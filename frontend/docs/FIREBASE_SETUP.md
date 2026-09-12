# Firebase Setup — Sat AI (SIH2026)

One-time console steps for the auth modal, the Firestore `users` collection, and
backend token verification. Project: **satqueryai-7ebac** (https://console.firebase.google.com).

## 1. Enable sign-in providers

Authentication → Sign-in method:

- **Email/Password** → Enable
- **Google** → Enable (pick a support email when prompted)

## 2. Authorized domains (web)

Authentication → Settings → Authorized domains. `localhost` (any port, incl. `:8081`)
is auto-authorized. If you open the app via `127.0.0.1`, add it manually —
otherwise Google sign-in fails with `auth/unauthorized-domain`.

## 3. Create the Firestore database

Firestore Database → Create database → pick a location → **Production mode**.
The app writes each user's profile to `users/{uid}` on sign-up/sign-in.

## 4. Deploy the security rules

Paste the contents of `../firestore.rules` (repo root) into
Firestore Database → Rules → Publish. The rules allow each user to read/write
**only their own** `users/{uid}` document.

(Alternatively, with firebase-tools: `npx firebase-tools deploy --only firestore:rules`.)

## 5. Frontend config (already done — verify)

`frontend/.env` holds the web config as `EXPO_PUBLIC_FIREBASE_*` vars (public,
not secret). Ensure there are **no spaces around `=`**.

## 6. Service account for backend token verification

The Express backend verifies Firebase ID tokens with firebase-admin:

1. Project settings → **Service accounts** → **Generate new private key**.
2. Save the JSON as `backend/credentials/service-account.json` (gitignored).
3. Point the backend at it (PowerShell):
   `$env:SERVICE_ACCOUNT_PATH = ".\credentials\service-account.json"` (or set
   `SERVICE_ACCOUNT_PATH` in a `backend/.env`).

Without credentials, protected routes return **503** and the frontend falls back
to its local mock. `AUTH_DEV_MODE=1` skips verification for local development
with loud warnings — never in production.

## 7. Smoke test

`.expo/smoke-map.cjs` signs in as `smoke-test@sih2026.test` via the real modal
(creates the account on first run). The account already exists with the
in-file default password `SatAiSmoke123!` — later runs log in with it. If you
set `SMOKE_TEST_PASSWORD` to something else, delete the account first
(Authentication → Users) or the run fails on login.

```
node .expo/smoke-map.cjs          # default password
$env:SMOKE_TEST_PASSWORD = "x"; node .expo/smoke-map.cjs   # custom
```
