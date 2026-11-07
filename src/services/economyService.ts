import {
  CoinTransaction,
  DailyMission,
  PlayerWallet,
  PowerUpId,
  PowerUpItem,
} from '../engine/types';
import { networkManager } from './networkManager';
import { deviceStorage } from './deviceStorage';
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
   * Persist wallet to Native Preferences (Android SharedPreferences) & localStorage.
   * Keyed per-player (by Google UID or persistent UID) so records are safely isolated in phone memory.
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
      }
    } catch {}
  }

  public getCachedWallet(specificPlayerId?: string): PlayerWallet | null {
    if (this.cachedWallet && (!specificPlayerId || this.cachedWallet.playerId === specificPlayerId)) {
      return this.cachedWallet;
    }
    try {
      // 1. Try reading dedicated player key from phone memory
      let local: string | null = null;
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
          this.cachedWallet = parsed;
          this.saveWalletToStorage(parsed, specificPlayerId);
        }
      }
    } catch {}
    return this.cachedWallet;
  }

  public getCachedCatalog(): Record<PowerUpId, PowerUpItem> | null {
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
    // 1. First retrieve any local record bound to this Google UID / player ID in Phone memory
    const localWallet = this.getCachedWallet(playerId);

    try {
      const url = `${networkManager.getHttpApiUrl()}/api/economy/wallet/${encodeURIComponent(
        playerId
      )}?name=${encodeURIComponent(playerName)}&avatar=${encodeURIComponent(playerAvatar)}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();

      // --- PHONE MEMORY HYDRATION GUARD ---
      // If the phone's native storage has higher progress (level/coins/xp) than the server,
      // always prioritize the phone's local memory to prevent resetting!
      const serverWallet: PlayerWallet = data.wallet;
      const localIsHigherProgress =
        localWallet &&
        ((localWallet.level || 1) > (serverWallet.level || 1) ||
          (localWallet.experience || 0) > (serverWallet.experience || 0) ||
          (localWallet.balance || 0) > (serverWallet.balance || 0));

      const walletToUse: PlayerWallet = localIsHigherProgress
        ? {
            ...localWallet!,
            playerId,
            playerName: playerName || localWallet!.playerName,
            playerAvatar: playerAvatar || localWallet!.playerAvatar,
            balance: Math.max(localWallet!.balance || 0, serverWallet.balance || 0),
            level: Math.max(localWallet!.level || 1, serverWallet.level || 1),
            experience: Math.max(localWallet!.experience || 0, serverWallet.experience || 0),
          }
        : serverWallet;

      this.cachedWallet = walletToUse;
      this.cachedCatalog = data.catalog;
      this.cachedMissions = data.missions || [];

      this.saveWalletToStorage(walletToUse, playerId);
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
        wallet,
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
    try {
      const res = await fetch(`${networkManager.getHttpApiUrl()}/api/economy/admin/config-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ powerUpId, updates }),
      });
      return await res.json();
    } catch {
      return { success: false };
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
