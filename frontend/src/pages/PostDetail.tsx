import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';
import { getItem } from '../hooks/useFirestore';
import { db } from '../lib/firebase';
import { CATEGORIES } from '../lib/types';
import type { Item, Match } from '../lib/types';

const locale = 'ko' as const;

const text = {
  ko: {
    loading: '게시글 정보를 불러오는 중...',
    notFound: '게시글을 찾을 수 없습니다.',
    backToList: '목록으로',
    previousImage: '이전 이미지',
    nextImage: '다음 이미지',
    goToImage: '이미지로 이동',
    noPhoto: '등록된 사진이 없습니다.',
    lostItem: '분실물',
    foundItem: '습득물',
    location: '장소',
    date: '날짜',
    postedBy: '작성자',
    verifyOwnership: '본인 확인하기',
    relatedMatches: '관련 매칭 결과',
    relatedMatchesDescription: '이 게시글과 연결된 다른 분실물/습득물 게시글입니다.',
    candidate: '건',
    similarity: '유사도',
    status: '상태',
    openRelatedPost: '관련 게시글 보기',
  },
  en: {
    loading: 'Loading post details',
    notFound: 'This post could not be found.',
    backToList: 'Back to list',
    previousImage: 'Previous image',
    nextImage: 'Next image',
    goToImage: 'Go to image',
    noPhoto: 'No photo uploaded for this post.',
    lostItem: 'Lost item',
    foundItem: 'Found item',
    location: 'Location',
    date: 'Date',
    postedBy: 'Posted by',
    verifyOwnership: 'Verify ownership',
    relatedMatches: 'Related matches',
    relatedMatchesDescription: 'These posts are already linked to this item by the matching flow.',
    candidate: 'candidate',
    similarity: 'similarity',
    status: 'Status',
    openRelatedPost: 'Open related post',
  },
};

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [item, setItem] = useState<Item | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [imgIndex, setImgIndex] = useState(0);
  const t = text[locale];

  useEffect(() => {
    if (!id) return;

    (async () => {
      const data = await getItem(id);
      setItem(data);

      if (data) {
        const field = data.type === 'lost' ? 'lostItemId' : 'foundItemId';
        const matchesQuery = query(collection(db, 'matches'), where(field, '==', id));
        const snapshot = await getDocs(matchesQuery);
        setMatches(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Match));
      }

      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return <LoadingSpinner label={t.loading} fullScreen />;
  }

  if (!item) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500 shadow-sm">
        {t.notFound}
      </div>
    );
  }

  const categoryLabel = CATEGORIES.find((category) => category.value === item.category)?.label ?? item.category;
  const dateStr = item.lostDate?.toDate().toLocaleDateString('ko-KR') ?? '';
  const hasImages = item.imageUrls.length > 0;
  const currentImgIndex = imgIndex < item.imageUrls.length ? imgIndex : 0;

  const goPrev = () => setImgIndex((prev) => (prev <= 0 ? item.imageUrls.length - 1 : prev - 1));
  const goNext = () => setImgIndex((prev) => (prev >= item.imageUrls.length - 1 ? 0 : prev + 1));

  return (
    <section className="space-y-6">
      <button
        type="button"
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
      >
        <span aria-hidden="true">←</span>
        {t.backToList}
      </button>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          {hasImages ? (
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-[1.5rem] bg-slate-100">
                <img
                  src={item.imageUrls[currentImgIndex]}
                  alt={item.title}
                  className="h-[280px] w-full object-cover sm:h-[360px]"
                />

                {item.imageUrls.length > 1 ? (
                  <>
                    <button
                      type="button"
                      onClick={goPrev}
                      className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-slate-700 shadow-sm transition hover:bg-white"
                      aria-label={t.previousImage}
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      onClick={goNext}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-slate-700 shadow-sm transition hover:bg-white"
                      aria-label={t.nextImage}
                    >
                      →
                    </button>
                  </>
                ) : null}
              </div>

              {item.imageUrls.length > 1 ? (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {item.imageUrls.map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setImgIndex(index)}
                      className={`h-2.5 rounded-full transition ${
                        index === currentImgIndex ? 'w-8 bg-sky-500' : 'w-2.5 bg-slate-300 hover:bg-slate-400'
                      }`}
                      aria-label={`${t.goToImage} ${index + 1}`}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex h-[280px] items-center justify-center rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 text-center text-sm text-slate-500 sm:h-[360px]">
              {t.noPhoto}
            </div>
          )}
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.type === 'lost' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {item.type === 'lost' ? t.lostItem : t.foundItem}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{categoryLabel}</span>
            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">{item.status}</span>
          </div>

          <h1 className="mt-4 text-3xl font-bold text-slate-900">{item.title}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>

          <div className="mt-6 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            <div className="flex items-center justify-between gap-4">
              <span className="font-medium text-slate-900">{t.location}</span>
              <span>{item.location}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="font-medium text-slate-900">{t.date}</span>
              <span>{dateStr}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="font-medium text-slate-900">{t.postedBy}</span>
              <span>{item.userName}</span>
            </div>
          </div>

          {user && user.uid !== item.userId && item.status === 'active' ? (
            <Link
              to={`/verify/${item.id}`}
              className="mt-6 inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              {t.verifyOwnership}
            </Link>
          ) : null}
        </div>
      </div>

      {matches.length > 0 ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{t.relatedMatches}</h2>
              <p className="mt-1 text-sm text-slate-500">{t.relatedMatchesDescription}</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {matches.length} {t.candidate}
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {matches.map((match) => (
              <div key={match.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{Math.round(match.similarityScore * 100)}% {t.similarity}</p>
                  <p className="text-sm text-slate-500">{t.status}: {match.status}</p>
                </div>
                <Link
                  to={`/item/${item.type === 'lost' ? match.foundItemId : match.lostItemId}`}
                  className="inline-flex items-center rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
                >
                  {t.openRelatedPost}
                </Link>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
