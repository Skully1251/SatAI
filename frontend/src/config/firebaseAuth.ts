/**
 * Auth factory for native platforms (base module — Metro also falls back to
 * this file on platforms without a specific override).
 *
 * Persists the auth session in AsyncStorage via getReactNativePersistence,
 * per the Firebase RN setup guide. The web override lives in
 * firebaseAuth.web.ts (the browser build has no getReactNativePersistence).
 */
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import type { FirebaseApp } from 'firebase/app';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

export const getPlatformAuth = (app: FirebaseApp) => {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    });
  } catch (err) {
    // Fast Refresh re-runs the module — reuse the instance already registered.
    if ((err as { code?: string }).code === 'auth/already-initialized') {
      return getAuth(app);
    }
    throw err;
  }
};
