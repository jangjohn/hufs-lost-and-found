import { useEffect, useState } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import MatchCard from '../components/MatchCard';
import { useAuth } from '../hooks/useAuth';
import { getItem, getMatchesForUser } from '../hooks/useFirestore';
import type { Item, Match } from '../lib/types';

function EmptyMatchesState() {
  return (
    <div className="flex flex-col items-center rounded-[2rem] border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm">
      <div className="mb-5 rounded-full bg-amber-100 px-5 py-4 text-2xl">↔</div>
      <h2 className="text-lg font-semibold text-slate-900">No matches yet</h2>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        When the matching service finds related lost and found posts, they will appear here with a similarity score for quick review.
      </p>
    </div>
  );
}

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

      const ids = new Set<string>();
      data.forEach((match) => {
        ids.add(match.lostItemId);
        ids.add(match.foundItemId);
      });

      const nextMap: Record<string, Item> = {};
      await Promise.all(
        Array.from(ids).map(async (itemId) => {
          const item = await getItem(itemId);
          if (item) nextMap[itemId] = item;
        })
      );

      setItemsMap(nextMap);
      setLoading(false);
    })();
  }, [user]);

  if (loading) {
    return <LoadingSpinner label="Loading matches" fullScreen />;
  }

  return (
    <section className="space-y-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
              Match review
            </span>
            <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">Potential matches</h1>
            <p className="mt-2 text-sm text-slate-500">
              Review AI-generated connections between your lost and found posts and contact the claimant after verifying ownership.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <strong className="font-semibold text-slate-900">{matches.length}</strong> total matches
          </div>
        </div>
      </div>

      {matches.length === 0 ? (
        <EmptyMatchesState />
      ) : (
        <div className="space-y-4">
          {matches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              lostItem={itemsMap[match.lostItemId]}
              foundItem={itemsMap[match.foundItemId]}
            />
          ))}
        </div>
      )}
    </section>
  );
}
