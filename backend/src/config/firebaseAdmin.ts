/**
 * Firebase Admin SDK bootstrap.
 *
 * Verifies Firebase ID tokens on protected routes. Credentials resolve in
 * order: SERVICE_ACCOUNT_PATH → GOOGLE_APPLICATION_CREDENTIALS → the default
 * ./credentials/service-account.json when it exists → Application Default
 * Credentials (e.g. a Cloud Run metadata server). Backend .env is loaded by
 * index.ts via dotenv.
 *
 * If nothing is available, admin stays uninitialized and protected routes
 * return 503 — unless AUTH_DEV_MODE=1 (local development only), which lets
 * requests through unverified with a loud warning.
 */
import { existsSync } from 'node:fs';
import { initializeApp, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const AUTH_DEV_MODE = process.env.AUTH_DEV_MODE === '1';
const DEFAULT_SERVICE_ACCOUNT_PATH = './credentials/service-account.json';
const serviceAccountPath =
  process.env.SERVICE_ACCOUNT_PATH ||
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  (existsSync(DEFAULT_SERVICE_ACCOUNT_PATH) ? DEFAULT_SERVICE_ACCOUNT_PATH : undefined);

let adminApp: App | null = null;

try {
  adminApp = serviceAccountPath
    ? initializeApp({ credential: cert(serviceAccountPath) })
    : initializeApp();
} catch {
  adminApp = null;
  console.warn(
    '[auth] firebase-admin not initialized — protected routes will return 503. ' +
      'Set SERVICE_ACCOUNT_PATH to a service-account JSON file (or rely on ADC), ' +
      'or AUTH_DEV_MODE=1 to skip verification in local development.'
  );
}

if (AUTH_DEV_MODE) {
  console.warn('[auth] ⚠ AUTH_DEV_MODE=1 — requests are NOT verified. Development only.');
}

export const isAdminReady = adminApp !== null;

export const getAdminAuth = () => {
  if (!adminApp) {
    throw new Error(
      'firebase-admin is not initialized (see SERVICE_ACCOUNT_PATH / AUTH_DEV_MODE)'
    );
  }
  return getAuth(adminApp);
};
