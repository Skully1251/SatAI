import { create } from 'zustand';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '../config/firebase';
import {
  fetchProfileDoc,
  initAuthListeners,
  loginWithEmail,
  loginWithGoogle,
  logout,
  mapAuthError,
  registerWithEmail,
  resetPassword,
} from '../services/authService';
import { useChatStore } from './chatStore';

/** The signed-in user as the app knows it (auth metadata + Firestore profile). */
export interface AuthUser {
  uid: string;
  name: string;
  email: string | null;
  photoURL: string | null;
  provider: string;
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';
export type AuthMode = 'login' | 'signup';
export type PostAuthAction = 'none' | 'goToChat';

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;

  // Auth modal state (rendered once at the app root, opened from anywhere).
  modalOpen: boolean;
  modalMode: AuthMode;
  modalError: string | null;
  modalBusy: boolean;
  /** What to do once auth succeeds (e.g. Get Started → jump straight to chat). */
  postAuthAction: PostAuthAction;

  openAuthModal: (mode: AuthMode, postAction?: PostAuthAction) => void;
  closeAuthModal: () => void;
  setModalMode: (mode: AuthMode) => void;

  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  resetPassword: (email: string) => Promise<boolean>;
  logout: () => Promise<void>;
  initAuth: () => void;
}

/** Derive the display user from the raw Firebase user (doc fetch may patch later). */
const toAuthUser = (user: FirebaseUser): AuthUser => ({
  uid: user.uid,
  name: user.displayName ?? user.email?.split('@')[0] ?? 'User',
  email: user.email,
  photoURL: user.photoURL,
  provider: user.providerData[0]?.providerId ?? 'password',
});

let initStarted = false;

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'loading',
  user: null,

  modalOpen: false,
  modalMode: 'login',
  modalError: null,
  modalBusy: false,
  postAuthAction: 'none',

  openAuthModal: (modalMode, postAction = 'none') =>
    set({ modalOpen: true, modalMode, modalError: null, postAuthAction: postAction }),

  closeAuthModal: () => set({ modalOpen: false, modalError: null }),

  setModalMode: (modalMode) => set({ modalMode, modalError: null }),

  login: async (email, password) => {
    set({ modalBusy: true, modalError: null });
    try {
      await loginWithEmail(email, password);
      return true;
    } catch (err) {
      set({ modalError: mapAuthError(err) });
      return false;
    } finally {
      set({ modalBusy: false });
    }
  },

  signup: async (name, email, password) => {
    set({ modalBusy: true, modalError: null });
    try {
      await registerWithEmail(name, email, password);
      return true;
    } catch (err) {
      set({ modalError: mapAuthError(err) });
      return false;
    } finally {
      set({ modalBusy: false });
    }
  },

  loginWithGoogle: async () => {
    set({ modalBusy: true, modalError: null });
    try {
      await loginWithGoogle();
      return true;
    } catch (err) {
      set({ modalError: mapAuthError(err) });
      return false;
    } finally {
      set({ modalBusy: false });
    }
  },

  resetPassword: async (email) => {
    set({ modalBusy: true, modalError: null });
    try {
      await resetPassword(email);
      return true;
    } catch (err) {
      set({ modalError: mapAuthError(err) });
      return false;
    } finally {
      set({ modalBusy: false });
    }
  },

  logout: async () => {
    try {
      await logout();
    } catch {
      // Even if the sign-out call fails, onAuthStateChanged will settle state.
    }
  },

  initAuth: () => {
    if (initStarted) return;
    initStarted = true;

    initAuthListeners();

    onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        set({ status: 'unauthenticated', user: null });
        return;
      }

      const { modalOpen, postAuthAction } = get();
      set({ status: 'authenticated', user: toAuthUser(firebaseUser) });

      // Patch the display user with the Firestore profile when it exists.
      const profile = await fetchProfileDoc(firebaseUser.uid);
      if (profile) {
        set((state) => ({
          user: state.user
            ? {
                ...state.user,
                name: profile.name ?? state.user.name,
                photoURL: profile.photoURL ?? state.user.photoURL,
              }
            : state.user,
        }));
      }

      // Successful auth while the modal is open → close it and, if the user
      // came via "Get Started", carry them into the chat view.
      if (modalOpen) {
        set({ modalOpen: false, modalError: null, modalBusy: false });
        if (postAuthAction === 'goToChat') {
          useChatStore.getState().setCurrentPage('chat');
        }
      }
    });
  },
}));
