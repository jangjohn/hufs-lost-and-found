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

/** Constants */
const SIMILARITY_THRESHOLD = 0.75; // Minimum cosine similarity score to consider a match
const TOP_K = 5; // Number of closest vectors to retrieve from Pinecone
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 384; // Reduced dimensions for cost/performance balance
const MATCHED_TOPIC = 'item-matched'; // Pub/Sub topic for newly created matches

// Initialize Firebase services
const db = admin.firestore();
const pubsub = new PubSub();

// Initialize external AI/vector services
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

/**
 * Builds a concatenated text string from item fields to be used for embedding.
 *
 * This combines the most semantically relevant fields so the resulting vector
 * captures the item's identity effectively for similarity search.
 *
 * @param item - Firestore document data for an item
 * @returns A pipe-separated string containing key item attributes
 */
function buildEmbeddingText(item: FirebaseFirestore.DocumentData): string {
  const parts: string[] = [];

  if (item.title) parts.push(item.title);
  if (item.description) parts.push(item.description);
  if (item.category) parts.push(item.category);
  if (item.location) parts.push(item.location);

  // Vision labels (from image analysis) provide additional context
  if (item.visionLabels && Array.isArray(item.visionLabels)) {
    parts.push(item.visionLabels.join(', '));
  }

  return parts.join(' | ');
}

/**
 * Generates a vector embedding for the given text using OpenAI's embedding model.
 *
 * @param text - The text to embed
 * @returns Promise resolving to an array of numbers representing the embedding vector
 * @throws Error if the OpenAI API call fails
 */
async function createEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
    dimensions: EMBEDDING_DIMENSIONS,
  });

  // Return only the first embedding (we send single input)
  return response.data[0].embedding;
}

/**
 * Cloud Function triggered by Pub/Sub message on the 'new-item' topic.
 *
 * This function:
 * 1. Embeds the new item using OpenAI
 * 2. Stores the vector in Pinecone for future similarity searches
 * 3. Queries Pinecone for similar items of the opposite type (lost ↔ found)
 * 4. Creates match records in Firestore if similarity exceeds threshold
 * 5. Publishes match events to trigger downstream notifications/workflows
 *
 * @param event - Pub/Sub message event containing the new item details
 */
export const matchItem = onMessagePublished('new-item', async (event) => {
  try {
    // Parse the incoming Pub/Sub message
    const message = event.data.message.json as {
      itemId: string;
      type: 'lost' | 'found';
      category: string;
      location: string;
      userId: string;
    };

    const { itemId, type } = message;

    logger.info(`[matchItem] Processing item: ${itemId}, type: ${type}`);

    // Fetch full item data from Firestore
    const itemDoc = await db.collection('items').doc(itemId).get();

    if (!itemDoc.exists) {
      logger.warn(`[matchItem] Item ${itemId} not found in Firestore`);
      return;
    }

    const itemData = itemDoc.data()!;

    // Step 1: Build text representation and create embedding
    const embeddingText = buildEmbeddingText(itemData);
    logger.info(`[matchItem] Embedding text: "${embeddingText.substring(0, 100)}..."`);

    const vector = await createEmbedding(embeddingText);
    logger.info(`[matchItem] Embedding created, dimensions: ${vector.length}`);

    // Step 2: Store vector in Pinecone with metadata for filtering
    const index = pinecone.index(process.env.PINECONE_INDEX!);

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

    // Update Firestore to mark that this item has been embedded
    await db.collection('items').doc(itemId).update({
      embeddingId: itemId,
    });

    // Step 3: Search for potential matches of the opposite type
    const oppositeType = type === 'lost' ? 'found' : 'lost';

    const queryResult = await index.query({
      vector,
      topK: TOP_K,
      includeMetadata: true,
      filter: {
        type: { $eq: oppositeType },
        status: { $eq: 'active' }, // Only match against active items
      },
    });

    // Filter matches by similarity threshold
    const matches = queryResult.matches?.filter(
      (m) => (m.score ?? 0) >= SIMILARITY_THRESHOLD
    ) ?? [];

    logger.info(
      `[matchItem] Found ${matches.length} matches above threshold (${SIMILARITY_THRESHOLD}) for item: ${itemId}`
    );

    if (matches.length === 0) {
      return; // No matches found - function ends here
    }

    // Step 4: Create match records in Firestore (using batch for efficiency)
    const batch = db.batch();

    for (const match of matches) {
      const matchedItemId = match.id;
      const similarityScore = match.score ?? 0;

      // Determine which is lost and which is found
      const lostItemId = type === 'lost' ? itemId : matchedItemId;
      const foundItemId = type === 'lost' ? matchedItemId : itemId;

      // Prevent duplicate matches (important for bidirectional triggering)
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

      // Create new match document
      const matchRef = db.collection('matches').doc();

      batch.set(matchRef, {
        lostItemId,
        foundItemId,
        similarityScore,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Publish event so other functions (e.g., notifications) can react
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
    throw error; // Let Firebase Functions handle retry logic if configured
  }
});