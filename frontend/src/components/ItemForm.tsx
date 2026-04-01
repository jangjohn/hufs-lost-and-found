import { useState } from 'react';
import type { ItemType, ItemCategory } from '../lib/types';
import { CATEGORIES, LOCATIONS } from '../lib/types';
import ImageUploader from './ImageUploader';

export interface ItemFormData {
  type: ItemType;
  category: ItemCategory;
  title: string;
  description: string;
  location: string;
  lostDate: string;
  verificationQ: string;
  verificationA: string;
  images: File[];
}

interface Props {
  onSubmit: (data: ItemFormData) => Promise<void>;
  loading?: boolean;
}

export default function ItemForm({ onSubmit, loading }: Props) {
  const [form, setForm] = useState<ItemFormData>({
    type: 'lost',
    category: 'other',
    title: '',
    description: '',
    location: '',
    lostDate: new Date().toISOString().split('T')[0],
    verificationQ: '',
    verificationA: '',
    images: [],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(form);
  };

  const set = <K extends keyof ItemFormData>(key: K, value: ItemFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      <div className="flex gap-4">
        <label className="flex items-center gap-1">
          <input
            type="radio"
            name="type"
            value="lost"
            checked={form.type === 'lost'}
            onChange={() => set('type', 'lost')}
          />
          <span className="text-sm">분실했어요</span>
        </label>
        <label className="flex items-center gap-1">
          <input
            type="radio"
            name="type"
            value="found"
            checked={form.type === 'found'}
            onChange={() => set('type', 'found')}
          />
          <span className="text-sm">주웠어요</span>
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
        <input
          type="text"
          required
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          placeholder="예: 검정 지갑 분실"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
        <textarea
          required
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          rows={3}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          placeholder="물건의 특징을 자세히 설명해주세요"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">분류</label>
          <select
            value={form.category}
            onChange={(e) => set('category', e.target.value as ItemCategory)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">장소</label>
          <select
            required
            value={form.location}
            onChange={(e) => set('location', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">선택하세요</option>
            {LOCATIONS.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {form.type === 'lost' ? '분실 날짜' : '습득 날짜'}
        </label>
        <input
          type="date"
          required
          value={form.lostDate}
          onChange={(e) => set('lostDate', e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">본인 확인 질문</label>
        <input
          type="text"
          required
          value={form.verificationQ}
          onChange={(e) => set('verificationQ', e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          placeholder="예: 지갑 안에 있는 카드 개수는?"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">확인 질문 답변</label>
        <input
          type="text"
          required
          value={form.verificationA}
          onChange={(e) => set('verificationA', e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          placeholder="정답을 입력하세요"
        />
      </div>

      <ImageUploader images={form.images} onChange={(files) => set('images', files)} />

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? '등록 중...' : '등록하기'}
      </button>
    </form>
  );
}
