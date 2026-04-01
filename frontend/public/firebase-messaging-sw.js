/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

if (!self.__FIREBASE_CONFIG__) {
  // 설정이 주입되지 않은 경우 service worker 정상 등록만 유지
  self.addEventListener('install', () => self.skipWaiting());
} else {
  firebase.initializeApp(self.__FIREBASE_CONFIG__);

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const { title, body } = payload.notification ?? {};
    if (title) {
      self.registration.showNotification(title, {
        body: body ?? '',
        icon: '/favicon.ico',
      });
    }
  });
}
