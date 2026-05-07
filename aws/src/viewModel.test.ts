import { describe, expect, it } from 'vitest';
import { buildDashboardStats, buildMatchCandidates, filterItemsForBoard, getCategoryLabel } from './viewModel';
import type { BoardItem } from './viewModel';

const items: BoardItem[] = [
  {
    id: 'lost-wallet',
    type: 'lost',
    status: 'active',
    category: 'wallet',
    title: 'Black wallet',
    description: 'Black leather wallet with student ID',
    location: 'Library 3F',
    lostDate: '2026-05-07',
    imageKeys: ['wallet.jpg'],
    imageUrls: [],
    verificationQ: 'What color is the ID card sleeve?',
    ownerName: 'student@hufs.ac.kr',
    createdAt: '2026-05-07T09:00:00.000Z',
  },
  {
    id: 'found-wallet',
    type: 'found',
    status: 'active',
    category: 'wallet',
    title: 'Wallet found near library',
    description: 'A wallet was found after lunch',
    location: 'Library 1F',
    lostDate: '2026-05-07',
    imageKeys: [],
    imageUrls: [],
    verificationQ: 'What is inside?',
    ownerName: 'staff@hufs.ac.kr',
    createdAt: '2026-05-07T10:00:00.000Z',
  },
  {
    id: 'found-key',
    type: 'found',
    status: 'matched',
    category: 'key',
    title: 'Key ring',
    description: 'Small key ring with two keys',
    location: 'Student Center',
    lostDate: '2026-05-06',
    imageKeys: [],
    imageUrls: [],
    verificationQ: 'How many keys?',
    ownerName: 'staff@hufs.ac.kr',
    createdAt: '2026-05-06T10:00:00.000Z',
  },
];

describe('board view model', () => {
  it('summarizes active board counts for the dashboard', () => {
    expect(buildDashboardStats(items)).toEqual({
      active: 2,
      lost: 1,
      found: 2,
      withPhotos: 1,
    });
  });

  it('filters board items by type, category, and query text', () => {
    const filtered = filterItemsForBoard(items, {
      type: 'found',
      category: 'wallet',
      query: 'library',
    });

    expect(filtered.map((item) => item.id)).toEqual(['found-wallet']);
  });

  it('builds match candidates with user-facing reasons', () => {
    const matches = buildMatchCandidates(items);

    expect(matches).toEqual([
      {
        id: 'lost-wallet-found-wallet',
        lostTitle: 'Black wallet',
        foundTitle: 'Wallet found near library',
        similarityScore: 0.91,
        reasons: ['분류 일치', '장소 유사', '날짜 일치'],
        status: 'pending',
      },
    ]);
  });

  it('returns Korean labels for item categories', () => {
    expect(getCategoryLabel('electronics')).toBe('전자기기');
    expect(getCategoryLabel('other')).toBe('기타');
  });
});
