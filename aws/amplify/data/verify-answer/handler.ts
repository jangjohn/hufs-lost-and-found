import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env } from '$amplify/env/verify-answer';
import { createHash, timingSafeEqual } from 'node:crypto';
import type { Schema } from '../resource';

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);

Amplify.configure(resourceConfig, libraryOptions);

const client = generateClient<Schema>();

function normalizeAnswer(value: string) {
  return value.trim().toLowerCase();
}

function hashAnswer(answer: string, salt: string) {
  return createHash('sha256')
    .update(`${salt}:${normalizeAnswer(answer)}`)
    .digest('hex');
}

function safeEqualHex(expectedHex: string, actualHex: string) {
  const expected = Buffer.from(expectedHex, 'hex');
  const actual = Buffer.from(actualHex, 'hex');

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function getUserId(identity: unknown) {
  const value = identity as { sub?: string; username?: string } | undefined;
  return value?.sub ?? value?.username ?? '';
}

export const handler: Schema['verifyAnswer']['functionHandler'] = async (event) => {
  const { itemId, answer } = event.arguments;
  const userId = getUserId(event.identity);

  if (!userId) {
    throw new Error('로그인이 필요합니다.');
  }

  if (!answer?.trim()) {
    return {
      success: false,
      remainingAttempts: 3,
      message: '답변을 입력하세요.',
    };
  }

  const itemResult = await client.models.Item.get({ id: itemId });

  if (!itemResult.data) {
    throw new Error('게시글을 찾을 수 없습니다.');
  }

  const attemptsResult = await client.models.VerificationAttempt.list({
    filter: {
      itemId: { eq: itemId },
      userId: { eq: userId },
    },
  });

  const usedAttempts = attemptsResult.data?.length ?? 0;

  if (usedAttempts >= 3) {
    return {
      success: false,
      remainingAttempts: 0,
      message: '인증 시도 횟수 3회를 초과했습니다.',
    };
  }

  const secretResult = await client.models.VerificationSecret.get({ itemId });

  if (!secretResult.data) {
    throw new Error('이 게시글에는 아직 인증 정보가 없습니다. 새로 등록한 테스트 게시글로 확인하세요.');
  }

  const actualHash = hashAnswer(answer, secretResult.data.salt);
  const success = safeEqualHex(secretResult.data.answerHash, actualHash);

  await client.models.VerificationAttempt.create({
    itemId,
    userId,
    success,
    attemptedAt: new Date().toISOString(),
  });

  const remainingAttempts = Math.max(0, 3 - usedAttempts - 1);

  return {
    success,
    remainingAttempts,
    message: success
      ? '인증에 성공했습니다.'
      : '답변이 일치하지 않습니다. 남은 시도: ' + remainingAttempts + '회',
  };
};