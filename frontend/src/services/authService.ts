/**
 * Auth service — Firebase Auth + the Firestore `users/{uid}` profile.
 *
 * All sign-in/sign-up flows go through here; the zustand authStore wraps these
 * functions for UI state. This module is also the token owner: a single
 * onIdTokenChanged subscription keeps `cachedIdToken` fresh so network
 * services (e.g. mapAnalysisService) can attach it without touching the store.
 */
import { Platform } from 'react-native';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onIdTokenChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

/** Firestore document shape for `users/{uid}`. */
export interface UserProfileDoc {
  name: string;
  email: string | null;
  photoURL: string | null;
  provider: string;
  createdAt: ReturnType<typeof serverTimestamp>;
  lastLoginAt: ReturnType<typeof serverTimestamp>;
}

// ---------------------------------------------------------------------------
// Token cache — refreshed by onIdTokenChanged, consumed via getCachedIdToken.
// ---------------------------------------------------------------------------

let cachedIdToken: string | null = null;
let listenersStarted = false;

/** Idempotent one-time subscription (called from authStore.initAuth). */
export const initAuthListeners = (): void => {
  if (listenersStarted) return;
  listenersStarted = true;
  onIdTokenChanged(auth, () => {
    // Token rotated (or user signed out) — drop the cache so the next
    // getCachedIdToken read pulls a fresh token from the current user.
    cachedIdToken = null;
  });
};

/** The current user's ID token, cached and auto-refreshed (null when signed out). */
export const getCachedIdToken = async (forceRefresh = false): Promise<string | null> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      cachedIdToken = null;
      return null;
    }
    // Refresh whenever the token may have rotated since the last read.
    if (forceRefresh || !cachedIdToken) {
      cachedIdToken = await user.getIdToken();
    }
    return cachedIdToken;
  } catch {
    cachedIdToken = null;
    return null;
  }
};

// ---------------------------------------------------------------------------
// Firestore profile helpers — a profile write failure must never block login.
// ---------------------------------------------------------------------------

const providerIdOf = (user: User): string => user.providerData[0]?.providerId ?? 'password';

/** Create the profile doc on first sign-up (writes createdAt — no merge). */
const createProfileDoc = async (user: User, name: string): Promise<void> => {
  await setDoc(doc(db, 'users', user.uid), {
    name,
    email: user.email,
    photoURL: user.photoURL,
    provider: providerIdOf(user),
    createdAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
  } satisfies UserProfileDoc);
};

/** Update lastLoginAt on sign-in (merge — never touches createdAt). */
const touchProfileDoc = async (user: User): Promise<void> => {
  try {
    await setDoc(
      doc(db, 'users', user.uid),
      {
        name: user.displayName ?? user.email ?? 'User',
        email: user.email,
        photoURL: user.photoURL,
        provider: providerIdOf(user),
        lastLoginAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch {
    // Profile sync is best-effort — never block the actual sign-in.
  }
};

/** One-shot profile read for the store (may legitimately not exist yet). */
export const fetchProfileDoc = async (uid: string): Promise<UserProfileDoc | null> => {
  try {
    const snapshot = await getDoc(doc(db, 'users', uid));
    return snapshot.exists() ? (snapshot.data() as UserProfileDoc) : null;
  } catch {
    return null; // offline / rules / Firestore not provisioned — stay authenticated
  }
};

// ---------------------------------------------------------------------------
// Auth flows
// ---------------------------------------------------------------------------

export const registerWithEmail = async (
  name: string,
  email: string,
  password: string
): Promise<void> => {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(user, { displayName: name });
  try {
    await createProfileDoc(user, name);
  } catch {
    // Profile write is best-effort — the account itself is created.
  }
};

export const loginWithEmail = async (email: string, password: string): Promise<void> => {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  void touchProfileDoc(user);
};

export const loginWithGoogle = async (): Promise<void> => {
  if (Platform.OS !== 'web') {
    throw new Error('Google sign-in is only available on the web app for now.');
  }
  // Call synchronously inside the click handler path — awaits before
  // signInWithPopup let browsers treat it as a blocked popup.
  const { user } = await signInWithPopup(auth, new GoogleAuthProvider());
  void touchProfileDoc(user);
};

export const logout = async (): Promise<void> => {
  await signOut(auth);
};

export const resetPassword = async (email: string): Promise<void> => {
  await sendPasswordResetEmail(auth, email);
};

// ---------------------------------------------------------------------------
// Error mapping — Firebase codes to friendly copy for the modal banner.
// ---------------------------------------------------------------------------

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Incorrect email or password. Please try again.',
  'auth/user-not-found': 'No account found with this email. Try signing up instead.',
  'auth/wrong-password': 'Incorrect email or password. Please try again.',
  'auth/email-already-in-use': 'This email is already registered. Log in instead.',
  'auth/weak-password': 'Password should be at least 6 characters long.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'Network error — check your connection and try again.',
  'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
  'auth/popup-blocked': 'The sign-in popup was blocked. Allow popups for this site.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled for the project.',
  'auth/unauthorized-domain': 'This domain is not authorized for sign-in.',
  'auth/account-exists-with-different-credential':
    'An account already exists with this email using a different sign-in method.',
};

export const mapAuthError = (err: unknown): string => {
  const code = (err as { code?: string } | null)?.code;
  if (code && AUTH_ERROR_MESSAGES[code]) return AUTH_ERROR_MESSAGES[code];
  if (err instanceof Error && err.message && !err.message.startsWith('Firebase:')) {
    return err.message;
  }
  return 'Something went wrong. Please try again.';
};
