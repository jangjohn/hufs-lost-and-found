import type { Timestamp } from 'firebase/firestore';

export type ItemType = 'lost' | 'found';

export type ItemCategory =
  | 'wallet'
  | 'phone'
  | 'card'
  | 'key'
  | 'bag'
  | 'book'
  | 'electronics'
  | 'clothing'
  | 'other';

export type SearchMode = 'title' | 'description' | 'both';

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface Item {
  id: string;
  type: ItemType;
  status: 'active' | 'matched' | 'resolved' | 'expired';
  category: ItemCategory;
  title: string;
  description: string;
  location: string;
  lostDate: Timestamp;
  imageUrls: string[];
  visionLabels?: string[];
  embeddingId?: string;
  verificationQ: string;
  verificationAHash?: string;
  userId: string;
  userName: string;
  createdAt?: Timestamp;
  expiresAt?: Timestamp;
}

export interface Match {
  id: string;
  lostItemId: string;
  foundItemId: string;
  similarityScore: number;
  status: 'pending' | 'verified' | 'rejected';
  createdAt?: Timestamp;
}

export interface Subscription {
  category: string;
  location: string | 'all';
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  fcmTokens: string[];
  subscriptions: Subscription[];
  createdAt?: Timestamp;
}

export const CATEGORIES: { value: ItemCategory; label: string }[] = [
  { value: 'wallet', label: '지갑' },
  { value: 'phone', label: '휴대폰' },
  { value: 'card', label: '카드' },
  { value: 'key', label: '열쇠' },
  { value: 'bag', label: '가방' },
  { value: 'book', label: '도서' },
  { value: 'electronics', label: '전자기기' },
  { value: 'clothing', label: '의류' },
  { value: 'other', label: '기타' },
];

export const LOCATIONS: string[] = [
  '학생식당',
  '도서관',
  '교학관A',
  '교학관B',
  '공학관',
  '인문관',
  '사회과학관',
  '자연과학관',
  '체육관',
  '학생회관',
  '기숙사A',
  '기숙사B',
  '정문',
  '후문',
];