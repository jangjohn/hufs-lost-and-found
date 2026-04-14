import { Link } from 'react-router-dom';
import type { Item, Match } from '../lib/types';

interface Props {
  match: Match;
  lostItem?: Item;
  foundItem?: Item;
}

function statusClass(status: Match['status']) {
  if (status === 'verified') return 'bg-emerald-50 text-emerald-700';
  if (status === 'rejected') return 'bg-rose-50 text-rose-700';
  return 'bg-amber-50 text-amber-700';
}

export default function MatchCard({ match, lostItem, foundItem }: Props) {
  const scorePercent = Math.round(match.similarityScore * 100);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClass(match.status)}`}>
            {match.status}
          </span>
          <h2 className="mt-3 text-lg font-semibold text-slate-900">Potential owner match</h2>
          <p className="mt-1 text-sm text-slate-500">Compare both posts and verify the claimant before resolving the item.</p>
        </div>
        <div className="min-w-[140px]">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Similarity</span>
            <span>{scorePercent}%</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-sky-500 to-cyan-400"
              style={{ width: `${scorePercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-600">Lost post</p>
          {lostItem ? (
            <>
              <Link to={`/item/${lostItem.id}`} className="mt-2 block text-sm font-semibold text-slate-900 hover:text-sky-700">
                {lostItem.title}
              </Link>
              <p className="mt-1 text-sm text-slate-500">{lostItem.location}</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-400">Loading linked item...</p>
          )}
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Found post</p>
          {foundItem ? (
            <>
              <Link to={`/item/${foundItem.id}`} className="mt-2 block text-sm font-semibold text-slate-900 hover:text-sky-700">
                {foundItem.title}
              </Link>
              <p className="mt-1 text-sm text-slate-500">{foundItem.location}</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-400">Loading linked item...</p>
          )}
        </div>
      </div>
    </div>
  );
}
