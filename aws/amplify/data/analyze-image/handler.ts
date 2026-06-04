import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import type { Schema } from '../resource';
import { RekognitionClient, DetectLabelsCommand } from '@aws-sdk/client-rekognition';

// Use process.env directly (populated at runtime by Amplify Lambda shims + function env injection).
// This avoids the $amplify/env/* virtual module import which can fail to resolve during esbuild bundling in ampx sandbox.
// getAmplifyDataClientConfig accepts it (with cast) because the required DataClientEnv keys are present in process.env at execution time.
const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
  // @ts-expect-error - process.env is augmented by Amplify at runtime with AMPLIFY_DATA_* and AWS_* keys; virtual env import avoided for bundler compatibility.
  process.env
);

Amplify.configure(resourceConfig, libraryOptions);

const client = generateClient<Schema>();
const rekognitionClient = new RekognitionClient({});

function getUserId(identity: unknown) {
  const value = identity as { sub?: string; username?: string } | undefined;
  return value?.sub ?? value?.username ?? '';
}

export const handler: Schema['analyzeImageLabels']['functionHandler'] = async (event) => {
  const { itemId } = event.arguments;
  console.log('[analyze-image] STORAGE_BUCKET_NAME present:', !!process.env.STORAGE_BUCKET_NAME);
  const userId = getUserId(event.identity);

  if (!itemId) {
    return { success: false, message: 'missing itemId' };
  }

  const itemResult = await client.models.Item.get({ id: itemId });

  if (!itemResult.data) {
    throw new Error('게시글을 찾을 수 없습니다.');
  }

  const item = itemResult.data;

  // Do not use ownerName for security checks (per requirements).
  // Use the implicit 'owner' field exposed by allow.owner() auth on Item (if present on the record).
  // Compare against event.identity (sub preferred, fallback username) using same helper as verify-answer.
  const itemOwner = (item as any)?.owner ?? '';
  if (itemOwner && userId && itemOwner !== userId) {
    console.warn(
      `[analyze-image] Ownership mismatch for item ${itemId}: itemOwner=${itemOwner} caller=${userId}. ` +
      'Continuing per prototype constraints (no hard fail).'
    );
  } else if (!itemOwner) {
    console.warn(
      `[analyze-image] Could not reliably verify ownership for item ${itemId} (no owner field on record). ` +
      'Continuing per prototype constraints.'
    );
  }

  const imageKeys: string[] = Array.isArray(item.imageKeys)
    ? item.imageKeys.filter((k): k is string => typeof k === 'string' && k.length > 0)
    : [];

  if (imageKeys.length === 0) {
    return { success: true, message: 'No images to analyze' };
  }

  const allLabels = new Set<string>();
  const MAX_LABELS_PER_IMAGE = 5;
  const MAX_TOTAL_LABELS = 10;

  const bucketName = process.env.STORAGE_BUCKET_NAME;
  if (!bucketName) {
    console.error('[analyze-image] STORAGE_BUCKET_NAME env var is not set (check backend.ts configuration)');
    return { success: false, message: 'Storage configuration error' };
  }

  for (const key of imageKeys) {
    try {
      const command = new DetectLabelsCommand({
        Image: {
          S3Object: {
            Bucket: bucketName,
            Name: key,
          },
        },
        MaxLabels: MAX_LABELS_PER_IMAGE,
      });

      const result = await rekognitionClient.send(command);
      const labels = result.Labels ?? [];

      for (const label of labels) {
        const description = label.Name?.toLowerCase().trim();
        if (description && description.length > 0) {
          allLabels.add(description);
          if (allLabels.size >= MAX_TOTAL_LABELS) {
            break;
          }
        }
      }
    } catch (imageError) {
      // Handle per-image errors gracefully (log + continue)
      console.warn(`[analyze-image] Failed to analyze image key: ${key}`, imageError);
    }
  }

  const visionLabels = Array.from(allLabels).slice(0, MAX_TOTAL_LABELS);

  if (visionLabels.length > 0) {
    await client.models.Item.update({
      id: itemId,
      visionLabels,
    });
  }

  const message =
    visionLabels.length > 0
      ? `Extracted ${visionLabels.length} labels from ${imageKeys.length} image(s)`
      : 'No labels extracted from images';

  return {
    success: true,
    message,
  };
};
