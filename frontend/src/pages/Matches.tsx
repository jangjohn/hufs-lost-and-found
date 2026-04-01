import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getMatchesForUser, getItem } from '../hooks/useFirestore';
import MatchCard from '../components/MatchCard';
import type { Match, Item } from '../lib/types';

export default function Matches() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [itemsMap, setItemsMap] = useState<Record<string, Item>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const data = (await getMatchesForUser(user.uid)) as Match[];
      setMatches(data);

      // 관련 아이템 로드
      const ids = new Set<string>();
      data.forEach((m) => {
        ids.add(m.lostItemId);
        ids.add(m.foundItemId);
      });

      const map: Record<string, Item> = {};
      await Promise.all(
        Array.from(ids).map(async (id) => {
          const item = await getItem(id);
          if (item) map[id] = item;
        })
      );
      setItemsMap(map);
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <p className="text-gray-500 text-sm">로딩 중...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">내 매칭</h1>

      {matches.length === 0 ? (
        <p className="text-gray-500 text-sm">매칭된 결과가 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {matches.map((m) => (
            <MatchCard
              key={m.id}
              match={m}
              lostItem={itemsMap[m.lostItemId]}
              foundItem={itemsMap[m.foundItemId]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
