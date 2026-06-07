import { describe, expect, test } from 'vitest';
import {
  MAX_ATTEMPTS,
  attemptsLeft,
  createSalt,
  hashAnswer,
  isAnswerCorrect,
  isLocked,
  normalizeAnswer,
} from './verify-core';

describe('verify-core normalization & salted hashing', () => {
  const salt = 'fixed-test-salt';

  test('normalizeAnswer trims and lowercases', () => {
    expect(normalizeAnswer('  Hello World  ')).toBe('hello world');
    expect(normalizeAnswer('ABC')).toBe('abc');
  });

  test('hashAnswer is deterministic & case/space insensitive for same salt', () => {
    const base = hashAnswer('Black Wallet', salt);
    expect(hashAnswer('  black wallet  ', salt)).toBe(base);
    expect(hashAnswer('BLACK WALLET', salt)).toBe(base);
    expect(base).toMatch(/^[0-9a-f]{64}$/);
  });

  test('different salt → different hash for same answer (salt actually used)', () => {
    expect(hashAnswer('answer', 'salt-a')).not.toBe(hashAnswer('answer', 'salt-b'));
  });

  test('different answers → different hashes (same salt)', () => {
    expect(hashAnswer('answer-a', salt)).not.toBe(hashAnswer('answer-b', salt));
  });

  test('createSalt returns distinct hex salts', () => {
    const a = createSalt();
    const b = createSalt();
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(a).not.toBe(b);
  });
});

describe('verify-core comparison (timingSafeEqual, salted)', () => {
  const salt = createSalt();
  const stored = hashAnswer('학생증', salt);

  test('correct answer + correct salt passes', () => {
    expect(isAnswerCorrect(stored, '학생증', salt)).toBe(true);
  });

  test('case / whitespace variations normalize and pass', () => {
    const s = createSalt();
    expect(isAnswerCorrect(hashAnswer('My Card', s), '  my card ', s)).toBe(true);
  });

  test('wrong answer is rejected', () => {
    expect(isAnswerCorrect(stored, '지갑', salt)).toBe(false);
  });

  test('correct answer but wrong salt is rejected', () => {
    expect(isAnswerCorrect(stored, '학생증', createSalt())).toBe(false);
  });

  test('empty / missing stored hash or salt is rejected', () => {
    expect(isAnswerCorrect('', '학생증', salt)).toBe(false);
    expect(isAnswerCorrect(null, '학생증', salt)).toBe(false);
    expect(isAnswerCorrect(undefined, '학생증', salt)).toBe(false);
    expect(isAnswerCorrect(stored, '학생증', '')).toBe(false);
  });

  test('malformed stored hash is rejected, not thrown', () => {
    expect(isAnswerCorrect('not-hex-zz', '학생증', salt)).toBe(false);
  });
});

describe('verify-core attempt limiting (max 3)', () => {
  test('locks at or beyond MAX_ATTEMPTS', () => {
    expect(MAX_ATTEMPTS).toBe(3);
    expect(isLocked(0)).toBe(false);
    expect(isLocked(2)).toBe(false);
    expect(isLocked(3)).toBe(true);
    expect(isLocked(4)).toBe(true);
  });

  test('attemptsLeft never goes negative', () => {
    expect(attemptsLeft(0)).toBe(3);
    expect(attemptsLeft(1)).toBe(2);
    expect(attemptsLeft(3)).toBe(0);
    expect(attemptsLeft(5)).toBe(0);
  });
});
