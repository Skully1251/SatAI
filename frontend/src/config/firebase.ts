/**
 * Firebase bootstrap — app, auth, and Firestore singletons.
 *
 * Config comes from EXPO_PUBLIC_* vars in .env (see .env.example). Values are
 * trimmed defensively — a stray space after `=` in .env silently breaks auth.
 */
import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import type { Auth } from 'firebase/auth';
import { getPlatformAuth } from './firebaseAuth';

const FIREBASE_CONFIG_KEYS = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
] as const;

const env = (key: string): string | undefined => process.env[key]?.trim();

const missing = FIREBASE_CONFIG_KEYS.filter((key) => !env(key));
if (missing.length > 0) {
  throw new Error(
    `Firebase config missing — set ${missing.join(', ')} in frontend/.env ` +
      '(copy .env.example, then paste the web config from the Firebase console).'
  );
}

// getApps() guard keeps Fast Refresh from double-initializing the SDK.
const app: FirebaseApp =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        apiKey: env('EXPO_PUBLIC_FIREBASE_API_KEY')!,
        authDomain: env('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN')!,
        projectId: env('EXPO_PUBLIC_FIREBASE_PROJECT_ID')!,
        storageBucket: env('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET')!,
        messagingSenderId: env('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID')!,
        appId: env('EXPO_PUBLIC_FIREBASE_APP_ID')!,
      });

export const auth: Auth = getPlatformAuth(app);
export const db: Firestore = getFirestore(app);
export { app };
