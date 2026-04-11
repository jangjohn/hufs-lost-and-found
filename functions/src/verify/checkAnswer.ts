import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { createHash, timingSafeEqual } from 'node:crypto';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';

const db = admin.firestore();

const sha256 = (s: string) =>
  createHash('sha256').update(s.trim().toLowerCase()).digest();

export const verifyAnswer = onCall(async (req) => {
  if (!req.auth) {
    throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
  }

  const { itemId, answer } = req.data as { itemId: string; answer: string };

  if (!itemId || !answer) {
    throw new HttpsError('invalid-argument', 'itemId와 answer가 필요합니다.');
  }

  const uid = req.auth.uid;

  try {
    // 트랜잭션으로 3회 제한 + 결과 기록을 원자적으로 처리
    const result = await db.runTransaction(async (tx) => {
      // 시도 횟수 확인
      const attemptsQuery = db
        .collection('verificationAttempts')
        .where('itemId', '==', itemId)
        .where('userId', '==', uid);

      const attemptsSnap = await tx.get(attemptsQuery);

      if (attemptsSnap.size >= 3) {
        throw new HttpsError(
          'resource-exhausted',
          '인증 시도 횟수(3회)를 초과했습니다.'
        );
      }

      // 아이템 조회 + 해시 비교
      const itemRef = db.doc(`items/${itemId}`);
      const itemDoc = await tx.get(itemRef);

      if (!itemDoc.exists) {
        throw new HttpsError('not-found', '아이템을 찾을 수 없습니다.');
      }

      const itemData = itemDoc.data() as {
        userId: string;
        title?: string;
        verificationAHash?: string;
      };

      if (itemData.userId === uid) {
        throw new HttpsError(
          'failed-precondition',
          '본인이 작성한 게시글은 인증할 수 없습니다.'
        );
      }

      const hashHex = itemData.verificationAHash;

      if (!hashHex) {
        throw new HttpsError(
          'failed-precondition',
          '인증 정보가 설정되지 않았습니다.'
        );
      }

      const expected = Buffer.from(hashHex, 'hex');
      const actual = sha256(answer);
      const isCorrect =
        expected.length === actual.length && timingSafeEqual(expected, actual);

      // 시도 기록 저장
      const attemptRef = db.collection('verificationAttempts').doc();

      tx.set(attemptRef, {
        itemId,
        userId: uid,
        result: isCorrect ? 'success' : 'fail',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      let ownershipCheckId: string | null = null;

      if (isCorrect) {
        const ownershipChecksQuery = db
          .collection('ownershipChecks')
          .where('itemId', '==', itemId)
          .where('userId', '==', uid)
          .limit(1);

        const ownershipChecksSnap = await tx.get(ownershipChecksQuery);

        if (!ownershipChecksSnap.empty) {
          ownershipCheckId = ownershipChecksSnap.docs[0].id;
        } else {
          const ownershipCheckRef = db.collection('ownershipChecks').doc();
          ownershipCheckId = ownershipCheckRef.id;

          tx.set(ownershipCheckRef, {
            itemId,
            userId: uid,
            ownerUserId: itemData.userId,
            status: 'verified',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }

      return {
        success: isCorrect,
        ownershipCheckId,
      };
    });

    return result;
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error('Error in verifyAnswer:', error);
    throw new HttpsError('internal', '인증 처리 중 오류가 발생했습니다.');
  }
});