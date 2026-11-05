export type GameVariant = 'classic' | 'all_wild' | 'flip' | 'dare';

export type CardColor = 
  | 'red' 
  | 'blue' 
  | 'green' 
  | 'yellow' 
  | 'teal' 
  | 'orange' 
  | 'purple' 
  | 'pink' 
  | 'wild';

export type CardType = 
  | 'number' 
  | 'skip' 
  | 'reverse' 
  | 'draw2' 
  | 'wild' 
  | 'wild4'
  | 'flip' 
  | 'draw1' 
  | 'draw5' 
  | 'skip_all' 
  | 'wild_draw_color'
  | 'skip2' 
  | 'targeted_draw2' 
  | 'forced_swap' 
  | 'dare' 
  | 'wild_dare'
  | 'power_shield'
  | 'power_swap'
  | 'power_reverse'
  | 'power_color'
  | 'power_extra_turn'
  | 'power_peek'
  | 'power_booster'
  | 'power_reflect';

export interface Card {
  id: string;
  color: CardColor;
  type: CardType;
  value?: number; // 0-9 for 'number'
  flipSide?: Card; // Used for Uno Flip double-sided cards
  dareText?: string; // Used for Uno Dare challenge cards
  powerUpId?: PowerUpId; // Set if this card represents a purchased power-up
}

export interface HouseRules {
  turnTimer: 0 | 15 | 30 | 60; // 0 means off
  stacking: boolean; // allow +2 on +2, +4 on +4/+2
  sevenZero: boolean; // 7 = swap hands, 0 = rotate hands
  wildDraw4Challenge: boolean; // bluff check on WD4
  startingHandSize: number; // 3 to 10, default 7
  allowSpectators: boolean;
}

export interface PublicPlayer {
  id: string;
  name: string;
  avatar: string;
  cardCount: number;
  isReady: boolean;
  isHost: boolean;
  isBot: boolean;
  isDisconnected: boolean;
  calledUno: boolean;
  score: number;
  finishRank?: number | null;
  isFinished?: boolean;
  hasPaidEntry?: boolean;
  level?: number;
  experience?: number;
  xpGained?: number;
}

export type GamePhase = 'lobby' | 'playing' | 'ended';

export type EntryFeeAmount = 0 | 100 | 200 | 300 | 400 | 500;

export interface PrizePayoutResult {
  playerId: string;
  playerName: string;
  playerAvatar: string;
  rank: number;
  prize: number;
  percentage: number;
}

export interface PublicGameState {
  roomId: string;
  roomName: string;
  variant: GameVariant;
  activeFlipSide: 'light' | 'dark';
  isPrivate: boolean;
  hostId: string;
  phase: GamePhase;
  players: PublicPlayer[];
  activePlayerIndex: number;
  direction: 1 | -1; // 1 = clockwise, -1 = counter-clockwise
  topDiscard: Card | null;
  currentColor: CardColor;
  drawPileCount: number;
  pendingDrawPenalty: number;
  unoCallWindow: {
    targetPlayerId: string;
    expiresAt: number;
  } | null;
  pendingChallenge: {
    challengerId: string;
    playedBy: string;
    playedCard: Card;
  } | null;
  pendingSevenSwap: {
    playerId: string;
  } | null;
  pendingTargetedDraw2: {
    playedBy: string;
  } | null;
  pendingDare: {
    targetPlayerId: string;
    playedBy: string;
    penaltyDrawCount: number;
    dareText: string;
  } | null;
  pendingKeepOrPlay: {
    playerId: string;
    drawnCard: Card;
  } | null;
  isDeadlockAvailable?: boolean;
  turnDeadline: number | null;
  winnerId: string | null;
  loserId: string | null;
  finishOrder: string[];
  houseRules: HouseRules;
  lastActionText: string | null;
  turnCount: number;
  startedAt: number | null;
  endedAt: number | null;
  // Power-Up match tracking
  matchPowerUpUses?: Record<string, number>; // playerId -> count used in this match (max 2)
  activeCoinBoosters?: string[]; // playerIds with Coin Booster active
  // Virtual Coin Entry Fee & Five-Place Prize Pool System
  entryFee: EntryFeeAmount;
  prizePool: number;
  isEntryFeeLocked: boolean;
  payoutResults?: PrizePayoutResult[];
  spectatorCount?: number;
  spectators?: { id: string; name: string; avatar: string }[];
}

export type PowerUpId =
  | 'shield'
  | 'swap'
  | 'reverse'
  | 'color'
  | 'extra_turn'
  | 'peek'
  | 'booster'
  | 'reflect';

export interface PowerUpItem {
  id: PowerUpId;
  name: string;
  description: string;
  price: number;
  icon: string;
  badge?: string;
  enabled: boolean;
}

export type TransactionType =
  | 'WELCOME_BONUS'
  | 'DAILY_LOGIN'
  | 'MATCH_VICTORY'
  | 'WIN_STREAK_BONUS'
  | 'MISSION_REWARD'
  | 'POWERUP_PURCHASE'
  | 'MATCH_ENTRY_FEE'
  | 'MATCH_ENTRY_REFUND'
  | 'MATCH_PRIZE_PAYOUT'
  | 'LEVEL_UP_REWARD'
  | 'ADMIN_GRANT'
  | 'ADMIN_DEDUCT';

export interface CoinTransaction {
  id: string;
  playerId: string;
  type: TransactionType;
  amount: number; // positive for gain, negative for spend
  balanceAfter: number;
  description: string;
  timestamp: number;
}

export interface DailyMission {
  id: string;
  title: string;
  description: string;
  rewardCoins: number;
  targetCount: number;
  currentCount: number;
  isCompleted: boolean;
  isClaimed: boolean;
}

export interface PlayerWallet {
  playerId: string;
  playerName: string;
  playerAvatar: string;
  balance: number;
  totalWins: number;
  totalLosses: number;
  winStreak: number;
  bestWinStreak: number;
  level: number;
  experience: number;
  lastDailyClaimDate: string | null; // YYYY-MM-DD
  inventory: Record<PowerUpId, number>;
  achievements: string[];
  createdAt: number;
  updatedAt: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  timestamp: number;
}

export interface ReactionEvent {
  senderId: string;
  senderName: string;
  emoji: string;
  timestamp: number;
}

export type SoundEffectType = 
  | 'card_play'
  | 'card_draw'
  | 'card_deal'
  | 'turn_alert'
  | 'uno_call'
  | 'uno_penalty'
  | 'game_win'
  | 'error'
  | 'timer_tick'
  | 'reverse'
  | 'skip'
  | 'flip'
  | 'dare'
  | 'shuffle'
  | 'power_skip'
  | 'power_reverse'
  | 'power_draw2'
  | 'power_targeted_draw2'
  | 'power_draw6'
  | 'power_draw8'
  | 'power_draw10'
  | 'power_draw12'
  | 'power_draw14'
  | 'power_draw16'
  | 'power_draw18'
  | 'power_draw20'
  | 'power_draw22'
  | 'power_draw24'
  | 'power_wild4'
  | 'power_wild'
  | 'power_flip'
  | 'power_draw5'
  | 'power_general'
  | 'power_swap'
  | 'power_skip2'
  | 'vs_impact'
  | 'countdown_tick'
  | 'match_start';

