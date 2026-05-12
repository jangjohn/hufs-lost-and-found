import { useMemo, useState } from 'react';
import type { ItemCategory, ItemType } from '../lib/types';
import { CATEGORIES, LOCATIONS } from '../lib/types';
import ImageUploader from './ImageUploader';

const locale = 'ko' as const;
const TITLE_LIMIT = 80;
const DESCRIPTION_LIMIT = 500;
const QUESTION_LIMIT = 120;
const ANSWER_LIMIT = 120;

const text = {
  ko: {
    typeTitle: '게시 유형',
    lostTitle: '분실물',
    lostDescription: '교내 구성원에게 분실물을 함께 찾아달라고 요청합니다.',
    foundTitle: '습득물',
    foundDescription: '주운 물건을 등록하고 주인을 찾습니다.',
    title: '제목',
    titlePlaceholder: '예: 도서관 입구 근처에서 검은 지갑을 잃어버렸어요',
    titleError: '물건을 알아볼 수 있는 제목을 입력해주세요.',
    description: '설명',
    descriptionPlaceholder: '색상, 브랜드, 특징, 마지막으로 본 장소 등을 자세히 적어주세요.',
    descriptionError: '물건을 식별할 수 있도록 자세히 설명해주세요.',
    category: '분류',
    location: '장소',
    locationPlaceholder: '교내 장소를 선택하세요',
    locationError: '분실하거나 습득한 장소를 선택해주세요.',
    lostDate: '분실 날짜',
    foundDate: '습득 날짜',
    dateError: '해당 날짜를 선택해주세요.',
    verificationQuestion: '본인 확인 질문',
    verificationQuestionPlaceholder: '예: 케이스에 붙어 있는 스티커는 무엇인가요?',
    verificationQuestionError: '실제 주인만 답할 수 있는 질문을 입력해주세요.',
    verificationAnswer: '본인 확인 답변',
    verificationAnswerPlaceholder: '본인과 실제 주인만 알 수 있는 답변을 입력하세요.',
    verificationAnswerError: '질문에 대한 답변을 입력해주세요.',
    reviewTitle: '게시 전에 한 번 더 확인하세요',
    reviewDescription: '필수 항목은 별표(*)로 표시됩니다. 사진은 선택 사항이지만 등록을 권장합니다.',
    posting: '등록 중...',
    publish: '게시글 등록',
  },
  en: {
    typeTitle: 'Post type',
    lostTitle: 'Lost item',
    lostDescription: 'Ask the campus community to help find it.',
    foundTitle: 'Found item',
    foundDescription: 'Report something you picked up and want to return.',
    title: 'Title',
    titlePlaceholder: 'Example: Black wallet near the library entrance',
    titleError: 'Enter a clear title for the item.',
    description: 'Description',
    descriptionPlaceholder: 'Add color, brand, unique marks, and where it may have been seen.',
    descriptionError: 'Describe the item so others can recognize it.',
    category: 'Category',
    location: 'Location',
    locationPlaceholder: 'Select a campus location',
    locationError: 'Select the place where it was lost or found.',
    lostDate: 'Lost date',
    foundDate: 'Found date',
    dateError: 'Choose the relevant date.',
    verificationQuestion: 'Verification question',
    verificationQuestionPlaceholder: 'Example: What sticker is on the case?',
    verificationQuestionError: 'Add a question only the real owner can answer.',
    verificationAnswer: 'Verification answer',
    verificationAnswerPlaceholder: 'Only you and the owner should know this answer.',
    verificationAnswerError: 'Add the expected answer.',
    reviewTitle: 'Review before posting',
    reviewDescription: 'Required fields are marked with an asterisk. Photos are optional but strongly recommended.',
    posting: 'Posting...',
    publish: 'Publish post',
  },
};

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

type FieldErrors = Partial<Record<'title' | 'description' | 'location' | 'lostDate' | 'verificationQ' | 'verificationA', string>>;

function fieldClass(hasError: boolean) {
  return [
    'w-full rounded-xl border px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition',
    hasError
      ? 'border-rose-300 bg-rose-50 focus:border-rose-400'
      : 'border-slate-200 bg-white focus:border-sky-400',
  ].join(' ');
}

function FieldLabel({ children }: { children: string }) {
  return (
    <label className="mb-1.5 block text-sm font-medium text-slate-800">
      {children} <span className="text-rose-500">*</span>
    </label>
  );
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
  const [errors, setErrors] = useState<FieldErrors>({});
  const t = text[locale];

  const counters = useMemo(() => ({
    title: `${form.title.length}/${TITLE_LIMIT}`,
    description: `${form.description.length}/${DESCRIPTION_LIMIT}`,
    verificationQ: `${form.verificationQ.length}/${QUESTION_LIMIT}`,
    verificationA: `${form.verificationA.length}/${ANSWER_LIMIT}`,
  }), [form.description.length, form.title.length, form.verificationA.length, form.verificationQ.length]);

  const set = <K extends keyof ItemFormData>(key: K, value: ItemFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key in errors) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const validate = () => {
    const nextErrors: FieldErrors = {};

    if (!form.title.trim()) nextErrors.title = t.titleError;
    if (!form.description.trim()) nextErrors.description = t.descriptionError;
    if (!form.location) nextErrors.location = t.locationError;
    if (!form.lostDate) nextErrors.lostDate = t.dateError;
    if (!form.verificationQ.trim()) nextErrors.verificationQ = t.verificationQuestionError;
    if (!form.verificationA.trim()) nextErrors.verificationA = t.verificationAnswerError;

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    await onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 sm:p-6">
        <div className="sm:col-span-2">
          <p className="text-sm font-semibold text-slate-900">{t.typeTitle}</p>
          <div className="mt-3 grid gap-3 min-[480px]:grid-cols-2">
            {([
              { value: 'lost', title: t.lostTitle, description: t.lostDescription },
              { value: 'found', title: t.foundTitle, description: t.foundDescription },
            ] as const).map((option) => (
              <label
                key={option.value}
                className={`cursor-pointer rounded-2xl border p-4 transition ${
                  form.type === option.value
                    ? 'border-sky-400 bg-sky-50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="type"
                  value={option.value}
                  checked={form.type === option.value}
                  onChange={() => set('type', option.value)}
                  className="sr-only"
                />
                <p className="text-sm font-semibold text-slate-900">{option.title}</p>
                <p className="mt-1 text-xs text-slate-500">{option.description}</p>
              </label>
            ))}
          </div>
        </div>

        <div className="sm:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <FieldLabel>{t.title}</FieldLabel>
            <span className="text-xs text-slate-400">{counters.title}</span>
          </div>
          <input
            type="text"
            required
            maxLength={TITLE_LIMIT}
            value={form.title}
            onChange={(event) => set('title', event.target.value)}
            className={fieldClass(Boolean(errors.title))}
            placeholder={t.titlePlaceholder}
          />
          {errors.title ? <p className="mt-1.5 text-xs text-rose-600">{errors.title}</p> : null}
        </div>

        <div className="sm:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <FieldLabel>{t.description}</FieldLabel>
            <span className="text-xs text-slate-400">{counters.description}</span>
          </div>
          <textarea
            required
            rows={5}
            maxLength={DESCRIPTION_LIMIT}
            value={form.description}
            onChange={(event) => set('description', event.target.value)}
            className={fieldClass(Boolean(errors.description))}
            placeholder={t.descriptionPlaceholder}
          />
          {errors.description ? <p className="mt-1.5 text-xs text-rose-600">{errors.description}</p> : null}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-800">{t.category}</label>
          <select
            value={form.category}
            onChange={(event) => set('category', event.target.value as ItemCategory)}
            className={fieldClass(false)}
          >
            {CATEGORIES.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel>{t.location}</FieldLabel>
          <select
            required
            value={form.location}
            onChange={(event) => set('location', event.target.value)}
            className={fieldClass(Boolean(errors.location))}
          >
            <option value="">{t.locationPlaceholder}</option>
            {LOCATIONS.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
          {errors.location ? <p className="mt-1.5 text-xs text-rose-600">{errors.location}</p> : null}
        </div>

        <div className="sm:col-span-2">
          <FieldLabel>{form.type === 'lost' ? t.lostDate : t.foundDate}</FieldLabel>
          <input
            type="date"
            required
            value={form.lostDate}
            onChange={(event) => set('lostDate', event.target.value)}
            className={fieldClass(Boolean(errors.lostDate))}
          />
          {errors.lostDate ? <p className="mt-1.5 text-xs text-rose-600">{errors.lostDate}</p> : null}
        </div>

        <div className="sm:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <FieldLabel>{t.verificationQuestion}</FieldLabel>
            <span className="text-xs text-slate-400">{counters.verificationQ}</span>
          </div>
          <input
            type="text"
            required
            maxLength={QUESTION_LIMIT}
            value={form.verificationQ}
            onChange={(event) => set('verificationQ', event.target.value)}
            className={fieldClass(Boolean(errors.verificationQ))}
            placeholder={t.verificationQuestionPlaceholder}
          />
          {errors.verificationQ ? <p className="mt-1.5 text-xs text-rose-600">{errors.verificationQ}</p> : null}
        </div>

        <div className="sm:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <FieldLabel>{t.verificationAnswer}</FieldLabel>
            <span className="text-xs text-slate-400">{counters.verificationA}</span>
          </div>
          <input
            type="text"
            required
            maxLength={ANSWER_LIMIT}
            value={form.verificationA}
            onChange={(event) => set('verificationA', event.target.value)}
            className={fieldClass(Boolean(errors.verificationA))}
            placeholder={t.verificationAnswerPlaceholder}
          />
          {errors.verificationA ? <p className="mt-1.5 text-xs text-rose-600">{errors.verificationA}</p> : null}
        </div>
      </div>

      <ImageUploader images={form.images} onChange={(files) => set('images', files)} />

      <div className="flex flex-col gap-3 rounded-2xl bg-slate-900 px-5 py-4 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">{t.reviewTitle}</p>
          <p className="text-xs text-slate-300">{t.reviewDescription}</p>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? t.posting : t.publish}
        </button>
      </div>
    </form>
  );
}
