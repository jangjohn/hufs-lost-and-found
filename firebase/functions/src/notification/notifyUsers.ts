import { onMessagePublished } from 'firebase-functions/v2/pubsub';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';

const db = admin.firestore();
const messaging = admin.messaging();

async function cleanupInvalidTokens(
  tokens: string[],
  response: admin.messaging.BatchResponse,
  tokenOwners: Map<string, string>
) {
  const invalidTokens = new Map<string, string[]>();

  response.responses.forEach((res, index) => {
    if (res.success) return;

    const code = res.error?.code;
    if (
      code !== 'messaging/invalid-registration-token' &&
      code !== 'messaging/registration-token-not-registered'
    ) {
      return;
    }

    const token = tokens[index];
    const uid = tokenOwners.get(token);
    if (!uid) return;

    if (!invalidTokens.has(uid)) {
      invalidTokens.set(uid, []);
    }
    invalidTokens.get(uid)!.push(token);
  });

  for (const [uid, badTokens] of invalidTokens) {
    await db.doc(`users/${uid}`).update({
      fcmTokens: admin.firestore.FieldValue.arrayRemove(...badTokens),
    });
    logger.info(`Removed ${badTokens.length} invalid tokens for user ${uid}`);
  }
}

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
    const uniqueTokens = new Set<string>();
    const tokenOwners = new Map<string, string>();

    for (const userDoc of usersSnap.docs) {
      const user = userDoc.data();

      if (userDoc.id === data.userId) continue;
      if (!Array.isArray(user.fcmTokens) || user.fcmTokens.length === 0) continue;

      const subscriptions = user.subscriptions ?? [];
      const matched = subscriptions.length === 0 || subscriptions.some(
        (sub: { category: string; location: string }) =>
          (!sub.category || sub.category === data.category) &&
          (!sub.location || sub.location === data.location)
      );

      if (!matched) continue;

      for (const token of user.fcmTokens) {
        uniqueTokens.add(token);
        tokenOwners.set(token, userDoc.id);
      }
    }

    const tokens = [...uniqueTokens];
    if (tokens.length === 0) {
      logger.info('No subscribers to notify');
      return;
    }

    const itemLabel = data.type === 'lost' ? 'lost item' : 'found item';
    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: {
        title: `New ${itemLabel} posted`,
        body: `${data.location} now has a new ${itemLabel} listing.`,
      },
      data: {
        itemId: data.itemId,
        type: data.type,
        link: `/item/${data.itemId}`,
      },
      webpush: {
        fcmOptions: {
          link: `/item/${data.itemId}`,
        },
      },
    });

    logger.info(`Sent notifications to ${tokens.length} devices, ${response.successCount} succeeded`);
    await cleanupInvalidTokens(tokens, response, tokenOwners);
  } catch (error) {
    logger.error('Error in notifyOnNewItem:', error);
    throw error;
  }
});

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

    const uniqueTokens = new Set<string>();
    const tokenOwners = new Map<string, string>();

    for (const itemDoc of [lostDoc, foundDoc]) {
      if (!itemDoc.exists) continue;

      const uid = itemDoc.data()!.userId;
      const userDoc = await db.collection('users').doc(uid).get();
      if (!userDoc.exists) continue;

      const fcmTokens = userDoc.data()!.fcmTokens ?? [];
      for (const token of fcmTokens) {
        uniqueTokens.add(token);
        tokenOwners.set(token, uid);
      }
    }

    const tokens = [...uniqueTokens];
    if (tokens.length === 0) {
      logger.info('No match recipients to notify');
      return;
    }

    const score = Math.round(data.similarityScore * 100);
    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: {
        title: 'Potential match found',
        body: `A new match was found with ${score}% similarity.`,
      },
      data: {
        matchId: data.matchId,
        link: '/matches',
      },
      webpush: {
        fcmOptions: {
          link: '/matches',
        },
      },
    });

    logger.info(`Sent match notifications to ${tokens.length} devices, ${response.successCount} succeeded`);
    await cleanupInvalidTokens(tokens, response, tokenOwners);
  } catch (error) {
    logger.error('Error in notifyOnMatch:', error);
    throw error;
  }
});
