import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { generateClient } from 'aws-amplify/api';
import type { AuthUser, FetchUserAttributesOutput } from 'aws-amplify/auth';
import { fetchUserAttributes } from 'aws-amplify/auth';
import { getUrl, uploadData } from 'aws-amplify/storage';
import type { Schema } from '../amplify/data/resource';
import { amplifyConfigured } from './amplifyClient';
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
  createdAt?: string | null;
};

const client = amplifyConfigured ? generateClient<Schema>() : null;

const typeLabels: Record<ItemType, string> = {
  lost: '분실',
  found: '습득',
};

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

function SetupScreen() {
  return (
    <main className="app-shell setup-screen">
      <section className="panel setup-panel">
        <p className="eyebrow">Service configuration required</p>
        <h1>서비스 설정 파일이 아직 없습니다.</h1>
        <p className="muted">
          배포 환경에서 생성되는 설정 파일이 있어야 서비스를 실행할 수 있습니다.
        </p>
        <pre>
          <code>npx ampx sandbox --outputs-out-dir src</code>
        </pre>
        <p className="muted">
          로컬 개발 환경에서는 위 명령으로 설정 파일을 생성하세요.
        </p>
      </section>
    </main>
  );
}

function PublicApp() {
  const [showSignIn, setShowSignIn] = useState(false);

  return (
    <main className="app-shell">
      <nav className="nav public-nav">
        <div>
          <strong>HUFS Lost & Found</strong>
          <span>한국외국어대학교 캠퍼스 분실물 게시판</span>
        </div>
        <button className="secondary-button" type="button" onClick={() => setShowSignIn(true)}>
          로그인
        </button>
      </nav>

      <section className="landing-hero">
        <div className="hero-copy">
          <p className="eyebrow">Campus recovery board</p>
          <h1>찾는 사람과 발견한 사람을 빠르게 연결합니다.</h1>
          <p>분실물과 습득물을 한곳에 등록하고, 사진과 장소 정보를 바탕으로 비슷한 게시글을 확인하세요.</p>
          <div className="hero-actions">
            <button type="button" onClick={() => setShowSignIn(true)}>
              분실물 찾기
            </button>
            <button className="secondary-button" type="button" onClick={() => setShowSignIn(true)}>
              습득물 등록
            </button>
          </div>
        </div>
        <div className="process-panel" aria-label="서비스 이용 방법">
          <div>
            <span>01</span>
            <strong>사진과 특징 등록</strong>
            <p>색상, 장소, 날짜처럼 기억하기 쉬운 단서를 남깁니다.</p>
          </div>
          <div>
            <span>02</span>
            <strong>비슷한 게시글 확인</strong>
            <p>분류와 장소가 가까운 분실물/습득물을 함께 봅니다.</p>
          </div>
          <div>
            <span>03</span>
            <strong>확인 질문으로 전달</strong>
            <p>물건의 세부 정보를 묻고 안전하게 돌려줍니다.</p>
          </div>
        </div>
      </section>

      <section className="grid public-grid" aria-label="주요 기능">
        <article className="feature-tile">
          <span className="tile-icon">?</span>
          <h2>잃어버렸나요?</h2>
          <p>게시판을 검색하고, 아직 없다면 분실 신고를 남겨두세요.</p>
        </article>
        <article className="feature-tile">
          <span className="tile-icon">+</span>
          <h2>무언가를 찾았나요?</h2>
          <p>습득 장소와 사진만 빠르게 등록해도 주인이 찾을 가능성이 커집니다.</p>
        </article>
        <article className="feature-tile">
          <span className="tile-icon">=</span>
          <h2>비슷한 항목 비교</h2>
          <p>카테고리, 장소, 날짜가 가까운 후보를 한눈에 비교합니다.</p>
        </article>
      </section>

      {showSignIn ? (
        <section className="auth-panel" aria-label="로그인">
          <Authenticator loginMechanisms={['email']} />
        </section>
      ) : null}
    </main>
  );
}

function AuthenticatedApp({ signOut, user }: { signOut?: () => void; user: AuthUser }) {
  const [items, setItems] = useState<Item[]>([]);
  const [attributes, setAttributes] = useState<FetchUserAttributesOutput | null>(null);
  const [filter, setFilter] = useState<ItemType | 'all'>('all');
  const [category, setCategory] = useState<ItemCategory | 'all'>('all');
  const [query, setQuery] = useState('');
  const [form, setForm] = useState<ItemFormState>(createDefaultForm);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const displayName = ownerLabel(user, attributes);

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

  useEffect(() => {
    let active = true;

    async function loadItems() {
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

        if (active) setItems(sortedItems);
      } catch (nextError) {
        if (active) setError(toMessage(nextError));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadItems();

    return () => {
      active = false;
    };
  }, []);

  const visibleItems = useMemo(() => {
    return filterItemsForBoard(items, { type: filter, category, query });
  }, [category, filter, items, query]);

  const matches = useMemo(() => buildMatchCandidates(items), [items]);
  const stats = useMemo(() => buildDashboardStats(items), [items]);

  const createItem = async (event: FormEvent) => {
    event.preventDefault();
    if (!client || saving) return;

    setSaving(true);
    setError('');

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

      const createdItem = response.data
        ? await hydrateItem(response.data as AmplifyItemRecord)
        : await hydrateItem({
            id: itemId,
            ...payload,
            createdAt: new Date().toISOString(),
          });

      setItems((currentItems) => [createdItem, ...currentItems]);
      setForm(createDefaultForm());
      setImageFiles([]);
      setFileInputKey((currentKey) => currentKey + 1);
    } catch (nextError) {
      setError(toMessage(nextError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="app-shell">
      <nav className="nav">
        <div>
          <strong>HUFS Lost & Found</strong>
          <span>캠퍼스 분실물 게시판</span>
        </div>
        <div className="nav-actions">
          <div className="nav-status">{displayName}</div>
          <button className="secondary-button" type="button" onClick={signOut}>
            로그아웃
          </button>
        </div>
      </nav>

      <section className="workspace-hero">
        <div className="hero-copy">
          <p className="eyebrow">오늘의 캠퍼스 게시판</p>
          <h1>분실물과 습득물을 빠르게 등록하고 비교하세요.</h1>
          <p>사진, 위치, 날짜를 중심으로 항목을 정리해 학교 구성원이 더 쉽게 찾아볼 수 있게 합니다.</p>
        </div>
        <div className="quick-actions" aria-label="빠른 작업">
          <button type="button" onClick={() => setForm((current) => ({ ...current, type: 'lost' }))}>
            분실물 신고
          </button>
          <button className="secondary-button" type="button" onClick={() => setForm((current) => ({ ...current, type: 'found' }))}>
            습득물 등록
          </button>
        </div>
      </section>

      <section className="stats-grid" aria-label="게시판 요약">
        <article>
          <span>Active</span>
          <strong>{stats.active}</strong>
          <p>진행 중인 게시글</p>
        </article>
        <article>
          <span>Lost</span>
          <strong>{stats.lost}</strong>
          <p>분실 신고</p>
        </article>
        <article>
          <span>Found</span>
          <strong>{stats.found}</strong>
          <p>습득 등록</p>
        </article>
        <article>
          <span>Photos</span>
          <strong>{stats.withPhotos}</strong>
          <p>사진 포함 항목</p>
        </article>
      </section>

      {error ? <div className="error-banner">{error}</div> : null}

      <section className="workspace-grid">
        <form className="entry-panel" onSubmit={createItem}>
          <div className="section-heading">
            <p className="eyebrow">새 게시글</p>
            <h2>{form.type === 'lost' ? '무엇을 잃어버렸나요?' : '무엇을 발견했나요?'}</h2>
            <p>정확한 장소와 확인 질문을 적으면 잘못 전달될 가능성을 줄일 수 있습니다.</p>
          </div>

          <div className="segment-control" role="group" aria-label="게시글 유형">
            <button
              className={form.type === 'lost' ? 'segment active' : 'segment'}
              type="button"
              onClick={() => setForm({ ...form, type: 'lost' })}
            >
              분실물
            </button>
            <button
              className={form.type === 'found' ? 'segment active' : 'segment'}
              type="button"
              onClick={() => setForm({ ...form, type: 'found' })}
            >
              습득물
            </button>
          </div>

          <label>
            <span>분류</span>
            <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as ItemCategory })}>
              {categories.map((value) => (
                <option key={value} value={value}>{getCategoryLabel(value)}</option>
              ))}
            </select>
          </label>

          <label>
            <span>제목</span>
            <input placeholder="예: 검은색 지갑을 찾습니다" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
          </label>

          <label>
            <span>상세 설명</span>
            <textarea placeholder="색상, 브랜드, 특징, 주변 상황을 적어주세요" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required />
          </label>

          <div className="row">
            <label>
              <span>장소</span>
              <input placeholder="예: 도서관 3층" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} required />
            </label>
            <label>
              <span>날짜</span>
              <input type="date" value={form.lostDate} onChange={(event) => setForm({ ...form, lostDate: event.target.value })} required />
            </label>
          </div>

          <label className="upload-field">
            <span>사진</span>
            <input
              key={fileInputKey}
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => setImageFiles(Array.from(event.target.files ?? []))}
            />
          </label>
          <p className="file-help">{imageFiles.length ? `${imageFiles.length}개 사진 선택됨` : '사진이 없더라도 등록할 수 있습니다.'}</p>

          <label>
            <span>본인 확인 질문</span>
            <input placeholder="예: 지갑 안 학생증의 색상은?" value={form.verificationQ} onChange={(event) => setForm({ ...form, verificationQ: event.target.value })} required />
          </label>

          <button className="submit-button" disabled={saving}>{saving ? '저장 중...' : `${typeLabels[form.type]} 게시글 등록`}</button>
        </form>

        <section className="board-panel">
          <div className="board-header">
            <div className="section-heading">
              <p className="eyebrow">Live board</p>
              <h2>실시간 게시판</h2>
              <p>{visibleItems.length}개의 게시글이 조건에 맞습니다.</p>
            </div>
            <div className="filters">
              <select value={filter} onChange={(event) => setFilter(event.target.value as ItemType | 'all')}>
                <option value="all">전체 유형</option>
                <option value="lost">분실물</option>
                <option value="found">습득물</option>
              </select>
              <select value={category} onChange={(event) => setCategory(event.target.value as ItemCategory | 'all')}>
                <option value="all">전체 분류</option>
                {categories.map((value) => (
                  <option key={value} value={value}>{getCategoryLabel(value)}</option>
                ))}
              </select>
              <input placeholder="제목, 설명, 장소 검색" value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>
          </div>

          {loading ? <p className="empty-state">게시글을 불러오는 중입니다...</p> : null}
          {!loading && visibleItems.length === 0 ? <p className="empty-state">조건에 맞는 게시글이 없습니다.</p> : null}

          <div className="cards">
            {visibleItems.map((item) => (
              <article className="item-card" key={item.id}>
                {item.imageUrls[0] ? (
                  <img className="card-image" src={item.imageUrls[0]} alt="" />
                ) : (
                  <div className="card-image placeholder-image">{getCategoryLabel(item.category)}</div>
                )}
                <div className="card-body">
                  <div className="card-meta">
                    <span className={`badge ${item.type}`}>{typeLabels[item.type]}</span>
                    <span>{getCategoryLabel(item.category)}</span>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                  <dl>
                    <div><dt>장소</dt><dd>{item.location}</dd></div>
                    <div><dt>날짜</dt><dd>{formatDate(item.lostDate)}</dd></div>
                    <div><dt>사진</dt><dd>{item.imageKeys.length}</dd></div>
                  </dl>
                  <p className="question">확인 질문: {item.verificationQ}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="match-panel">
          <div className="section-heading">
            <p className="eyebrow">Matches</p>
            <h2>가능성 있는 연결</h2>
            <p>분실물과 습득물의 공통 단서를 기준으로 정리합니다.</p>
          </div>
          {matches.length === 0 ? <p className="empty-state">아직 비교할 후보가 없습니다.</p> : null}
          <div className="match-list">
            {matches.map((match) => (
              <article className="match" key={match.id}>
                <strong>{Math.round(match.similarityScore * 100)}%</strong>
                <div>
                  <p>{match.lostTitle}</p>
                  <p>{match.foundTitle}</p>
                  <div className="reason-list">
                    {match.reasons.map((reason) => (
                      <span key={reason}>{reason}</span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}

function App() {
  if (!amplifyConfigured) {
    return <SetupScreen />;
  }

  return (
    <Authenticator.Provider>
      <AppContent />
    </Authenticator.Provider>
  );
}

function AppContent() {
  const { authStatus } = useAuthenticator((context) => [context.authStatus]);

  if (authStatus !== 'authenticated') {
    return <PublicApp />;
  }

  return (
    <Authenticator loginMechanisms={['email']}>
      {({ signOut, user }) => (user ? <AuthenticatedApp signOut={() => signOut?.()} user={user} /> : <PublicApp />)}
    </Authenticator>
  );
}

export default App;
