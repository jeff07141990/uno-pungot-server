import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  linkWithPopup,
  Auth, 
  User 
} from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { deviceStorage } from '../services/deviceStorage';

interface FirebaseState {
  app: FirebaseApp | null;
  auth: Auth | null;
  db: Firestore | null;
  isConfigured: boolean;
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDlFT9ZihYH4eckT8oF-EkBemlI5xX2aOc',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'uno-pungot-edition.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'uno-pungot-edition',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'uno-pungot-edition.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '433936377963',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:433936377963:web:99c48654494e9d1d4be92e',
};

export const firebaseState: FirebaseState = {
  app: null,
  auth: null,
  db: null,
  isConfigured: Boolean(firebaseConfig.apiKey && firebaseConfig.projectId),
};

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

if (firebaseState.isConfigured) {
  try {
    firebaseState.app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    firebaseState.auth = getAuth(firebaseState.app);
    firebaseState.db = getFirestore(firebaseState.app);
    console.log('🔥 Firebase initialized successfully');
  } catch (err) {
    console.warn('Firebase initialization skipped or failed:', err);
    firebaseState.isConfigured = false;
  }
}

/**
 * Initializes anonymous guest session or retrieves existing auth token.
 */
export async function getOrCreateGuestSession(): Promise<{ uid: string; isAnonymous: boolean }> {
  // If user already logged in with Google or Auth
  if (firebaseState.isConfigured && firebaseState.auth) {
    try {
      if (firebaseState.auth.currentUser) {
        return {
          uid: firebaseState.auth.currentUser.uid,
          isAnonymous: firebaseState.auth.currentUser.isAnonymous,
        };
      }
      const cred = await signInAnonymously(firebaseState.auth);
      return { uid: cred.user.uid, isAnonymous: true };
    } catch (e) {
      console.warn('Firebase anonymous auth failed, falling back to local persistent UUID:', e);
    }
  }

  // Fallback: persistent local user ID stored across Native SharedPreferences & localStorage
  let localUid = await deviceStorage.getItem('uno_guest_uid');
  if (!localUid) {
    localUid = await deviceStorage.getItem('uno_persistent_uid');
  }

  if (!localUid) {
    localUid = 'usr_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
  }

  // Always write to both keys in native preferences and localStorage
  await deviceStorage.setItem('uno_guest_uid', localUid);
  await deviceStorage.setItem('uno_persistent_uid', localUid);

  return { uid: localUid, isAnonymous: true };
}

/**
 * Sign in or link with Google Account.
 * Returns the signed-in User object or throws an error.
 */
export async function signInWithGoogle(): Promise<User> {
  if (!firebaseState.auth) {
    throw new Error('Firebase Auth is not configured. Please verify your VITE_FIREBASE_API_KEY.');
  }

  try {
    // If user is currently guest/anonymous, try linking so stats carry over
    if (firebaseState.auth.currentUser && firebaseState.auth.currentUser.isAnonymous) {
      try {
        const result = await linkWithPopup(firebaseState.auth.currentUser, googleProvider);
        const user = result.user;
        await deviceStorage.setItem('uno_persistent_uid', user.uid);
        if (user.displayName) await deviceStorage.setItem('uno_player_name', user.displayName);
        return user;
      } catch (linkError: any) {
        // If credential is already used by an existing Google account, sign in directly
        if (linkError?.code === 'auth/credential-already-in-use') {
          const result = await signInWithPopup(firebaseState.auth, googleProvider);
          const user = result.user;
          await deviceStorage.setItem('uno_persistent_uid', user.uid);
          if (user.displayName) await deviceStorage.setItem('uno_player_name', user.displayName);
          return user;
        }
        throw linkError;
      }
    }

    const result = await signInWithPopup(firebaseState.auth, googleProvider);
    const user = result.user;
    await deviceStorage.setItem('uno_persistent_uid', user.uid);
    if (user.displayName) await deviceStorage.setItem('uno_player_name', user.displayName);
    return user;
  } catch (error: any) {
    console.error('Google Sign-in failed:', error);
    // User-friendly translation for common OAuth / WebView errors
    if (error?.message?.includes('missing initial state') || error?.code === 'auth/missing-initial-state') {
      throw new Error('Pansamantalang na-block ng in-app browser ang Google pop-up. Naka-save pa rin ang iyong coins at data sa cellphone storage.');
    }
    if (error?.code === 'auth/popup-closed-by-user') {
      throw new Error('Na-cancel ang Google Sign-In.');
    }
    if (error?.code === 'auth/popup-blocked') {
      throw new Error('Naka-block ang pop-up window sa browser. Paki-allow ang pop-up.');
    }
    throw error;
  }
}

/**
 * Sign out user.
 */
export async function logoutUser(): Promise<void> {
  if (firebaseState.auth) {
    await signOut(firebaseState.auth);
  }
}

