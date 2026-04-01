import { useState, useEffect } from 'react';
import { getToken } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, getMessagingInstance } from '../lib/firebase';

export function useNotification(userId: string | undefined) {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || permission !== 'granted') return;
    registerToken(userId);
  }, [userId, permission]);

  const requestPermission = async () => {
    if (!userId) return;

    const result = await Notification.requestPermission();
    setPermission(result);

    if (result === 'granted') {
      await registerToken(userId);
    }
  };

  const registerToken = async (uid: string) => {
    try {
      const messaging = await getMessagingInstance();
      if (!messaging) return;

      const fcmToken = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      });

      if (fcmToken) {
        setToken(fcmToken);
        // Firestore에 토큰 저장
        await updateDoc(doc(db, 'users', uid), {
          fcmTokens: arrayUnion(fcmToken),
        });
      }
    } catch (error) {
      console.error('FCM 토큰 등록 실패:', error);
    }
  };

  return { permission, token, requestPermission };
}
