import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import BoardFilters from '../components/BoardFilters';
import ItemCard from '../components/ItemCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';
import { useItems } from '../hooks/useFirestore';
import { filterItems } from '../lib/filterItems';
import type { ItemCategory, ItemType, SearchMode } from '../lib/types';

const locale = 'ko' as const;

const text = {
  ko: {
    emptyTitle: '아직 등록된 게시글이 없습니다',
    emptyDescription: '분실물이나 습득물이 등록되면 이곳에 표시됩니다. 검색 조건을 넓히거나 첫 게시글을 작성해보세요.',
    guestBadge: '교내 분실물 게시판',
    guestTitle: '잃어버린 물건을 다시 찾을 수 있도록 도와주세요.',
    guestDescription: '학교 계정으로 로그인하면 분실물과 습득물을 등록하고, 매칭 결과를 확인하고, 관련 알림을 받을 수 있습니다.',
    guestAction: '로그인하고 글쓰기',
    guestHint: '학교 이메일 계정 필요',
    guestHowTo: '이용 방법',
    guestStep1: '1. 사진과 특징을 함께 등록합니다.',
    guestStep2: '2. AI가 유사한 게시글을 비교합니다.',
    guestStep3: '3. 본인 확인 질문으로 실제 주인을 확인합니다.',
    liveBoard: '실시간 게시판',
    boardTitle: '분실물 / 습득물 게시판',
    boardDescription: '유형, 분류, 장소, 날짜로 검색하세요',
    postsCount: '개의 게시글',
    preparing: '게시판을 준비하는 중...',
    loadingItems: '게시글을 불러오는 중...',
  },
  en: {
    emptyTitle: 'No posts yet',
    emptyDescription: 'When students add lost or found items, they will appear here. Try broadening the filters or create the first post for your campus area.',
    guestBadge: 'Campus recovery board',
    guestTitle: 'Help lost items find their way back.',
    guestDescription: 'Sign in with your university account to post lost or found items, track possible matches, and receive notifications when something relevant appears.',
    guestAction: 'Sign in to post',
    guestHint: 'University email required',
    guestHowTo: 'How it works',
    guestStep1: '1. Post a lost or found item with photos and key details.',
    guestStep2: '2. AI matching compares similar reports in the background.',
    guestStep3: '3. Verify the owner through a custom question before handing the item over.',
    liveBoard: 'Live board',
    boardTitle: 'Lost and found listings',
    boardDescription: 'Filter by type, category, location, and date range to find the most relevant post quickly.',
    postsCount: 'active posts in view',
    preparing: 'Preparing the board',
    loadingItems: 'Loading items',
  },
};

function EmptyBoardState() {
  const t = text[locale];

  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm">
      <div className="relative mb-6 h-24 w-24 rounded-full bg-sky-100">
        <div className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-2xl border-2 border-sky-400 bg-white" />
        <div className="absolute right-5 top-6 h-3 w-3 rounded-full bg-amber-400" />
      </div>
      <h2 className="text-lg font-semibold text-slate-900">{t.emptyTitle}</h2>
      <p className="mt-2 max-w-md text-sm text-slate-500">{t.emptyDescription}</p>
    </div>
  );
}

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const t = text[locale];

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
    if (isInvalidDateRange) return [];

    return filterItems(items, {
      keyword,
      searchMode,
      startDate,
      endDate,
    });
  }, [endDate, isInvalidDateRange, items, keyword, searchMode, startDate]);

  if (authLoading) {
    return <LoadingSpinner label={t.preparing} fullScreen />;
  }

  if (!user) {
    return (
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
          <div>
            <span className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
              {t.guestBadge}
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              {t.guestTitle}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              {t.guestDescription}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                {t.guestAction}
              </Link>
              <span className="inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-3 text-sm font-medium text-slate-500">
                {t.guestHint}
              </span>
            </div>
          </div>

          <div className="rounded-3xl bg-[linear-gradient(145deg,_#0f172a,_#0ea5e9)] p-6 text-white shadow-lg">
            <p className="text-sm font-semibold text-sky-100">{t.guestHowTo}</p>
            <ul className="mt-4 space-y-3 text-sm text-slate-100">
              <li>{t.guestStep1}</li>
              <li>{t.guestStep2}</li>
              <li>{t.guestStep3}</li>
            </ul>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              {t.liveBoard}
            </span>
            <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">{t.boardTitle}</h1>
            <p className="mt-2 text-sm text-slate-500">{t.boardDescription}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <strong className="font-semibold text-slate-900">{searchedItems.length}</strong> {t.postsCount}
          </div>
        </div>

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
          onToggleDateFilter={() => setShowDateFilter((prev) => !prev)}
          onToggleSearchMode={() => setShowSearchMode((prev) => !prev)}
          onResetDateFilter={() => {
            setStartDate('');
            setEndDate('');
          }}
        />
      </div>

      {loading ? (
        <LoadingSpinner label={t.loadingItems} />
      ) : isInvalidDateRange ? null : searchedItems.length === 0 ? (
        <EmptyBoardState />
      ) : (
        <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-3">
          {searchedItems.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
