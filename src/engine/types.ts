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
  | 'wild_dare';

export interface Card {
  id: string;
  color: CardColor;
  type: CardType;
  value?: number; // 0-9 for 'number'
  flipSide?: Card; // Used for Uno Flip double-sided cards
  dareText?: string; // Used for Uno Dare challenge cards
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
}

export type GamePhase = 'lobby' | 'playing' | 'ended';

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
  | 'power_wild4'
  | 'power_wild'
  | 'power_flip'
  | 'power_draw5'
  | 'power_general';
