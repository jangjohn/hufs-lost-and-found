import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import type { Schema } from '../resource';
import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';

// Use process.env directly (populated at runtime by Amplify Lambda shims + function env injection).
// This avoids the $amplify/env/* virtual module import which can fail to resolve during esbuild bundling in ampx sandbox.
// getAmplifyDataClientConfig accepts it (with cast) because the required DataClientEnv keys are present in process.env at execution time.
const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
  // @ts-expect-error - process.env is augmented by Amplify at runtime with AMPLIFY_DATA_* and AWS_* keys; virtual env import avoided for bundler compatibility.
  process.env
);

Amplify.configure(resourceConfig, libraryOptions);

const client = generateClient<Schema>();

/** Constants */
const SIMILARITY_THRESHOLD = 0.75;
const TOP_K = 5;
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 384;

function getUserId(identity: unknown) {
  const value = identity as { sub?: string; username?: string } | undefined;
  return value?.sub ?? value?.username ?? '';
}

function buildEmbeddingText(item: any): string {
  const parts: string[] = [];
  if (item.title) parts.push(item.title);
  if (item.description) parts.push(item.description);
  if (item.category) parts.push(item.category);
  if (item.location) parts.push(item.location);
  if (item.visionLabels && Array.isArray(item.visionLabels)) {
    parts.push(item.visionLabels.join(' '));
  }
  return parts.join(' | ');
}

async function createEmbedding(openai: OpenAI, text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
    dimensions: EMBEDDING_DIMENSIONS,
  });
  return response.data[0].embedding;
}

export const handler: Schema['generateMatches']['functionHandler'] = async (event) => {
  const { itemId } = event.arguments;
  const userId = getUserId(event.identity);

  // Safe logs for presence (no secret values)
  console.log('[match-item] OPENAI_API_KEY present:', !!process.env.OPENAI_API_KEY);
  console.log('[match-item] PINECONE_API_KEY present:', !!process.env.PINECONE_API_KEY);
  console.log('[match-item] PINECONE_INDEX present:', !!process.env.PINECONE_INDEX);
  console.log('[match-item] Processing itemId:', itemId);

  if (!itemId) {
    return { success: false, message: 'missing itemId' };
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required');
  }
  if (!process.env.PINECONE_API_KEY) {
    throw new Error('PINECONE_API_KEY is required');
  }
  if (!process.env.PINECONE_INDEX) {
    throw new Error('PINECONE_INDEX is required');
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

  const itemResult = await client.models.Item.get({ id: itemId });
  if (!itemResult.data) {
    throw new Error('Item not found');
  }
  const item = itemResult.data;

  // Ownership: do not use ownerName. Use implicit owner if available.
  const itemOwner = (item as any)?.owner ?? '';
  if (itemOwner && userId && itemOwner !== userId) {
    console.warn(
      `[match-item] Ownership mismatch for item ${itemId}: itemOwner=${itemOwner} caller=${userId}. ` +
      'Continuing per prototype constraints (no hard fail).'
    );
  } else if (!itemOwner) {
    console.warn(
      `[match-item] Could not reliably verify ownership for item ${itemId} (no owner field on record). ` +
      'Continuing per prototype constraints.'
    );
  }

  const embeddingText = buildEmbeddingText(item);
  const vector = await createEmbedding(openai, embeddingText);

  const indexName = process.env.PINECONE_INDEX;
  const index = pinecone.index(indexName);

  await index.upsert([
    {
      id: itemId,
      values: vector,
      metadata: {
        type: item.type ?? '',
        category: item.category ?? '',
        location: item.location ?? '',
        status: item.status ?? '',
        owner: itemOwner ?? '',
      },
    },
  ]);

  await client.models.Item.update({
    id: itemId,
    embeddingId: itemId,
  });

  console.log('[match-item] Vector stored in Pinecone and embeddingId updated for item:', itemId);

  const oppositeType = item.type === 'lost' ? 'found' : 'lost';
  const queryResult = await index.query({
    vector,
    topK: TOP_K,
    includeMetadata: true,
    filter: {
      type: { $eq: oppositeType },
      status: { $eq: 'active' },
    },
  });

  const candidates = (queryResult.matches ?? []).filter(
    (m) => (m.score ?? 0) >= SIMILARITY_THRESHOLD && m.id && m.id !== itemId
  );

  console.log(`[match-item] Found ${candidates.length} candidates above threshold for item: ${itemId}`);

  let createdCount = 0;
  for (const match of candidates) {
    const candidateId = match.id!;
    const score = match.score ?? 0;

    const lostItemId = item.type === 'lost' ? itemId : candidateId;
    const foundItemId = item.type === 'lost' ? candidateId : itemId;

    // Check for duplicate
    const existing = await client.models.Match.list({
      filter: {
        and: [
          { lostItemId: { eq: lostItemId } },
          { foundItemId: { eq: foundItemId } },
        ],
      },
      limit: 1,
    });
    if (existing.data && existing.data.length > 0) {
      console.log(`[match-item] Duplicate match skipped: ${lostItemId} ↔ ${foundItemId}`);
      continue;
    }

    await client.models.Match.create({
      lostItemId,
      foundItemId,
      similarityScore: score,
      status: 'pending',
    });
    createdCount++;
  }

  console.log(`[match-item] Created ${createdCount} Match record(s) for item: ${itemId}`);

  return {
    success: true,
    message: `created ${createdCount} matches`,
  };
};
