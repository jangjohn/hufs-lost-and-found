/**
 * analyzeImage — 팀원 B 담당 모듈
 *
 * Pub/Sub "new-item" 트리거
 * 1. Firestore에서 아이템의 imageUrls 조회
 * 2. Cloud Vision API로 각 이미지 라벨 추출
 * 3. 추출된 라벨을 Firestore items 문서의 visionLabels 필드에 업데이트
 *
 * Cloud Vision API 사용 (GCP 프로젝트에서 사전 활성화 필요)
 */

import { onMessagePublished } from 'firebase-functions/v2/pubsub';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import vision from '@google-cloud/vision';

/** Constants */
const MAX_LABELS_PER_IMAGE = 5;   // Maximum number of labels to take from each individual image
const MAX_TOTAL_LABELS = 10;      // Maximum number of unique labels to store per item (across all images)

/**
 * Firestore database instance
 */
const db = admin.firestore();

/**
 * Google Cloud Vision client for image label detection
 */
const visionClient = new vision.ImageAnnotatorClient();

/**
 * Interface representing the structure of the Pub/Sub message payload
 * for a new item.
 */
interface NewItemMessage {
  itemId: string;
  type: string;
  category: string;
  location: string;
  userId: string;
}

/**
 * Cloud Function triggered by Pub/Sub topic 'new-item'.
 *
 * This function performs automated image analysis using Google Cloud Vision API
 * to extract descriptive labels from uploaded images. These labels are then
 * stored in Firestore and later used for building semantic embeddings
 * to improve item matching accuracy.
 *
 * Flow:
 * 1. Retrieve item document from Firestore
 * 2. For each image URL, call Cloud Vision label detection
 * 3. Aggregate unique labels across all images (case-insensitive)
 * 4. Limit total labels and update the item document
 *
 * @param event - Pub/Sub message event containing item details
 */
export const analyzeImage = onMessagePublished('new-item', async (event) => {
  try {
    // Parse the incoming Pub/Sub message
    const message = event.data.message.json as NewItemMessage;
    const { itemId } = message;

    logger.info(`[analyzeImage] Processing item: ${itemId}`);

    // Fetch the full item document from Firestore
    const itemDoc = await db.collection('items').doc(itemId).get();

    if (!itemDoc.exists) {
      logger.warn(`[analyzeImage] Item ${itemId} not found`);
      return;
    }

    const itemData = itemDoc.data()!;

    // Extract image URLs (fallback to empty array if none exist)
    const imageUrls: string[] = itemData.imageUrls ?? [];

    if (imageUrls.length === 0) {
      logger.info(`[analyzeImage] No images for item: ${itemId}, skipping`);
      return;
    }

    logger.info(`[analyzeImage] Analyzing ${imageUrls.length} image(s) for item: ${itemId}`);

    // Use a Set to automatically handle uniqueness (case-insensitive)
    const allLabels = new Set<string>();

    // Process each image individually to handle failures gracefully
    for (const url of imageUrls) {
      try {
        // Call Google Cloud Vision API for label detection
        const [result] = await visionClient.labelDetection({
          image: { source: { imageUri: url } },
        });

        const labels = result.labelAnnotations ?? [];

        // Take only the top N most confident labels per image
        const topLabels = labels
          .slice(0, MAX_LABELS_PER_IMAGE)
          .map((label) => label.description ?? '')
          .filter((desc) => desc.length > 0); // Remove empty descriptions

        // Add labels to the set (converted to lowercase for deduplication)
        topLabels.forEach((label) => allLabels.add(label.toLowerCase()));

        logger.info(
          `[analyzeImage] Labels for image: [${topLabels.join(', ')}]`
        );
      } catch (imageError) {
        // Log warning but continue processing other images
        logger.warn(`[analyzeImage] Failed to analyze image: ${url}`, imageError);
      }
    }

    // Convert set back to array and enforce global limit
    const visionLabels = Array.from(allLabels).slice(0, MAX_TOTAL_LABELS);

    if (visionLabels.length > 0) {
      // Update the item document with the extracted vision labels
      await db.collection('items').doc(itemId).update({ visionLabels });

      logger.info(
        `[analyzeImage] Updated visionLabels for item ${itemId}: [${visionLabels.join(', ')}]`
      );
    } else {
      logger.info(`[analyzeImage] No labels extracted for item: ${itemId}`);
    }
  } catch (error) {
    logger.error('[analyzeImage] Error:', error);
    throw error; // Let Firebase Functions handle retries if configured
  }
});