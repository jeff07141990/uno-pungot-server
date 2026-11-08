import {
  CoinTransaction,
  DailyMission,
  PlayerWallet,
  PowerUpId,
  PowerUpItem,
} from '../engine/types';
import { networkManager } from './networkManager';
import { deviceStorage } from './deviceStorage';
import { firestoreStorage } from './firestoreStorage';
import { getLevelFromXP } from '../utils/levelUtils';

class EconomyService {
  private cachedWallet: PlayerWallet | null = null;
  private cachedCatalog: Record<PowerUpId, PowerUpItem> | null = null;
  private cachedMissions: DailyMission[] = [];
  private listeners: Set<() => void> = new Set();

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }

  /**
   * Persist wallet to Native Preferences (Android SharedPreferences), localStorage, AND Firebase Cloud Firestore.
   * Keyed per-player (by Google UID or persistent UID) so records are safely isolated and permanent!
   */
  public saveWalletToStorage(wallet: PlayerWallet, specificPlayerId?: string): void {
    try {
      const pid = specificPlayerId || wallet.playerId;
      const json = JSON.stringify(wallet);
      // General fallback key
      deviceStorage.setItem('uno_player_wallet', json);
      deviceStorage.setItem('uno_player_wallet_backup', json);
      // Dedicated phone memory key bound to Google/Player UID
      if (pid) {
        deviceStorage.setItem(`uno_player_wallet_${pid}`, json);
        deviceStorage.setItem(`uno_player_wallet_backup_${pid}`, json);
        // Persist to Cloud Firestore (silent background save)
        firestoreStorage.saveWallet(pid, wallet).catch(() => {});
      }
      this.cachedWallet = wallet;
    } catch {}
  }

  public getCachedWallet(specificPlayerId?: string): PlayerWallet | null {
    // 1. Try reading dedicated player key from phone memory
    let local: string | null = null;
    try {
      if (specificPlayerId) {
        local =
          deviceStorage.getItemSync(`uno_player_wallet_${specificPlayerId}`) ||
          deviceStorage.getItemSync(`uno_player_wallet_backup_${specificPlayerId}`);
      }
      // 2. Fall back to generic keys
      if (!local) {
        local =
          deviceStorage.getItemSync('uno_player_wallet') ||
          deviceStorage.getItemSync('uno_player_wallet_backup');
      }

      if (local) {
        const parsed: PlayerWallet = JSON.parse(local);
        if (parsed) {
          // If in-memory cachedWallet has higher balance/xp/level, prioritize the higher one!
          if (
            this.cachedWallet &&
            (!specificPlayerId || this.cachedWallet.playerId === specificPlayerId) &&
            ((this.cachedWallet.balance || 0) > (parsed.balance || 0) ||
              (this.cachedWallet.experience || 0) > (parsed.experience || 0))
          ) {
            this.saveWalletToStorage(this.cachedWallet, specificPlayerId);
            return this.cachedWallet;
          }
          this.cachedWallet = parsed;
          return this.cachedWallet;
        }
      }
    } catch {}

    if (this.cachedWallet && (!specificPlayerId || this.cachedWallet.playerId === specificPlayerId)) {
      return this.cachedWallet;
    }
    return this.cachedWallet;
  }

  public getCachedCatalog(): Record<PowerUpId, PowerUpItem> | null {
    if (!this.cachedCatalog) {
      try {
        const stored = deviceStorage.getItemSync('uno_custom_catalog');
        if (stored) {
          this.cachedCatalog = JSON.parse(stored);
        }
      } catch {}
    }
    return this.cachedCatalog;
  }

  public getCachedMissions(): DailyMission[] {
    return this.cachedMissions;
  }

  public async fetchWallet(
    playerId: string,
    playerName: string = 'Player',
    playerAvatar: string = '🦊'
  ): Promise<{
    wallet: PlayerWallet;
    catalog: Record<PowerUpId, PowerUpItem>;
    missions: DailyMission[];
  }> {
    // 1. Retrieve local record from Phone memory and Cloud Firestore
    let localWallet = this.getCachedWallet(playerId);
    let firestoreWallet: PlayerWallet | null = null;
    try {
      firestoreWallet = await firestoreStorage.getWallet(playerId);
    } catch {}

    // Combine local & firestore: pick whichever has higher progress
    if (firestoreWallet) {
      if (!localWallet) {
        localWallet = firestoreWallet;
      } else {
        const fLevel = firestoreWallet.level || 1;
        const lLevel = localWallet.level || 1;
        const fBalance = firestoreWallet.balance || 0;
        const lBalance = localWallet.balance || 0;
        if (fLevel > lLevel || (fLevel === lLevel && fBalance > lBalance)) {
          localWallet = {
            ...localWallet,
            ...firestoreWallet,
            balance: Math.max(lBalance, fBalance),
            level: Math.max(lLevel, fLevel),
            experience: Math.max(localWallet.experience || 0, firestoreWallet.experience || 0),
          };
        }
      }
    }

    try {
      const url = `${networkManager.getHttpApiUrl()}/api/economy/wallet/${encodeURIComponent(
        playerId
      )}?name=${encodeURIComponent(playerName)}&avatar=${encodeURIComponent(playerAvatar)}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();

      // --- HYDRATION GUARD: Prioritize highest balance, level & XP across Phone + Cloud Firestore ---
      const serverWallet: PlayerWallet = data.wallet;
      const localBalance = localWallet?.balance || 0;
      const serverBalance = serverWallet?.balance || 0;
      const localLevel = localWallet?.level || 1;
      const serverLevel = serverWallet?.level || 1;
      const localExp = localWallet?.experience || 0;
      const serverExp = serverWallet?.experience || 0;

      const localIsHigherProgress =
        localWallet &&
        (localLevel > serverLevel || localExp > serverExp || localBalance > serverBalance);

      const walletToUse: PlayerWallet = localIsHigherProgress
        ? {
            ...localWallet!,
            playerId,
            playerName: playerName || localWallet!.playerName,
            playerAvatar: playerAvatar || localWallet!.playerAvatar,
            balance: Math.max(localBalance, serverBalance),
            level: Math.max(localLevel, serverLevel),
            experience: Math.max(localExp, serverExp),
            totalWins: Math.max(localWallet!.totalWins || 0, serverWallet.totalWins || 0),
            totalLosses: Math.max(localWallet!.totalLosses || 0, serverWallet.totalLosses || 0),
            winStreak: Math.max(localWallet!.winStreak || 0, serverWallet.winStreak || 0),
            bestWinStreak: Math.max(localWallet!.bestWinStreak || 0, serverWallet.bestWinStreak || 0),
          }
        : serverWallet;

      this.cachedWallet = walletToUse;
      this.cachedCatalog = data.catalog;
      this.cachedMissions = data.missions || [];

      this.saveWalletToStorage(walletToUse, playerId);

      // If local/cloud progress had more coins than server, asynchronously sync difference to server
      if (localBalance > serverBalance) {
        const diff = localBalance - serverBalance;
        this.adminAdjustBalance(playerId, diff, 'Sync offline earnings to server').catch(() => {});
      }

      this.notify();
      return { wallet: walletToUse, catalog: data.catalog, missions: data.missions || [] };
    } catch (err) {
      console.warn('Economy API unavailable, loading offline local wallet fallback:', err);
      // Fallback local wallet from phone memory
      let wallet = this.getCachedWallet(playerId);
      if (!wallet) {
        wallet = {
          playerId,
          playerName,
          playerAvatar,
          balance: 1000,
          totalWins: 0,
          totalLosses: 0,
          winStreak: 0,
          bestWinStreak: 0,
          level: 1,
          experience: 0,
          lastDailyClaimDate: null,
          inventory: {
            shield: 1,
            swap: 0,
            reverse: 0,
            color: 0,
            extra_turn: 0,
            peek: 1,
            booster: 0,
            reflect: 0,
          },
          achievements: ['welcome_aboard'],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        this.cachedWallet = wallet;
        this.saveWalletToStorage(wallet);
      }
      return {
        wallet: wallet as PlayerWallet,
        catalog: this.cachedCatalog || ({} as any),
        missions: this.cachedMissions,
      };
    }
  }

  public async claimDailyReward(
    playerId: string,
    name?: string,
    avatar?: string
  ): Promise<{ success: boolean; message: string; wallet?: PlayerWallet; coinsAdded?: number }> {
    try {
      const res = await fetch(`${networkManager.getHttpApiUrl()}/api/economy/daily-reward`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, name, avatar }),
      });
      const data = await res.json();
      if (data.wallet) {
        this.cachedWallet = data.wallet;
        this.saveWalletToStorage(data.wallet);
        this.notify();
      }
      return data;
    } catch (err: any) {
      return { success: false, message: 'Hindi makontak ang server para kunin ang reward.' };
    }
  }

  public async buyPowerUp(
    playerId: string,
    powerUpId: PowerUpId,
    quantity: number = 1
  ): Promise<{ success: boolean; message: string; wallet?: PlayerWallet }> {
    try {
      const res = await fetch(`${networkManager.getHttpApiUrl()}/api/economy/buy-powerup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, powerUpId, quantity }),
      });
      const data = await res.json();
      if (data.wallet) {
        this.cachedWallet = data.wallet;
        this.saveWalletToStorage(data.wallet);
        this.notify();
      }
      return data;
    } catch (err: any) {
      return { success: false, message: 'Hindi makontak ang tindahan. Subukan muli mamaya.' };
    }
  }

  public async claimMissionReward(
    playerId: string,
    missionId: string
  ): Promise<{ success: boolean; message: string; wallet?: PlayerWallet; reward?: number }> {
    try {
      const res = await fetch(`${networkManager.getHttpApiUrl()}/api/economy/claim-mission`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, missionId }),
      });
      const data = await res.json();
      if (data.wallet) {
        this.cachedWallet = data.wallet;
        this.saveWalletToStorage(data.wallet);
        this.notify();
      }
      return data;
    } catch (err: any) {
      return { success: false, message: 'Hindi ma-claim ang mission reward.' };
    }
  }

  public async getLeaderboards(): Promise<{
    topWins: PlayerWallet[];
    topStreaks: PlayerWallet[];
    topLevels: PlayerWallet[];
    topCoins: PlayerWallet[];
  }> {
    try {
      const res = await fetch(`${networkManager.getHttpApiUrl()}/api/economy/leaderboard`);
      return await res.json();
    } catch {
      return { topWins: [], topStreaks: [], topLevels: [], topCoins: [] };
    }
  }

  public async getAdminTransactions(): Promise<CoinTransaction[]> {
    try {
      const res = await fetch(`${networkManager.getHttpApiUrl()}/api/economy/admin/transactions?limit=100`);
      const data = await res.json();
      return data.transactions || [];
    } catch {
      return [];
    }
  }

  public async adminAdjustBalance(
    playerId: string,
    amount: number,
    reason: string
  ): Promise<{ success: boolean; message: string; wallet?: PlayerWallet }> {
    try {
      const res = await fetch(`${networkManager.getHttpApiUrl()}/api/economy/admin/adjust-balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, amount, reason }),
      });
      const data = await res.json();
      if (data.wallet) {
        this.cachedWallet = data.wallet;
        this.notify();
      }
      return data;
    } catch {
      return { success: false, message: 'Hindi naipadala ang admin adjustment.' };
    }
  }

  public async adminUpdateItem(
    powerUpId: PowerUpId,
    updates: Partial<PowerUpItem>
  ): Promise<{ success: boolean; item?: PowerUpItem }> {
    // 1. Immediately update local in-memory catalog
    if (!this.cachedCatalog) {
      this.cachedCatalog = this.getCachedCatalog();
    }
    if (this.cachedCatalog && this.cachedCatalog[powerUpId]) {
      this.cachedCatalog[powerUpId] = {
        ...this.cachedCatalog[powerUpId],
        ...updates,
      };
      // Save custom catalog overrides to persistent device storage
      try {
        deviceStorage.setItem('uno_custom_catalog', JSON.stringify(this.cachedCatalog));
      } catch {}
      this.notify();
    }

    // 2. Sync to online server
    try {
      const res = await fetch(`${networkManager.getHttpApiUrl()}/api/economy/admin/config-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ powerUpId, updates }),
      });
      const data = await res.json();
      if (data.success && data.item) {
        if (this.cachedCatalog) {
          this.cachedCatalog[powerUpId] = data.item;
          deviceStorage.setItem('uno_custom_catalog', JSON.stringify(this.cachedCatalog));
          this.notify();
        }
      }
      return { success: true, item: this.cachedCatalog ? this.cachedCatalog[powerUpId] : data.item };
    } catch {
      // Even if server is slow/offline, local persistent change succeeded!
      return { success: true, item: this.cachedCatalog ? this.cachedCatalog[powerUpId] : undefined };
    }
  }
  /**
   * Directly award experience locally (guaranteed offline progression).
   * Automatically calculates level up, awards level bonus coins, and permanently saves to device storage.
   */
  public addLocalExperience(xpAmount: number): { wallet: PlayerWallet; leveledUp: boolean; newLevel: number; bonus: number } {
    let wallet = this.getCachedWallet() || {
      playerId: 'local_player',
      playerName: 'Player',
      playerAvatar: '🦊',
      balance: 1000,
      totalWins: 0,
      totalLosses: 0,
      winStreak: 0,
      bestWinStreak: 0,
      level: 1,
      experience: 0,
      lastDailyClaimDate: null,
      inventory: {
        shield: 1,
        swap: 0,
        reverse: 0,
        color: 0,
        extra_turn: 0,
        peek: 1,
        booster: 0,
        reflect: 0,
      },
      achievements: ['welcome_aboard'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const oldLevel = wallet.level || 1;
    const newXP = (wallet.experience || 0) + Math.max(0, xpAmount);
    const calculatedLevel = getLevelFromXP(newXP);
    const leveledUp = calculatedLevel > oldLevel;
    let bonusCoins = 0;

    if (leveledUp) {
      bonusCoins = 100 * (calculatedLevel + 1);
    }

    const updatedWallet: PlayerWallet = {
      ...wallet,
      experience: newXP,
      level: calculatedLevel,
      balance: wallet.balance + bonusCoins,
      updatedAt: Date.now(),
    };

    this.cachedWallet = updatedWallet;
    this.saveWalletToStorage(updatedWallet);
    this.notify();

    return {
      wallet: updatedWallet,
      leveledUp,
      newLevel: calculatedLevel,
      bonus: bonusCoins,
    };
  }

  /**
   * Directly record match outcome and award coins locally (works 100% offline).
   */
  public addLocalMatchResult(
    won: boolean,
    coinsReward: number = 200,
    xpReward: number = 120,
    specificPlayerId?: string
  ): PlayerWallet {
    let wallet = this.getCachedWallet(specificPlayerId) || {
      playerId: specificPlayerId || 'local_player',
      playerName: 'Player',
      playerAvatar: '🦊',
      balance: 1000,
      totalWins: 0,
      totalLosses: 0,
      winStreak: 0,
      bestWinStreak: 0,
      level: 1,
      experience: 0,
      lastDailyClaimDate: null,
      inventory: {
        shield: 1,
        swap: 0,
        reverse: 0,
        color: 0,
        extra_turn: 0,
        peek: 1,
        booster: 0,
        reflect: 0,
      },
      achievements: ['welcome_aboard'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const currentWins = (wallet.totalWins || 0) + (won ? 1 : 0);
    const currentLosses = (wallet.totalLosses || 0) + (won ? 0 : 1);
    const currentStreak = won ? (wallet.winStreak || 0) + 1 : 0;
    const bestStreak = Math.max(wallet.bestWinStreak || 0, currentStreak);
    const addedCoins = won ? coinsReward : 20; // 20 coins consolation for participation

    const newXP = (wallet.experience || 0) + (won ? xpReward : 35);
    const newLevel = getLevelFromXP(newXP);
    const levelBonus = newLevel > wallet.level ? 100 * (newLevel + 1) : 0;

    const updatedWallet: PlayerWallet = {
      ...wallet,
      playerId: specificPlayerId || wallet.playerId,
      balance: wallet.balance + addedCoins + levelBonus,
      totalWins: currentWins,
      totalLosses: currentLosses,
      winStreak: currentStreak,
      bestWinStreak: bestStreak,
      experience: newXP,
      level: newLevel,
      updatedAt: Date.now(),
    };

    this.cachedWallet = updatedWallet;
    this.saveWalletToStorage(updatedWallet, specificPlayerId);
    this.notify();

    return updatedWallet;
  }
}

export const economyService = new EconomyService();
