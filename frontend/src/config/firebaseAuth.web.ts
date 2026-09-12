/**
 * Auth factory for web — plain getAuth (browserLocalPersistence, backed by
 * IndexedDB, is the Firebase web default).
 */
import { getAuth } from 'firebase/auth';
import type { FirebaseApp } from 'firebase/app';

export const getPlatformAuth = (app: FirebaseApp) => getAuth(app);
