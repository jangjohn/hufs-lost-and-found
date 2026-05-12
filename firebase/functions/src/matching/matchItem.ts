/**
 * matchItem — 팀원 B (PSCHEDULE) 담당 모듈
 *
 * Pub/Sub "new-item" 트리거
 * 1. 아이템 데이터를 OpenAI text-embedding-3-small로 임베딩 생성 (384 dim)
 * 2. Pinecone에 벡터 저장
 * 3. Pinecone에서 유사 벡터 검색 (반대 type: lost ↔ found + 자기 아이템 제외)
 * 4. 유사도 threshold 이상인 결과를 Firestore matches collection에 저장
 * 5. 매칭 발견 시 Pub/Sub "item-matched" 토픽에 발행
 *
 * 환경 변수: OPENAI_API_KEY, PINECONE_API_KEY, PINECONE_INDEX
 * Pinecone SDK v7.1.0 기준 최신 API 사용
 */

import { onMessagePublished } from 'firebase-functions/v2/pubsub';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { PubSub } from '@google-cloud/pubsub';
import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import { FieldValue } from 'firebase-admin/firestore';

/** Constants */
const SIMILARITY_THRESHOLD = 0.75;
const TOP_K = 5;
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 384;
const MATCHED_TOPIC = 'item-matched';

// Emulator + Prod compatibility
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const pubsub = new PubSub();

/**
 * Builds a concatenated text string from item fields to be used for embedding.
 */
function buildEmbeddingText(item: admin.firestore.DocumentData): string {
  const parts: string[] = [];
  if (item.title) parts.push(item.title);
  if (item.description) parts.push(item.description);
  if (item.category) parts.push(item.category);
  if (item.location) parts.push(item.location);
  if (item.visionLabels && Array.isArray(item.visionLabels)) {
    parts.push(item.visionLabels.join(', '));
  }
  return parts.join(' | ');
}

/**
 * Generates a vector embedding for the given text using OpenAI.
 */
async function createEmbedding(openai: OpenAI, text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
    dimensions: EMBEDDING_DIMENSIONS,
  });
  return response.data[0].embedding;
}

/**
 * Cloud Function triggered by Pub/Sub message on the 'new-item' topic.
 */
export const matchItem = onMessagePublished(
  {
    topic: 'new-item',
    secrets: ['OPENAI_API_KEY', 'PINECONE_API_KEY'],
  },
  async (event) => {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

    const message = event.data.message.json as {
      itemId: string;
      type: 'lost' | 'found';
      userId: string;
    };
    const { itemId, type, userId } = message;

    logger.info(`[matchItem] Processing item: ${itemId}, type: ${type}`);

    const itemDoc = await db.collection('items').doc(itemId).get();
    if (!itemDoc.exists) {
      logger.warn(`[matchItem] Item ${itemId} not found in Firestore`);
      return;
    }
    const itemData = itemDoc.data()!;

    // Build embedding text
    const embeddingText = buildEmbeddingText(itemData);
    logger.info(`[matchItem] Embedding text: "${embeddingText.substring(0, 100)}..."`);

    // Create embedding vector
    const vector = await createEmbedding(openai, embeddingText);
    logger.info(`[matchItem] Embedding created, dimensions: ${vector.length}`);

    // Store vector in Pinecone
    const index = pinecone.index(process.env.PINECONE_INDEX || 'hufs-lost-and-found');
    await index.upsert({
      records: [
        {
          id: itemId,
          values: vector,
          metadata: {
            type: itemData.type,
            category: itemData.category,
            location: itemData.location,
            status: itemData.status,
            userId: itemData.userId,
          },
        },
      ],
    });
    logger.info(`[matchItem] Vector stored in Pinecone for item: ${itemId}`);

    await db.collection('items').doc(itemId).update({ embeddingId: itemId });

    // Search for matches (opposite type only)
    const oppositeType = type === 'lost' ? 'found' : 'lost';
    const queryResult = await index.query({
      vector,
      topK: TOP_K,
      includeMetadata: true,
      filter: {
        type: { $eq: oppositeType },
        status: { $eq: 'active' },
        userId: { $ne: userId },
      },
    });

    const matches = queryResult.matches?.filter(
      (m) => (m.score ?? 0) >= SIMILARITY_THRESHOLD
    ) ?? [];

    logger.info(`[matchItem] Found ${matches.length} matches above threshold for item: ${itemId}`);

    if (matches.length === 0) return;

    // Create match records
    const batch = db.batch();
    const matchResults: Array<{
      matchId: string;
      lostItemId: string;
      foundItemId: string;
      similarityScore: number;
    }> = [];

    for (const match of matches) {
      const matchedItemId = match.id;
      const similarityScore = match.score ?? 0;

      const lostItemId = type === 'lost' ? itemId : matchedItemId;
      const foundItemId = type === 'lost' ? matchedItemId : itemId;

      const existingMatch = await db
        .collection('matches')
        .where('lostItemId', '==', lostItemId)
        .where('foundItemId', '==', foundItemId)
        .limit(1)
        .get();

      if (!existingMatch.empty) {
        logger.info(`[matchItem] Duplicate match skipped: ${lostItemId} ↔ ${foundItemId}`);
        continue;
      }

      const matchRef = db.collection('matches').doc();
      batch.set(matchRef, {
        lostItemId,
        foundItemId,
        similarityScore,
        status: 'pending',
        createdAt: FieldValue.serverTimestamp(),
      });

      matchResults.push({ matchId: matchRef.id, lostItemId, foundItemId, similarityScore });
    }

    await batch.commit();
    logger.info(`[matchItem] All matches committed for item: ${itemId}`);

    // Publish match events
    for (const result of matchResults) {
      await pubsub.topic(MATCHED_TOPIC).publishMessage({ json: result });
      logger.info(
        `[matchItem] Match published: ${result.matchId} (score: ${result.similarityScore.toFixed(3)}) ` +
        `lost=${result.lostItemId} ↔ found=${result.foundItemId}`
      );
    }
  } catch (error) {
    logger.error('[matchItem] Error:', error);
    throw error;
  }
});