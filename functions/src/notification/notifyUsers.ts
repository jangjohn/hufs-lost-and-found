import { onMessagePublished } from 'firebase-functions/v2/pubsub';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';

const db = admin.firestore();
const messaging = admin.messaging();

// 무효 FCM 토큰 정리
async function cleanupInvalidTokens(
  tokens: string[],
  response: admin.messaging.BatchResponse,
  tokenOwners: Map<string, string>
) {
  const invalidTokens = new Map<string, string[]>();
  response.responses.forEach((res, i) => {
    if (!res.success) {
      const code = res.error?.code;
      if (
        code === 'messaging/invalid-registration-token' ||
        code === 'messaging/registration-token-not-registered'
      ) {
        const uid = tokenOwners.get(tokens[i]);
        if (uid) {
          if (!invalidTokens.has(uid)) invalidTokens.set(uid, []);
          invalidTokens.get(uid)!.push(tokens[i]);
        }
      }
    }
  });

  for (const [uid, badTokens] of invalidTokens) {
    await db.doc(`users/${uid}`).update({
      fcmTokens: admin.firestore.FieldValue.arrayRemove(...badTokens),
    });
    logger.info(`Removed ${badTokens.length} invalid tokens for user ${uid}`);
  }
}

// 새 아이템 등록 시 구독자에게 알림
export const notifyOnNewItem = onMessagePublished('new-item', async (event) => {
  try {
    const data = event.data.message.json as {
      itemId: string;
      type: string;
      category: string;
      location: string;
      userId: string;
    };

    logger.info(`Notifying subscribers for new item: ${data.itemId}`);

    const usersSnap = await db.collection('users').get();
    const tokens: string[] = [];
    const tokenOwners = new Map<string, string>();

    for (const userDoc of usersSnap.docs) {
      const user = userDoc.data();

      if (userDoc.id === data.userId) continue;
      if (!user.fcmTokens || user.fcmTokens.length === 0) continue;

      const subscriptions = user.subscriptions ?? [];
      const matched = subscriptions.length === 0 || subscriptions.some(
        (sub: { category: string; location: string }) =>
          (!sub.category || sub.category === data.category) &&
          (!sub.location || sub.location === data.location)
      );

      if (matched) {
        for (const t of user.fcmTokens) {
          tokens.push(t);
          tokenOwners.set(t, userDoc.id);
        }
      }
    }

    if (tokens.length === 0) {
      logger.info('No subscribers to notify');
      return;
    }

    const typeLabel = data.type === 'lost' ? '분실물' : '습득물';
    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: {
        title: `새 ${typeLabel}이 등록되었습니다`,
        body: `${data.location}에서 새 ${typeLabel}이 등록되었습니다.`,
      },
      data: {
        itemId: data.itemId,
        type: data.type,
      },
    });

    logger.info(`Sent notifications to ${tokens.length} devices, ${response.successCount} succeeded`);

    await cleanupInvalidTokens(tokens, response, tokenOwners);
  } catch (error) {
    logger.error('Error in notifyOnNewItem:', error);
    throw error;
  }
});

// 매칭 발견 시 게시자에게 알림
export const notifyOnMatch = onMessagePublished('item-matched', async (event) => {
  try {
    const data = event.data.message.json as {
      matchId: string;
      lostItemId: string;
      foundItemId: string;
      similarityScore: number;
    };

    logger.info(`Notifying users for match: ${data.matchId}`);

    const [lostDoc, foundDoc] = await Promise.all([
      db.collection('items').doc(data.lostItemId).get(),
      db.collection('items').doc(data.foundItemId).get(),
    ]);

    const tokens: string[] = [];
    const tokenOwners = new Map<string, string>();

    for (const itemDoc of [lostDoc, foundDoc]) {
      if (!itemDoc.exists) continue;
      const uid = itemDoc.data()!.userId;
      const userDoc = await db.collection('users').doc(uid).get();
      if (userDoc.exists) {
        const fcmTokens = userDoc.data()!.fcmTokens ?? [];
        for (const t of fcmTokens) {
          tokens.push(t);
          tokenOwners.set(t, uid);
        }
      }
    }

    if (tokens.length === 0) return;

    const score = Math.round(data.similarityScore * 100);
    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: {
        title: '매칭 결과가 있습니다!',
        body: `유사도 ${score}%의 매칭이 발견되었습니다.`,
      },
      data: {
        matchId: data.matchId,
      },
    });

    logger.info(`Sent match notifications to ${tokens.length} devices, ${response.successCount} succeeded`);

    await cleanupInvalidTokens(tokens, response, tokenOwners);
  } catch (error) {
    logger.error('Error in notifyOnMatch:', error);
    throw error;
  }
});
