/**
 * verifyAnswer / setVerificationAnswer custom mutation 핸들러 (加盐 + VerificationSecret).
 *
 * 보안 요점:
 *  - 해시·답변 평문은 절대 클라이언트로 반환하지 않는다(응답은 success/remainingAttempts/message).
 *  - 발행: setVerificationAnswer 가 서버에서 salt 생성 + sha256(salt:answer) → VerificationSecret 저장(owner 검증).
 *  - 검증: verifyAnswer 가 VerificationSecret 을 IAM(allow.resource)으로 읽어 timingSafeEqual 비교.
 *  - 시도는 (item, user) 당 3회 제한.
 *  - 순수 로직(해시/정규화/제한)은 verify-core.ts 와 공유(단일 진실원 + 단위 테스트).
 */
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import type { Schema } from '../resource';
import {
  MAX_ATTEMPTS,
  MESSAGES,
  attemptsLeft,
  createSalt,
  failMessage,
  hashAnswer,
  isAnswerCorrect,
  isLocked,
} from './verify-core';

// process.env 를 직접 사용 — $amplify/env/* 가상 모듈은 esbuild 번들 시 해석 실패할 수 있어 회피.
// 런타임에 Amplify 가 AMPLIFY_DATA_* / AWS_* 키를 주입하므로 실행 시점엔 필요한 값이 모두 존재한다.
const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
  // @ts-expect-error - process.env 는 런타임에 Amplify 가 보강. 번들러 호환 위해 가상 env import 회피.
  process.env,
);

Amplify.configure(resourceConfig, libraryOptions);

const client = generateClient<Schema>();

type VerifyAnswerResult = { success: boolean; remainingAttempts: number; message: string };

function getUserId(identity: unknown): string {
  const value = identity as { sub?: string; username?: string } | undefined;
  return value?.sub ?? value?.username ?? '';
}

export const handler: Schema['verifyAnswer']['functionHandler'] = async (event) => {
  const fieldName = (event as { info?: { fieldName?: string } }).info?.fieldName;
  const { itemId, answer } = event.arguments;
  const userId = getUserId(event.identity);

  if (!userId) {
    throw new Error(MESSAGES.needLogin);
  }

  if (fieldName === 'setVerificationAnswer') {
    return setVerificationAnswer(itemId, answer, userId);
  }
  return verifyAnswer(itemId, answer, userId);
};

// 발행자(owner)만 자기 글의 정답 해시를 저장/갱신. salt 는 서버에서 생성.
async function setVerificationAnswer(itemId: string, answer: string, userId: string): Promise<VerifyAnswerResult> {
  if (!answer?.trim()) {
    return { success: false, remainingAttempts: MAX_ATTEMPTS, message: MESSAGES.empty };
  }

  const itemResult = await client.models.Item.get({ id: itemId });
  if (itemResult.errors?.length) {
    console.error(JSON.stringify({ op: 'setVerificationAnswer', itemId, stage: 'item-get', errors: itemResult.errors }));
    throw new Error(MESSAGES.notFound);
  }
  if (!itemResult.data) {
    throw new Error(MESSAGES.notFound);
  }

  // 암시적 owner 필드(형식: `${sub}::${username}`)로 본인 글인지 확인.
  const owner = (itemResult.data as { owner?: string | null }).owner ?? '';
  if (!owner.startsWith(userId)) {
    throw new Error(MESSAGES.notOwner);
  }

  const salt = createSalt();
  const answerHash = hashAnswer(answer, salt);

  // 기존 secret 조회 — 조회 자체가 실패하면(권한/일시오류) 무턱대고 create 로 넘어가지 않는다.
  const existing = await client.models.VerificationSecret.get({ itemId });
  if (existing.errors?.length) {
    console.error(JSON.stringify({ op: 'setVerificationAnswer', itemId, stage: 'secret-get', errors: existing.errors }));
    return { success: false, remainingAttempts: MAX_ATTEMPTS, message: MESSAGES.saveFailed };
  }

  // 발행/갱신. write 응답 데이터로 회독(read-back) — 별도 get 은 DynamoDB 최종 일관성으로 거짓 실패 위험이 있어 사용 안 함.
  const writeResult = existing.data
    ? await client.models.VerificationSecret.update({ itemId, answerHash, salt })
    : await client.models.VerificationSecret.create({ itemId, answerHash, salt });

  if (writeResult.errors?.length || writeResult.data?.answerHash !== answerHash) {
    console.error(
      JSON.stringify({
        op: 'setVerificationAnswer',
        itemId,
        stage: existing.data ? 'secret-update' : 'secret-create',
        errors: writeResult.errors ?? 'no-data-or-hash-mismatch',
      }),
    );
    return { success: false, remainingAttempts: MAX_ATTEMPTS, message: MESSAGES.saveFailed };
  }

  // 민감정보(해시/salt)는 로그·응답에 절대 포함하지 않음 — 성공 여부만 기록.
  console.log(JSON.stringify({ op: 'setVerificationAnswer', itemId, success: true }));
  return { success: true, remainingAttempts: MAX_ATTEMPTS, message: MESSAGES.saved };
}

// 로그인 사용자 누구나 시도 가능(본인 글 인지는 UI 가 숨김). (item,user) 당 3회 제한.
async function verifyAnswer(itemId: string, answer: string, userId: string): Promise<VerifyAnswerResult> {
  if (!answer?.trim()) {
    return { success: false, remainingAttempts: MAX_ATTEMPTS, message: MESSAGES.empty };
  }

  const itemResult = await client.models.Item.get({ id: itemId });
  if (!itemResult.data) {
    throw new Error(MESSAGES.notFound);
  }

  // (item, user) 당 누적 시도 — IAM 으로 조회(클라이언트는 VerificationAttempt 직접 접근 불가).
  const attemptsResult = await client.models.VerificationAttempt.list({
    filter: { and: [{ itemId: { eq: itemId } }, { userId: { eq: userId } }] },
    limit: 50,
  });
  const usedAttempts = attemptsResult.data?.length ?? 0;

  if (isLocked(usedAttempts)) {
    return { success: false, remainingAttempts: 0, message: MESSAGES.locked };
  }

  const secretResult = await client.models.VerificationSecret.get({ itemId });
  if (!secretResult.data) {
    return { success: false, remainingAttempts: attemptsLeft(usedAttempts), message: MESSAGES.unconfigured };
  }

  const success = isAnswerCorrect(secretResult.data.answerHash, answer, secretResult.data.salt);

  await client.models.VerificationAttempt.create({
    itemId,
    userId,
    success,
    attemptedAt: new Date().toISOString(),
  });

  const remaining = attemptsLeft(usedAttempts + 1);

  // 민감정보(답변/해시) 로그 금지 — 결과만.
  console.log(JSON.stringify({ op: 'verifyAnswer', itemId, success }));

  return {
    success,
    remainingAttempts: remaining,
    message: success ? MESSAGES.success : failMessage(remaining),
  };
}
