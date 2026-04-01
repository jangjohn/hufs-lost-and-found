import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CATEGORIES, LOCATIONS } from '../lib/types';
import type { Subscription } from '../lib/types';

interface Props {
  userId: string;
  subscriptions: Subscription[];
}

export default function SubscriptionManager({ userId, subscriptions }: Props) {
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [subs, setSubs] = useState<Subscription[]>(subscriptions);

  const handleAdd = async () => {
    if (!category && !location) return;

    const newSub: Subscription = { category, location };
    const updated = [...subs, newSub];
    setSubs(updated);

    await updateDoc(doc(db, 'users', userId), { subscriptions: updated });
    setCategory('');
    setLocation('');
  };

  const handleRemove = async (index: number) => {
    const updated = subs.filter((_, i) => i !== index);
    setSubs(updated);
    await updateDoc(doc(db, 'users', userId), { subscriptions: updated });
  };

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-700 mb-2">알림 구독 설정</h3>

      <div className="flex gap-2 mb-3">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="border border-gray-300 rounded-md px-2 py-1 text-sm"
        >
          <option value="">전체 분류</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <select
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="border border-gray-300 rounded-md px-2 py-1 text-sm"
        >
          <option value="">전체 장소</option>
          {LOCATIONS.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>
        <button
          onClick={handleAdd}
          className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700"
        >
          추가
        </button>
      </div>

      <ul className="space-y-1">
        {subs.map((sub, i) => (
          <li key={i} className="flex items-center justify-between bg-gray-50 px-3 py-1.5 rounded text-sm">
            <span>
              {sub.category || '전체 분류'} · {sub.location || '전체 장소'}
            </span>
            <button onClick={() => handleRemove(i)} className="text-red-500 text-xs hover:underline">
              삭제
            </button>
          </li>
        ))}
        {subs.length === 0 && <p className="text-xs text-gray-400">구독이 없습니다</p>}
      </ul>
    </div>
  );
}
