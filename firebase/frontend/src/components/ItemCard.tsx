import { Link } from 'react-router-dom';
import type { Item } from '../lib/types';
import { CATEGORIES } from '../lib/types';

interface Props {
  item: Item;
}

export default function ItemCard({ item }: Props) {
  const categoryLabel = CATEGORIES.find((c) => c.value === item.category)?.label ?? item.category;
  const dateStr = item.lostDate?.toDate().toLocaleDateString('ko-KR') ?? '';

  return (
    <Link
      to={`/item/${item.id}`}
      className="block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
    >
      {item.imageUrls.length > 0 && (
        <div className="h-40 bg-gray-100">
          <img
            src={item.imageUrls[0]}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="p-3">
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              item.type === 'lost'
                ? 'bg-red-100 text-red-700'
                : 'bg-green-100 text-green-700'
            }`}
          >
            {item.type === 'lost' ? '분실' : '습득'}
          </span>
          <span className="text-xs text-gray-500">{categoryLabel}</span>
        </div>
        <h3 className="font-medium text-gray-900 text-sm truncate">{item.title}</h3>
        <p className="text-xs text-gray-500 mt-1">
          {item.location} · {dateStr}
        </p>
      </div>
    </Link>
  );
}
