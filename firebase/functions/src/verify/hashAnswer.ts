import { createHash } from 'node:crypto';

export function hashVerificationAnswer(answer: string): string {
  return createHash('sha256').update(answer.trim().toLowerCase()).digest('hex');
}
