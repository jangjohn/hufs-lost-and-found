import { useState, useEffect } from 'react';
import { getToken } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, getMessagingInstance } from '../lib/firebase';

async function registerMessagingServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return undefined;
  }

  const swUrl = new URL('/firebase-messaging-sw.js', window.location.origin);
  swUrl.searchParams.set('apiKey', import.meta.env.VITE_FIREBASE_API_KEY ?? '');
  swUrl.searchParams.set('authDomain', import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '');
  swUrl.searchParams.set('projectId', import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '');
  swUrl.searchParams.set('storageBucket', import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '');
  swUrl.searchParams.set('messagingSenderId', import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '');
  swUrl.searchParams.set('appId', import.meta.env.VITE_FIREBASE_APP_ID ?? '');

  return navigator.serviceWorker.register(swUrl, { scope: '/' });
}

export function useNotification(userId: string | undefined) {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || permission !== 'granted') return;
    void registerToken(userId);
  }, [userId, permission]);

  const requestPermission = async () => {
    if (!userId || typeof Notification === 'undefined') return;

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

      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
        console.warn('Missing VITE_FIREBASE_VAPID_KEY; skipping FCM token registration.');
        return;
      }

      const serviceWorkerRegistration = await registerMessagingServiceWorker();
      const fcmToken = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration,
      });

      if (!fcmToken) return;

      setToken(fcmToken);
      await updateDoc(doc(db, 'users', uid), {
        fcmTokens: arrayUnion(fcmToken),
      });
    } catch (error) {
      console.error('Failed to register FCM token:', error);
    }
  };

  return { permission, token, requestPermission };
}
