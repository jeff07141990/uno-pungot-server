import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, Auth, User } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { deviceStorage } from '../services/deviceStorage';

interface FirebaseState {
  app: FirebaseApp | null;
  auth: Auth | null;
  db: Firestore | null;
  isConfigured: boolean;
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseState: FirebaseState = {
  app: null,
  auth: null,
  db: null,
  isConfigured: Boolean(firebaseConfig.apiKey && firebaseConfig.projectId),
};

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
  // If Firebase is configured, use Firebase Auth
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
