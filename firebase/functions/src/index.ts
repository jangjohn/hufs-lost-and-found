import * as admin from 'firebase-admin';

admin.initializeApp();

// Triggers
export { onItemCreated } from './triggers/onItemCreated';

// Notification
export { notifyOnNewItem, notifyOnMatch } from './notification/notifyUsers';

// Cleanup
export { cleanupExpired } from './cleanup/expireItems';

// Verification
export { verifyAnswer } from './verify/checkAnswer';

// Matching (팀원 B 담당) — 구현 완료 후 아래 주석 해제
export { matchItem } from './matching/matchItem';

// Vision (팀원 B 담당) — 구현 완료 후 아래 주석 해제
export { analyzeImage } from './vision/analyzeImage';
