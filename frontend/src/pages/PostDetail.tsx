import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, limit, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getItem } from '../hooks/useFirestore';
import { useAuth } from '../hooks/useAuth';
import { CATEGORIES } from '../lib/types';
import type { Item, Match } from '../lib/types';

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [item, setItem] = useState<Item | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [imgIndex, setImgIndex] = useState(0);
  const [isVerified, setIsVerified] = useState(false);
  const [deleting, setDeleting] = useState(false);

useEffect(() => {
  if (!id) return;

  (async () => {
    try {
      const data = await getItem(id);
      setItem(data);

      if (data) {
        const field = data.type === 'lost' ? 'lostItemId' : 'foundItemId';
        const q = query(collection(db, 'matches'), where(field, '==', id));
        const snap = await getDocs(q);
        setMatches(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Match));
      }

      if (data && user) {
        const ownershipCheckQuery = query(
          collection(db, 'ownershipChecks'),
          where('itemId', '==', id),
          where('userId', '==', user.uid),
          limit(1)
        );

        const ownershipCheckSnap = await getDocs(ownershipCheckQuery);
        setIsVerified(!ownershipCheckSnap.empty);
      } else {
        setIsVerified(false);
      } 
    } catch (error) {
      console.error('PostDetail load error:', error);
      setIsVerified(false);
    } finally {
      setLoading(false);
    }
  })();
}, [id, user]);

const handleDelete = async () => {
  if (!id || !item || !user) return;

  const confirmed = window.confirm('이 게시글을 삭제하시겠습니까?');
  if (!confirmed) return;

  try {
    setDeleting(true);
    await deleteDoc(doc(db, 'items', id));
    alert('게시글이 삭제되었습니다.');
    navigate('/');
  } catch (error) {
    console.error('Delete error:', error);
    alert('게시글 삭제에 실패했습니다.');
  } finally {
    setDeleting(false);
  }
};

  if (loading) return <p className="text-gray-500 text-sm">로딩 중...</p>;
  if (!item) return <p className="text-gray-500">게시글을 찾을 수 없습니다.</p>;

  const categoryLabel = CATEGORIES.find((c) => c.value === item.category)?.label ?? item.category;
  const dateStr = item.lostDate?.toDate().toLocaleDateString('ko-KR') ?? '';

  return (
    <div className="max-w-2xl">
      {/* 이미지 슬라이드 */}
      {item.imageUrls.length > 0 && (
        <div className="mb-4">
          <img
            src={item.imageUrls[imgIndex]}
            alt={item.title}
            className="w-full max-h-80 object-contain bg-gray-100 rounded-lg"
          />
          {item.imageUrls.length > 1 && (
            <div className="flex justify-center gap-2 mt-2">
              {item.imageUrls.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setImgIndex(i)}
                  className={`w-2 h-2 rounded-full ${i === imgIndex ? 'bg-blue-600' : 'bg-gray-300'}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 mb-2">
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            item.type === 'lost' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}
        >
          {item.type === 'lost' ? '분실' : '습득'}
        </span>
        <span className="text-xs text-gray-500">{categoryLabel}</span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            item.status === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
          }`}
        >
          {item.status}
        </span>
      </div>

      <h1 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h1>
      <p className="text-sm text-gray-600 mb-4">{item.description}</p>

      <div className="text-sm text-gray-500 space-y-1 mb-6">
        <p>장소: {item.location}</p>
        <p>날짜: {dateStr}</p>
        <p>작성자: {item.userName}</p>
      </div>
      
      {/* 본인 확인 */}
      {user && user.uid !== item.userId && item.status === 'active' && !isVerified && (
        <Link
        to={`/verify/${item.id}`}
        className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700"
        >
          본인 확인하기
        </Link>
      )}
        
        {user && user.uid !== item.userId && item.status === 'active' && isVerified && (
          <div className="inline-block bg-green-50 text-green-700 px-4 py-2 rounded-md text-sm">
            본인 확인이 완료되었습니다.
          </div>
        )}

      {/* 삭제 버튼 */}
      {user && user.uid === item.userId && (
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="inline-block bg-red-600 text-white px-4 py-2 rounded-md text-sm hover:bg-red-700 disabled:opacity-50 ml-2"
      >
        {deleting ? '삭제 중...' : '삭제하기'}
      </button>
    )}

      {/* 매칭 결과 */}
      {matches.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">매칭 결과</h2>
          <div className="space-y-2">
            {matches.map((m) => (
              <div key={m.id} className="bg-gray-50 p-3 rounded-md text-sm flex justify-between items-center">
                <span>
                  유사도: {Math.round(m.similarityScore * 100)}% ({m.status})
                </span>
                <Link
                  to={`/item/${item.type === 'lost' ? m.foundItemId : m.lostItemId}`}
                  className="text-blue-600 hover:underline"
                >
                  상대 게시글 보기
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
