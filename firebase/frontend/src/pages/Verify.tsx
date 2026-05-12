import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { getFunctions } from 'firebase/functions';
import { useAuth } from '../hooks/useAuth';
import { getItem } from '../hooks/useFirestore';
import type { Item } from '../lib/types';

const functions = getFunctions();
const verifyAnswerFn = httpsCallable<{ itemId: string; answer: string }, { success: boolean }>(
  functions,
  'verifyAnswer'
);

export default function Verify() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [item, setItem] = useState<Item | null>(null);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!id) return;
    getItem(id).then(setItem);
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id) return;
    setLoading(true);
    setMessage('');

    try {
      const result = await verifyAnswerFn({ itemId: id, answer });
      if (result.data.success) {
        setMessage('인증에 성공했습니다! 게시자에게 연락 정보가 전달됩니다.');
      } else {
        setMessage('답변이 일치하지 않습니다. 다시 시도해주세요.');
      }
      setAnswer('');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '제출에 실패했습니다.';
      setMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!item) return <p className="text-gray-500 text-sm">로딩 중...</p>;

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">본인 확인</h1>
      <p className="text-sm text-gray-600 mb-2">물품: {item.title}</p>

      <div className="bg-blue-50 p-4 rounded-md mb-4">
        <p className="text-sm font-medium text-blue-900">질문:</p>
        <p className="text-sm text-blue-700">{item.verificationQ}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          required
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          placeholder="답변을 입력하세요"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '제출 중...' : '제출하기'}
        </button>
      </form>

      {message && (
        <p className="mt-3 text-sm text-gray-700 bg-gray-50 p-3 rounded-md">{message}</p>
      )}

      <button
        onClick={() => navigate(-1)}
        className="mt-4 text-sm text-gray-500 hover:underline"
      >
        돌아가기
      </button>
    </div>
  );
}
