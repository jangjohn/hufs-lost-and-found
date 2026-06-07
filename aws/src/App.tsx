import { FormEvent, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { generateClient } from 'aws-amplify/api';
import type { AuthUser, FetchUserAttributesOutput } from 'aws-amplify/auth';
import { fetchUserAttributes, getCurrentUser, signOut as amplifySignOut } from 'aws-amplify/auth';
import { getUrl, uploadData } from 'aws-amplify/storage';
import { Hub } from 'aws-amplify/utils';
import type { Schema } from '../amplify/data/resource';
import { amplifyConfigured } from './amplifyClient';
import { resolveAuthUser, shouldRefreshAuthUser } from './authState';
import {
  buildItemImagePath,
  categories,
  toDateInputValue,
  toItemCreateInput,
  type ItemCategory,
  type ItemFormState,
  type ItemStatus,
  type ItemType,
} from './awsItem';
import {
  buildDashboardStats,
  buildMatchCandidates,
  filterItemsForBoard,
  getCategoryLabel,
  type BoardItem,
} from './viewModel';

type Item = BoardItem;

type AmplifyItemRecord = {
  id?: string | null;
  type?: ItemType | null;
  status?: ItemStatus | null;
  category?: ItemCategory | null;
  title?: string | null;
  description?: string | null;
  location?: string | null;
  lostDate?: string | null;
  imageKeys?: (string | null)[] | null;
  verificationQ?: string | null;
  ownerName?: string | null;
  owner?: string | null;
  createdAt?: string | null;
};

const client = amplifyConfigured ? generateClient<Schema>() : null;
const AuthPanel = lazy(() => import('./AuthPanel'));

const typeLabels: Record<ItemType, string> = {
  lost: '분실',
  found: '습득',
};

/* =========================================================================
   icons (단색 라인 · 이모지 없음)
   ========================================================================= */
type IconProps = { className?: string };

const BrandPin = () => (
  <svg viewBox="0 0 24 24">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);
const IcSearch = ({ className = 'ic' }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);
const IcRefresh = ({ className = 'ic' }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24">
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);
const IcMoon = ({ className = 'ic' }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24">
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9" />
  </svg>
);
const IcSun = ({ className = 'ic' }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);
const IcLogout = ({ className = 'ic' }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
);
const IcPlus = ({ className = 'ic' }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24">
    <path d="M12 5v14M5 12h14" />
  </svg>
);
const IcClose = ({ className = 'ic' }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);
const IcPin = ({ className = 'ic' }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);
const IcClock = ({ className = 'ic' }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);
const IcCam = ({ className = 'ic' }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24">
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z" />
    <circle cx="12" cy="13" r="3" />
  </svg>
);
const IcLink = ({ className = 'ic' }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24">
    <path d="M9 17H7A5 5 0 0 1 7 7h2" />
    <path d="M15 7h2a5 5 0 0 1 0 10h-2" />
    <path d="M8 12h8" />
  </svg>
);
const IcNoImage = ({ className = 'ic' }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24">
    <path d="M3 3l18 18" />
    <path d="M21 15l-5-5L8 18" />
    <path d="M3 6v13a2 2 0 0 0 2 2h13" />
    <path d="M5 3h14a2 2 0 0 1 2 2v9" />
  </svg>
);
const IcInfo = ({ className = 'ic' }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </svg>
);
const IcLock = ({ className = 'ic' }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24">
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);
const IcCheck = ({ className = 'ic' }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
const IcHome = ({ className = 'ic' }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24">
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h14V9.5" />
  </svg>
);
const IcUser = ({ className = 'ic' }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21v-1a7 7 0 0 1 14 0v1" />
  </svg>
);

function Brand() {
  return (
    <span className="brand">
      <span className="mark">
        <BrandPin />
      </span>
      <b>HUFS 분실물</b>
    </span>
  );
}

/* =========================================================================
   theme toggle (light / dark · localStorage 持久化)
   ========================================================================= */
type Theme = 'light' | 'dark';

function readInitialTheme(): Theme {
  if (typeof document !== 'undefined') {
    const current = document.documentElement.dataset.theme;
    if (current === 'light' || current === 'dark') return current;
  }
  return 'light';
}

function useTheme() {
  const [theme, setTheme] = useState<Theme>(readInitialTheme);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try {
        localStorage.setItem('hufs-theme', next);
      } catch {
        /* localStorage 사용 불가 시 무시 */
      }
      return next;
    });
  }, []);

  return { theme, toggleTheme };
}

function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  return (
    <button className="icon-btn" type="button" onClick={onToggle} title="테마 전환" aria-label="테마 전환">
      {theme === 'dark' ? <IcSun /> : <IcMoon />}
    </button>
  );
}

/* =========================================================================
   helpers (Amplify 데이터 처리 — 기존 로직 유지)
   ========================================================================= */
function formatDate(date: string) {
  if (!date) return '-';

  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${date}T00:00:00`));
}

function createDefaultForm(): ItemFormState {
  return {
    type: 'lost',
    category: 'wallet',
    title: '',
    description: '',
    location: '',
    lostDate: new Date().toISOString().slice(0, 10),
    verificationQ: '',
    verificationA: '',
  };
}

function toMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unexpected service operation error';
}

function normalizeItem(record: AmplifyItemRecord): Item {
  return {
    id: record.id ?? crypto.randomUUID(),
    type: record.type ?? 'lost',
    status: record.status ?? 'active',
    category: record.category ?? 'other',
    title: record.title ?? '',
    description: record.description ?? '',
    location: record.location ?? '',
    lostDate: toDateInputValue(record.lostDate),
    imageKeys: (record.imageKeys ?? []).filter((key): key is string => Boolean(key)),
    imageUrls: [],
    verificationQ: record.verificationQ ?? '',
    ownerName: record.ownerName ?? 'School user',
    ownerId: record.owner ?? '',
    createdAt: record.createdAt ?? '',
  };
}

async function resolveImageUrls(imageKeys: string[]) {
  const urls = await Promise.all(
    imageKeys.map(async (path) => {
      try {
        const result = await getUrl({
          path,
          options: {
            expiresIn: 60 * 30,
          },
        });

        return result.url.toString();
      } catch (error) {
        console.warn('Failed to create S3 image URL:', error);
        return null;
      }
    }),
  );

  return urls.filter((url): url is string => Boolean(url));
}

async function hydrateItem(record: AmplifyItemRecord) {
  const item = normalizeItem(record);
  return {
    ...item,
    imageUrls: await resolveImageUrls(item.imageKeys),
  };
}

function ownerLabel(user: AuthUser, attributes: FetchUserAttributesOutput | null) {
  return attributes?.email ?? user.signInDetails?.loginId ?? user.username;
}

function confidenceLevel(score: number): 'high' | 'mid' | 'low' {
  if (score >= 0.8) return 'high';
  if (score >= 0.7) return 'mid';
  return 'low';
}

const confidenceLabel: Record<'high' | 'mid' | 'low', string> = {
  high: '높음',
  mid: '보통',
  low: '낮음',
};

/* =========================================================================
   setup / loading screens
   ========================================================================= */
function AuthLoadingScreen() {
  return (
    <div className="page setup-shell">
      <section className="setup-card" aria-live="polite">
        <span className="eyebrow">
          <span className="d" />
          Session check
        </span>
        <h1>로그인 상태를 확인하는 중입니다.</h1>
        <p>잠시만 기다려주세요.</p>
      </section>
    </div>
  );
}

function SetupScreen() {
  return (
    <div className="page setup-shell">
      <section className="setup-card">
        <span className="eyebrow">
          <span className="d" />
          Service configuration required
        </span>
        <h1>서비스 설정 파일이 아직 없습니다.</h1>
        <p>배포 환경에서 생성되는 설정 파일이 있어야 서비스를 실행할 수 있습니다.</p>
        <pre>
          <code>npx ampx sandbox --outputs-out-dir src</code>
        </pre>
        <p>로컬 개발 환경에서는 위 명령으로 설정 파일을 생성하세요.</p>
      </section>
    </div>
  );
}

/* =========================================================================
   PublicApp — 소개(방문자 홈) + 로그인
   * 隐私: 미인증 화면은 Item.list() 호출/렌더링 금지. 우측은 추상 일러스트.
   ========================================================================= */
function BrandViz() {
  return (
    <div className="brandviz">
      <svg viewBox="0 0 440 420" role="img" aria-label="캠퍼스 분실물을 다시 연결하는 일러스트">
        <defs>
          <filter id="bvSoft" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="5" stdDeviation="7" floodColor="rgba(75,50,30,0.14)" />
          </filter>
        </defs>
        <circle cx="356" cy="78" r="84" fill="var(--coral)" opacity="0.08" />
        <circle cx="80" cy="338" r="66" fill="var(--coral)" opacity="0.06" />
        <circle
          cx="220"
          cy="205"
          r="150"
          fill="none"
          stroke="var(--line-2)"
          strokeWidth="1.5"
          strokeDasharray="1.5 9"
          strokeLinecap="round"
          opacity="0.85"
        />
        <g stroke="var(--coral)" strokeWidth="2" strokeDasharray="3 7" strokeLinecap="round" opacity="0.45" fill="none">
          <line x1="220" y1="205" x2="118" y2="112" />
          <line x1="220" y1="205" x2="336" y2="166" />
          <line x1="220" y1="205" x2="162" y2="320" />
        </g>
        <circle cx="220" cy="205" r="56" fill="none" stroke="var(--coral)" strokeWidth="2" opacity="0">
          <animate attributeName="r" values="56;102" dur="3.2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.3;0" dur="3.2s" repeatCount="indefinite" />
        </circle>
        <circle cx="220" cy="205" r="68" fill="none" stroke="var(--coral)" strokeWidth="2" opacity="0.22" />
        <circle cx="220" cy="205" r="52" fill="var(--coral)" />
        <g
          transform="translate(220,205) scale(1.9) translate(-12,-12.5)"
          fill="none"
          stroke="#fff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0" />
          <circle cx="12" cy="10" r="3" />
        </g>
        <g filter="url(#bvSoft)">
          <circle cx="118" cy="112" r="34" fill="var(--surface)" stroke="var(--line)" strokeWidth="1.5" />
          <g
            transform="translate(118,112) scale(1.05) translate(-12,-12)"
            fill="none"
            stroke="var(--ink-2)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="6" width="18" height="13" rx="2.5" />
            <path d="M3 9.5h18" />
            <circle cx="16.5" cy="13.5" r="1.3" />
          </g>
        </g>
        <g filter="url(#bvSoft)">
          <circle cx="336" cy="166" r="34" fill="var(--surface)" stroke="var(--line)" strokeWidth="1.5" />
          <g
            transform="translate(336,166) scale(1.05) translate(-12,-12)"
            fill="none"
            stroke="var(--ink-2)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="9" cy="14.5" r="4" />
            <path d="m11.8 11.7 7.2-7.2" />
            <path d="m17 6 2 2" />
            <path d="m14.3 8.7 1.8 1.8" />
          </g>
        </g>
        <g filter="url(#bvSoft)">
          <circle cx="162" cy="320" r="34" fill="var(--surface)" stroke="var(--line)" strokeWidth="1.5" />
          <g
            transform="translate(162,320) scale(1.05) translate(-12,-12)"
            fill="none"
            stroke="var(--ink-2)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="5" width="18" height="14" rx="2.5" />
            <path d="M3 10h18" />
            <path d="M7 14.5h4" />
          </g>
        </g>
      </svg>
    </div>
  );
}

function PublicApp() {
  const [showSignIn, setShowSignIn] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const openSignIn = () => setShowSignIn(true);
  const backToHome = () => setShowSignIn(false);

  return (
    <div className="page">
      <header className="topbar">
        <div className="shell-wide topbar-in">
          <Brand />
          <span className="sp" />
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          {showSignIn ? (
            <button className="btn btn-ghost btn-sm" type="button" onClick={backToHome}>
              홈으로
            </button>
          ) : (
            <button className="btn btn-outline btn-sm" type="button" onClick={openSignIn}>
              로그인
            </button>
          )}
        </div>
      </header>

      {showSignIn ? (
        <Suspense
          fallback={
            <main className="auth-shell">
              <p className="auth-loading">로그인 화면을 불러오는 중입니다...</p>
            </main>
          }
        >
          <AuthPanel />
        </Suspense>
      ) : (
        <main className="hero">
          <div className="shell-wide hero-grid">
            <div className="hero-copy">
              <span className="eyebrow">
                <span className="d" />
                한국외대 캠퍼스 전용
              </span>
              <h1>
                캠퍼스에서 잃어버린 물건, <em>다시 주인에게.</em>
              </h1>
              <p className="lead">분실물·습득물을 등록하면, 같은 단서를 가진 글과 연결해 드려요.</p>
              <div className="cta">
                <button className="btn btn-primary" type="button" onClick={openSignIn}>
                  시작하기
                </button>
                <button className="btn btn-outline" type="button" onClick={openSignIn}>
                  로그인
                </button>
              </div>
            </div>
            <BrandViz />
          </div>
        </main>
      )}

      <footer className="site-footer">
        <div className="shell-wide foot-in">
          <span>HUFS Lost &amp; Found</span>
          <span className="dotsep" />
          <span>학교 이메일(.ac.kr) 전용</span>
          <span className="dotsep" />
          <a href="#" onClick={(event) => event.preventDefault()}>
            문의
          </a>
        </div>
      </footer>
    </div>
  );
}

/* =========================================================================
   AuthenticatedApp — 워크스페이스(피드)
   ========================================================================= */
function AuthenticatedApp({ signOut, user }: { signOut?: () => void; user: AuthUser }) {
  const [items, setItems] = useState<Item[]>([]);
  const [attributes, setAttributes] = useState<FetchUserAttributesOutput | null>(null);
  const [filter, setFilter] = useState<ItemType | 'all'>('all');
  const [category, setCategory] = useState<ItemCategory | 'all'>('all');
  const [query, setQuery] = useState('');
  const [form, setForm] = useState<ItemFormState>(createDefaultForm);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { theme, toggleTheme } = useTheme();

  // 상세 보기 + 본인 확인(认领) 상태
  const [detailItem, setDetailItem] = useState<Item | null>(null);
  const [claimAnswer, setClaimAnswer] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<{ success: boolean; remainingAttempts: number; message: string } | null>(null);
  const [claimError, setClaimError] = useState('');

  const displayName = ownerLabel(user, attributes);
  const avatarInitial = displayName.trim().charAt(0).toUpperCase() || '?';
  // Amplify owner 필드는 `${sub}::${username}` 형식 — 내 sub 로 시작하면 내 글.
  const isOwnItem = (item: Item) => Boolean(item.ownerId) && item.ownerId.startsWith(user.userId);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2200);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  // 선택한 이미지 미리보기(object URL) 생성 + 정리
  useEffect(() => {
    const urls = imageFiles.map((file) => URL.createObjectURL(file));
    setImagePreviews(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imageFiles]);

  useEffect(() => {
    let active = true;

    fetchUserAttributes()
      .then((nextAttributes) => {
        if (active) setAttributes(nextAttributes);
      })
      .catch((nextError) => {
        console.warn('Failed to load Cognito attributes:', nextError);
      });

    return () => {
      active = false;
    };
  }, [user.userId]);

  const loadItems = useCallback(async () => {
    if (!client) return;

    setLoading(true);
    setError('');

    try {
      const response = await client.models.Item.list({
        limit: 100,
      });

      if (response.errors?.length) {
        throw new Error(response.errors.map((itemError) => itemError.message).join(', '));
      }

      const hydratedItems = await Promise.all((response.data as AmplifyItemRecord[]).map(hydrateItem));
      const sortedItems = hydratedItems.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      setItems(sortedItems);
    } catch (nextError) {
      setError(toMessage(nextError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  // Esc 로 모달/상세 닫기
  useEffect(() => {
    if (!modalOpen && !detailItem) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setModalOpen(false);
        setDetailItem(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [modalOpen, detailItem]);

  const visibleItems = useMemo(() => {
    return filterItemsForBoard(items, { type: filter, category, query });
  }, [category, filter, items, query]);

  const matches = useMemo(() => buildMatchCandidates(items), [items]);
  const stats = useMemo(() => buildDashboardStats(items), [items]);

  const matchCountById = useMemo(() => {
    const map: Record<string, number> = {};

    for (const item of items) {
      const count = matches.filter((match) =>
        item.type === 'lost' ? match.id.startsWith(`${item.id}-`) : match.id.endsWith(`-${item.id}`),
      ).length;

      if (count) map[item.id] = count;
    }

    return map;
  }, [items, matches]);

  const recCards = useMemo(() => matches.slice(0, 6), [matches]);

  const openModal = (type?: ItemType) => {
    if (type) setForm((current) => ({ ...current, type }));
    setError('');
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const createItem = async (event: FormEvent) => {
    event.preventDefault();
    if (!client || saving) return;

    setSaving(true);
    setError('');

    // 평문 답변은 폼에서만 임시로 사용 — 서버에서 해시되어 저장된다(Item 레코드엔 저장 안 함).
    const answer = form.verificationA;

    try {
      const itemId = crypto.randomUUID();
      const imageKeys: string[] = [];

      for (const file of imageFiles) {
        const uploadResult = await uploadData({
          path: buildItemImagePath(itemId, file.name),
          data: file,
          options: {
            contentType: file.type || undefined,
          },
        }).result;

        imageKeys.push(uploadResult.path);
      }

      const payload = toItemCreateInput(form, imageKeys, displayName);
      const response = await client.models.Item.create({
        id: itemId,
        ...payload,
      });

      if (response.errors?.length) {
        throw new Error(response.errors.map((itemError) => itemError.message).join(', '));
      }

      // 이미지 비전 라벨 + AI 매칭은 백그라운드로(실패해도 게시글 등록엔 영향 없음).
      client.mutations.analyzeImageLabels({ itemId })
        .then(() => client.mutations.generateMatches({ itemId }))
        .catch((error) => console.warn('AI processing failed:', error));

      const createdItem = response.data
        ? await hydrateItem(response.data as AmplifyItemRecord)
        : await hydrateItem({
            id: itemId,
            ...payload,
            owner: `${user.userId}::${user.username}`,
            createdAt: new Date().toISOString(),
          });

      setItems((currentItems) => [createdItem, ...currentItems]);
      setForm(createDefaultForm());
      setImageFiles([]);
      setFileInputKey((currentKey) => currentKey + 1);
      setModalOpen(false);
      showToast(`${typeLabels[createdItem.type]} 게시글이 등록되었어요.`);

      // 정답 해시는 서버(owner 전용 mutation)에서 계산·저장. 실패해도 게시글은 등록됨 — 경고만 표시.
      try {
        const verificationResponse = await client.mutations.setVerificationAnswer({ itemId, answer });
        if (verificationResponse.errors?.length) {
          throw new Error(verificationResponse.errors.map((itemError) => itemError.message).join(', '));
        }
      } catch (verificationError) {
        console.warn('Failed to store verification answer:', verificationError);
        showToast('본인 확인 답변 저장에 실패했어요. 게시글을 다시 등록해 주세요.');
      }
    } catch (nextError) {
      setError(toMessage(nextError));
    } finally {
      setSaving(false);
    }
  };

  const openDetail = (item: Item) => {
    setDetailItem(item);
    setClaimAnswer('');
    setClaimResult(null);
    setClaimError('');
  };

  const closeDetail = () => setDetailItem(null);

  const submitClaim = async (event: FormEvent) => {
    event.preventDefault();
    if (!client || !detailItem || claiming) return;

    setClaiming(true);
    setClaimError('');

    try {
      // 평문 답변만 서버로 전송 — 해시/정답은 절대 클라이언트로 돌아오지 않는다.
      const response = await client.mutations.verifyAnswer({
        itemId: detailItem.id,
        answer: claimAnswer,
      });

      if (response.errors?.length) {
        throw new Error(response.errors.map((itemError) => itemError.message).join(', '));
      }

      const result = response.data;
      if (!result) {
        throw new Error('인증 처리 중 오류가 발생했습니다.');
      }

      setClaimResult({
        success: result.success,
        remainingAttempts: result.remainingAttempts,
        message: result.message,
      });
    } catch (nextError) {
      setClaimError(toMessage(nextError));
    } finally {
      setClaiming(false);
    }
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <div className="page">
      <nav className="nav">
        <div className="shell nav-in">
          <Brand />
          <label className="nav-search">
            <IcSearch />
            <input
              placeholder="물건·장소 검색"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="검색"
            />
          </label>
          <span className="nav-sp" />
          <button
            className="icon-btn hide-mobile"
            type="button"
            onClick={() => void loadItems()}
            title="새로고침"
            aria-label="새로고침"
          >
            <IcRefresh />
          </button>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <button className="icon-btn" type="button" onClick={signOut} title="로그아웃" aria-label="로그아웃">
            <IcLogout />
          </button>
          <span className="nav-avatar" title={displayName}>
            {avatarInitial}
          </span>
        </div>
      </nav>

      <main className="workspace shell">
        <div className="summary scroll-x" aria-label="게시판 요약">
          <span className="spill">
            <span className="dot" style={{ background: 'var(--coral)' }} />
            <span className="n">{stats.active}</span>
            <span className="t">진행 중</span>
          </span>
          <span className="spill">
            <span className="dot" style={{ background: 'var(--lost)' }} />
            <span className="n">{stats.lost}</span>
            <span className="t">분실</span>
          </span>
          <span className="spill">
            <span className="dot" style={{ background: 'var(--found)' }} />
            <span className="n">{stats.found}</span>
            <span className="t">습득</span>
          </span>
          <span className="spill">
            <span className="dot" style={{ background: 'var(--ink-3)' }} />
            <span className="n">{stats.withPhotos}</span>
            <span className="t">사진 포함</span>
          </span>
        </div>

        {recCards.length > 0 ? (
          <section className="sec" id="recSec">
            <div className="sec-h">
              <h2>추천 연결</h2>
              <span className="more">매칭 {matches.length}</span>
            </div>
            <p className="sec-note">
              <IcInfo />
              분류·장소·날짜 등 공통 단서로 묶은 추천이에요. 정밀 매칭이 아닙니다.
            </p>
            <div className="rec-row">
              {recCards.map((match) => {
                const conf = confidenceLevel(match.similarityScore);
                const confVar = `var(--c-${conf})`;
                const pct = Math.round(match.similarityScore * 100);

                return (
                  <article className="rec" key={match.id}>
                    <div className="rh">
                      <span className="conf">
                        <span className="dot" style={{ background: confVar }} />
                        신뢰도 {confidenceLabel[conf]}
                      </span>
                      <span className="pct">{pct}%</span>
                    </div>
                    <div className="bar">
                      <i style={{ width: `${pct}%`, background: confVar }} />
                    </div>
                    <div className="pair">
                      <div className="side lost">
                        <span className="role">분실</span>
                        <span className="nm">{match.lostTitle}</span>
                      </div>
                      <div className="side found">
                        <span className="role">습득</span>
                        <span className="nm">{match.foundTitle}</span>
                      </div>
                    </div>
                    <div className="reasons">
                      {match.reasons.map((reason) => (
                        <span className="reason" key={reason}>
                          {reason}
                        </span>
                      ))}
                    </div>
                    <div className="foot">
                      <IcInfo />
                      공통 단서 기반 추천 · 정밀 매칭 아님
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="sec" id="feedSec">
          <div className="sec-h">
            <h2>실시간 게시판</h2>
            <span className="more">{visibleItems.length}건</span>
          </div>

          <div className="chips scroll-x">
            <button
              className={filter === 'all' ? 'chip on' : 'chip'}
              type="button"
              onClick={() => setFilter('all')}
            >
              전체
            </button>
            <button
              className={filter === 'lost' ? 'chip on' : 'chip'}
              type="button"
              data-v="lost"
              onClick={() => setFilter('lost')}
            >
              <span className="dot" style={{ background: 'var(--lost)' }} />
              분실
            </button>
            <button
              className={filter === 'found' ? 'chip on' : 'chip'}
              type="button"
              data-v="found"
              onClick={() => setFilter('found')}
            >
              <span className="dot" style={{ background: 'var(--found)' }} />
              습득
            </button>
            <span className="chip-sep" />
            {categories.map((value) => (
              <button
                key={value}
                className={category === value ? 'chip on' : 'chip'}
                type="button"
                onClick={() => setCategory((current) => (current === value ? 'all' : value))}
              >
                {getCategoryLabel(value)}
              </button>
            ))}
          </div>

          <div className="feed">
            {loading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <div className="sk-card" key={index}>
                  <div className="sk-thumb shimmer" />
                  <div className="sk-info">
                    <div className="sk-1 shimmer" />
                    <div className="sk-2 shimmer" />
                    <div className="sk-3 shimmer" />
                  </div>
                </div>
              ))
            ) : error ? (
              <div className="empty">
                <div className="ei">
                  <IcInfo />
                </div>
                <h3>게시글을 불러오지 못했어요</h3>
                <p>{error}</p>
              </div>
            ) : visibleItems.length === 0 ? (
              <div className="empty">
                <div className="ei">
                  <IcSearch />
                </div>
                <h3>조건에 맞는 게시글이 없어요</h3>
                <p>필터를 바꾸거나 새 게시글을 등록해 보세요.</p>
              </div>
            ) : (
              visibleItems.map((item) => {
                const matchCount = matchCountById[item.id] ?? 0;

                return (
                  <article
                    className="card"
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openDetail(item)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openDetail(item);
                      }
                    }}
                  >
                    {item.imageUrls[0] ? (
                      <div className="thumb img">
                        <img src={item.imageUrls[0]} alt={`${item.title} 사진`} />
                        {item.imageKeys.length > 0 ? (
                          <span className="pc">
                            <IcCam />
                            {item.imageKeys.length}
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <div className="thumb noimg">
                        <IcNoImage />
                        <span>{getCategoryLabel(item.category)}</span>
                      </div>
                    )}
                    <div className="info">
                      <div className="badges">
                        <span className={`badge badge-${item.type}`}>
                          <span className="dot" />
                          {typeLabels[item.type]}
                        </span>
                        <span className="cat">{getCategoryLabel(item.category)}</span>
                      </div>
                      <h3>{item.title}</h3>
                      {item.description ? <p className="desc">{item.description}</p> : null}
                      <div className="pt">
                        <IcPin />
                        {item.location}
                        <span className="sepdot">·</span>
                        <IcClock />
                        {formatDate(item.lostDate)}
                      </div>
                      {item.verificationQ ? (
                        <p className="verify-q">
                          <b>확인 질문</b> {item.verificationQ}
                        </p>
                      ) : null}
                      <div className="cfoot">
                        {matchCount > 0 ? (
                          <span className="flag">
                            <IcLink />
                            매칭 {matchCount}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </main>

      <footer className="workspace-footer">
        <div className="shell">HUFS Lost &amp; Found · 캠퍼스 분실물 커뮤니티</div>
      </footer>

      {/* FAB (desktop) */}
      <button className="fab" type="button" onClick={() => openModal()} aria-label="게시글 등록">
        <IcPlus />
        등록
      </button>

      {/* bottom tab (mobile) */}
      <nav className="tabbar">
        <button className="tab on" type="button" onClick={scrollToTop}>
          <IcHome />
          홈
        </button>
        <button
          className="tab"
          type="button"
          onClick={() => document.getElementById('feedSec')?.scrollIntoView({ behavior: 'smooth' })}
        >
          <IcSearch />
          검색
        </button>
        <button className="tab center" type="button" onClick={() => openModal()} aria-label="게시글 등록">
          <span className="plus">
            <IcPlus />
          </span>
          등록
        </button>
        <button
          className="tab"
          type="button"
          onClick={() => document.getElementById('recSec')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
        >
          <IcLink />
          매칭
        </button>
        <button className="tab" type="button" onClick={signOut}>
          <IcUser />
          내 정보
        </button>
      </nav>

      {/* posting modal */}
      <div
        className={modalOpen ? 'modal-back open' : 'modal-back'}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeModal();
        }}
      >
        <div className="modal" role="dialog" aria-modal="true" aria-label="새 게시글">
          <div className="modal-h">
            <h2>새 게시글</h2>
            <button className="x" type="button" onClick={closeModal} aria-label="닫기">
              <IcClose />
            </button>
          </div>
          <div className="modal-b">
            <form onSubmit={createItem}>
              {error ? (
                <div className="alert" role="alert">
                  <IcInfo />
                  <span>{error}</span>
                </div>
              ) : null}

              <div className="seg" role="group" aria-label="게시글 유형">
                <button
                  type="button"
                  data-on="lost"
                  className={form.type === 'lost' ? 'on' : ''}
                  onClick={() => setForm({ ...form, type: 'lost' })}
                >
                  <span className="dot" />
                  분실했어요
                </button>
                <button
                  type="button"
                  data-on="found"
                  className={form.type === 'found' ? 'on' : ''}
                  onClick={() => setForm({ ...form, type: 'found' })}
                >
                  <span className="dot" />
                  주웠어요
                </button>
              </div>

              <div className="field">
                <label htmlFor="f-category">분류</label>
                <select
                  id="f-category"
                  className="input"
                  value={form.category}
                  onChange={(event) => setForm({ ...form, category: event.target.value as ItemCategory })}
                >
                  {categories.map((value) => (
                    <option key={value} value={value}>
                      {getCategoryLabel(value)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="f-title">제목</label>
                <input
                  id="f-title"
                  className="input"
                  placeholder="예) 검은색 가죽 반지갑"
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="f-desc">상세 설명</label>
                <textarea
                  id="f-desc"
                  className="input"
                  placeholder="색상, 브랜드, 특징, 주변 상황을 적어주세요"
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  required
                />
              </div>

              <div className="row2">
                <div className="field">
                  <label htmlFor="f-location">장소</label>
                  <input
                    id="f-location"
                    className="input"
                    placeholder="도서관 3층"
                    value={form.location}
                    onChange={(event) => setForm({ ...form, location: event.target.value })}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="f-date">날짜</label>
                  <input
                    id="f-date"
                    className="input"
                    type="date"
                    value={form.lostDate}
                    onChange={(event) => setForm({ ...form, lostDate: event.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="field">
                <label>사진</label>
                <label className="upload">
                  <IcCam />
                  사진 추가
                  <input
                    key={fileInputKey}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) => setImageFiles(Array.from(event.target.files ?? []))}
                  />
                </label>
                {imagePreviews.length > 0 ? (
                  <div className="thumbs">
                    {imagePreviews.map((url, index) => (
                      <span className="thumb-mini" key={url}>
                        <img src={url} alt={`첨부 사진 ${index + 1}`} />
                      </span>
                    ))}
                  </div>
                ) : null}
                <p className="fhint">
                  {imageFiles.length > 0
                    ? `${imageFiles.length}개 사진이 선택되었어요.`
                    : '사진이 없어도 등록할 수 있어요.'}
                </p>
              </div>

              <div className="verify">
                <div className="vt">
                  <IcLock />
                  본인 확인 질문 &amp; 정답
                </div>
                <input
                  className="input"
                  placeholder="질문 (예) 지갑 안에 무엇이 들어 있나요?"
                  value={form.verificationQ}
                  onChange={(event) => setForm({ ...form, verificationQ: event.target.value })}
                  required
                />
                <input
                  className="input verify-answer"
                  placeholder="정답 (예) 학생증과 만원"
                  value={form.verificationA}
                  onChange={(event) => setForm({ ...form, verificationA: event.target.value })}
                  required
                />
                <p className="fhint">
                  정답을 맞힌 사람에게만 연락처가 공개돼요. 정답은 서버에서 안전하게 해시 처리되며 평문으로 저장되지
                  않아요.
                </p>
              </div>

              <button className="btn btn-primary btn-block" type="submit" disabled={saving}>
                {saving ? '저장 중...' : `${typeLabels[form.type]} 게시글 등록`}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* detail + claim modal */}
      {detailItem ? (
        <div
          className="modal-back open"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeDetail();
          }}
        >
          <div className="modal" role="dialog" aria-modal="true" aria-label="게시글 상세">
            <div className="modal-h">
              <h2>게시글 상세</h2>
              <button className="x" type="button" onClick={closeDetail} aria-label="닫기">
                <IcClose />
              </button>
            </div>
            <div className="modal-b">
              {detailItem.imageUrls[0] ? (
                <img className="detail-image" src={detailItem.imageUrls[0]} alt={`${detailItem.title} 사진`} />
              ) : (
                <div className="detail-image detail-noimg">
                  <IcNoImage />
                  <span>{getCategoryLabel(detailItem.category)}</span>
                </div>
              )}

              <div className="detail-badges">
                <span className={`badge badge-${detailItem.type}`}>
                  <span className="dot" />
                  {typeLabels[detailItem.type]}
                </span>
                <span className="cat">{getCategoryLabel(detailItem.category)}</span>
              </div>

              <h3 className="detail-title">{detailItem.title}</h3>
              {detailItem.description ? <p className="detail-desc">{detailItem.description}</p> : null}

              <dl className="detail-dl">
                <div>
                  <dt>장소</dt>
                  <dd>{detailItem.location}</dd>
                </div>
                <div>
                  <dt>날짜</dt>
                  <dd>{formatDate(detailItem.lostDate)}</dd>
                </div>
                <div>
                  <dt>작성자</dt>
                  <dd>{detailItem.ownerName}</dd>
                </div>
                <div>
                  <dt>확인 질문</dt>
                  <dd>{detailItem.verificationQ || '-'}</dd>
                </div>
              </dl>

              {isOwnItem(detailItem) ? (
                <p className="detail-own-note">
                  <IcInfo />
                  내가 등록한 게시글이에요. 본인 확인 요청은 다른 사용자에게 표시됩니다.
                </p>
              ) : (
                <div className="claim">
                  <div className="vt">
                    <IcLock />
                    본인 확인하고 연락받기
                  </div>
                  {detailItem.verificationQ ? <p className="claim-q">Q. {detailItem.verificationQ}</p> : null}

                  {claimResult ? (
                    claimResult.success ? (
                      <div className="claim-result ok">
                        <IcCheck />
                        <span>{claimResult.message} 작성자에게 연락 요청이 전달됩니다.</span>
                      </div>
                    ) : (
                      <div className="claim-result bad">
                        <IcInfo />
                        <span>{claimResult.message}</span>
                      </div>
                    )
                  ) : null}

                  {claimError ? (
                    <div className="claim-result bad">
                      <IcInfo />
                      <span>{claimError}</span>
                    </div>
                  ) : null}

                  {claimResult && (claimResult.success || claimResult.remainingAttempts === 0) ? null : (
                    <form className="claim-form" onSubmit={submitClaim}>
                      <input
                        className="input"
                        placeholder="답변 입력"
                        value={claimAnswer}
                        onChange={(event) => setClaimAnswer(event.target.value)}
                        required
                      />
                      <button
                        className="btn btn-primary btn-block"
                        type="submit"
                        disabled={claiming || !claimAnswer.trim()}
                      >
                        {claiming ? '확인 중...' : '본인 확인하고 연락받기'}
                      </button>
                    </form>
                  )}

                  <p className="fhint">
                    답변은 서버에서만 비교돼요. 정답·해시는 공개되지 않으며, 시도는 3회로 제한됩니다.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* toast */}
      <div className={toast ? 'toast show' : 'toast'} role="status" aria-live="polite">
        {toast ? (
          <>
            <IcCheck />
            {toast}
          </>
        ) : null}
      </div>
    </div>
  );
}

function App() {
  if (!amplifyConfigured) {
    return <SetupScreen />;
  }

  return <AppContent />;
}

function AppContent() {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);

  useEffect(() => {
    let active = true;

    async function refreshUser() {
      const nextUser = await resolveAuthUser(getCurrentUser);
      if (active) setUser(nextUser);
    }

    refreshUser();

    const cancelHubListener = Hub.listen('auth', ({ payload }) => {
      if (shouldRefreshAuthUser(payload.event)) {
        void refreshUser();
      }
    });

    return () => {
      active = false;
      cancelHubListener();
    };
  }, []);

  if (user === undefined) {
    return <AuthLoadingScreen />;
  }

  if (!user) {
    return <PublicApp />;
  }

  return <AuthenticatedApp signOut={() => void amplifySignOut()} user={user} />;
}

export default App;
