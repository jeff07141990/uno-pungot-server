import { doc, getDoc, setDoc } from 'firebase/firestore';
import { firebaseState } from '../firebase/config';
import { PlayerWallet } from '../engine/types';

class FirestoreStorageService {
  /**
   * Save or sync wallet document directly to Firestore under users/{userId}.
   */
  /**
   * Fetch wallet document from Firestore for this user.
   * If not found by userId, also searches by playerName to recover progress after APK updates!
   */
  public async getWallet(userId: string, playerName?: string): Promise<PlayerWallet | null> {
    if (!firebaseState.db || !userId) return null;
    try {
      // 1. Direct UID lookup
      const userRef = doc(firebaseState.db, 'users', userId);
      const snapshot = await getDoc(userRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data?.wallet) {
          return data.wallet as PlayerWallet;
        }
      }

      // 2. Name-based recovery from Firestore users/{clean_name}
      if (playerName && playerName !== 'Player' && playerName !== 'Player 1') {
        const cleanNameDoc = 'name_' + playerName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
        const nameRef = doc(firebaseState.db, 'users', cleanNameDoc);
        const nameSnap = await getDoc(nameRef);
        if (nameSnap.exists()) {
          const nameData = nameSnap.data();
          if (nameData?.wallet) {
            console.log('✨ Recovered player wallet from Cloud Firestore using Player Name:', playerName);
            return nameData.wallet as PlayerWallet;
          }
        }
      }
      return null;
    } catch (err) {
      console.warn('Firestore wallet fetch failed:', err);
      return null;
    }
  }

  /**
   * Save wallet under both userId and name-based backup key for guaranteed retention
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

      // Name-based recovery backup
      if (wallet.playerName && wallet.playerName !== 'Player' && wallet.playerName !== 'Player 1') {
        const cleanNameDoc = 'name_' + wallet.playerName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
        const nameRef = doc(firebaseState.db, 'users', cleanNameDoc);
        setDoc(nameRef, { wallet, lastUpdated: Date.now() }, { merge: true }).catch(() => {});
      }
      return true;
    } catch (err) {
      console.warn('Firestore wallet save failed (offline or permissions):', err);
      return false;
    }
  }
}

export const firestoreStorage = new FirestoreStorageService();
