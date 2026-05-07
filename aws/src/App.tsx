import { FormEvent, useMemo, useState } from 'react';

type ItemType = 'lost' | 'found';
type ItemStatus = 'active' | 'matched' | 'resolved' | 'expired';
type ItemCategory = 'wallet' | 'phone' | 'card' | 'key' | 'bag' | 'book' | 'electronics' | 'clothing' | 'other';

interface Item {
  id: string;
  type: ItemType;
  status: ItemStatus;
  category: ItemCategory;
  title: string;
  description: string;
  location: string;
  lostDate: string;
  imageName: string;
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

const categories: ItemCategory[] = ['wallet', 'phone', 'card', 'key', 'bag', 'book', 'electronics', 'clothing', 'other'];
const storageKey = 'hufs-lost-found-aws-items';

const seedItems: Item[] = [
  {
    id: 'aws-demo-1',
    type: 'lost',
    status: 'active',
    category: 'card',
    title: '학생증을 찾습니다',
    description: '도서관 2층 근처에서 학생증을 잃어버렸습니다.',
    location: 'Library',
    lostDate: '2026-05-06',
    imageName: 'student-card.jpg',
    verificationQ: '학생증 뒷면 스티커 색상은?',
    ownerName: 'AWS Cognito User',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'aws-demo-2',
    type: 'found',
    status: 'active',
    category: 'electronics',
    title: '무선 이어폰 케이스 습득',
    description: '학생회관 카페 테이블에서 이어폰 케이스를 발견했습니다.',
    location: 'Student Center',
    lostDate: '2026-05-07',
    imageName: 'earbuds-case.jpg',
    verificationQ: '케이스에 붙어 있는 표시가 무엇인가요?',
    ownerName: 'AWS Cognito User',
    createdAt: new Date().toISOString(),
  },
];

function loadItems() {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return seedItems;
  try {
    return JSON.parse(raw) as Item[];
  } catch {
    return seedItems;
  }
}

function saveItems(items: Item[]) {
  localStorage.setItem(storageKey, JSON.stringify(items));
}

function App() {
  const [items, setItems] = useState<Item[]>(loadItems);
  const [email, setEmail] = useState('student@hufs.ac.kr');
  const [signedIn, setSignedIn] = useState(false);
  const [filter, setFilter] = useState<ItemType | 'all'>('all');
  const [category, setCategory] = useState<ItemCategory | 'all'>('all');
  const [query, setQuery] = useState('');
  const [form, setForm] = useState({
    type: 'lost' as ItemType,
    category: 'wallet' as ItemCategory,
    title: '',
    description: '',
    location: '',
    lostDate: new Date().toISOString().slice(0, 10),
    imageName: '',
    verificationQ: '',
  });

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
        }))
    );
  }, [items]);

  const signIn = (event: FormEvent) => {
    event.preventDefault();
    if (!email.endsWith('.ac.kr')) {
      alert('학교 이메일(.ac.kr)을 사용하세요.');
      return;
    }
    setSignedIn(true);
  };

  const createItem = (event: FormEvent) => {
    event.preventDefault();
    if (!signedIn) {
      alert('AWS Cognito 로그인 후 등록할 수 있습니다.');
      return;
    }

    const nextItems = [
      {
        id: crypto.randomUUID(),
        status: 'active' as const,
        ownerName: email,
        createdAt: new Date().toISOString(),
        ...form,
      },
      ...items,
    ];
    setItems(nextItems);
    saveItems(nextItems);
    setForm({
      type: 'lost',
      category: 'wallet',
      title: '',
      description: '',
      location: '',
      lostDate: new Date().toISOString().slice(0, 10),
      imageName: '',
      verificationQ: '',
    });
  };

  return (
    <main className="app-shell">
      <nav className="nav">
        <div>
          <strong>HUFS Lost & Found AWS</strong>
          <span>Amplify · Cognito · DynamoDB · S3</span>
        </div>
        <div className="nav-status">{signedIn ? email : 'Guest'}</div>
      </nav>

      <section className="hero">
        <div>
          <p className="eyebrow">AWS migration version</p>
          <h1>교내 분실물을 AWS 기반으로 관리합니다.</h1>
          <p>
            이 버전은 Firebase 프로젝트와 분리된 AWS 전용 제출본입니다. Amplify Gen2 백엔드는 Cognito 인증,
            DynamoDB 데이터 모델, S3 이미지 저장소로 구성됩니다.
          </p>
        </div>
        <form className="login-card" onSubmit={signIn}>
          <label>School email</label>
          <input value={email} onChange={(event) => setEmail(event.target.value)} />
          <button>{signedIn ? 'Signed in' : 'Sign in with Cognito flow'}</button>
        </form>
      </section>

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
          <input placeholder="S3 image object name" value={form.imageName} onChange={(event) => setForm({ ...form, imageName: event.target.value })} />
          <input placeholder="본인 확인 질문" value={form.verificationQ} onChange={(event) => setForm({ ...form, verificationQ: event.target.value })} required />
          <button>Upload to S3 & save to DynamoDB</button>
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
            <p className="muted">현재 화면은 local demo cache를 사용하며, Amplify 배포 시 schema가 DynamoDB/AppSync로 연결됩니다.</p>
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
        <div className="cards">
          {visibleItems.map((item) => (
            <article className="card" key={item.id}>
              <span className={`badge ${item.type}`}>{item.type}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <dl>
                <div><dt>Category</dt><dd>{item.category}</dd></div>
                <div><dt>Location</dt><dd>{item.location}</dd></div>
                <div><dt>Date</dt><dd>{item.lostDate}</dd></div>
                <div><dt>S3 object</dt><dd>{item.imageName || 'not uploaded'}</dd></div>
              </dl>
              <p className="question">Q. {item.verificationQ}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default App;
