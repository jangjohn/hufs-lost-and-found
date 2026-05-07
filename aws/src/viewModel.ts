import type { ItemCategory, ItemStatus, ItemType } from './awsItem';

export interface BoardItem {
  id: string;
  type: ItemType;
  status: ItemStatus;
  category: ItemCategory;
  title: string;
  description: string;
  location: string;
  lostDate: string;
  imageKeys: string[];
  imageUrls: string[];
  verificationQ: string;
  ownerName: string;
  createdAt: string;
}

export interface BoardFilters {
  type: ItemType | 'all';
  category: ItemCategory | 'all';
  query: string;
}

export interface MatchCandidate {
  id: string;
  lostTitle: string;
  foundTitle: string;
  similarityScore: number;
  reasons: string[];
  status: 'pending' | 'verified' | 'rejected';
}

export const categoryLabels: Record<ItemCategory, string> = {
  wallet: '지갑',
  phone: '휴대폰',
  card: '카드',
  key: '열쇠',
  bag: '가방',
  book: '도서',
  electronics: '전자기기',
  clothing: '의류',
  other: '기타',
};

export function getCategoryLabel(category: ItemCategory) {
  return categoryLabels[category];
}

export function buildDashboardStats(items: BoardItem[]) {
  return {
    active: items.filter((item) => item.status === 'active').length,
    lost: items.filter((item) => item.type === 'lost').length,
    found: items.filter((item) => item.type === 'found').length,
    withPhotos: items.filter((item) => item.imageKeys.length > 0 || item.imageUrls.length > 0).length,
  };
}

export function filterItemsForBoard(items: BoardItem[], filters: BoardFilters) {
  const query = filters.query.trim().toLowerCase();

  return items.filter((item) => {
    const typeMatch = filters.type === 'all' || item.type === filters.type;
    const categoryMatch = filters.category === 'all' || item.category === filters.category;
    const queryTarget = `${item.title} ${item.description} ${item.location} ${getCategoryLabel(item.category)}`.toLowerCase();
    const queryMatch = !query || queryTarget.includes(query);

    return typeMatch && categoryMatch && queryMatch;
  });
}

function nearbyPlace(left: string, right: string) {
  const leftRoot = left.trim().split(/\s+/)[0]?.toLowerCase();
  const rightRoot = right.trim().split(/\s+/)[0]?.toLowerCase();

  return Boolean(leftRoot && rightRoot && (leftRoot === rightRoot || left.toLowerCase().includes(rightRoot) || right.toLowerCase().includes(leftRoot)));
}

function sameDay(left: string, right: string) {
  return Boolean(left && right && left.slice(0, 10) === right.slice(0, 10));
}

export function buildMatchCandidates(items: BoardItem[]): MatchCandidate[] {
  const lost = items.filter((item) => item.type === 'lost');
  const found = items.filter((item) => item.type === 'found');

  return lost.flatMap((lostItem) =>
    found
      .map((foundItem): MatchCandidate | null => {
        const reasons = [
          lostItem.category === foundItem.category ? '분류 일치' : '',
          nearbyPlace(lostItem.location, foundItem.location) ? '장소 유사' : '',
          sameDay(lostItem.lostDate, foundItem.lostDate) ? '날짜 일치' : '',
        ].filter(Boolean);

        if (reasons.length === 0) return null;

        return {
          id: `${lostItem.id}-${foundItem.id}`,
          lostTitle: lostItem.title,
          foundTitle: foundItem.title,
          similarityScore: Math.min(0.64 + reasons.length * 0.09, 0.91),
          reasons,
          status: 'pending' as const,
        };
      })
      .filter((match): match is MatchCandidate => Boolean(match))
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, 3),
  );
}
