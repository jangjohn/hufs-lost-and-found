/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/12.1.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.1.0/firebase-messaging-compat.js');

const params = new URL(self.location.href).searchParams;
const firebaseConfig = {
  apiKey: params.get('apiKey'),
  authDomain: params.get('authDomain'),
  projectId: params.get('projectId'),
  storageBucket: params.get('storageBucket'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId'),
};

const hasFirebaseConfig = firebaseConfig.apiKey
  && firebaseConfig.projectId
  && firebaseConfig.messagingSenderId
  && firebaseConfig.appId;

if (hasFirebaseConfig) {
  firebase.initializeApp(firebaseConfig);

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const { title, body } = payload.notification ?? {};
    if (!title) return;

    self.registration.showNotification(title, {
      body: body ?? '',
      icon: '/favicon.svg',
      data: {
        link: payload.fcmOptions?.link ?? payload.data?.link ?? '/',
      },
    });
  });
}

self.addEventListener('notificationclick', (event) => {
  const link = event.notification?.data?.link ?? '/';
  event.notification?.close();

  event.waitUntil((async () => {
    const windowClients = await clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    });

    for (const client of windowClients) {
      if ('focus' in client) {
        await client.navigate(link);
        return client.focus();
      }
    }

    if (clients.openWindow) {
      return clients.openWindow(link);
    }

    return undefined;
  })());
});
