import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ItemCategory, ItemType, SearchMode } from '../lib/types';
import { useAuth } from '../hooks/useAuth';
import { useItems } from '../hooks/useFirestore';
import { filterItems } from '../lib/filterItems';
import BoardFilters from '../components/BoardFilters';
import ItemCard from '../components/ItemCard';

export default function Home() {
  const { user, loading: authLoading } = useAuth();

  const [type, setType] = useState<ItemType | ''>('');
  const [category, setCategory] = useState<ItemCategory | ''>('');
  const [location, setLocation] = useState('');

  const [keyword, setKeyword] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('title');

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [showDateFilter, setShowDateFilter] = useState(false);
  const [showSearchMode, setShowSearchMode] = useState(false);

  const { items, loading } = useItems({
    type: type || undefined,
    category: category || undefined,
    location: location || undefined,
  });

  const isInvalidDateRange = Boolean(startDate && endDate && startDate > endDate);

  const searchedItems = useMemo(() => {
    if (isInvalidDateRange) {
      return [];
    }

    return filterItems(items, {
      keyword,
      searchMode,
      startDate,
      endDate,
    });
  }, [items, keyword, searchMode, startDate, endDate, isInvalidDateRange]);

  const handleToggleDateFilter = () => {
    setShowDateFilter((prev) => !prev);
  };

  const handleToggleSearchMode = () => {
    setShowSearchMode((prev) => !prev);
  };

  const handleResetDateFilter = () => {
    setStartDate('');
    setEndDate('');
  };

  if (authLoading) {
    return <p className="text-gray-500 text-sm p-4">로딩 중...</p>;
  }

  if (!user) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">분실물 게시판</h1>
        <p className="text-gray-600 mb-6">게시판을 이용하려면 로그인이 필요합니다.</p>
        <Link
          to="/login"
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          로그인하기
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">분실물 게시판</h1>

      <BoardFilters
        type={type}
        category={category}
        location={location}
        keyword={keyword}
        searchMode={searchMode}
        startDate={startDate}
        endDate={endDate}
        showDateFilter={showDateFilter}
        showSearchMode={showSearchMode}
        isInvalidDateRange={isInvalidDateRange}
        onTypeChange={setType}
        onCategoryChange={setCategory}
        onLocationChange={setLocation}
        onKeywordChange={setKeyword}
        onSearchModeChange={setSearchMode}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onToggleDateFilter={handleToggleDateFilter}
        onToggleSearchMode={handleToggleSearchMode}
        onResetDateFilter={handleResetDateFilter}
      />
      
      {loading ? (
        <p className="text-gray-500 text-sm">로딩 중...</p>
      ) : isInvalidDateRange ? null : searchedItems.length === 0 ? (
        <p className="text-gray-500 text-sm">조건에 맞는 게시글이 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {searchedItems.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}