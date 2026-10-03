// Handles push notifications while the app is closed or in the background.
// The Firebase Web config isn't a secret (it identifies the project, it
// doesn't authenticate anything). A service worker can't read
// import.meta.env, so the app passes it in the registration URL
// (src/lib/firebase.ts → firebaseServiceWorkerUrl). Before, this file had
// "REPLACE_WITH_..." placeholders and background push never worked.

importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

const params = new URL(self.location.href).searchParams;
const config = {
  apiKey: params.get('apiKey'),
  authDomain: params.get('authDomain'),
  projectId: params.get('projectId'),
  storageBucket: params.get('storageBucket'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId'),
};

if (config.apiKey && config.projectId && config.messagingSenderId && config.appId) {
  firebase.initializeApp(config);
  const messaging = firebase.messaging();

  // Mensagens com "notification" o próprio Firebase já mostra (e abre o
  // fcm_options.link ao tocar); aqui só as que vêm só com dados.
  messaging.onBackgroundMessage((payload) => {
    if (payload.notification) return;
    const { title, body } = payload.data || {};
    if (!title) return;

    self.registration.showNotification(title, {
      body: body || '',
      icon: '/favicon.ico',
      data: payload.data || {},
    });
  });
}

// Tocar na notificação abre a tela certa (data.url: consultas, chat, hábito...).
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  if (data.FCM_MSG) return; // notificação mostrada pelo Firebase: ele cuida do clique
  const target = typeof data.url === 'string' && data.url.startsWith('/') ? data.url : '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client && 'navigate' in client) {
          return client.navigate(target).then((c) => (c || client).focus());
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
