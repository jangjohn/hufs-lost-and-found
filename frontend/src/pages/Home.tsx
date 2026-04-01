import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { ItemType, ItemCategory } from '../lib/types';
import { useAuth } from '../hooks/useAuth';
import { useItems } from '../hooks/useFirestore';
import FilterBar from '../components/FilterBar';
import ItemCard from '../components/ItemCard';

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const [type, setType] = useState<ItemType | ''>('');
  const [category, setCategory] = useState<ItemCategory | ''>('');
  const [location, setLocation] = useState('');

  const { items, loading } = useItems({
    type: type || undefined,
    category: category || undefined,
    location: location || undefined,
  });

  if (authLoading) {
    return <p className="text-gray-500 text-sm p-4">로딩 중...</p>;
  }

  if (!user) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">분실물 게시판</h1>
        <p className="text-gray-600 mb-6">게시판을 이용하려면 로그인이 필요합니다.</p>
        <Link to="/login" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          로그인하기
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">분실물 게시판</h1>

      <FilterBar
        type={type}
        category={category}
        location={location}
        onTypeChange={setType}
        onCategoryChange={setCategory}
        onLocationChange={setLocation}
      />

      {loading ? (
        <p className="text-gray-500 text-sm">로딩 중...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500 text-sm">등록된 게시글이 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
