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

// ─── 상수 ───────────────────────────────────────────────
const MAX_LABELS_PER_IMAGE = 5;   // 이미지당 최대 라벨 수
const MAX_TOTAL_LABELS = 10;      // 아이템당 최대 총 라벨 수

// ─── 클라이언트 초기화 ──────────────────────────────────
const db = admin.firestore();
const visionClient = new vision.ImageAnnotatorClient();

// ─── 메인 Cloud Function ────────────────────────────────
export const analyzeImage = onMessagePublished('new-item', async (event) => {
  try {
    const message = event.data.message.json as {
      itemId: string;
      type: string;
      category: string;
      location: string;
      userId: string;
    };

    const { itemId } = message;
    logger.info(`[analyzeImage] Processing item: ${itemId}`);

    // 1) Firestore에서 아이템 조회 → imageUrls 확인
    const itemDoc = await db.collection('items').doc(itemId).get();
    if (!itemDoc.exists) {
      logger.warn(`[analyzeImage] Item ${itemId} not found`);
      return;
    }

    const itemData = itemDoc.data()!;
    const imageUrls: string[] = itemData.imageUrls ?? [];

    if (imageUrls.length === 0) {
      logger.info(`[analyzeImage] No images for item: ${itemId}, skipping`);
      return;
    }

    logger.info(`[analyzeImage] Analyzing ${imageUrls.length} image(s) for item: ${itemId}`);

    // 2) 각 이미지에 대해 Cloud Vision 라벨 감지 수행
    const allLabels = new Set<string>();

    for (const url of imageUrls) {
      try {
        const [result] = await visionClient.labelDetection({
          image: { source: { imageUri: url } },
        });

        const labels = result.labelAnnotations ?? [];

        // 상위 N개 라벨만 추출 (confidence 기반 이미 정렬됨)
        const topLabels = labels
          .slice(0, MAX_LABELS_PER_IMAGE)
          .map((label) => label.description ?? '')
          .filter((desc) => desc.length > 0);

        topLabels.forEach((label) => allLabels.add(label.toLowerCase()));

        logger.info(
          `[analyzeImage] Labels for image: [${topLabels.join(', ')}]`
        );
      } catch (imageError) {
        // 개별 이미지 실패 시 다른 이미지는 계속 처리
        logger.warn(`[analyzeImage] Failed to analyze image: ${url}`, imageError);
      }
    }

    // 3) 추출된 라벨을 Firestore에 업데이트
    const visionLabels = Array.from(allLabels).slice(0, MAX_TOTAL_LABELS);

    if (visionLabels.length > 0) {
      await db.collection('items').doc(itemId).update({ visionLabels });
      logger.info(
        `[analyzeImage] Updated visionLabels for item ${itemId}: [${visionLabels.join(', ')}]`
      );
    } else {
      logger.info(`[analyzeImage] No labels extracted for item: ${itemId}`);
    }
  } catch (error) {
    logger.error('[analyzeImage] Error:', error);
    throw error;
  }
});