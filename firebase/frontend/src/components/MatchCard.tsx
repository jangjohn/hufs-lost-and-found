import { Link } from 'react-router-dom';
import type { Item, Match } from '../lib/types';

const locale = 'ko' as const;

const text = {
  ko: {
    title: '예상 매칭 결과',
    description: '두 게시글을 비교한 뒤 본인 확인 절차를 통해 실제 소유자인지 확인하세요.',
    similarity: '유사도',
    lostPost: '분실 게시글',
    foundPost: '습득 게시글',
    loadingLinkedItem: '연결된 게시글을 불러오는 중...',
    verified: '인증 완료',
    rejected: '거절됨',
    pending: '검토 중',
  },
  en: {
    title: 'Potential owner match',
    description: 'Compare both posts and verify the claimant before resolving the item.',
    similarity: 'Similarity',
    lostPost: 'Lost post',
    foundPost: 'Found post',
    loadingLinkedItem: 'Loading linked item...',
    verified: 'verified',
    rejected: 'rejected',
    pending: 'pending',
  },
};

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
  const t = text[locale];
  const statusLabel =
    match.status === 'verified' ? t.verified : match.status === 'rejected' ? t.rejected : t.pending;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClass(match.status)}`}>
            {statusLabel}
          </span>
          <h2 className="mt-3 text-lg font-semibold text-slate-900">{t.title}</h2>
          <p className="mt-1 text-sm text-slate-500">{t.description}</p>
        </div>
        <div className="min-w-[140px]">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>{t.similarity}</span>
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
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-600">{t.lostPost}</p>
          {lostItem ? (
            <>
              <Link to={`/item/${lostItem.id}`} className="mt-2 block text-sm font-semibold text-slate-900 hover:text-sky-700">
                {lostItem.title}
              </Link>
              <p className="mt-1 text-sm text-slate-500">{lostItem.location}</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-400">{t.loadingLinkedItem}</p>
          )}
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">{t.foundPost}</p>
          {foundItem ? (
            <>
              <Link to={`/item/${foundItem.id}`} className="mt-2 block text-sm font-semibold text-slate-900 hover:text-sky-700">
                {foundItem.title}
              </Link>
              <p className="mt-1 text-sm text-slate-500">{foundItem.location}</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-400">{t.loadingLinkedItem}</p>
          )}
        </div>
      </div>
    </div>
  );
}
