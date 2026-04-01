import type { ItemType, ItemCategory } from '../lib/types';
import { CATEGORIES, LOCATIONS } from '../lib/types';

interface Props {
  type: ItemType | '';
  category: ItemCategory | '';
  location: string;
  onTypeChange: (v: ItemType | '') => void;
  onCategoryChange: (v: ItemCategory | '') => void;
  onLocationChange: (v: string) => void;
}

export default function FilterBar({
  type,
  category,
  location,
  onTypeChange,
  onCategoryChange,
  onLocationChange,
}: Props) {
  return (
    <div className="flex flex-wrap gap-3 mb-4">
      <select
        value={type}
        onChange={(e) => onTypeChange(e.target.value as ItemType | '')}
        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white"
      >
        <option value="">전체 유형</option>
        <option value="lost">분실</option>
        <option value="found">습득</option>
      </select>

      <select
        value={category}
        onChange={(e) => onCategoryChange(e.target.value as ItemCategory | '')}
        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white"
      >
        <option value="">전체 분류</option>
        {CATEGORIES.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>

      <select
        value={location}
        onChange={(e) => onLocationChange(e.target.value)}
        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white"
      >
        <option value="">전체 장소</option>
        {LOCATIONS.map((loc) => (
          <option key={loc} value={loc}>
            {loc}
          </option>
        ))}
      </select>
    </div>
  );
}
