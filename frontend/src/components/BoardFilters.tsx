import type { ItemCategory, ItemType, SearchMode } from '../lib/types';

interface BoardFiltersProps {
  type: ItemType | '';
  category: ItemCategory | '';
  location: string;
  keyword: string;
  searchMode: SearchMode;
  startDate: string;
  endDate: string;
  showDateFilter: boolean;
  showSearchMode: boolean;
  isInvalidDateRange: boolean;
  onTypeChange: (value: ItemType | '') => void;
  onCategoryChange: (value: ItemCategory | '') => void;
  onLocationChange: (value: string) => void;
  onKeywordChange: (value: string) => void;
  onSearchModeChange: (value: SearchMode) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onToggleDateFilter: () => void;
  onToggleSearchMode: () => void;
  onResetDateFilter: () => void;
}

const categories: { value: ItemCategory; label: string }[] = [
  { value: 'wallet', label: '지갑' },
  { value: 'phone', label: '휴대폰' },
  { value: 'card', label: '카드' },
  { value: 'key', label: '열쇠' },
  { value: 'bag', label: '가방' },
  { value: 'book', label: '책' },
  { value: 'electronics', label: '전자기기' },
  { value: 'clothing', label: '의류' },
  { value: 'other', label: '기타' },
];

const locations = [
  '학생식당',
  '도서관',
  '공학관',
  '인문관',
  '교학관A',
  '교학관B',
  '강의동',
  '운동장',
  '기숙사',
];

function getDateLabel(startDate: string, endDate: string) {
  if (startDate && endDate) return `${startDate} ~ ${endDate}`;
  if (startDate) return `${startDate}부터`;
  if (endDate) return `${endDate}까지`;
  return '전체 날짜';
}

function getSearchModeLabel(searchMode: SearchMode) {
  if (searchMode === 'title') return '제목으로 찾기';
  if (searchMode === 'description') return '설명으로 찾기';
  return '제목+설명으로 찾기';
}

export default function BoardFilters({
  type,
  category,
  location,
  keyword,
  searchMode,
  startDate,
  endDate,
  showDateFilter,
  showSearchMode,
  isInvalidDateRange,
  onTypeChange,
  onCategoryChange,
  onLocationChange,
  onKeywordChange,
  onSearchModeChange,
  onStartDateChange,
  onEndDateChange,
  onToggleDateFilter,
  onToggleSearchMode,
  onResetDateFilter,
}: BoardFiltersProps) {
  const dateLabel = getDateLabel(startDate, endDate);
  const searchModeLabel = getSearchModeLabel(searchMode);

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <select
            value={type}
            onChange={(e) => onTypeChange(e.target.value as ItemType | '')}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
          >
            <option value="">전체 유형</option>
            <option value="lost">분실</option>
            <option value="found">습득</option>
          </select>

          <select
            value={category}
            onChange={(e) => onCategoryChange(e.target.value as ItemCategory | '')}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
          >
            <option value="">전체 분류</option>
            {categories.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <select
            value={location}
            onChange={(e) => onLocationChange(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
          >
            <option value="">전체 장소</option>
            {locations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onToggleDateFilter}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white whitespace-nowrap"
          >
            {dateLabel}
          </button>
        </div>

        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            placeholder="검색어를 입력하세요"
            className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white min-w-[220px]"
          />

          <button
            type="button"
            onClick={onToggleSearchMode}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white whitespace-nowrap"
          >
            {searchModeLabel}
          </button>
        </div>
      </div>

      {showDateFilter && (
        <div className="mt-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col">
              <label className="text-sm text-gray-700 mb-1">부터</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => onStartDateChange(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-sm text-gray-700 mb-1">까지</label>
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => onEndDateChange(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
              />
            </div>

            <button
              type="button"
              onClick={onResetDateFilter}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
            >
              날짜 초기화
            </button>
          </div>

          {isInvalidDateRange && (
            <p className="mt-2 text-sm text-red-600">
              시작 날짜는 종료 날짜보다 늦을 수 없습니다.
            </p>
          )}
        </div>
      )}

      {showSearchMode && (
        <div className="mt-4 flex flex-wrap gap-3">
          <div className="flex flex-col">
            <label className="text-sm text-gray-700 mb-1">검색 기준</label>
            <select
              value={searchMode}
              onChange={(e) => onSearchModeChange(e.target.value as SearchMode)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
            >
              <option value="title">제목으로 찾기</option>
              <option value="description">설명으로 찾기</option>
              <option value="both">제목+설명으로 찾기</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}