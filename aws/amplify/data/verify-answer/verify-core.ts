/**
 * 본인 확인 답변의 순수 로직(사이드이펙트 없음) — 加盐 방식.
 *
 * - 해시: sha256( `${salt}:${answer.trim().toLowerCase()}` ) 를 hex 로 저장/비교.
 *   발행(setVerificationAnswer)과 검증(verifyAnswer)이 같은 salt 로 같은 식을 쓴다.
 * - 비교는 timingSafeEqual(타이밍 공격 방지, === 금지).
 * - 시도 제한은 (item, user) 당 최대 3회.
 *
 * handler.ts 가 이 모듈을 import 해서 동일 로직을 사용한다(단일 진실원). vitest 로 단위 테스트한다.
 */
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const MAX_ATTEMPTS = 3;

export const MESSAGES = {
  needLogin: '로그인이 필요합니다.',
  empty: '답변을 입력하세요.',
  notFound: '게시글을 찾을 수 없습니다.',
  notOwner: '본인 게시글만 설정할 수 있습니다.',
  unconfigured: '이 게시글에는 아직 인증 정보가 없습니다.',
  locked: '인증 시도 횟수(3회)를 초과했습니다.',
  saved: '본인 확인 정답이 저장되었습니다.',
  success: '인증에 성공했습니다.',
} as const;

/** 답변 정규화: 앞뒤 공백 제거 + 소문자. 발행/검증 양쪽이 반드시 동일하게 사용. */
export function normalizeAnswer(answer: string): string {
  return answer.trim().toLowerCase();
}

/** 새 salt(hex). 게시글마다 1개 생성해 VerificationSecret 에 저장. */
export function createSalt(): string {
  return randomBytes(16).toString('hex');
}

/** salt + 정규화 답변의 sha256 hex 다이제스트. 저장용. */
export function hashAnswer(answer: string, salt: string): string {
  return createHash('sha256').update(`${salt}:${normalizeAnswer(answer)}`).digest('hex');
}

/** 저장된 hex 해시와 (answer, salt)를 timingSafeEqual 로 비교. */
export function isAnswerCorrect(
  storedHashHex: string | null | undefined,
  answer: string,
  salt: string | null | undefined,
): boolean {
  if (!storedHashHex || !salt) return false;

  let expected: Buffer;
  try {
    expected = Buffer.from(storedHashHex, 'hex');
  } catch {
    return false;
  }

  const actual = createHash('sha256').update(`${salt}:${normalizeAnswer(answer)}`).digest();
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** 이미 누적된 시도 횟수로 잠금 여부 판단. */
export function isLocked(priorAttemptCount: number): boolean {
  return priorAttemptCount >= MAX_ATTEMPTS;
}

/** 남은 시도 횟수(0 미만으로 내려가지 않음). */
export function attemptsLeft(usedAttemptCount: number): number {
  return Math.max(0, MAX_ATTEMPTS - usedAttemptCount);
}

/** 실패 메시지(남은 횟수 포함). */
export function failMessage(remaining: number): string {
  return `답변이 일치하지 않습니다. 남은 시도: ${remaining}회`;
}
