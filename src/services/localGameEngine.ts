import {
  Card,
  CardColor,
  CardType,
  GameVariant,
  HouseRules,
  PublicGameState,
  PublicPlayer,
  PlayerWallet,
  PowerUpId,
  SoundEffectType,
} from '../engine/types';
import { createDeckForVariant, shuffleDeck, reshuffleDiscards, COLORS } from '../engine/deck';
import { isCardPlayable, getPlayableCards } from '../engine/rules';
import { makeBotMove } from '../engine/botAi';
import { economyService } from './economyService';

export interface LocalEngineCallbacks {
  onSyncState: (state: PublicGameState, yourHand: Card[], yourPlayerId?: string) => void;
  onToast: (text: string, sound?: SoundEffectType) => void;
  onUnoShout?: (playerId: string) => void;
  onWalletUpdate?: (wallet: PlayerWallet, levelUp?: any, xpGained?: number) => void;
}

const BOT_NAMES = ['Aero Bot', 'Turbo Bot', 'Spark Bot', 'Nova Bot', 'Blaze Bot', 'Luna Bot', 'Titan Bot'];
const BOT_AVATARS = ['🤖', '⚡', '🦊', '🐯', '🐼', '🦁', '🦉'];

export class LocalGameEngine {
  private active: boolean = false;
  private roomId: string = 'local_bots';
  private publicState!: PublicGameState;
  private drawPile: Card[] = [];
  private discardPile: Card[] = [];
  private playerHands: Map<string, Card[]> = new Map();
  private callbacks: LocalEngineCallbacks | null = null;
  private humanPlayerId: string = 'local_player';
  private lastGameParams: {
    humanName: string;
    humanAvatar: string;
    botCount: number;
    variant: GameVariant;
    houseRulesOverride?: Partial<HouseRules>;
  } | null = null;
  private botTimer: NodeJS.Timeout | null = null;
  private unoWindowTimer: NodeJS.Timeout | null = null;
  private turnTimer: NodeJS.Timeout | null = null;

  public setCallbacks(cbs: LocalEngineCallbacks) {
    this.callbacks = cbs;
  }

  public isRunning(): boolean {
    return this.active;
  }

  public isActive(): boolean {
    return this.active;
  }

  public restartBotGame() {
    if (!this.lastGameParams) return;
    this.startBotGame(
      this.humanPlayerId,
      this.lastGameParams.humanName,
      this.lastGameParams.humanAvatar,
      this.lastGameParams.botCount,
      this.lastGameParams.variant,
      this.lastGameParams.houseRulesOverride
    );
  }

  public startBotGame(
    humanId: string,
    humanName: string,
    humanAvatar: string,
    botCount: number,
    variant: GameVariant = 'classic',
    houseRulesOverride?: Partial<HouseRules>
  ) {
    this.stop();
    this.active = true;
    this.humanPlayerId = humanId || 'local_player';
    this.lastGameParams = {
      humanName,
      humanAvatar,
      botCount,
      variant,
      houseRulesOverride,
    };
    this.roomId = 'offline_' + Math.random().toString(36).substring(2, 7);

    const houseRules: HouseRules = {
      turnTimer: 30,
      stacking: true,
      sevenZero: false,
      wildDraw4Challenge: true,
      startingHandSize: 7,
      allowSpectators: false,
      gameTable: 'game table 1.jpg',
      ...houseRulesOverride,
    };

    const players: PublicPlayer[] = [];
    const localWallet = economyService.getCachedWallet(this.humanPlayerId);

    // Human player
    players.push({
      id: this.humanPlayerId,
      name: humanName || 'Player 1',
      avatar: humanAvatar || '🦊',
      cardCount: houseRules.startingHandSize,
      isReady: true,
      isHost: true,
      isBot: false,
      isAutoplayBot: false,
      isDisconnected: false,
      calledUno: false,
      score: 0,
      level: localWallet?.level || 1,
      experience: localWallet?.experience || 0,
    });

    // Add Bots
    const count = Math.min(9, Math.max(1, botCount));
    for (let i = 0; i < count; i++) {
      players.push({
        id: `bot_${i + 1}`,
        name: BOT_NAMES[i % BOT_NAMES.length],
        avatar: BOT_AVATARS[i % BOT_AVATARS.length],
        cardCount: houseRules.startingHandSize,
        isReady: true,
        isHost: false,
        isBot: true,
        isDisconnected: false,
        calledUno: false,
        score: 0,
        level: Math.floor(Math.random() * 3) + 1,
      });
    }

    // Create & shuffle deck
    const deck = shuffleDeck(createDeckForVariant(variant));
    this.playerHands.clear();

    // Deal cards
    players.forEach((p) => {
      const hand: Card[] = [];
      for (let i = 0; i < houseRules.startingHandSize; i++) {
        const c = deck.pop();
        if (c) hand.push(c);
      }
      this.playerHands.set(p.id, hand);
    });

    // Top discard
    let firstCard = deck.pop() || { id: 'c1', color: 'red', type: 'number', value: 5 };
    while (firstCard.color === 'wild' || firstCard.type === 'wild4' || firstCard.type === 'wild_draw_color') {
      deck.unshift(firstCard);
      firstCard = deck.pop()!;
    }

    this.discardPile = [firstCard];
    this.drawPile = deck;

    this.publicState = {
      roomId: this.roomId,
      roomName: 'Solo Offline Challenge',
      variant,
      activeFlipSide: 'light',
      isPrivate: true,
      hostId: this.humanPlayerId,
      phase: 'playing',
      players,
      activePlayerIndex: 0,
      direction: 1,
      currentColor: firstCard.color,
      topDiscard: firstCard,
      drawPileCount: this.drawPile.length,
      pendingDrawPenalty: 0,
      unoCallWindow: null,
      pendingChallenge: null,
      pendingSevenSwap: null,
      pendingTargetedDraw2: null,
      pendingDare: null,
      pendingKeepOrPlay: null,
      turnDeadline: null,
      winnerId: null,
      loserId: null,
      finishOrder: [],
      houseRules,
      lastActionText: 'Nagsimula na ang offline game laban sa mga Bots!',
      turnCount: 0,
      startedAt: Date.now(),
      endedAt: null,
      entryFee: 0,
      prizePool: 0,
      isEntryFeeLocked: true,
    };

    // Initialize turn timer for first player (Turn 1)
    const firstPlayer = this.publicState.players[0];
    const timerSeconds = this.publicState.houseRules?.turnTimer !== undefined
      ? this.publicState.houseRules.turnTimer
      : 30;

    if (timerSeconds > 0) {
      this.publicState.turnDeadline = Date.now() + timerSeconds * 1000;
      if (!firstPlayer.isBot) {
        this.turnTimer = setTimeout(() => {
          if (!this.active || this.publicState.phase !== 'playing') return;
          const current = this.publicState.players[this.publicState.activePlayerIndex];
          if (!current || current.id !== firstPlayer.id) return;

          current.isAutoplayBot = true;
          this.callbacks?.onToast(`🤖 Naubos ang oras ni ${current.name}! Nilalaro na ito ng Bot (Autoplay).`, 'turn_alert');
          this.broadcast();
          this.scheduleBotMove(current.id);
        }, timerSeconds * 1000);
      }
    }

    this.broadcast();
  }

  public resumeControl(playerId: string) {
    if (!this.active) return;
    const player = this.publicState.players.find((p) => p.id === playerId);
    if (!player) return;

    player.isAutoplayBot = false;
    this.callbacks?.onToast(`👤 Nagbalik si ${player.name}! Manual control restored.`, 'turn_alert');
    this.broadcast();
  }

  public playCard(playerId: string, cardId: string, chosenColor?: CardColor, targetPlayerId?: string) {
    if (!this.active || this.publicState.phase !== 'playing') return;
    const activePlayer = this.publicState.players[this.publicState.activePlayerIndex];
    if (!activePlayer || activePlayer.id !== playerId) return;

    const hand = this.playerHands.get(playerId);
    if (!hand) return;

    const cardIdx = hand.findIndex((c) => c.id === cardId);
    if (cardIdx === -1) return;
    const card = hand[cardIdx];

    // Validate play
    if (!isCardPlayable(
      card,
      this.publicState.topDiscard,
      this.publicState.currentColor,
      this.publicState.pendingDrawPenalty,
      this.publicState.houseRules.stacking,
      this.publicState.variant
    )) return;

    // Remove from hand
    hand.splice(cardIdx, 1);
    this.discardPile.push(card);
    activePlayer.cardCount = hand.length;

    // Clear turn timer on play
    if (this.turnTimer) clearTimeout(this.turnTimer);

    // If human had autoplay bot active, restore manual control upon playing
    if (!activePlayer.isBot && activePlayer.isAutoplayBot) {
      activePlayer.isAutoplayBot = false;
      this.callbacks?.onToast(`👤 Nagbalik si ${activePlayer.name}! Manual control restored.`, 'turn_alert');
    }

    // Award XP locally to human player for playing card
    if (!activePlayer.isBot) {
      const isAction = card.color === 'wild' || card.type === 'draw2' || card.type === 'skip' || card.type === 'reverse' || card.type === 'flip';
      const xpEarned = isAction ? 8 : 4;
      const res = economyService.addLocalExperience(xpEarned);
      activePlayer.level = res.wallet.level;
      activePlayer.experience = res.wallet.experience;
      if (res.leveledUp) {
        this.callbacks?.onToast(`🎉 LEVEL UP! Umabot ka sa Level ${res.newLevel}! (+₱${res.bonus})`, 'game_win');
      }
    }

    // Color resolution
    let effectiveColor = card.color;
    if (card.color === 'wild' && chosenColor) {
      effectiveColor = chosenColor;
    } else if (card.color === 'wild') {
      effectiveColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    }

    this.publicState.currentColor = effectiveColor;
    this.publicState.topDiscard = card;
    this.publicState.turnCount++;

    // Check Victory
    if (hand.length === 0) {
      this.handleGameOver(activePlayer);
      return;
    }

    // UNO check: if player now has 1 card
    if (hand.length === 1) {
      if (activePlayer.isBot) {
        // Bots do NOT automatically call UNO immediately: hammer appears for player to catch them!
        activePlayer.calledUno = false;
        this.publicState.unoCallWindow = {
          targetPlayerId: activePlayer.id,
          expiresAt: Date.now() + 3500,
        };
        if (this.unoWindowTimer) clearTimeout(this.unoWindowTimer);
        // Dynamic & variable Bot UNO response time:
        // - 15% chance: INSTANT reaction (flash reflex: 300ms - 650ms)
        // - 35% chance: FAST reaction (750ms - 1400ms)
        // - 30% chance: NORMAL / MEDIUM reaction (1600ms - 2400ms)
        // - 12% chance: SLOW / PANIC reaction (2600ms - 3400ms)
        // - 8% chance: FORGOT / DISTRACTED (never calls before catch window expires!)
        const roll = Math.random();
        let botCallDelay: number | null = null;
        if (roll < 0.15) {
          botCallDelay = 300 + Math.random() * 350; // Instant
        } else if (roll < 0.50) {
          botCallDelay = 750 + Math.random() * 650; // Fast
        } else if (roll < 0.80) {
          botCallDelay = 1600 + Math.random() * 800; // Normal
        } else if (roll < 0.92) {
          botCallDelay = 2600 + Math.random() * 800; // Slow / Clumsy
        } else {
          botCallDelay = null; // Forgot to press! Player has guaranteed hammer opportunity!
        }

        if (botCallDelay !== null) {
          this.unoWindowTimer = setTimeout(() => {
            if (activePlayer.cardCount === 1 && !activePlayer.calledUno) {
              activePlayer.calledUno = true;
              this.publicState.unoCallWindow = null;
              this.callbacks?.onUnoShout?.(activePlayer.id);
              this.callbacks?.onToast(`🔥 Sumigaw si ${activePlayer.name} ng UNO!`, 'uno_call');
              this.broadcast();
            }
          }, botCallDelay);
        }
      } else if (!activePlayer.calledUno) {
        // Human player forgot or hasn't called UNO yet: open catch window
        this.publicState.unoCallWindow = {
          targetPlayerId: activePlayer.id,
          expiresAt: Date.now() + 3000,
        };
        if (this.unoWindowTimer) clearTimeout(this.unoWindowTimer);
        this.unoWindowTimer = setTimeout(() => {
          if (this.publicState.unoCallWindow?.targetPlayerId === activePlayer.id) {
            this.publicState.unoCallWindow = null;
            this.broadcast();
          }
        }, 3000);
      }
    } else {
      activePlayer.calledUno = false;
      if (this.publicState.unoCallWindow?.targetPlayerId === activePlayer.id) {
        this.publicState.unoCallWindow = null;
      }
    }

    // Action Card Effects
    let nextStep = 1;
    if (card.type === 'skip') {
      nextStep = 2;
      this.callbacks?.onToast(`⚡ SKIP! Nilaktawan ang susunod!`, 'turn_alert');
    } else if (card.type === 'reverse') {
      this.publicState.direction = (this.publicState.direction * -1) as 1 | -1;
      this.callbacks?.onToast(`🔄 REVERSE! Binaliktad ang ikot!`, 'turn_alert');
    } else if (card.type === 'draw2') {
      this.publicState.pendingDrawPenalty += 2;
    } else if (card.type === 'wild4') {
      this.publicState.pendingDrawPenalty += 4;
    } else if (card.type === 'discard_all') {
      const activeColor = chosenColor || this.publicState.currentColor;
      const discardedCards: Card[] = [];
      const remainingCards: Card[] = [];

      for (const c of hand) {
        if (c.color === activeColor) {
          discardedCards.push(c);
        } else {
          remainingCards.push(c);
        }
      }

      if (discardedCards.length > 0) {
        this.discardPile.push(...discardedCards);
        this.playerHands.set(playerId, remainingCards);
        activePlayer.cardCount = remainingCards.length;
        this.callbacks?.onToast(`🎴 WILD DISCARD ALL! Nagtapon si ${activePlayer.name} ng ${discardedCards.length} ${activeColor.toUpperCase()} cards!`, 'discard_all');
      }

      if (remainingCards.length === 0) {
        this.handleGameOver(activePlayer);
        return;
      }
    } else if (card.type === 'punch') {
      const penalty = this.publicState.pendingDrawPenalty;
      if (penalty > 0) {
        const total = this.publicState.players.length;
        const prevIdx = (this.publicState.activePlayerIndex - this.publicState.direction + total) % total;
        const attacker = this.publicState.players[prevIdx];
        const attackerHand = this.playerHands.get(attacker.id) || [];

        for (let i = 0; i < penalty; i++) {
          if (this.drawPile.length === 0) {
            const reshuffled = reshuffleDiscards(this.drawPile, this.discardPile);
            this.drawPile = reshuffled.newDrawPile;
            this.discardPile = reshuffled.newDiscardPile;
          }
          const c = this.drawPile.pop();
          if (c) attackerHand.push(c);
        }
        attacker.cardCount = attackerHand.length;
        this.publicState.drawPileCount = this.drawPile.length;
        this.publicState.pendingDrawPenalty = 0;
        this.callbacks?.onToast(`🥊 WILD PUNCH! Pinalo pabalik ni ${activePlayer.name} ang +${penalty} penalty kay ${attacker.name}!`, 'vs_impact');
      } else {
        this.callbacks?.onToast(`🥊 WILD PUNCH! Pinalitan ang kulay!`, 'turn_alert');
      }
    }

    this.advanceTurn(nextStep);
  }

  public drawCard(playerId: string) {
    if (!this.active || this.publicState.phase !== 'playing') return;
    const activePlayer = this.publicState.players[this.publicState.activePlayerIndex];
    if (!activePlayer || activePlayer.id !== playerId) return;

    const hand = this.playerHands.get(playerId);
    if (!hand) return;

    const penalty = this.publicState.pendingDrawPenalty;
    const drawCount = penalty > 0 ? penalty : 1;
    this.publicState.pendingDrawPenalty = 0;

    for (let i = 0; i < drawCount; i++) {
      if (this.drawPile.length === 0) {
        const reshuffled = reshuffleDiscards(this.drawPile, this.discardPile);
        this.drawPile = reshuffled.newDrawPile;
        this.discardPile = reshuffled.newDiscardPile;
      }
      const c = this.drawPile.pop();
      if (c) hand.push(c);
    }

    activePlayer.cardCount = hand.length;
    activePlayer.calledUno = false;
    this.publicState.drawPileCount = this.drawPile.length;

    // If penalty, pass turn immediately
    if (penalty > 0) {
      this.advanceTurn(1);
    } else {
      this.broadcast();
    }
  }

  public passTurn(playerId: string) {
    if (!this.active || this.publicState.phase !== 'playing') return;
    const activePlayer = this.publicState.players[this.publicState.activePlayerIndex];
    if (!activePlayer || activePlayer.id !== playerId) return;
    this.advanceTurn(1);
  }

  public callUno(playerId: string) {
    if (!this.active) return;
    const player = this.publicState.players.find((p) => p.id === playerId);
    if (!player) return;
    const hand = this.playerHands.get(playerId) || [];

    const isPlayerTurn = this.publicState.players[this.publicState.activePlayerIndex]?.id === playerId;
    const hasPlayableCard = hand.some((c) =>
      isCardPlayable(
        c,
        this.publicState.topDiscard,
        this.publicState.currentColor,
        this.publicState.pendingDrawPenalty,
        this.publicState.houseRules.stacking,
        this.publicState.variant
      )
    );
    const canCallUno = hand.length === 1 || (hand.length === 2 && isPlayerTurn && hasPlayableCard);

    if (!canCallUno) {
      // False UNO penalty (+1 card)
      if (this.drawPile.length === 0) {
        const reshuffled = reshuffleDiscards(this.drawPile, this.discardPile);
        this.drawPile = reshuffled.newDrawPile;
        this.discardPile = reshuffled.newDiscardPile;
      }
      const penaltyCard = this.drawPile.pop();
      if (penaltyCard) hand.push(penaltyCard);
      player.cardCount = hand.length;
      player.calledUno = false;
      this.publicState.drawPileCount = this.drawPile.length;

      this.callbacks?.onToast(`⚠️ FALSE UNO! Hindi pa pwede mag-UNO si ${player.name}! (+1 Penalty Card)`, 'uno_call');
      this.broadcast();
      return;
    }

    player.calledUno = true;
    if (this.publicState.unoCallWindow?.targetPlayerId === playerId) {
      this.publicState.unoCallWindow = null;
    }
    this.callbacks?.onUnoShout?.(playerId);
    this.callbacks?.onToast(`🔥 Sumigaw si ${player.name} ng UNO!`, 'uno_call');
    this.broadcast();
  }

  public catchUno(catcherId: string, targetId: string) {
    if (!this.active) return;
    const target = this.publicState.players.find((p) => p.id === targetId);
    const catcher = this.publicState.players.find((p) => p.id === catcherId);
    if (!target || !catcher) return;

    if (target.cardCount === 1 && !target.calledUno) {
      const hand = this.playerHands.get(targetId);
      if (hand) {
        if (this.drawPile.length === 0) {
          const reshuffled = reshuffleDiscards(this.drawPile, this.discardPile);
          this.drawPile = reshuffled.newDrawPile;
          this.discardPile = reshuffled.newDiscardPile;
        }
        const penaltyCard = this.drawPile.pop();
        if (penaltyCard) hand.push(penaltyCard);
        target.cardCount = hand.length;
        this.publicState.drawPileCount = this.drawPile.length;
      }
      this.callbacks?.onToast(`🔨 HULI! Nahuli ni ${catcher.name} si ${target.name}! (+1 Penalty Card)`, 'uno_call');
      this.broadcast();
    } else {
      // False accusation penalty!
      const callerHand = this.playerHands.get(catcherId);
      if (callerHand) {
        if (this.drawPile.length === 0) {
          const reshuffled = reshuffleDiscards(this.drawPile, this.discardPile);
          this.drawPile = reshuffled.newDrawPile;
          this.discardPile = reshuffled.newDiscardPile;
        }
        const penaltyCard = this.drawPile.pop();
        if (penaltyCard) callerHand.push(penaltyCard);
        catcher.cardCount = callerHand.length;
        this.publicState.drawPileCount = this.drawPile.length;
      }
      this.callbacks?.onToast(`⚠️ Maling akusasyon! Hindi pa pwedeng pukpukin si ${target.name}. Si ${catcher.name} ay nakatanggap ng +1 Penalty Card!`, 'uno_penalty');
      this.broadcast();
    }
  }

  private advanceTurn(steps: number = 1) {
    const total = this.publicState.players.length;
    let nextIdx = this.publicState.activePlayerIndex;

    for (let s = 0; s < steps; s++) {
      nextIdx = (nextIdx + this.publicState.direction + total) % total;
    }

    this.publicState.activePlayerIndex = nextIdx;

    if (this.turnTimer) clearTimeout(this.turnTimer);

    // Turn timer: deadline for active player based on houseRules
    const nextPlayer = this.publicState.players[nextIdx];
    if (this.publicState.phase === 'playing') {
      const timerSec = this.publicState.houseRules?.turnTimer !== undefined
        ? this.publicState.houseRules.turnTimer
        : 30;

      if (timerSec > 0) {
        this.publicState.turnDeadline = Date.now() + timerSec * 1000;
        this.broadcast();

        if (nextPlayer.isBot || nextPlayer.isAutoplayBot) {
          this.scheduleBotMove(nextPlayer.id);
        } else {
          // Human player turn: set timeout before Bot AI takes over and automatically plays
          this.turnTimer = setTimeout(() => {
            if (!this.active || this.publicState.phase !== 'playing') return;
            const current = this.publicState.players[this.publicState.activePlayerIndex];
            if (!current || current.id !== nextPlayer.id) return;

            current.isAutoplayBot = true;
            this.callbacks?.onToast(`🤖 Naubos ang oras ni ${current.name}! Nilalaro na ito ng Bot (Autoplay).`, 'turn_alert');
            this.broadcast();

            // Immediately execute bot move for the human player
            this.scheduleBotMove(current.id);
          }, timerSec * 1000);
        }
      } else {
        this.publicState.turnDeadline = null;
        this.broadcast();
        if (nextPlayer.isBot || nextPlayer.isAutoplayBot) {
          this.scheduleBotMove(nextPlayer.id);
        }
      }
    } else {
      this.publicState.turnDeadline = null;
      this.broadcast();
    }
  }

  private scheduleBotMove(botId: string) {
    if (this.botTimer) clearTimeout(this.botTimer);
    this.botTimer = setTimeout(() => {
      if (!this.active || this.publicState.phase !== 'playing') return;
      const botHand = this.playerHands.get(botId);
      if (!botHand) return;

      const bot = this.publicState.players[this.publicState.activePlayerIndex];
      if (!bot || bot.id !== botId) return;

      const decision = makeBotMove(botHand, this.publicState, this.publicState.houseRules);

      if (decision.action === 'play' && decision.cardId) {
        this.playCard(botId, decision.cardId, decision.chosenColor, decision.targetPlayerId);
      } else {
        // Draw card
        this.drawCard(botId);
        // If drawn card is playable, play it immediately
        const updatedHand = this.playerHands.get(botId) || [];
        const playable = getPlayableCards(
          updatedHand,
          this.publicState.topDiscard,
          this.publicState.currentColor,
          this.publicState.pendingDrawPenalty,
          this.publicState.houseRules,
          this.publicState.variant
        );
        if (playable.length > 0) {
          setTimeout(() => {
            if (this.active && this.publicState.players[this.publicState.activePlayerIndex]?.id === botId) {
              this.playCard(botId, playable[0].id);
            }
          }, 600);
        } else {
          setTimeout(() => {
            if (this.active && this.publicState.players[this.publicState.activePlayerIndex]?.id === botId) {
              this.passTurn(botId);
            }
          }, 400);
        }
      }
    }, 1100);
  }

  private handleGameOver(winner: PublicPlayer) {
    this.publicState.phase = 'ended';
    this.publicState.winnerId = winner.id;
    this.publicState.endedAt = Date.now();

    const humanWon = winner.id === this.humanPlayerId;
    // Award offline payout & XP to persistent device memory!
    const updatedWallet = economyService.addLocalMatchResult(
      humanWon,
      200,
      humanWon ? 120 : 35,
      this.humanPlayerId
    );

    // Update human in public state
    const human = this.publicState.players.find((p) => p.id === this.humanPlayerId);
    if (human) {
      human.level = updatedWallet.level;
      human.experience = updatedWallet.experience;
      human.xpGained = humanWon ? 120 : 35;
    }

    if (humanWon) {
      this.callbacks?.onToast('🏆 PANALO KA! +₱200 Victory Coins & +120 XP!', 'game_win');
    } else {
      this.callbacks?.onToast(`🎮 Tapos na ang laban! Nanalo si ${winner.name}! +35 XP`, 'turn_alert');
    }

    if (this.callbacks?.onWalletUpdate) {
      this.callbacks.onWalletUpdate(updatedWallet, undefined, humanWon ? 120 : 35);
    }

    this.broadcast();
  }

  private broadcast() {
    if (!this.callbacks) return;
    let targetUid = this.humanPlayerId;
    let humanHand = this.playerHands.get(targetUid);
    if (!humanHand) {
      const human = this.publicState.players.find((p) => !p.isBot);
      if (human) {
        targetUid = human.id;
        humanHand = this.playerHands.get(targetUid);
      }
    }
    this.callbacks.onSyncState({ ...this.publicState }, [...(humanHand || [])], targetUid);
  }

  public addPowerUpCardToHand(playerId: string, powerUpId: PowerUpId): boolean {
    if (!this.active || this.publicState.phase !== 'playing') return false;
    
    // Resilient hand lookup: try playerId, this.humanPlayerId, or the non-bot player
    let targetPlayerId = playerId;
    let hand = this.playerHands.get(targetPlayerId);
    if (!hand) {
      targetPlayerId = this.humanPlayerId;
      hand = this.playerHands.get(targetPlayerId);
    }
    if (!hand) {
      const human = this.publicState.players.find((p) => !p.isBot);
      if (human) {
        targetPlayerId = human.id;
        hand = this.playerHands.get(targetPlayerId);
      }
    }
    if (!hand) return false;

    // Strict check: Maximum 2 Power-Ups per match
    if (!this.publicState.matchPowerUpUses) {
      this.publicState.matchPowerUpUses = {};
    }
    const currentUses = this.publicState.matchPowerUpUses[targetPlayerId] || 0;
    if (currentUses >= 2) {
      this.callbacks?.onToast('⚠️ Naabot mo na ang limit na 2 Power-Ups para sa labang ito!', 'turn_alert');
      return false;
    }

    const typeMap: Record<PowerUpId, CardType> = {
      skip2: 'skip2',
      targeted_draw2: 'targeted_draw2',
      forced_swap: 'forced_swap',
      wild4: 'wild4',
      draw2: 'draw2',
      reverse: 'reverse',
      skip: 'skip',
      wild: 'wild',
      punch: 'punch',
    };

    const card: Card = {
      id: `pcard-${powerUpId}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      color: 'wild',
      type: typeMap[powerUpId] || (powerUpId as CardType),
      powerUpId,
    };

    hand.push(card);
    const player = this.publicState.players.find((p) => p.id === targetPlayerId);
    if (player) {
      player.cardCount = hand.length;
    }

    // Track match usage limit
    if (!this.publicState.matchPowerUpUses) {
      this.publicState.matchPowerUpUses = {};
    }
    this.publicState.matchPowerUpUses[targetPlayerId] =
      (this.publicState.matchPowerUpUses[targetPlayerId] || 0) + 1;

    // Consume inventory item since it became a card in hand
    economyService.consumePowerUp(playerId, powerUpId);
    if (targetPlayerId !== playerId) {
      economyService.consumePowerUp(targetPlayerId, powerUpId);
    }

    this.callbacks?.onToast(`🃏 Nakakuha ka ng ${powerUpId.toUpperCase()} power card!`, 'power_general');
    this.broadcast();
    return true;
  }

  public stop() {
    this.active = false;
    if (this.botTimer) clearTimeout(this.botTimer);
    if (this.unoWindowTimer) clearTimeout(this.unoWindowTimer);
  }
}

export const localGameEngine = new LocalGameEngine();

