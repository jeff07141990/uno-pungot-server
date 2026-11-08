import { doc, getDoc, setDoc } from 'firebase/firestore';
import { firebaseState } from '../firebase/config';
import { PlayerWallet } from '../engine/types';

class FirestoreStorageService {
  /**
   * Save or sync wallet document directly to Firestore under users/{userId}.
   */
  public async saveWallet(userId: string, wallet: PlayerWallet): Promise<boolean> {
    if (!firebaseState.db || !userId) return false;
    try {
      const userRef = doc(firebaseState.db, 'users', userId);
      await setDoc(
        userRef,
        {
          wallet,
          lastUpdated: Date.now(),
        },
        { merge: true }
      );
      return true;
    } catch (err) {
      console.warn('Firestore wallet save failed (offline or permissions):', err);
      return false;
    }
  }

  /**
   * Fetch wallet document from Firestore for this user.
   */
  public async getWallet(userId: string): Promise<PlayerWallet | null> {
    if (!firebaseState.db || !userId) return null;
    try {
      const userRef = doc(firebaseState.db, 'users', userId);
      const snapshot = await getDoc(userRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data?.wallet) {
          return data.wallet as PlayerWallet;
        }
      }
      return null;
    } catch (err) {
      console.warn('Firestore wallet fetch failed:', err);
      return null;
    }
  }
}

export const firestoreStorage = new FirestoreStorageService();
