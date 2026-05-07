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

interface Item {
  id: string;
  type: ItemType;
  status: ItemStatus;
  category: ItemCategory;
  title: string;
  description: string;
  location: string;
  lostDate: string;
  imageKeys: string[];
  imageUrls: string[];
  verificationQ: string;
  ownerName: string;
  createdAt: string;
}

interface Match {
  id: string;
  lostTitle: string;
  foundTitle: string;
  similarityScore: number;
  status: 'pending' | 'verified' | 'rejected';
}

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
  return error instanceof Error ? error.message : 'Unexpected AWS operation error';
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
    ownerName: record.ownerName ?? 'Cognito user',
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
        <p className="eyebrow">Amplify configuration required</p>
        <h1>AWS 백엔드 설정 파일이 아직 없습니다.</h1>
        <p className="muted">
          Cognito, DynamoDB/AppSync, S3를 사용하려면 Amplify Gen2가 생성하는 amplify_outputs.json이 필요합니다.
        </p>
        <pre>
          <code>npx ampx sandbox --outputs-out-dir src</code>
        </pre>
        <p className="muted">
          Amplify Hosting에서는 빌드 설정이 pipeline-deploy를 실행해 같은 파일을 생성하도록 구성되어 있습니다.
        </p>
      </section>
    </main>
  );
}

function PublicApp() {
  const [showSignIn, setShowSignIn] = useState(false);

  return (
    <main className="app-shell">
      <nav className="nav">
        <div>
          <strong>HUFS Lost & Found AWS</strong>
          <span>Amplify · Cognito · DynamoDB · S3</span>
        </div>
        <button className="secondary-button" type="button" onClick={() => setShowSignIn(true)}>
          Sign in
        </button>
      </nav>

      <section className="hero">
        <div>
          <p className="eyebrow">AWS migration version</p>
          <h1>교내 분실물 서비스를 먼저 둘러보세요.</h1>
          <p>
            게시글 등록, 실시간 게시판, 이미지 업로드는 Cognito 로그인 후 AWS 백엔드와 연결됩니다.
          </p>
        </div>
        <div className="login-card">
          <span>AWS backend ready</span>
          <strong>DynamoDB와 S3 작업은 로그인 후 사용할 수 있습니다.</strong>
          <button type="button" onClick={() => setShowSignIn(true)}>
            Continue with Cognito
          </button>
        </div>
      </section>

      <section className="grid public-grid">
        <article className="panel">
          <h2>분실물 등록</h2>
          <p className="muted">사진은 S3에 업로드되고 게시글은 AppSync/DynamoDB에 저장됩니다.</p>
        </article>
        <article className="panel">
          <h2>실시간 게시판</h2>
          <p className="muted">로그인한 학교 구성원이 등록된 분실물과 습득물을 확인합니다.</p>
        </article>
        <article className="panel">
          <h2>자동 매칭</h2>
          <p className="muted">카테고리와 장소를 기준으로 분실물과 습득물 후보를 계산합니다.</p>
        </article>
      </section>

      {showSignIn ? (
        <section className="panel auth-panel">
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
    return items.filter((item) => {
      const typeMatch = filter === 'all' || item.type === filter;
      const categoryMatch = category === 'all' || item.category === category;
      const q = query.trim().toLowerCase();
      const queryMatch = !q || `${item.title} ${item.description} ${item.location}`.toLowerCase().includes(q);
      return typeMatch && categoryMatch && queryMatch;
    });
  }, [category, filter, items, query]);

  const matches: Match[] = useMemo(() => {
    const lost = items.filter((item) => item.type === 'lost');
    const found = items.filter((item) => item.type === 'found');
    return lost.flatMap((lostItem) =>
      found
        .filter((foundItem) => lostItem.category === foundItem.category || lostItem.location === foundItem.location)
        .slice(0, 2)
        .map((foundItem) => ({
          id: `${lostItem.id}-${foundItem.id}`,
          lostTitle: lostItem.title,
          foundTitle: foundItem.title,
          similarityScore: lostItem.category === foundItem.category ? 0.91 : 0.73,
          status: 'pending' as const,
        })),
    );
  }, [items]);

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
          <strong>HUFS Lost & Found AWS</strong>
          <span>Amplify · Cognito · DynamoDB · S3</span>
        </div>
        <div className="nav-actions">
          <div className="nav-status">{displayName}</div>
          <button className="secondary-button" type="button" onClick={signOut}>
            Sign out
          </button>
        </div>
      </nav>

      <section className="hero">
        <div>
          <p className="eyebrow">AWS migration version</p>
          <h1>교내 분실물을 AWS 기반으로 관리합니다.</h1>
          <p>
            Cognito 인증 사용자만 게시글을 등록하고, 게시글 데이터는 AppSync/DynamoDB에 저장되며 이미지는 S3에
            업로드됩니다.
          </p>
        </div>
        <div className="login-card">
          <span>Signed in with Cognito</span>
          <strong>{displayName}</strong>
        </div>
      </section>

      {error ? <div className="error-banner">{error}</div> : null}

      <section className="grid two-columns">
        <form className="panel" onSubmit={createItem}>
          <h2>새 게시글 등록</h2>
          <div className="row">
            <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as ItemType })}>
              <option value="lost">Lost</option>
              <option value="found">Found</option>
            </select>
            <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as ItemCategory })}>
              {categories.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </div>
          <input placeholder="제목" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
          <textarea placeholder="상세 설명" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required />
          <div className="row">
            <input placeholder="장소" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} required />
            <input type="date" value={form.lostDate} onChange={(event) => setForm({ ...form, lostDate: event.target.value })} required />
          </div>
          <input
            key={fileInputKey}
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => setImageFiles(Array.from(event.target.files ?? []))}
          />
          <p className="file-help">{imageFiles.length ? `${imageFiles.length} image file(s) selected` : 'Images upload to S3.'}</p>
          <input placeholder="본인 확인 질문" value={form.verificationQ} onChange={(event) => setForm({ ...form, verificationQ: event.target.value })} required />
          <button disabled={saving}>{saving ? 'Saving to AWS...' : 'Upload to S3 & save to DynamoDB'}</button>
        </form>

        <section className="panel">
          <h2>예상 매칭</h2>
          {matches.length === 0 ? <p className="muted">아직 매칭 후보가 없습니다.</p> : null}
          <div className="match-list">
            {matches.map((match) => (
              <article className="match" key={match.id}>
                <strong>{Math.round(match.similarityScore * 100)}%</strong>
                <div>
                  <p>{match.lostTitle}</p>
                  <p>{match.foundTitle}</p>
                </div>
                <span>{match.status}</span>
              </article>
            ))}
          </div>
        </section>
      </section>

      <section className="panel board">
        <div className="board-header">
          <div>
            <h2>실시간 게시판</h2>
            <p className="muted">DynamoDB/AppSync에서 불러온 게시글입니다.</p>
          </div>
          <div className="filters">
            <select value={filter} onChange={(event) => setFilter(event.target.value as ItemType | 'all')}>
              <option value="all">All</option>
              <option value="lost">Lost</option>
              <option value="found">Found</option>
            </select>
            <select value={category} onChange={(event) => setCategory(event.target.value as ItemCategory | 'all')}>
              <option value="all">All categories</option>
              {categories.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
            <input placeholder="검색" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
        </div>
        {loading ? <p className="muted">Loading AWS data...</p> : null}
        {!loading && visibleItems.length === 0 ? <p className="muted">게시글이 없습니다.</p> : null}
        <div className="cards">
          {visibleItems.map((item) => (
            <article className="card" key={item.id}>
              {item.imageUrls[0] ? <img className="card-image" src={item.imageUrls[0]} alt="" /> : null}
              <span className={`badge ${item.type}`}>{item.type}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <dl>
                <div><dt>Category</dt><dd>{item.category}</dd></div>
                <div><dt>Location</dt><dd>{item.location}</dd></div>
                <div><dt>Date</dt><dd>{item.lostDate}</dd></div>
                <div><dt>S3 objects</dt><dd>{item.imageKeys.length}</dd></div>
              </dl>
              <p className="question">Q. {item.verificationQ}</p>
            </article>
          ))}
        </div>
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
