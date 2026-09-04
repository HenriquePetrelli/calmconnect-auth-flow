import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getMessaging, type Messaging } from 'firebase/messaging';

// Firebase Web config is not a secret (it's shipped to every browser by
// design) — it identifies the project, it doesn't authenticate anything.
// Fill these in after creating a Firebase project with Cloud Messaging
// enabled (Project Settings → General → Your apps → Web app). The VAPID
// key comes from Project Settings → Cloud Messaging → Web Push
// certificates.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const FIREBASE_VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;

export const isFirebaseConfigured = (): boolean =>
  Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.messagingSenderId && firebaseConfig.appId);

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

/** Lazily initializes Firebase — only once something actually asks for
 * push, and never at all if the project isn't configured. */
export const getFirebaseMessaging = (): Messaging | null => {
  if (!isFirebaseConfigured()) return null;
  if (!app) app = initializeApp(firebaseConfig);
  if (!messaging) messaging = getMessaging(app);
  return messaging;
};
