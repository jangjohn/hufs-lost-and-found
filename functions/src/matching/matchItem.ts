/**
 * matchItem — 팀원 B 담당 모듈
 *
 * Pub/Sub "new-item" 트리거
 * 1. 아이템 데이터를 OpenAI text-embedding-3-small로 임베딩 생성 (256 dim)
 * 2. Pinecone에 벡터 저장
 * 3. Pinecone에서 유사 벡터 검색 (반대 type: lost ↔ found)
 * 4. 유사도 threshold 이상인 결과를 Firestore matches collection에 저장
 * 5. 매칭 발견 시 Pub/Sub "item-matched" 토픽에 발행
 *
 * 환경 변수: OPENAI_API_KEY, PINECONE_API_KEY, PINECONE_INDEX
 */

import { onMessagePublished } from 'firebase-functions/v2/pubsub';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { PubSub } from '@google-cloud/pubsub';
import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';

// ─── 상수 ───────────────────────────────────────────────
const SIMILARITY_THRESHOLD = 0.75; // 유사도 임계값 (0~1)
const TOP_K = 5;                   // 상위 K개 결과 검색
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 256;
const MATCHED_TOPIC = 'item-matched';

// ─── 클라이언트 초기화 ──────────────────────────────────
const db = admin.firestore();
const pubsub = new PubSub();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

// ─── 헬퍼: 아이템 텍스트를 임베딩용 문자열로 결합 ─────
function buildEmbeddingText(item: FirebaseFirestore.DocumentData): string {
  const parts: string[] = [];

  if (item.title) parts.push(item.title);
  if (item.description) parts.push(item.description);
  if (item.category) parts.push(item.category);
  if (item.location) parts.push(item.location);

  // visionLabels가 있으면 함께 포함 (analyzeImage에서 추가)
  if (item.visionLabels && Array.isArray(item.visionLabels)) {
    parts.push(item.visionLabels.join(', '));
  }

  return parts.join(' | ');
}

// ─── 헬퍼: OpenAI 임베딩 생성 ──────────────────────────
async function createEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
    dimensions: EMBEDDING_DIMENSIONS,
  });

  return response.data[0].embedding;
}

// ─── 메인 Cloud Function ────────────────────────────────
export const matchItem = onMessagePublished('new-item', async (event) => {
  try {
    const message = event.data.message.json as {
      itemId: string;
      type: string;
      category: string;
      location: string;
      userId: string;
    };

    const { itemId, type } = message;
    logger.info(`[matchItem] Processing item: ${itemId}, type: ${type}`);

    // 1) Firestore에서 아이템 전체 데이터 조회
    const itemDoc = await db.collection('items').doc(itemId).get();
    if (!itemDoc.exists) {
      logger.warn(`[matchItem] Item ${itemId} not found in Firestore`);
      return;
    }
    const itemData = itemDoc.data()!;

    // 2) 임베딩용 텍스트 생성 → OpenAI 임베딩 호출
    const embeddingText = buildEmbeddingText(itemData);
    logger.info(`[matchItem] Embedding text: "${embeddingText.substring(0, 100)}..."`);

    const vector = await createEmbedding(embeddingText);
    logger.info(`[matchItem] Embedding created, dimensions: ${vector.length}`);

    // 3) Pinecone 인덱스에 벡터 저장
    const index = pinecone.index(process.env.PINECONE_INDEX!);
    await index.upsert([
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
    ]);
    logger.info(`[matchItem] Vector stored in Pinecone for item: ${itemId}`);

    // Firestore에 embeddingId 업데이트
    await db.collection('items').doc(itemId).update({ embeddingId: itemId });

    // 4) 반대 타입으로 유사 벡터 검색 (lost ↔ found)
    const oppositeType = type === 'lost' ? 'found' : 'lost';

    const queryResult = await index.query({
      vector,
      topK: TOP_K,
      includeMetadata: true,
      filter: {
        type: { $eq: oppositeType },
        status: { $eq: 'active' },
      },
    });

    const matches = queryResult.matches?.filter(
      (m) => (m.score ?? 0) >= SIMILARITY_THRESHOLD
    ) ?? [];

    logger.info(
      `[matchItem] Found ${matches.length} matches above threshold (${SIMILARITY_THRESHOLD}) for item: ${itemId}`
    );

    if (matches.length === 0) return;

    // 5) Firestore matches 컬렉션에 결과 저장 + Pub/Sub 발행
    const batch = db.batch();

    for (const match of matches) {
      const matchedItemId = match.id;
      const similarityScore = match.score ?? 0;

      // lost/found 순서 정규화: lostItemId는 항상 lost 타입
      const lostItemId = type === 'lost' ? itemId : matchedItemId;
      const foundItemId = type === 'lost' ? matchedItemId : itemId;

      // 중복 매칭 방지: 같은 쌍이 이미 있는지 확인
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
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Pub/Sub "item-matched" 토픽에 발행 → notifyOnMatch가 처리
      await pubsub.topic(MATCHED_TOPIC).publishMessage({
        json: {
          matchId: matchRef.id,
          lostItemId,
          foundItemId,
          similarityScore,
        },
      });

      logger.info(
        `[matchItem] Match created: ${matchRef.id} (score: ${similarityScore.toFixed(3)}) ` +
        `lost=${lostItemId} ↔ found=${foundItemId}`
      );
    }

    await batch.commit();
    logger.info(`[matchItem] All matches committed for item: ${itemId}`);
  } catch (error) {
    logger.error('[matchItem] Error:', error);
    throw error;
  }
});