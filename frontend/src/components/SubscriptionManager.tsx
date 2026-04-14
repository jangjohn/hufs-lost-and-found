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

    const nextSubscription: Subscription = { category, location };
    const updated = [...subs, nextSubscription];
    setSubs(updated);
    await updateDoc(doc(db, 'users', userId), { subscriptions: updated });
    setCategory('');
    setLocation('');
  };

  const handleRemove = async (index: number) => {
    const updated = subs.filter((_, currentIndex) => currentIndex !== index);
    setSubs(updated);
    await updateDoc(doc(db, 'users', userId), { subscriptions: updated });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Notification subscriptions</h3>
          <p className="mt-1 text-xs text-slate-500">Choose a category, a location, or both to receive focused alerts.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
          >
            <option value="">Any category</option>
            {CATEGORIES.map((categoryOption) => (
              <option key={categoryOption.value} value={categoryOption.value}>
                {categoryOption.label}
              </option>
            ))}
          </select>

          <select
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
          >
            <option value="">Any location</option>
            {LOCATIONS.map((locationOption) => (
              <option key={locationOption} value={locationOption}>
                {locationOption}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleAdd}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Add alert
          </button>
        </div>
      </div>

      <div className="grid gap-3">
        {subs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
            No subscriptions yet. Create one to get notified about new matching posts.
          </div>
        ) : (
          subs.map((sub, index) => (
            <div key={`${sub.category}-${sub.location}-${index}`} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {sub.category || 'Any category'}
                </p>
                <p className="text-sm text-slate-500">{sub.location || 'Any location'}</p>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="rounded-full border border-rose-200 px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
