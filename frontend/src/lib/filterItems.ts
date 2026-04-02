import type { Item, SearchMode } from './types';

function toDate(value: unknown): Date | null {
  if (!value) return null;

  if (value instanceof Date) return value;

  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate?: unknown }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate();
  }

  const parsed = new Date(value as string | number | Date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export interface FilterItemsParams {
  keyword: string;
  searchMode: SearchMode;
  startDate: string;
  endDate: string;
}

export function filterItems(items: Item[], params: FilterItemsParams): Item[] {
  const { keyword, searchMode, startDate, endDate } = params;

  const q = keyword.trim().toLowerCase();
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  if (end) {
    end.setHours(23, 59, 59, 999);
  }

  return items.filter((item) => {
    const title = normalizeText(item.title);
    const description = normalizeText(item.description);

    const matchesKeyword =
      !q ||
      (searchMode === 'title' && title.includes(q)) ||
      (searchMode === 'description' && description.includes(q)) ||
      (searchMode === 'both' && (title.includes(q) || description.includes(q)));

    const itemDate = toDate(item.lostDate);
    const matchesDate =
      (!start || (itemDate !== null && itemDate >= start)) &&
      (!end || (itemDate !== null && itemDate <= end));

    return matchesKeyword && matchesDate;
  });
}