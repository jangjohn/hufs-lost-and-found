import { Link } from 'react-router-dom';
import type { Match, Item } from '../lib/types';

interface Props {
  match: Match;
  lostItem?: Item;
  foundItem?: Item;
}

export default function MatchCard({ match, lostItem, foundItem }: Props) {
  const scorePercent = Math.round(match.similarityScore * 100);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            match.status === 'verified'
              ? 'bg-green-100 text-green-700'
              : match.status === 'rejected'
                ? 'bg-red-100 text-red-700'
                : 'bg-yellow-100 text-yellow-700'
          }`}
        >
          {match.status === 'verified' ? '확인됨' : match.status === 'rejected' ? '거절됨' : '대기중'}
        </span>
        <span className="text-sm font-medium text-blue-600">유사도 {scorePercent}%</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="text-sm">
          <p className="text-xs text-red-500 font-medium mb-1">분실물</p>
          {lostItem ? (
            <Link to={`/item/${lostItem.id}`} className="text-gray-900 hover:underline">
              {lostItem.title}
            </Link>
          ) : (
            <span className="text-gray-400">로딩중...</span>
          )}
        </div>
        <div className="text-sm">
          <p className="text-xs text-green-600 font-medium mb-1">습득물</p>
          {foundItem ? (
            <Link to={`/item/${foundItem.id}`} className="text-gray-900 hover:underline">
              {foundItem.title}
            </Link>
          ) : (
            <span className="text-gray-400">로딩중...</span>
          )}
        </div>
      </div>
    </div>
  );
}
