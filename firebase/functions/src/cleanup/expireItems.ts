import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';

const db = admin.firestore();

export const cleanupExpired = onSchedule('every 24 hours', async () => {
  try {
    const now = admin.firestore.Timestamp.now();

    const expiredQuery = db
      .collection('items')
      .where('status', '==', 'active')
      .where('expiresAt', '<', now);

    const snapshot = await expiredQuery.get();

    if (snapshot.empty) {
      logger.info('No expired items found');
      return;
    }

    // Firestore batch 最大 500 条限制 → 분할 처리
    const docs = snapshot.docs;
    for (let i = 0; i < docs.length; i += 500) {
      const batch = db.batch();
      const chunk = docs.slice(i, i + 500);
      chunk.forEach((d) => batch.update(d.ref, { status: 'expired' }));
      await batch.commit();
    }

    logger.info(`Expired ${snapshot.size} items`);

    // TODO: Pinecone에서 해당 벡터 삭제 (팀원 B와 연동)
  } catch (error) {
    logger.error('Error in cleanupExpired:', error);
    throw error;
  }
});
