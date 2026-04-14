import { useMemo, useState } from 'react';
import type { ItemCategory, ItemType } from '../lib/types';
import { CATEGORIES, LOCATIONS } from '../lib/types';
import ImageUploader from './ImageUploader';

const TITLE_LIMIT = 80;
const DESCRIPTION_LIMIT = 500;
const QUESTION_LIMIT = 120;
const ANSWER_LIMIT = 120;

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

    if (!form.title.trim()) nextErrors.title = 'Enter a clear title for the item.';
    if (!form.description.trim()) nextErrors.description = 'Describe the item so others can recognize it.';
    if (!form.location) nextErrors.location = 'Select the place where it was lost or found.';
    if (!form.lostDate) nextErrors.lostDate = 'Choose the relevant date.';
    if (!form.verificationQ.trim()) nextErrors.verificationQ = 'Add a question only the real owner can answer.';
    if (!form.verificationA.trim()) nextErrors.verificationA = 'Add the expected answer.';

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
          <p className="text-sm font-semibold text-slate-900">Post type</p>
          <div className="mt-3 grid gap-3 min-[480px]:grid-cols-2">
            {([
              { value: 'lost', title: 'Lost item', description: 'Ask the campus community to help find it.' },
              { value: 'found', title: 'Found item', description: 'Report something you picked up and want to return.' },
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
            <FieldLabel>Title</FieldLabel>
            <span className="text-xs text-slate-400">{counters.title}</span>
          </div>
          <input
            type="text"
            required
            maxLength={TITLE_LIMIT}
            value={form.title}
            onChange={(event) => set('title', event.target.value)}
            className={fieldClass(Boolean(errors.title))}
            placeholder="Example: Black wallet near the library entrance"
          />
          {errors.title ? <p className="mt-1.5 text-xs text-rose-600">{errors.title}</p> : null}
        </div>

        <div className="sm:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <FieldLabel>Description</FieldLabel>
            <span className="text-xs text-slate-400">{counters.description}</span>
          </div>
          <textarea
            required
            rows={5}
            maxLength={DESCRIPTION_LIMIT}
            value={form.description}
            onChange={(event) => set('description', event.target.value)}
            className={fieldClass(Boolean(errors.description))}
            placeholder="Add color, brand, unique marks, and where it may have been seen."
          />
          {errors.description ? <p className="mt-1.5 text-xs text-rose-600">{errors.description}</p> : null}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-800">Category</label>
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
          <FieldLabel>Location</FieldLabel>
          <select
            required
            value={form.location}
            onChange={(event) => set('location', event.target.value)}
            className={fieldClass(Boolean(errors.location))}
          >
            <option value="">Select a campus location</option>
            {LOCATIONS.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
          {errors.location ? <p className="mt-1.5 text-xs text-rose-600">{errors.location}</p> : null}
        </div>

        <div className="sm:col-span-2">
          <FieldLabel>{form.type === 'lost' ? 'Lost date' : 'Found date'}</FieldLabel>
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
            <FieldLabel>Verification question</FieldLabel>
            <span className="text-xs text-slate-400">{counters.verificationQ}</span>
          </div>
          <input
            type="text"
            required
            maxLength={QUESTION_LIMIT}
            value={form.verificationQ}
            onChange={(event) => set('verificationQ', event.target.value)}
            className={fieldClass(Boolean(errors.verificationQ))}
            placeholder="Example: What sticker is on the case?"
          />
          {errors.verificationQ ? <p className="mt-1.5 text-xs text-rose-600">{errors.verificationQ}</p> : null}
        </div>

        <div className="sm:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <FieldLabel>Verification answer</FieldLabel>
            <span className="text-xs text-slate-400">{counters.verificationA}</span>
          </div>
          <input
            type="text"
            required
            maxLength={ANSWER_LIMIT}
            value={form.verificationA}
            onChange={(event) => set('verificationA', event.target.value)}
            className={fieldClass(Boolean(errors.verificationA))}
            placeholder="Only you and the owner should know this answer."
          />
          {errors.verificationA ? <p className="mt-1.5 text-xs text-rose-600">{errors.verificationA}</p> : null}
        </div>
      </div>

      <ImageUploader images={form.images} onChange={(files) => set('images', files)} />

      <div className="flex flex-col gap-3 rounded-2xl bg-slate-900 px-5 py-4 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">Review before posting</p>
          <p className="text-xs text-slate-300">Required fields are marked with an asterisk. Photos are optional but strongly recommended.</p>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Posting...' : 'Publish post'}
        </button>
      </div>
    </form>
  );
}
