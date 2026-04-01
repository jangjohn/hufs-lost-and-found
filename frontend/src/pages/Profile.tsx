import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { useNotification } from '../hooks/useNotification';
import SubscriptionManager from '../components/SubscriptionManager';
import type { User } from '../lib/types';

export default function Profile() {
  const { user } = useAuth();
  const { permission, requestPermission } = useNotification(user?.uid);
  const [userData, setUserData] = useState<User | null>(null);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'users', user.uid)).then((snap) => {
      if (snap.exists()) {
        setUserData({ uid: snap.id, ...snap.data() } as User);
      }
    });
  }, [user]);

  if (!user) return null;

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">프로필</h1>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        <p className="text-sm text-gray-700">
          <span className="font-medium">이름:</span> {user.displayName}
        </p>
        <p className="text-sm text-gray-700">
          <span className="font-medium">이메일:</span> {user.email}
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        <h2 className="text-sm font-medium text-gray-700 mb-2">푸시 알림</h2>
        {permission === 'granted' ? (
          <p className="text-sm text-green-600">알림이 활성화되어 있습니다.</p>
        ) : (
          <button
            onClick={requestPermission}
            className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700"
          >
            알림 허용하기
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        {userData && (
          <SubscriptionManager
            userId={user.uid}
            subscriptions={userData.subscriptions}
          />
        )}
      </div>
    </div>
  );
}
