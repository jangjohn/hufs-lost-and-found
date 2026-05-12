import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { PubSub } from '@google-cloud/pubsub';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';

const pubsub = new PubSub();
const NEW_ITEM_TOPIC = 'new-item';

export const onItemCreated = onDocumentCreated('items/{itemId}', async (event) => {
  try {
    const snapshot = event.data;
    if (!snapshot) {
      logger.warn('No data in onItemCreated event');
      return;
    }

    const itemId = event.params.itemId;
    const data = snapshot.data();

    logger.info(`New item created: ${itemId}`, { type: data.type, category: data.category });

    // createdAt 기준으로 expiresAt 계산 (서버 시간 기준 +90일)
    const createdAt = data.createdAt as FirebaseFirestore.Timestamp;
    const expiresAt = admin.firestore.Timestamp.fromMillis(
      createdAt.toMillis() + 90 * 24 * 60 * 60 * 1000
    );
    await snapshot.ref.update({ expiresAt });

    // Pub/Sub "new-item" 토픽에 메시지 발행
    const message = {
      itemId,
      type: data.type,
      category: data.category,
      location: data.location,
      userId: data.userId,
    };

    await pubsub.topic(NEW_ITEM_TOPIC).publishMessage({
      json: message,
    });

    logger.info(`Published message to ${NEW_ITEM_TOPIC} for item: ${itemId}`);
  } catch (error) {
    logger.error('Error in onItemCreated:', error);
    throw error;
  }
});
