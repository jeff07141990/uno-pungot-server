import fs from 'fs';
import path from 'path';
import {
  CoinTransaction,
  DailyMission,
  PlayerWallet,
  PowerUpId,
  PowerUpItem,
  PrizePayoutResult,
  TransactionType,
} from '../src/engine/types';

export const DEFAULT_POWER_UP_CATALOG: Record<PowerUpId, PowerUpItem> = {
  shield: {
    id: 'shield',
    name: 'Shield Protection',
    description: 'Block the next attack!',
    price: 100,
    icon: '🛡️',
    badge: 'Defense',
    enabled: true,
  },
  extra_turn: {
    id: 'extra_turn',
    name: 'Extra Turn',
    description: 'Play one more turn!',
    price: 250,
    icon: '⚡',
    badge: 'Special',
    enabled: true,
  },
  swap: {
    id: 'swap',
    name: 'Card Swap',
    description: 'Swap hands with another player!',
    price: 150,
    icon: '🔄',
    badge: 'Tactical',
    enabled: true,
  },
  color: {
    id: 'color',
    name: 'Color Changer',
    description: 'Change the color anytime!',
    price: 120,
    icon: '🎨',
    badge: 'Control',
    enabled: true,
  },
  reverse: {
    id: 'reverse',
    name: 'Reverse Master',
    description: 'Reverse the turn!',
    price: 100,
    icon: '🔁',
    badge: 'Control',
    enabled: true,
  },
  peek: {
    id: 'peek',
    name: 'Peek Card',
    description: "View a player's card!",
    price: 80,
    icon: '👁️',
    badge: 'Scout',
    enabled: true,
  },
  booster: {
    id: 'booster',
    name: 'Coin Booster',
    description: 'Earn extra coins!',
    price: 200,
    icon: '💰',
    badge: 'Reward',
    enabled: true,
  },
  reflect: {
    id: 'reflect',
    name: 'Attack Reflect',
    description: 'Send the attack back!',
    price: 180,
    icon: '🪞',
    badge: 'Defense',
    enabled: true,
  },
};

export const MISSION_DEFINITIONS = [
  {
    id: 'play_match',
    title: 'Play 1 Match',
    description: 'Complete 1 match against players or bots.',
    rewardCoins: 50,
    targetCount: 1,
  },
  {
    id: 'win_match',
    title: 'Victory Champion',
    description: 'Win 1 match (empty all your cards first).',
    rewardCoins: 100,
    targetCount: 1,
  },
  {
    id: 'use_powerup',
    title: 'Tactical Master',
    description: 'Use at least 1 Power-Up in any active game.',
    rewardCoins: 60,
    targetCount: 1,
  },
  {
    id: 'play_friends',
    title: 'Multiplayer Fun',
    description: 'Play a match with online human players.',
    rewardCoins: 80,
    targetCount: 1,
  },
];

interface EconomyDatabaseSchema {
  wallets: Record<string, PlayerWallet>;
  transactions: CoinTransaction[];
  catalog: Record<PowerUpId, PowerUpItem>;
  missions: Record<string, Record<string, DailyMission>>;
  systemConfig: {
    startingBalance: number;
    dailyLoginReward: number;
    matchVictoryReward: number;
    streakBonusBase: number;
  };
}

export class EconomyManager {
  private dataFilePath: string;
  private db: EconomyDatabaseSchema;

  constructor() {
    const dataDir = path.resolve(process.cwd(), 'server', 'data');
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch (e) {
        console.warn('Failed to create server data directory:', e);
      }
    }
    this.dataFilePath = path.join(dataDir, 'economy.json');
    this.db = this.loadDatabase();
  }

  private loadDatabase(): EconomyDatabaseSchema {
    try {
      if (fs.existsSync(this.dataFilePath)) {
        const raw = fs.readFileSync(this.dataFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          wallets: parsed.wallets || {},
          transactions: parsed.transactions || [],
          catalog: { ...DEFAULT_POWER_UP_CATALOG, ...(parsed.catalog || {}) },
          missions: parsed.missions || {},
          systemConfig: {
            startingBalance: 1000,
            dailyLoginReward: 100,
            matchVictoryReward: 200,
            streakBonusBase: 50,
            ...(parsed.systemConfig || {}),
          },
        };
      }
    } catch (e) {
      console.warn('Could not read existing economy.json, initializing fresh store:', e);
    }

    return {
      wallets: {},
      transactions: [],
      catalog: { ...DEFAULT_POWER_UP_CATALOG },
      missions: {},
      systemConfig: {
        startingBalance: 1000,
        dailyLoginReward: 100,
        matchVictoryReward: 200,
        streakBonusBase: 50,
      },
    };
  }

  private persistDatabase() {
    try {
      fs.writeFileSync(this.dataFilePath, JSON.stringify(this.db, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to write economy database to disk:', e);
    }
  }

  private getTodayDateKey(): string {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(
      now.getUTCDate()
    ).padStart(2, '0')}`;
  }

  public getOrCreateWallet(
    playerId: string,
    playerName: string = 'Player',
    playerAvatar: string = '🦊'
  ): PlayerWallet {
    if (!playerId) {
      throw new Error('playerId is required');
    }

    let wallet = this.db.wallets[playerId];
    if (!wallet) {
      // Recovery check: If user's browser/device generated a new guest UUID (e.g. after refresh/update),
      // look for an existing registered wallet matching this playerName so their hard-earned Level & Coins are never lost!
      const isTestUser = playerId.startsWith('test') || playerId.startsWith('p1_') || playerId.startsWith('p2_') || playerName.startsWith('XP Tester');
      if (!isTestUser && playerName && playerName !== 'Player' && playerName !== 'Player 1') {
        const existingId = Object.keys(this.db.wallets).find((id) => {
          if (id.startsWith('test') || id.startsWith('p1_') || id.startsWith('p2_')) return false;
          const w = this.db.wallets[id];
          return (
            w &&
            w.playerName &&
            w.playerName.trim().toLowerCase() === playerName.trim().toLowerCase() &&
            (w.level > 1 || w.balance > 1000 || (w.experience || 0) > 0)
          );
        });

        if (existingId) {
          const existingWallet = this.db.wallets[existingId];
          // Re-bind to current playerId and carry over all progress
          wallet = {
            ...existingWallet,
            playerId,
            playerAvatar: playerAvatar || existingWallet.playerAvatar,
            updatedAt: Date.now(),
          };
          this.db.wallets[playerId] = wallet;
          this.persistDatabase();
          return wallet;
        }
      }

      const startingBalance = this.db.systemConfig.startingBalance || 1000;
      wallet = {
        playerId,
        playerName,
        playerAvatar,
        balance: startingBalance,
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

      this.db.wallets[playerId] = wallet;

      this.recordTransaction(
        playerId,
        'WELCOME_BONUS',
        startingBalance,
        wallet.balance,
        'Welcome to UNO Pungot! ₱1,000 starting gift.'
      );

      this.persistDatabase();
    } else {
      let changed = false;
      if (playerName && wallet.playerName !== playerName) {
        wallet.playerName = playerName;
        changed = true;
      }
      if (playerAvatar && wallet.playerAvatar !== playerAvatar) {
        wallet.playerAvatar = playerAvatar;
        changed = true;
      }
      for (const key of Object.keys(DEFAULT_POWER_UP_CATALOG) as PowerUpId[]) {
        if (typeof wallet.inventory[key] !== 'number') {
          wallet.inventory[key] = 0;
          changed = true;
        }
      }
      if (changed) {
        wallet.updatedAt = Date.now();
        this.persistDatabase();
      }
    }

    return wallet;
  }

  public getWallet(playerId: string): PlayerWallet | null {
    return this.db.wallets[playerId] || null;
  }

  private recordTransaction(
    playerId: string,
    type: TransactionType,
    amount: number,
    balanceAfter: number,
    description: string
  ): CoinTransaction {
    const tx: CoinTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      playerId,
      type,
      amount,
      balanceAfter,
      description,
      timestamp: Date.now(),
    };

    this.db.transactions.unshift(tx);
    if (this.db.transactions.length > 500) {
      this.db.transactions = this.db.transactions.slice(0, 500);
    }
    return tx;
  }

  public claimDailyReward(
    playerId: string,
    playerName?: string,
    playerAvatar?: string
  ): { success: boolean; message: string; wallet?: PlayerWallet; coinsAdded?: number } {
    const wallet = this.getOrCreateWallet(playerId, playerName, playerAvatar);
    const today = this.getTodayDateKey();

    if (wallet.lastDailyClaimDate === today) {
      return {
        success: false,
        message: 'Nakuha mo na ang iyong Daily Reward ngayong araw! Bumalik muli bukas.',
        wallet,
      };
    }

    const reward = this.db.systemConfig.dailyLoginReward || 100;
    wallet.balance += reward;
    wallet.lastDailyClaimDate = today;
    wallet.updatedAt = Date.now();
    this.addExperience(wallet, 25);

    this.recordTransaction(
      playerId,
      'DAILY_LOGIN',
      reward,
      wallet.balance,
      `Daily Login Reward for ${today} (+₱${reward})`
    );

    this.persistDatabase();

    return {
      success: true,
      message: `Nakuha mo ang +₱${reward} Daily Login Reward!`,
      wallet,
      coinsAdded: reward,
    };
  }

  public buyPowerUp(
    playerId: string,
    powerUpId: PowerUpId,
    quantity: number = 1
  ): { success: boolean; message: string; wallet?: PlayerWallet } {
    const wallet = this.getOrCreateWallet(playerId);
    const item = this.db.catalog[powerUpId] || DEFAULT_POWER_UP_CATALOG[powerUpId];

    if (!item || item.enabled === false) {
      // Auto-enable if it's a valid default powerup
      if (item) {
        item.enabled = true;
        this.persistDatabase();
      } else {
        return { success: false, message: 'Ang item na ito ay kasalukuyang hindi magagamit.', wallet };
      }
    }

    if (quantity <= 0 || !Number.isInteger(quantity)) {
      return { success: false, message: 'Maling quantity ng bibilhin.', wallet };
    }

    const totalCost = item.price * quantity;
    if (wallet.balance < totalCost) {
      return {
        success: false,
        message: `Kulang ang iyong barya! Kailangan ng ₱${totalCost}, ngunit mayroon ka lamang ₱${wallet.balance}.`,
        wallet,
      };
    }

    wallet.balance -= totalCost;
    wallet.inventory[powerUpId] = (wallet.inventory[powerUpId] || 0) + quantity;
    wallet.updatedAt = Date.now();
    this.addExperience(wallet, 15 * quantity);

    this.recordTransaction(
      playerId,
      'POWERUP_PURCHASE',
      -totalCost,
      wallet.balance,
      `Binili ang ${quantity}x ${item.name} (-₱${totalCost})`
    );

    this.persistDatabase();

    return {
      success: true,
      message: `Matagumpay na nabili ang ${quantity}x ${item.name} para sa ₱${totalCost}!`,
      wallet,
    };
  }

  public consumePowerUp(
    playerId: string,
    powerUpId: PowerUpId
  ): { success: boolean; message?: string; wallet?: PlayerWallet } {
    const wallet = this.getOrCreateWallet(playerId);
    const owned = wallet.inventory[powerUpId] || 0;

    if (owned <= 0) {
      return { success: false, message: 'Wala kang natitirang stock ng Power-Up na ito.' };
    }

    wallet.inventory[powerUpId] = owned - 1;
    wallet.updatedAt = Date.now();
    this.addExperience(wallet, 10);
    this.trackMissionProgress(playerId, 'use_powerup', 1);

    this.persistDatabase();
    return { success: true, wallet };
  }

  public awardMatchFinish(
    winnerId: string,
    loserId: string | null,
    allPlayerIds: string[],
    hasCoinBooster: boolean = false,
    finishOrder: string[] = []
  ): {
    winnerCoins: number;
    streak: number;
    updatedWallets: Record<string, PlayerWallet>;
    levelUps: Record<string, { oldLevel: number; newLevel: number; bonus: number }>;
    xpGains: Record<string, number>;
  } {
    let winnerReward = 0;
    let currentStreak = 0;
    const updatedWallets: Record<string, PlayerWallet> = {};
    const levelUps: Record<string, { oldLevel: number; newLevel: number; bonus: number }> = {};
    const xpGains: Record<string, number> = {};

    if (winnerId) {
      const winnerWallet = this.getOrCreateWallet(winnerId);
      winnerWallet.totalWins += 1;
      winnerWallet.winStreak += 1;
      currentStreak = winnerWallet.winStreak;
      if (winnerWallet.winStreak > winnerWallet.bestWinStreak) {
        winnerWallet.bestWinStreak = winnerWallet.winStreak;
      }

      const baseReward = this.db.systemConfig.matchVictoryReward || 200;
      let totalAward = hasCoinBooster ? baseReward * 2 : baseReward;

      let streakBonus = 0;
      if (winnerWallet.winStreak >= 2) {
        streakBonus = Math.min((winnerWallet.winStreak - 1) * this.db.systemConfig.streakBonusBase, 200);
        totalAward += streakBonus;
      }

      winnerWallet.balance += totalAward;
      const winnerXP = hasCoinBooster ? 240 : 120;
      const lvlRes = this.addExperience(winnerWallet, winnerXP);
      xpGains[winnerId] = winnerXP;
      if (lvlRes.leveledUp) {
        levelUps[winnerId] = { oldLevel: lvlRes.oldLevel, newLevel: lvlRes.newLevel, bonus: lvlRes.bonusCoins };
      }

      this.checkAchievements(winnerWallet);
      this.trackMissionProgress(winnerId, 'play_match', 1);
      this.trackMissionProgress(winnerId, 'win_match', 1);
      if (allPlayerIds.length > 1) {
        this.trackMissionProgress(winnerId, 'play_friends', 1);
      }

      this.recordTransaction(
        winnerId,
        'MATCH_VICTORY',
        totalAward,
        winnerWallet.balance,
        `1st Place Victory Reward! (+₱${baseReward}${hasCoinBooster ? ' x2 Booster' : ''}${
          streakBonus > 0 ? ` + ₱${streakBonus} Streak Bonus` : ''
        })`
      );

      winnerReward = totalAward;
      if (!winnerId.startsWith('bot-')) {
        updatedWallets[winnerId] = winnerWallet;
      }
    }

    for (const pid of allPlayerIds) {
      if (pid === winnerId) continue;
      const wallet = this.getOrCreateWallet(pid);
      wallet.winStreak = 0;
      if (pid === loserId) {
        wallet.totalLosses += 1;
      }

      // Standing-based XP
      let xpEarned = 35;
      const rankIndex = finishOrder.indexOf(pid);
      if (pid === loserId) {
        xpEarned = 25; // Pungot / Loser consolation
      } else if (rankIndex === 1) {
        xpEarned = 75; // 2nd place
      } else if (rankIndex === 2) {
        xpEarned = 50; // 3rd place
      } else {
        xpEarned = 35;
      }

      const lvlRes = this.addExperience(wallet, xpEarned);
      xpGains[pid] = xpEarned;
      if (lvlRes.leveledUp) {
        levelUps[pid] = { oldLevel: lvlRes.oldLevel, newLevel: lvlRes.newLevel, bonus: lvlRes.bonusCoins };
      }

      this.trackMissionProgress(pid, 'play_match', 1);
      if (allPlayerIds.length > 1) {
        this.trackMissionProgress(pid, 'play_friends', 1);
      }

      if (!pid.startsWith('bot-')) {
        updatedWallets[pid] = wallet;
      }
    }

    this.persistDatabase();
    return { winnerCoins: winnerReward, streak: currentStreak, updatedWallets, levelUps, xpGains };
  }

  /**
   * Reserve entry fee from player wallet atomically.
   */
  public reserveEntryFee(
    playerId: string,
    roomId: string,
    entryFee: number,
    playerName: string = 'Player',
    playerAvatar: string = '🦊'
  ): { success: boolean; message: string; wallet?: PlayerWallet } {
    if (entryFee <= 0) {
      return { success: true, message: 'Free match - No entry fee required.' };
    }

    const wallet = this.getOrCreateWallet(playerId, playerName, playerAvatar);
    if (wallet.balance < entryFee) {
      return {
        success: false,
        message: `Kulang ang iyong barya! Kailangan ng ₱${entryFee}, ngunit ang iyong balance ay ₱${wallet.balance}.`,
        wallet,
      };
    }

    wallet.balance -= entryFee;
    wallet.updatedAt = Date.now();

    this.recordTransaction(
      playerId,
      'MATCH_ENTRY_FEE',
      -entryFee,
      wallet.balance,
      `Reserved ₱${entryFee} entry fee for 5-Place Prize Pool match in Room ${roomId}`
    );

    this.persistDatabase();
    return {
      success: true,
      message: `Matagumpay na na-reserve ang ₱${entryFee} Entry Fee!`,
      wallet,
    };
  }

  /**
   * Refund entry fee back to player wallet if lobby is canceled or player leaves.
   */
  public refundEntryFee(
    playerId: string,
    roomId: string,
    entryFee: number
  ): { success: boolean; message: string; wallet?: PlayerWallet } {
    if (entryFee <= 0) {
      return { success: true, message: 'No fee to refund.' };
    }

    const wallet = this.getOrCreateWallet(playerId);
    wallet.balance += entryFee;
    wallet.updatedAt = Date.now();

    this.recordTransaction(
      playerId,
      'MATCH_ENTRY_REFUND',
      entryFee,
      wallet.balance,
      `Refunded ₱${entryFee} entry fee from canceled Room ${roomId}`
    );

    this.persistDatabase();
    return {
      success: true,
      message: `Nai-refund ang ₱${entryFee} Entry Fee pabalik sa iyong wallet!`,
      wallet,
    };
  }

  /**
   * Distribute five-place prize pool (50%, 25%, 15%, 7%, 3%) with integer-safe calculation.
   * Guarantees total payout equals exactly 100% of the pool.
   */
  public distributePrizePool(
    roomId: string,
    rankings: { playerId: string; name: string; avatar: string; rank: number }[],
    entryFee: number
  ): {
    payouts: PrizePayoutResult[];
    updatedWallets: Record<string, PlayerWallet>;
    levelUps: Record<string, { oldLevel: number; newLevel: number; bonus: number }>;
    xpGains: Record<string, number>;
  } {
    const totalPrizePool = entryFee * rankings.length;
    const payouts: PrizePayoutResult[] = [];
    const updatedWallets: Record<string, PlayerWallet> = {};
    const levelUps: Record<string, { oldLevel: number; newLevel: number; bonus: number }> = {};
    const xpGains: Record<string, number> = {};

    if (totalPrizePool <= 0 || rankings.length === 0) {
      return { payouts, updatedWallets, levelUps, xpGains };
    }

    // Integer-safe percentages:
    // Pungot (last place / 5th place) receives 0 coins (0%).
    // Top 4 share the full 100% prize pool: 1st: 55%, 2nd: 25%, 3rd: 13%, 4th: 7%
    const p1 = Math.floor(totalPrizePool * 0.55);
    const p2 = Math.floor(totalPrizePool * 0.25);
    const p3 = Math.floor(totalPrizePool * 0.13);
    const p4 = totalPrizePool - (p1 + p2 + p3);
    const p5 = 0; // Pungot receives NO prize / 0 coins

    const prizeTable = [
      { rank: 1, prize: p1, percentage: 55 },
      { rank: 2, prize: p2, percentage: 25 },
      { rank: 3, prize: p3, percentage: 13 },
      { rank: 4, prize: p4, percentage: 7 },
      { rank: 5, prize: p5, percentage: 0 },
    ];

    const xpTable: Record<number, number> = {
      1: 200,
      2: 120,
      3: 80,
      4: 50,
      5: 0,
    };

    for (let i = 0; i < rankings.length; i++) {
      const playerRank = rankings[i];
      const tier = prizeTable.find((t) => t.rank === playerRank.rank) || prizeTable[i] || {
        rank: playerRank.rank,
        prize: 0,
        percentage: 0,
      };

      payouts.push({
        playerId: playerRank.playerId,
        playerName: playerRank.name,
        playerAvatar: playerRank.avatar,
        rank: playerRank.rank,
        prize: tier.prize,
        percentage: tier.percentage,
      });

      // If player is human, credit prize and award tournament XP
      if (!playerRank.playerId.startsWith('bot-')) {
        const wallet = this.getOrCreateWallet(playerRank.playerId, playerRank.name, playerRank.avatar);
        if (tier.prize > 0) {
          wallet.balance += tier.prize;
          this.recordTransaction(
            playerRank.playerId,
            'MATCH_PRIZE_PAYOUT',
            tier.prize,
            wallet.balance,
            `🏆 Rank #${playerRank.rank} Prize Payout (${tier.percentage}%) from Room ${roomId} (+₱${tier.prize})`
          );
        }

        const xpAward = xpTable[playerRank.rank] || 30;
        const lvlRes = this.addExperience(wallet, xpAward);
        xpGains[playerRank.playerId] = xpAward;
        if (lvlRes.leveledUp) {
          levelUps[playerRank.playerId] = { oldLevel: lvlRes.oldLevel, newLevel: lvlRes.newLevel, bonus: lvlRes.bonusCoins };
        }

        wallet.updatedAt = Date.now();
        updatedWallets[playerRank.playerId] = wallet;
      }
    }

    this.persistDatabase();
    return { payouts, updatedWallets, levelUps, xpGains };
  }

  public getDailyMissions(playerId: string): DailyMission[] {
    const today = this.getTodayDateKey();
    if (!this.db.missions[playerId]) {
      this.db.missions[playerId] = {};
    }

    const playerMissions = this.db.missions[playerId];

    const result: DailyMission[] = [];
    for (const def of MISSION_DEFINITIONS) {
      let mission = playerMissions[def.id];
      if (!mission || (mission as any).dateKey !== today) {
        mission = {
          id: def.id,
          title: def.title,
          description: def.description,
          rewardCoins: def.rewardCoins,
          targetCount: def.targetCount,
          currentCount: 0,
          isCompleted: false,
          isClaimed: false,
        };
        (mission as any).dateKey = today;
        playerMissions[def.id] = mission;
      }
      result.push(mission);
    }

    return result;
  }

  public trackMissionProgress(playerId: string, missionId: string, amount: number = 1) {
    const missions = this.getDailyMissions(playerId);
    const mission = missions.find((m) => m.id === missionId);
    if (mission && !mission.isCompleted) {
      mission.currentCount = Math.min(mission.currentCount + amount, mission.targetCount);
      if (mission.currentCount >= mission.targetCount) {
        mission.isCompleted = true;
      }
      this.persistDatabase();
    }
  }

  public claimMissionReward(
    playerId: string,
    missionId: string
  ): { success: boolean; message: string; wallet?: PlayerWallet; reward?: number } {
    const missions = this.getDailyMissions(playerId);
    const mission = missions.find((m) => m.id === missionId);

    if (!mission) {
      return { success: false, message: 'Hindi nahanap ang mission.' };
    }
    if (!mission.isCompleted) {
      return { success: false, message: 'Hindi pa tapos ang mission na ito.' };
    }
    if (mission.isClaimed) {
      return { success: false, message: 'Nakuha mo na ang pabuya para sa mission na ito.' };
    }

    const wallet = this.getOrCreateWallet(playerId);
    mission.isClaimed = true;
    wallet.balance += mission.rewardCoins;
    this.addExperience(wallet, 50);

    this.recordTransaction(
      playerId,
      'MISSION_REWARD',
      mission.rewardCoins,
      wallet.balance,
      `Pabuya sa pagtatapos ng Mission: "${mission.title}" (+₱${mission.rewardCoins})`
    );

    this.persistDatabase();

    return {
      success: true,
      message: `Nakuha mo ang +₱${mission.rewardCoins} para sa "${mission.title}"!`,
      wallet,
      reward: mission.rewardCoins,
    };
  }

  public addExperience(wallet: PlayerWallet, xp: number): {
    leveledUp: boolean;
    oldLevel: number;
    newLevel: number;
    bonusCoins: number;
    newExperience: number;
  } {
    if (xp <= 0) {
      return {
        leveledUp: false,
        oldLevel: wallet.level,
        newLevel: wallet.level,
        bonusCoins: 0,
        newExperience: wallet.experience,
      };
    }

    const oldLevel = wallet.level || 1;
    wallet.experience = Math.max(0, (wallet.experience || 0) + xp);
    const newLevel = Math.max(1, Math.floor(Math.sqrt(wallet.experience / 100)) + 1);
    let bonusCoins = 0;
    let leveledUp = false;

    if (newLevel > oldLevel) {
      leveledUp = true;
      wallet.level = newLevel;
      bonusCoins = 100 * newLevel;
      wallet.balance += bonusCoins;
      wallet.updatedAt = Date.now();
      this.recordTransaction(
        wallet.playerId,
        'LEVEL_UP_REWARD',
        bonusCoins,
        wallet.balance,
        `Level Up! Umabot sa Level ${newLevel}! (+₱${bonusCoins} Level Bonus)`
      );
    }

    this.checkAchievements(wallet);
    return {
      leveledUp,
      oldLevel,
      newLevel,
      bonusCoins,
      newExperience: wallet.experience,
    };
  }

  public addInGameExperience(
    playerId: string,
    xp: number,
    reason: string = 'Gameplay'
  ): { wallet: PlayerWallet; leveledUp: boolean; oldLevel: number; newLevel: number; bonusCoins: number } | null {
    if (!playerId || playerId.startsWith('bot-')) return null;
    const wallet = this.getOrCreateWallet(playerId);
    const result = this.addExperience(wallet, xp);
    wallet.updatedAt = Date.now();
    this.persistDatabase();
    return {
      wallet,
      ...result,
    };
  }

  private checkAchievements(wallet: PlayerWallet) {
    const badges = new Set(wallet.achievements);
    if (wallet.totalWins >= 1) badges.add('first_blood');
    if (wallet.totalWins >= 5) badges.add('veteran');
    if (wallet.totalWins >= 20) badges.add('uno_legend');
    if (wallet.winStreak >= 3) badges.add('on_fire');
    if (wallet.winStreak >= 5) badges.add('unstoppable');
    if (wallet.level >= 5) badges.add('high_roller');
    wallet.achievements = Array.from(badges);
  }

  public getLeaderboards() {
    const all = Object.values(this.db.wallets);

    const topWins = [...all]
      .sort((a, b) => b.totalWins - a.totalWins || b.balance - a.balance)
      .slice(0, 20);

    const topStreaks = [...all]
      .sort((a, b) => b.bestWinStreak - a.bestWinStreak || b.totalWins - a.totalWins)
      .slice(0, 20);

    const topLevels = [...all]
      .sort((a, b) => b.level - a.level || b.experience - a.experience)
      .slice(0, 20);

    const topCoins = [...all]
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 20);

    return { topWins, topStreaks, topLevels, topCoins };
  }

  public adminAdjustBalance(
    playerId: string,
    amount: number,
    reason: string
  ): { success: boolean; wallet?: PlayerWallet; message: string } {
    const wallet = this.db.wallets[playerId];
    if (!wallet) {
      return { success: false, message: 'Hindi nahanap ang manlalaro.' };
    }

    if (wallet.balance + amount < 0) {
      return { success: false, message: 'Hindi maaaring maging negatibo ang balanse.' };
    }

    wallet.balance += amount;
    wallet.updatedAt = Date.now();

    this.recordTransaction(
      playerId,
      amount >= 0 ? 'ADMIN_GRANT' : 'ADMIN_DEDUCT',
      amount,
      wallet.balance,
      `Admin action: ${reason}`
    );

    this.persistDatabase();
    return { success: true, wallet, message: `Balanse binago ng ₱${amount}. Bagong balanse: ₱${wallet.balance}.` };
  }

  public adminUpdateCatalogItem(
    powerUpId: PowerUpId,
    updates: Partial<PowerUpItem>
  ): { success: boolean; item?: PowerUpItem } {
    if (!this.db.catalog[powerUpId]) {
      return { success: false };
    }
    this.db.catalog[powerUpId] = {
      ...this.db.catalog[powerUpId],
      ...updates,
    };
    this.persistDatabase();
    return { success: true, item: this.db.catalog[powerUpId] };
  }

  public getTransactions(limit: number = 100): CoinTransaction[] {
    return this.db.transactions.slice(0, limit);
  }

  public getCatalog(): Record<PowerUpId, PowerUpItem> {
    return this.db.catalog;
  }
}

export const economyManager = new EconomyManager();
