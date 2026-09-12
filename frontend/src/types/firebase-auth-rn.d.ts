/**
 * Ambient augmentation for the React Native build of Firebase Auth.
 *
 * `getReactNativePersistence` is only exported from the RN bundle
 * (`@firebase/auth/dist/rn`), but TypeScript resolves `firebase/auth` to the
 * shared `auth-public.d.ts` typings, which omit it. Metro picks the RN build
 * on native platforms, so the runtime export exists — this declaration just
 * makes the native config file (`src/config/firebaseAuth.ts`) typecheck.
 */
declare module 'firebase/auth' {
  interface ReactNativeAsyncStorage {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
  }

  function getReactNativePersistence(storage: ReactNativeAsyncStorage): Persistence;
}

// Make this file a module so the declaration above augments (not replaces)
// the resolved 'firebase/auth' module.
export {};
