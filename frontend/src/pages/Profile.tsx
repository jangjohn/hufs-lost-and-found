import { useEffect, useState } from 'react';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import LoadingSpinner from '../components/LoadingSpinner';
import SubscriptionManager from '../components/SubscriptionManager';
import { useAuth } from '../hooks/useAuth';
import { useNotification } from '../hooks/useNotification';
import { db } from '../lib/firebase';
import type { User } from '../lib/types';

export default function Profile() {
  const { user } = useAuth();
  const { permission, requestPermission } = useNotification(user?.uid);
  const [userData, setUserData] = useState<User | null>(null);
  const [postedItemsCount, setPostedItemsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    (async () => {
      const [userSnap, postsSnap] = await Promise.all([
        getDoc(doc(db, 'users', user.uid)),
        getDocs(query(collection(db, 'items'), where('userId', '==', user.uid))),
      ]);

      if (userSnap.exists()) {
        setUserData({ uid: userSnap.id, ...userSnap.data() } as User);
      }
      setPostedItemsCount(postsSnap.size);
      setLoading(false);
    })();
  }, [user]);

  if (!user) return null;
  if (loading) return <LoadingSpinner label="Loading profile" fullScreen />;

  return (
    <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="space-y-6">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <span className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
            Account
          </span>
          <h1 className="mt-4 text-3xl font-bold text-slate-900">Profile</h1>
          <div className="mt-6 space-y-3 text-sm text-slate-600">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Name</p>
              <p className="mt-2 text-base font-medium text-slate-900">{user.displayName ?? 'No display name'}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Email</p>
              <p className="mt-2 text-base font-medium text-slate-900">{user.email}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Posted items</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">{postedItemsCount}</p>
            <p className="mt-2 text-sm text-slate-500">Total lost or found posts created from this account.</p>
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Push notifications</p>
            <p className="mt-3 text-lg font-semibold text-slate-900">
              {permission === 'granted' ? 'Enabled' : permission === 'denied' ? 'Blocked' : 'Not enabled'}
            </p>
            <p className="mt-2 text-sm text-slate-500">Enable notifications to hear about new relevant posts and match results.</p>
            {permission !== 'granted' ? (
              <button
                onClick={requestPermission}
                className="mt-4 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Enable notifications
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        {userData ? (
          <SubscriptionManager userId={user.uid} subscriptions={userData.subscriptions} />
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
            Profile details are unavailable right now.
          </div>
        )}
      </div>
    </section>
  );
}
