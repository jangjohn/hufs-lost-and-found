import { useEffect, useState } from 'react';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import LoadingSpinner from '../components/LoadingSpinner';
import SubscriptionManager from '../components/SubscriptionManager';
import { useAuth } from '../hooks/useAuth';
import { useNotification } from '../hooks/useNotification';
import { db } from '../lib/firebase';
import type { User } from '../lib/types';

const locale = 'ko' as const;

const text = {
  ko: {
    loading: '프로필을 불러오는 중...',
    badge: '계정 정보',
    title: '프로필',
    name: '이름',
    noDisplayName: '표시 이름 없음',
    email: '이메일',
    postedItems: '작성한 게시글',
    postedItemsDescription: '이 계정으로 작성한 분실물 및 습득물 게시글 수입니다.',
    pushNotifications: '푸시 알림',
    enabled: '사용 중',
    blocked: '차단됨',
    notEnabled: '미설정',
    pushDescription: '관련 게시글이나 매칭 결과를 빠르게 받으려면 알림을 활성화하세요.',
    enableNotifications: '알림 활성화',
    profileUnavailable: '프로필 정보를 지금 불러올 수 없습니다.',
  },
  en: {
    loading: 'Loading profile',
    badge: 'Account',
    title: 'Profile',
    name: 'Name',
    noDisplayName: 'No display name',
    email: 'Email',
    postedItems: 'Posted items',
    postedItemsDescription: 'Total lost or found posts created from this account.',
    pushNotifications: 'Push notifications',
    enabled: 'Enabled',
    blocked: 'Blocked',
    notEnabled: 'Not enabled',
    pushDescription: 'Enable notifications to hear about new relevant posts and match results.',
    enableNotifications: 'Enable notifications',
    profileUnavailable: 'Profile details are unavailable right now.',
  },
};

export default function Profile() {
  const { user } = useAuth();
  const { permission, requestPermission } = useNotification(user?.uid);
  const [userData, setUserData] = useState<User | null>(null);
  const [postedItemsCount, setPostedItemsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const t = text[locale];

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
  if (loading) return <LoadingSpinner label={t.loading} fullScreen />;

  return (
    <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="space-y-6">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <span className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
            {t.badge}
          </span>
          <h1 className="mt-4 text-3xl font-bold text-slate-900">{t.title}</h1>
          <div className="mt-6 space-y-3 text-sm text-slate-600">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{t.name}</p>
              <p className="mt-2 text-base font-medium text-slate-900">{user.displayName ?? t.noDisplayName}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{t.email}</p>
              <p className="mt-2 text-base font-medium text-slate-900">{user.email}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{t.postedItems}</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">{postedItemsCount}</p>
            <p className="mt-2 text-sm text-slate-500">{t.postedItemsDescription}</p>
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{t.pushNotifications}</p>
            <p className="mt-3 text-lg font-semibold text-slate-900">
              {permission === 'granted' ? t.enabled : permission === 'denied' ? t.blocked : t.notEnabled}
            </p>
            <p className="mt-2 text-sm text-slate-500">{t.pushDescription}</p>
            {permission !== 'granted' ? (
              <button
                onClick={requestPermission}
                className="mt-4 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                {t.enableNotifications}
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
            {t.profileUnavailable}
          </div>
        )}
      </div>
    </section>
  );
}
