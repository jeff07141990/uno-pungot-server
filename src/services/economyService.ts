import {
  CoinTransaction,
  DailyMission,
  PlayerWallet,
  PowerUpId,
  PowerUpItem,
} from '../engine/types';
import { networkManager } from './networkManager';

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

  public getCachedWallet(): PlayerWallet | null {
    if (this.cachedWallet) return this.cachedWallet;
    try {
      const local = localStorage.getItem('uno_player_wallet');
      if (local) {
        this.cachedWallet = JSON.parse(local);
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
    try {
      const url = `${networkManager.getHttpApiUrl()}/api/economy/wallet/${encodeURIComponent(
        playerId
      )}?name=${encodeURIComponent(playerName)}&avatar=${encodeURIComponent(playerAvatar)}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();

      this.cachedWallet = data.wallet;
      this.cachedCatalog = data.catalog;
      this.cachedMissions = data.missions || [];

      try {
        localStorage.setItem('uno_player_wallet', JSON.stringify(data.wallet));
      } catch {}

      this.notify();
      return data;
    } catch (err) {
      console.warn('Economy API unavailable, loading offline local wallet fallback:', err);
      // Fallback local wallet
      let wallet = this.getCachedWallet();
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
        localStorage.setItem('uno_player_wallet', JSON.stringify(wallet));
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
        localStorage.setItem('uno_player_wallet', JSON.stringify(data.wallet));
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
        localStorage.setItem('uno_player_wallet', JSON.stringify(data.wallet));
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
        localStorage.setItem('uno_player_wallet', JSON.stringify(data.wallet));
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
}

export const economyService = new EconomyService();
