import { WebSocket } from 'ws';
import {
  Card,
  CardColor,
  CardType,
  ChatMessage,
  EntryFeeAmount,
  GameVariant,
  HouseRules,
  PlayerWallet,
  PowerUpId,
  PublicGameState,
  PublicPlayer,
  ReactionEvent,
  SoundEffectType,
} from '../src/engine/types';
import { createStandardDeck, createDeckForVariant, reshuffleDiscards, shuffleDeck } from '../src/engine/deck';
import {
  calculateHandScore,
  getNextPlayerIndex,
  hasColorInHand,
  isCardPlayable,
} from '../src/engine/rules';
import { makeBotMove } from '../src/engine/botAi';
import { economyManager } from './economyManager';

export interface InternalRoomState {
  publicState: PublicGameState;
  drawPile: Card[];
  discardPile: Card[];
  playerHands: Map<string, Card[]>; // Secret hand for each player
  sockets: Map<string, WebSocket>; // Live socket connection for each player
  spectators?: Map<string, { id: string; name: string; avatar: string; ws: WebSocket }>; // Spectators watching match
  timerInterval: NodeJS.Timeout | null;
  botTimeout: NodeJS.Timeout | null;
  unoTimeout: NodeJS.Timeout | null;
  extraTurnsRemaining?: { playerId: string; count: number } | null;
  payoutsProcessed?: boolean;
  startGracePeriodUntil?: number;
  createdAt: number;
}

export class RoomManager {
  private rooms = new Map<string, InternalRoomState>();

  /**
   * Generates a 6-character room code (e.g. "PUNG77").
   */
  public generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    do {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.rooms.has(code));
    return code;
  }

  public getRoom(roomId: string): InternalRoomState | undefined {
    return this.rooms.get(roomId);
  }

  public getAllPublicRooms(): {
    roomId: string;
    roomName: string;
    variant: GameVariant;
    playerCount: number;
    maxPlayers: number;
    phase: string;
    spectatorCount?: number;
  }[] {
    const list: {
      roomId: string;
      roomName: string;
      variant: GameVariant;
      playerCount: number;
      maxPlayers: number;
      phase: string;
      entryFee: number;
      prizePool: number;
      spectatorCount?: number;
    }[] = [];

    for (const [id, room] of this.rooms.entries()) {
      // Must not be private, ended, or an automated test room (e.g. alice_123, test-room, Championship Match test)
      if (room.publicState.isPrivate || room.publicState.phase === 'ended') {
        continue;
      }

      // Check if this was a test room
      const isTestRoom =
        room.publicState.hostId.startsWith('alice_') ||
        room.publicState.hostId.startsWith('test') ||
        room.publicState.hostId.startsWith('p1_') ||
        room.publicState.roomName === 'Championship Match';

      if (isTestRoom) {
        // Automatically purge leftover test rooms from memory
        this.cleanupRoom(id);
        continue;
      }

      // Only display rooms that have at least one active, real connected human player
      const hasActiveHuman = room.publicState.players.some((p) => !p.isBot && !p.isDisconnected);
      if (!hasActiveHuman) {
        continue;
      }

      list.push({
        roomId: id,
        roomName: room.publicState.roomName,
        variant: room.publicState.variant,
        playerCount: room.publicState.players.length,
        maxPlayers: 10,
        phase: room.publicState.phase,
        entryFee: room.publicState.entryFee,
        prizePool: room.publicState.prizePool,
        spectatorCount: room.spectators?.size || 0,
      });
    }
    return list;
  }

  /**
   * Create a new room with configuration.
   */
  public createRoom(
    hostId: string,
    hostName: string,
    hostAvatar: string,
    options: {
      roomName?: string;
      isPrivate?: boolean;
      variant?: GameVariant;
      houseRules?: Partial<HouseRules>;
      entryFee?: EntryFeeAmount;
      initialBots?: number;
      autoStart?: boolean;
    }
  ): string {
    const roomId = this.generateRoomCode();
    const entryFee: EntryFeeAmount = options.entryFee || 0;
    const prizePool = entryFee * 1; // Starts at 1x, grows as players pay

    const defaultRules: HouseRules = {
      turnTimer: 30,
      stacking: true,
      sevenZero: false,
      wildDraw4Challenge: true,
      startingHandSize: 7,
      allowSpectators: true,
      gameTable: 'game table 1.jpg',
      ...options.houseRules,
    };

    const hostWallet = economyManager.getOrCreateWallet(hostId, hostName, hostAvatar);

    const hostPlayer: PublicPlayer = {
      id: hostId,
      name: hostName || 'Host Player',
      avatar: hostAvatar || '🦊',
      cardCount: 0,
      isReady: entryFee === 0, // In casual matches host is ready; in fee matches host confirms entry payment
      isHost: true,
      isBot: false,
      isDisconnected: false,
      calledUno: false,
      score: 0,
      hasPaidEntry: false,
      level: hostWallet.level || 1,
      experience: hostWallet.experience || 0,
    };

    const initialPublicState: PublicGameState = {
      roomId,
      roomName: options.roomName || `${hostPlayer.name}'s Room`,
      variant: options.variant || 'classic',
      activeFlipSide: 'light',
      isPrivate: options.isPrivate ?? false,
      hostId,
      phase: 'lobby',
      players: [hostPlayer],
      activePlayerIndex: 0,
      direction: 1,
      topDiscard: null,
      currentColor: 'red',
      drawPileCount: 0,
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
      houseRules: defaultRules,
      lastActionText: 'Lobby created. Waiting for players...',
      turnCount: 0,
      startedAt: null,
      endedAt: null,
      entryFee,
      prizePool,
      isEntryFeeLocked: false,
    };

    const roomState: InternalRoomState = {
      publicState: initialPublicState,
      drawPile: [],
      discardPile: [],
      playerHands: new Map<string, Card[]>(),
      sockets: new Map<string, WebSocket>(),
      spectators: new Map<string, { id: string; name: string; avatar: string; ws: WebSocket }>(),
      timerInterval: null,
      botTimeout: null,
      unoTimeout: null,
      extraTurnsRemaining: null,
      createdAt: Date.now(),
    };

    this.rooms.set(roomId, roomState);

    // If options specify initial bots (e.g. Solo Bot Challenge)
    if (options.initialBots && options.initialBots > 0) {
      for (let i = 0; i < options.initialBots; i++) {
        this.addBot(roomId, hostId);
      }
      if (options.autoStart) {
        this.startGame(roomId, hostId);
      }
    }

    return roomId;
  }

  /**
   * Join an existing room.
   */
  public joinRoom(
    roomId: string,
    playerId: string,
    playerName: string,
    playerAvatar: string,
    ws: WebSocket,
    asSpectator?: boolean
  ): { success: boolean; message?: string } {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { success: false, message: 'Room not found. Check the room code.' };
    }

    // Check if player is reconnecting or initial host binding
    const existingIndex = room.publicState.players.findIndex((p) => p.id === playerId);
    if (existingIndex !== -1 && !asSpectator) {
      const player = room.publicState.players[existingIndex];
      const wasDisconnected = player.isDisconnected;
      player.isDisconnected = false;
      player.name = playerName || player.name;
      player.avatar = playerAvatar || player.avatar;
      room.sockets.set(playerId, ws);
      this.broadcastState(roomId);
      if (wasDisconnected) {
        this.broadcastToast(roomId, `${player.name} reconnected!`, 'turn_alert');
      }
      return { success: true };
    }

    // If joining explicitly as spectator OR if game has already started, admit the user as SPECTATOR (Manonood)!
    if (asSpectator || room.publicState.phase !== 'lobby') {
      if (!room.spectators) {
        room.spectators = new Map();
      }
      const specName = playerName || 'Spectator';
      const specAvatar = playerAvatar || '🍿';
      room.spectators.set(playerId, { id: playerId, name: specName, avatar: specAvatar, ws });

      // Update spectator list on public state
      room.publicState.spectators = Array.from(room.spectators.values()).map((s) => ({
        id: s.id,
        name: s.name,
        avatar: s.avatar,
      }));
      room.publicState.spectatorCount = room.spectators.size;

      // Broadcast new state so players see spectator arrived
      this.broadcastState(roomId);
      this.broadcastToast(roomId, `🍿 ${specName} is now viewing the match!`, 'turn_alert');
      return { success: true };
    }

    const isEntryFeeRoom = room.publicState.entryFee > 0;
    const maxCapacity = 10;
    if (room.publicState.players.length >= maxCapacity) {
      return {
        success: false,
        message: 'Room is already full (maximum 10 players).',
      };
    }

    const playerWallet = economyManager.getOrCreateWallet(playerId, playerName, playerAvatar);

    const newPlayer: PublicPlayer = {
      id: playerId,
      name: playerName || `Player ${room.publicState.players.length + 1}`,
      avatar: playerAvatar || '🐼',
      cardCount: 0,
      isReady: false,
      isHost: false,
      isBot: false,
      isDisconnected: false,
      calledUno: false,
      score: 0,
      hasPaidEntry: false,
      level: playerWallet.level || 1,
      experience: playerWallet.experience || 0,
    };

    room.publicState.players.push(newPlayer);
    room.sockets.set(playerId, ws);

    // Rule A: Once the first player joins, lock the selected entry fee
    if (isEntryFeeRoom) {
      room.publicState.isEntryFeeLocked = true;
    }

    this.broadcastState(roomId);
    this.broadcastToast(roomId, `${newPlayer.name} joined the room!`, 'card_draw');
    return { success: true };
  }

  /**
   * Host updates room house rules and variant while in lobby.
   */
  public updateRules(roomId: string, playerId: string, rules: Partial<HouseRules>, variant?: GameVariant): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.publicState.hostId !== playerId || room.publicState.phase !== 'lobby') {
      return false;
    }
    if (variant) {
      room.publicState.variant = variant;
    }
    room.publicState.houseRules = {
      ...room.publicState.houseRules,
      ...rules,
    };
    this.broadcastState(roomId);
    return true;
  }

  /**
   * Host updates entry fee before non-host players join.
   */
  public updateEntryFee(roomId: string, hostId: string, entryFee: EntryFeeAmount): { success: boolean; message?: string } {
    const room = this.rooms.get(roomId);
    if (!room || room.publicState.hostId !== hostId || room.publicState.phase !== 'lobby') {
      return { success: false, message: 'Only host can change entry fee in lobby.' };
    }

    if (room.publicState.isEntryFeeLocked) {
      return { success: false, message: 'Naka-lock na ang entry fee dahil may sumali nang ibang manlalaro.' };
    }

    room.publicState.entryFee = entryFee;
    const paidCount = Math.max(1, room.publicState.players.filter((p) => p.hasPaidEntry).length);
    room.publicState.prizePool = entryFee * paidCount;

    // Reset host payment status if fee changes
    const host = room.publicState.players.find((p) => p.isHost);
    if (host) {
      host.hasPaidEntry = false;
      host.isReady = entryFee === 0;
    }

    this.broadcastState(roomId);
    this.broadcastToast(roomId, `Entry fee updated to ₱${entryFee}. Total Prize Pool: ₱${room.publicState.prizePool}`, 'turn_alert');
    return { success: true };
  }

  /**
   * Confirm and reserve entry fee payment for a player.
   */
  public confirmEntryPayment(roomId: string, playerId: string): { success: boolean; message?: string; wallet?: PlayerWallet } {
    const room = this.rooms.get(roomId);
    if (!room || room.publicState.phase !== 'lobby') {
      return { success: false, message: 'Lobby is not currently active.' };
    }

    const player = room.publicState.players.find((p) => p.id === playerId);
    if (!player) {
      return { success: false, message: 'Player not found in room.' };
    }

    if (player.hasPaidEntry) {
      return { success: false, message: 'Bayad ka na sa entry fee!' };
    }

    const entryFee = room.publicState.entryFee;
    if (entryFee <= 0) {
      player.hasPaidEntry = true;
      player.isReady = true;
      this.broadcastState(roomId);
      return { success: true, message: 'Free match confirmed.' };
    }

    // Reserve entry fee atomically from authoritative wallet
    const res = economyManager.reserveEntryFee(playerId, roomId, entryFee, player.name, player.avatar);
    if (!res.success) {
      return { success: false, message: res.message, wallet: res.wallet };
    }

    player.hasPaidEntry = true;
    player.isReady = true;

    // Recalculate total prize pool based on actual paid players
    const paidPlayersCount = room.publicState.players.filter((p) => p.hasPaidEntry).length;
    room.publicState.prizePool = entryFee * paidPlayersCount;

    // Send updated wallet directly to player socket
    const client = room.sockets.get(playerId);
    if (client && client.readyState === WebSocket.OPEN && res.wallet) {
      client.send(
        JSON.stringify({
          type: 'WALLET_UPDATE',
          wallet: res.wallet,
        })
      );
    }

    this.broadcastState(roomId);
    this.broadcastToast(roomId, `💵 ${player.name} paid ₱${entryFee} entry fee and is ready! Prize Pool: ₱${room.publicState.prizePool}`, 'card_draw');
    return { success: true, message: res.message, wallet: res.wallet };
  }

  /**
   * Toggle player ready status.
   */
  public setReady(roomId: string, playerId: string, isReady: boolean) {
    const room = this.rooms.get(roomId);
    if (!room || room.publicState.phase !== 'lobby') return;

    const player = room.publicState.players.find((p) => p.id === playerId);
    if (player && !player.isHost) {
      player.isReady = isReady;
      this.broadcastState(roomId);
    }
  }

  /**
   * Add a bot to the room.
   */
  public addBot(roomId: string, hostId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.publicState.hostId !== hostId || room.publicState.phase !== 'lobby') {
      return false;
    }

    const isEntryFeeRoom = room.publicState.entryFee > 0;
    const maxCapacity = 10;
    if (room.publicState.players.length >= maxCapacity) return false;

    const botAvatars = ['🤖', '🦾', '👾', '🚀', '⚡', '🧠'];
    const botNames = ['CyberBot', 'RoboPungot', 'ByteRider', 'AlphaUNO', 'CircuitKing', 'NanoCard'];

    const index = room.publicState.players.filter((p) => p.isBot).length;
    const botId = `bot-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const botPlayer: PublicPlayer = {
      id: botId,
      name: botNames[index % botNames.length],
      avatar: botAvatars[index % botAvatars.length],
      cardCount: 0,
      isReady: true,
      isHost: false,
      isBot: true,
      isDisconnected: false,
      calledUno: false,
      score: 0,
      hasPaidEntry: isEntryFeeRoom ? true : undefined,
    };

    room.publicState.players.push(botPlayer);
    if (isEntryFeeRoom) {
      room.publicState.isEntryFeeLocked = true;
    }
    this.broadcastState(roomId);
    return true;
  }

  /**
   * Remove a bot or kick player.
   */
  public removePlayer(roomId: string, hostId: string, targetPlayerId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.publicState.hostId !== hostId || room.publicState.phase !== 'lobby') {
      return false;
    }

    if (targetPlayerId === hostId) return false;

    const playerIndex = room.publicState.players.findIndex((p) => p.id === targetPlayerId);
    if (playerIndex !== -1) {
      const removed = room.publicState.players[playerIndex];

      // Refund entry fee if removed player paid in entry fee match
      if (room.publicState.entryFee > 0 && removed.hasPaidEntry && !removed.isBot) {
        const refundRes = economyManager.refundEntryFee(removed.id, roomId, room.publicState.entryFee);
        const ws = room.sockets.get(targetPlayerId);
        if (ws && ws.readyState === WebSocket.OPEN && refundRes.wallet) {
          ws.send(JSON.stringify({ type: 'WALLET_UPDATE', wallet: refundRes.wallet }));
        }
      }

      room.publicState.players.splice(playerIndex, 1);
      const ws = room.sockets.get(targetPlayerId);
      if (ws) {
        ws.send(JSON.stringify({ type: 'KICKED', message: 'You were removed from the room.' }));
        room.sockets.delete(targetPlayerId);
      }
      this.broadcastState(roomId);
      this.broadcastToast(roomId, `${removed.name} left the room.`, 'error');
      return true;
    }
    return false;
  }

  /**
   * Start the game (Host only).
   */
  public startGame(
    roomId: string,
    hostId: string,
    countdownMs: number = (typeof process !== 'undefined' && (process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST))) ? 0 : 10000
  ): { success: boolean; message?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, message: 'Room not found.' };

    if (room.publicState.hostId !== hostId) {
      return { success: false, message: 'Only the room host can start the match.' };
    }

    const isEntryFeeRoom = room.publicState.entryFee > 0;

    if (room.publicState.players.length < 2) {
      return { success: false, message: 'At least 2 players are required to start.' };
    }

    if (isEntryFeeRoom) {
      const unpaidPlayer = room.publicState.players.find((p) => !p.hasPaidEntry);
      if (unpaidPlayer) {
        return {
          success: false,
          message: `Hindi pa makapagsimula! May hindi pa nagbabayad ng Entry Fee (${unpaidPlayer.name}).`,
        };
      }
      room.publicState.prizePool = room.publicState.entryFee * room.publicState.players.length;
    }

    // Initialize Deck based on variant
    let deck = shuffleDeck(createDeckForVariant(room.publicState.variant));
    const startingHandSize = room.publicState.houseRules.startingHandSize || 7;

    // Clear previous hands
    room.playerHands.clear();

    // Deal cards to each player
    for (const player of room.publicState.players) {
      const hand: Card[] = [];
      for (let i = 0; i < startingHandSize; i++) {
        const card = deck.pop();
        if (card) hand.push(card);
      }

      room.playerHands.set(player.id, hand);
      player.cardCount = hand.length;
      player.calledUno = false;
    }

    // Pick a valid initial discard card (avoid extreme penalty cards as first card)
    let initialDiscard = deck.pop()!;
    while (
      initialDiscard.type === 'wild4' ||
      initialDiscard.type === 'wild_draw_color' ||
      initialDiscard.type === 'wild_dare' ||
      initialDiscard.type === 'forced_swap' ||
      initialDiscard.type === 'targeted_draw2'
    ) {
      deck.unshift(initialDiscard);
      deck = shuffleDeck(deck);
      initialDiscard = deck.pop()!;
    }

    room.discardPile = [initialDiscard];
    room.drawPile = deck;

    // Initial color
    let initialColor: CardColor = initialDiscard.color;
    if (initialColor === 'wild') {
      const colors: CardColor[] = room.publicState.activeFlipSide === 'dark'
        ? ['teal', 'orange', 'purple', 'pink']
        : ['red', 'blue', 'green', 'yellow'];
      initialColor = colors[Math.floor(Math.random() * colors.length)];
    }

    // Setup active player and game status
    room.publicState.phase = 'playing';
    room.publicState.topDiscard = initialDiscard;
    room.publicState.currentColor = initialColor;
    room.publicState.drawPileCount = room.drawPile.length;
    room.publicState.direction = 1;
    room.publicState.activePlayerIndex = 0;
    room.publicState.pendingDrawPenalty = 0;
    room.publicState.unoCallWindow = null;
    room.publicState.pendingChallenge = null;
    room.publicState.pendingSevenSwap = null;
    room.publicState.pendingKeepOrPlay = null;
    room.publicState.winnerId = null;
    room.publicState.loserId = null;
    room.publicState.finishOrder = [];
    room.publicState.matchPowerUpUses = {};
    room.publicState.activeCoinBoosters = [];
    for (const p of room.publicState.players) {
      p.finishRank = null;
      p.isFinished = false;
      room.publicState.matchPowerUpUses[p.id] = 0;
    }
    room.publicState.turnCount = 1;
    room.publicState.startedAt = Date.now();
    room.publicState.lastActionText = `Game started! First card is ${initialDiscard.color.toUpperCase()} ${initialDiscard.type}.`;

    // Handle initial action card effect if any (e.g. Draw 2, Skip, Reverse)
    this.handleFirstCardEffect(room, initialDiscard);

    // Countdown Grace Period (default 10s in live play, 0s in test): ensure neither players nor bots make moves until countdown completes!
    if (countdownMs > 0) {
      room.startGracePeriodUntil = Date.now() + countdownMs;
    } else {
      room.startGracePeriodUntil = undefined;
    }

    this.startTurnTimer(room, countdownMs);
    this.broadcastState(roomId);
    this.broadcastToast(roomId, 'Cards dealt! Game on!');

    // Trigger bot if first player is bot (will respect 10s grace period)
    this.checkTriggerBot(roomId);

    return { success: true };
  }

  private handleFirstCardEffect(room: InternalRoomState, card: Card) {
    const playerCount = room.publicState.players.length;
    if (card.type === 'skip') {
      room.publicState.activePlayerIndex = getNextPlayerIndex(0, playerCount, 1, 1);
      room.publicState.lastActionText = 'Starting card was Skip! First player was skipped.';
    } else if (card.type === 'reverse') {
      room.publicState.direction = -1;
      if (playerCount === 2) {
        room.publicState.activePlayerIndex = 1;
      }
      room.publicState.lastActionText = 'Starting card was Reverse! Turn direction reversed.';
    } else if (card.type === 'draw2') {
      // First player must draw 2 and skip turn
      const firstPlayer = room.publicState.players[0];
      const hand = room.playerHands.get(firstPlayer.id) ?? [];
      const drawn = this.drawFromPile(room, 2);
      hand.push(...drawn);
      firstPlayer.cardCount = hand.length;
      room.publicState.activePlayerIndex = getNextPlayerIndex(0, playerCount, 1, 1);
      room.publicState.lastActionText = `${firstPlayer.name} drew 2 cards from starting Draw Two!`;
    }
  }

  /**
   * Safe draw from pile.
   * If draw deck is empty (0), NEVER reshuffle discard pile!
   * Instead, player draws directly from the next player's hand by selecting/taking a card!
   */
  private drawFromPile(room: InternalRoomState, count: number, targetCardIndex?: number): Card[] {
    const drawn: Card[] = [];
    for (let i = 0; i < count; i++) {
      if (room.drawPile.length > 0) {
        drawn.push(room.drawPile.pop()!);
      } else {
        // Draw pile is 0! DO NOT reshuffle discards.
        // User rule: Player draws from the next player's hand!
        const nextPlayerIdx = this.getNextActivePlayerIndex(
          room,
          room.publicState.activePlayerIndex,
          1
        );
        const nextPlayer = room.publicState.players[nextPlayerIdx];
        if (nextPlayer && nextPlayer.id !== room.publicState.players[room.publicState.activePlayerIndex].id) {
          const nextHand = room.playerHands.get(nextPlayer.id);
          if (nextHand && nextHand.length > 0) {
            let stolenCard: Card;
            if (
              typeof targetCardIndex === 'number' &&
              targetCardIndex >= 0 &&
              targetCardIndex < nextHand.length
            ) {
              stolenCard = nextHand.splice(targetCardIndex, 1)[0];
            } else {
              // Default to top/last card or random card
              const pickIdx = Math.floor(Math.random() * nextHand.length);
              stolenCard = nextHand.splice(pickIdx, 1)[0];
            }
            nextPlayer.cardCount = nextHand.length;
            drawn.push(stolenCard);
          }
        }
      }
    }
    room.publicState.drawPileCount = room.drawPile.length;
    return drawn;
  }

  /**
   * Player plays a card from hand.
   */
  public playCard(
    roomId: string,
    playerId: string,
    cardId: string,
    chosenColor?: CardColor,
    targetPlayerId?: string
  ): { success: boolean; message?: string } {
    const room = this.rooms.get(roomId);
    if (!room || room.publicState.phase !== 'playing') {
      return { success: false, message: 'Game is not currently active.' };
    }

    if (room.startGracePeriodUntil && Date.now() < room.startGracePeriodUntil) {
      return { success: false, message: 'Game is starting, please wait for the countdown to complete!' };
    }

    const { publicState } = room;
    const activePlayer = publicState.players[publicState.activePlayerIndex];

    if (activePlayer.id !== playerId) {
      return { success: false, message: "It's not your turn!" };
    }

    if (publicState.pendingChallenge) {
      return { success: false, message: 'A Wild Draw Four challenge is pending resolution!' };
    }

    if (publicState.pendingSevenSwap) {
      return { success: false, message: 'Choose a player to swap hands with first!' };
    }

    const hand = room.playerHands.get(playerId);
    if (!hand) return { success: false, message: 'Player hand not found.' };

    const cardIndex = hand.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) {
      return { success: false, message: 'Card not found in your hand.' };
    }

    const card = hand[cardIndex];

    // Validate if playable
    const playable = isCardPlayable(
      card,
      publicState.topDiscard,
      publicState.currentColor,
      publicState.pendingDrawPenalty,
      publicState.houseRules.stacking,
      publicState.variant
    );

    if (!playable) {
      return { success: false, message: 'This card cannot be played on the current discard.' };
    }

    // If Wild or Wild action, validate chosen color
    const isWildCard =
      card.color === 'wild' ||
      card.type === 'wild' ||
      card.type === 'wild4' ||
      card.type === 'wild_draw_color' ||
      card.type === 'wild_dare' ||
      card.type === 'power_color';

    if (isWildCard) {
      const validColors =
        publicState.activeFlipSide === 'dark'
          ? ['teal', 'orange', 'purple', 'pink']
          : ['red', 'blue', 'green', 'yellow'];
      if (!chosenColor || !validColors.includes(chosenColor)) {
        chosenColor = validColors[0] as CardColor;
      }
    }

    // Remove card from hand
    hand.splice(cardIndex, 1);
    activePlayer.cardCount = hand.length;

    // Put on discard pile
    room.discardPile.push(card);
    publicState.topDiscard = card;
    publicState.turnCount++;
    publicState.pendingKeepOrPlay = null;

    // Update active color
    if (isWildCard) {
      publicState.currentColor = chosenColor!;
    } else if (card.color !== 'wild') {
      publicState.currentColor = card.color;
    }

    // UNO check: if player now has 1 card
    if (hand.length === 1) {
      if (activePlayer.calledUno) {
        // Player already called UNO beforehand (e.g. while having 2 cards)! Safe!
        publicState.unoCallWindow = null;
      } else if (activePlayer.isBot) {
        // Bots do NOT automatically get calledUno=true immediately.
        // Instead, the hammer appears! Bot will only call UNO after a 2.5s-4.0s delay (if not caught first).
        activePlayer.calledUno = false;
        publicState.unoCallWindow = {
          targetPlayerId: activePlayer.id,
          expiresAt: Date.now() + 3500,
        };

        if (room.unoTimeout) clearTimeout(room.unoTimeout);
        // Dynamic & variable Bot UNO response time:
        // - 15% chance: INSTANT reaction (flash reflex / preemptive press: 300ms - 650ms)
        // - 35% chance: FAST reaction (alert bot: 750ms - 1400ms)
        // - 30% chance: NORMAL / MEDIUM reaction (1600ms - 2400ms)
        // - 12% chance: SLOW / PANIC reaction (2600ms - 3400ms, easy catch for human!)
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
          room.unoTimeout = setTimeout(() => {
            const currentRoom = this.rooms.get(roomId);
            if (!currentRoom || currentRoom.publicState.phase !== 'playing') return;
            const currentHand = currentRoom.playerHands.get(activePlayer.id) || [];
            if (currentHand.length === 1 && !activePlayer.calledUno) {
              activePlayer.calledUno = true;
              currentRoom.publicState.unoCallWindow = null;
              this.broadcastUnoShout(roomId, activePlayer.id, activePlayer.name);
              this.broadcastToast(roomId, `🔥 ${activePlayer.name} SHOUTED UNO! 🔥`, 'uno_call');
              this.broadcastState(roomId);
            }
          }, botCallDelay);
        }
      } else {
        // Human player forgot or hasn't called UNO yet: open a 3.5s reaction window for opponents
        publicState.unoCallWindow = {
          targetPlayerId: activePlayer.id,
          expiresAt: Date.now() + 3500,
        };
        if (room.unoTimeout) clearTimeout(room.unoTimeout);
        room.unoTimeout = setTimeout(() => {
          if (room.publicState.unoCallWindow?.targetPlayerId === activePlayer.id) {
            room.publicState.unoCallWindow = null;
            this.broadcastState(roomId);
          }
        }, 3600);
      }
    } else {
      activePlayer.calledUno = false;
      publicState.unoCallWindow = null;
    }

    // Award in-game card play XP for active human player
    if (!activePlayer.isBot) {
      const isAction = isWildCard || card.type === 'draw2' || card.type === 'skip' || card.type === 'reverse' || card.type === 'flip' || card.type === 'dare';
      const xpAmt = isAction ? 8 : 4;
      const expRes = economyManager.addInGameExperience(activePlayer.id, xpAmt, 'Card Played');
      if (expRes) {
        activePlayer.level = expRes.wallet.level;
        activePlayer.experience = expRes.wallet.experience;
        const client = room.sockets.get(activePlayer.id);
        if (client && client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({
              type: 'WALLET_UPDATE',
              wallet: expRes.wallet,
              levelUp: expRes.leveledUp ? { oldLevel: expRes.oldLevel, newLevel: expRes.newLevel, bonus: expRes.bonusCoins } : undefined,
              xpGained: xpAmt,
            })
          );
        }
        if (expRes.leveledUp) {
          this.broadcastToast(roomId, `🎉 LEVEL UP! Si ${activePlayer.name} ay Level ${expRes.newLevel} na! (+₱${expRes.bonusCoins})`, 'game_win');
        }
      }
    }

    // Hand-empty / Survival Win check!
    if (hand.length === 0) {
      this.handlePlayerFinished(room, activePlayer, card, chosenColor, targetPlayerId);
      return { success: true };
    }

    // Resolve card effects on active players
    const { sound, actionDescription: effectDesc } = this.resolveCardEffect(
      room,
      card,
      activePlayer,
      chosenColor,
      targetPlayerId
    );

    publicState.lastActionText = effectDesc;

    this.startTurnTimer(room);
    this.checkDeadlock(room);
    this.broadcastState(roomId);
    this.broadcastToast(roomId, effectDesc, sound);

    // If next player is bot, trigger it
    this.checkTriggerBot(roomId);

    return { success: true };
  }

  /**
   * Calculate next player index, skipping players who have finished (0 cards).
   */
  public getNextActivePlayerIndex(
    room: InternalRoomState,
    fromIndex: number,
    steps: number = 1
  ): number {
    const players = room.publicState.players;
    const count = players.length;
    const dir = room.publicState.direction;
    let curr = fromIndex;
    let stepsCounted = 0;

    for (let i = 0; i < count * 3; i++) {
      curr = (curr + dir + count) % count;
      const player = players[curr];
      const hand = room.playerHands.get(player.id) || [];
      const isFinished = player.isFinished || hand.length === 0;

      if (!isFinished) {
        stepsCounted++;
        if (stepsCounted === steps) {
          return curr;
        }
      }
    }
    return curr;
  }

  /**
   * Handle when a player empties their hand.
   * Universal Pungot Rule: First to empty cards wins 1st Place.
   * Match continues for remaining players until only 1 player remains holding cards (The Loser / Ang Pungot)!
   */
  private handlePlayerFinished(
    room: InternalRoomState,
    player: PublicPlayer,
    playedCard: Card,
    chosenColor?: CardColor,
    targetPlayerId?: string
  ) {
    const { publicState } = room;
    const roomId = publicState.roomId;

    const finishRank = publicState.finishOrder.length + 1;
    player.isFinished = true;
    player.finishRank = finishRank;
    publicState.finishOrder.push(player.id);

    if (finishRank === 1) {
      publicState.winnerId = player.id;
      const desc = `🏆 ${player.name} EMPTIED HAND & WON 1ST PLACE! Match continues for remaining players!`;
      publicState.lastActionText = desc;
      this.broadcastToast(roomId, desc, 'game_win');

      // Immediate coin & XP payout for 1st place in casual matches (so players get coins instantly!)
      if (publicState.entryFee === 0 && !room.payoutsProcessed && !player.isBot) {
        try {
          const hasBooster = Boolean(publicState.activeCoinBoosters?.includes(player.id));
          const allHumanIds = publicState.players.filter((p) => !p.isBot).map((p) => p.id);
          const playerMetadata: Record<string, { name: string; avatar: string }> = {};
          for (const p of publicState.players) {
            playerMetadata[p.id] = { name: p.name, avatar: p.avatar };
          }
          const { winnerCoins, streak, updatedWallets, levelUps, xpGains } = economyManager.awardMatchFinish(
            player.id,
            null,
            allHumanIds,
            hasBooster,
            publicState.finishOrder,
            playerMetadata
          );
          room.payoutsProcessed = true;

          for (const p of publicState.players) {
            if (updatedWallets[p.id]) {
              p.level = updatedWallets[p.id].level;
              p.experience = updatedWallets[p.id].experience;
              p.xpGained = xpGains[p.id] || 0;
            }
          }

          for (const [pid, updatedWallet] of Object.entries(updatedWallets)) {
            const client = room.sockets.get(pid);
            if (client && client.readyState === WebSocket.OPEN) {
              client.send(
                JSON.stringify({
                  type: 'WALLET_UPDATE',
                  wallet: updatedWallet,
                  levelUp: levelUps[pid],
                  xpGained: xpGains[pid] || 0,
                })
              );
            }
            if (levelUps[pid]) {
              const p = publicState.players.find((pl) => pl.id === pid);
              this.broadcastToast(
                roomId,
                `🎉 LEVEL UP! Si ${p?.name || 'Player'} ay Level ${levelUps[pid].newLevel} na! (+₱${levelUps[pid].bonus})`,
                'game_win'
              );
            }
          }
        } catch (err) {
          console.error('Error awarding immediate 1st place payout:', err);
        }
      }
    } else {
      const desc = `🎉 ${player.name} is SAFE (Rank ${finishRank})! Battle continues!`;
      publicState.lastActionText = desc;
      this.broadcastToast(roomId, desc, 'turn_alert');
    }

    // Count remaining players who still have cards
    const remainingPlayers = publicState.players.filter(
      (p) => !p.isFinished && (room.playerHands.get(p.id)?.length || 0) > 0
    );

    // If only 1 player remains with cards -> That last player is ANG PUNGOT (LOSER)!
    if (remainingPlayers.length <= 1) {
      const loser = remainingPlayers[0] || null;
      if (loser) {
        loser.isFinished = true;
        loser.finishRank = publicState.players.length;
        publicState.finishOrder.push(loser.id);
        publicState.loserId = loser.id;
      }

      publicState.phase = 'ended';
      publicState.endedAt = Date.now();

      if (room.timerInterval) clearInterval(room.timerInterval);
      if (room.botTimeout) clearTimeout(room.botTimeout);
      let coinToastSuffix = '';

      // Prize Pool Distribution for Entry Fee matches (5-Place System)
      if (publicState.entryFee > 0 && !room.payoutsProcessed) {
        room.payoutsProcessed = true;

        // Compile ordered rankings based on finishOrder
        const rankedPlayers = publicState.finishOrder
          .map((pid, idx) => {
            const p = publicState.players.find((pl) => pl.id === pid);
            return {
              playerId: pid,
              name: p?.name || `Player ${idx + 1}`,
              avatar: p?.avatar || '🐼',
              rank: idx + 1,
            };
          });

        // Any players not yet in finishOrder (e.g. ties or unfinished)
        for (const p of publicState.players) {
          if (!rankedPlayers.some((rp) => rp.playerId === p.id)) {
            rankedPlayers.push({
              playerId: p.id,
              name: p.name,
              avatar: p.avatar,
              rank: rankedPlayers.length + 1,
            });
          }
        }

        const { payouts, updatedWallets, levelUps, xpGains } = economyManager.distributePrizePool(
          roomId,
          rankedPlayers,
          publicState.entryFee
        );
        publicState.payoutResults = payouts;

        // Attach level and xpGained to publicState players
        for (const p of publicState.players) {
          if (updatedWallets[p.id]) {
            p.level = updatedWallets[p.id].level;
            p.experience = updatedWallets[p.id].experience;
            p.xpGained = xpGains[p.id] || 0;
          }
        }

        // Send updated wallets directly to connected players
        for (const [pid, updatedWallet] of Object.entries(updatedWallets)) {
          const client = room.sockets.get(pid);
          if (client && client.readyState === WebSocket.OPEN) {
            client.send(
              JSON.stringify({
                type: 'WALLET_UPDATE',
                wallet: updatedWallet,
                levelUp: levelUps[pid],
                xpGained: xpGains[pid] || 0,
              })
            );
          }
          if (levelUps[pid]) {
            const p = publicState.players.find((pl) => pl.id === pid);
            this.broadcastToast(
              roomId,
              `🎉 LEVEL UP! Si ${p?.name || 'Player'} ay Level ${levelUps[pid].newLevel} na! (+₱${levelUps[pid].bonus})`,
              'game_win'
            );
          }
        }

        const firstPlacePayout = payouts.find((p) => p.rank === 1);
        coinToastSuffix = ` • 💰 1st Place Prize: ₱${firstPlacePayout?.prize || 0} (${firstPlacePayout?.percentage || 50}%)!`;
      } else if (publicState.entryFee === 0 && !room.payoutsProcessed) {
        // Casual / Free match: Award Standard Virtual Peso Coins and Streaks
        room.payoutsProcessed = true;
        const allHumanIds = publicState.players.filter((p) => !p.isBot).map((p) => p.id);
        const winnerId = publicState.winnerId;
        const hasBooster = Boolean(winnerId && publicState.activeCoinBoosters?.includes(winnerId));

        if (winnerId) {
          const playerMetadata: Record<string, { name: string; avatar: string }> = {};
          for (const p of publicState.players) {
            playerMetadata[p.id] = { name: p.name, avatar: p.avatar };
          }

          const { winnerCoins, streak, updatedWallets, levelUps, xpGains } = economyManager.awardMatchFinish(
            winnerId,
            loser?.id || null,
            allHumanIds,
            hasBooster,
            publicState.finishOrder,
            playerMetadata
          );

          // Attach level and xpGained to publicState players
          for (const p of publicState.players) {
            if (updatedWallets[p.id]) {
              p.level = updatedWallets[p.id].level;
              p.experience = updatedWallets[p.id].experience;
              p.xpGained = xpGains[p.id] || 0;
            }
          }

          // Send updated wallets directly to connected players via WebSocket
          for (const [pid, updatedWallet] of Object.entries(updatedWallets)) {
            const client = room.sockets.get(pid);
            if (client && client.readyState === WebSocket.OPEN) {
              client.send(
                JSON.stringify({
                  type: 'WALLET_UPDATE',
                  wallet: updatedWallet,
                  levelUp: levelUps[pid],
                  xpGained: xpGains[pid] || 0,
                })
              );
            }
            if (levelUps[pid]) {
              const p = publicState.players.find((pl) => pl.id === pid);
              this.broadcastToast(
                roomId,
                `🎉 LEVEL UP! Si ${p?.name || 'Player'} ay Level ${levelUps[pid].newLevel} na! (+₱${levelUps[pid].bonus})`,
                'game_win'
              );
            }
          }

          if (winnerCoins > 0) {
            coinToastSuffix = ` • 💰 Won ₱${winnerCoins}${hasBooster ? ' (2x Booster!)' : ''}${
              streak >= 2 ? ` (${streak}x Win Streak!)` : ''
            }`;
          }
        }
      }

      // Pungot Edition: Purely elimination/standing, zero point scoring!
      const winner = publicState.players.find((p) => p.id === publicState.winnerId);
      const loserMsg = loser
        ? ` • 💀 ${loser.name} is ANG PUNGOT (LOST with ${loser.cardCount} cards)!`
        : '';
      const endDesc = `🏁 MATCH FINISHED! 🏆 1st: ${winner?.name || 'Winner'}${coinToastSuffix}${loserMsg}`;
      publicState.lastActionText = endDesc;

      this.broadcastState(roomId);
      this.broadcastToast(roomId, endDesc, 'game_win');
      return;
    }

    // More than 1 player remains -> Resolve card effects on remaining active players and continue!
    const { sound, actionDescription: effectDesc } = this.resolveCardEffect(
      room,
      playedCard,
      player,
      chosenColor,
      targetPlayerId
    );

    publicState.lastActionText = effectDesc;
    this.startTurnTimer(room);
    this.broadcastState(roomId);
    this.broadcastToast(roomId, effectDesc, sound);
    this.checkTriggerBot(roomId);
  }

  /**
   * Helper to determine exact stacked draw sound effect based on total accumulated penalty cards.
   */
  private getStackedDrawSound(totalPenalty: number): SoundEffectType {
    if (totalPenalty <= 2) return 'power_draw2';
    if (totalPenalty === 4) return 'power_wild4';
    if (totalPenalty === 6) return 'power_draw6';
    if (totalPenalty === 8) return 'power_draw8';
    if (totalPenalty === 10) return 'power_draw10';
    if (totalPenalty === 12) return 'power_draw12';
    if (totalPenalty === 14) return 'power_draw14';
    if (totalPenalty === 16) return 'power_draw16';
    if (totalPenalty === 18) return 'power_draw18';
    if (totalPenalty === 20) return 'power_draw20';
    if (totalPenalty === 22) return 'power_draw22';
    if (totalPenalty >= 24) return 'power_draw24';
    return 'power_wild4';
  }

  /**
   * Resolve card actions affecting the active player queue.
   */
  private resolveCardEffect(
    room: InternalRoomState,
    card: Card,
    activePlayer: PublicPlayer,
    chosenColor?: CardColor,
    targetPlayerId?: string
  ): { sound?: SoundEffectType; actionDescription: string } {
    const { publicState } = room;
    let sound: SoundEffectType | undefined;
    let actionDescription = `${activePlayer.name} played ${card.color.toUpperCase()} ${card.type.toUpperCase()}`;

    // 1. Skip
    if (card.type === 'skip') {
      sound = 'skip';
      const skippedIdx = this.getNextActivePlayerIndex(room, publicState.activePlayerIndex, 1);
      const skippedPlayer = publicState.players[skippedIdx];
      actionDescription += ` — ${skippedPlayer.name} was skipped!`;
      publicState.activePlayerIndex = this.getNextActivePlayerIndex(room, publicState.activePlayerIndex, 2);
    }
    // 2. Reverse
    else if (card.type === 'reverse') {
      sound = 'reverse';
      publicState.direction = (publicState.direction * -1) as 1 | -1;
      actionDescription += ' — Direction reversed!';
      const activeCount = publicState.players.filter(
        (p) => !p.isFinished && (room.playerHands.get(p.id)?.length || 0) > 0
      ).length;
      if (activeCount === 2) {
        publicState.activePlayerIndex = this.getNextActivePlayerIndex(room, publicState.activePlayerIndex, 2);
      } else {
        publicState.activePlayerIndex = this.getNextActivePlayerIndex(room, publicState.activePlayerIndex, 1);
      }
    }
    // 3. Draw 2
    else if (card.type === 'draw2') {
      if (publicState.houseRules.stacking) {
        publicState.pendingDrawPenalty += 2;
        sound = this.getStackedDrawSound(publicState.pendingDrawPenalty);
        actionDescription += ` (Pending Penalty: +${publicState.pendingDrawPenalty})`;
        publicState.activePlayerIndex = this.getNextActivePlayerIndex(room, publicState.activePlayerIndex, 1);
      } else {
        sound = 'power_draw2';
        const nextIdx = this.getNextActivePlayerIndex(room, publicState.activePlayerIndex, 1);
        const nextPlayer = publicState.players[nextIdx];
        const nextHand = room.playerHands.get(nextPlayer.id) ?? [];
        const drawn = this.drawFromPile(room, 2);
        nextHand.push(...drawn);
        nextPlayer.cardCount = nextHand.length;
        actionDescription += ` — ${nextPlayer.name} draws 2 and loses turn!`;
        publicState.activePlayerIndex = this.getNextActivePlayerIndex(room, publicState.activePlayerIndex, 2);
      }
    }
    // 4. Wild Draw 4
    else if (card.type === 'wild4') {
      const nextIdx = this.getNextActivePlayerIndex(room, publicState.activePlayerIndex, 1);
      const nextPlayer = publicState.players[nextIdx];

      // If Stacking rule is enabled: add +4 to pendingDrawPenalty and pass the turn to the next player
      // (This supports full cumulative stacking: +2 +4 +2 +4 = 12 cards, etc.)
      if (publicState.houseRules.stacking) {
        publicState.pendingDrawPenalty += 4;
        sound = this.getStackedDrawSound(publicState.pendingDrawPenalty);
        actionDescription += ` (Pending Penalty: +${publicState.pendingDrawPenalty})`;
        publicState.activePlayerIndex = nextIdx;
      } else if (publicState.variant !== 'all_wild' && publicState.houseRules.wildDraw4Challenge && !nextPlayer.isBot) {
        sound = 'power_wild4';
        // In All Wild variant, all cards are wild so there is NO bluffing/challenging!
        publicState.pendingChallenge = {
          challengerId: nextPlayer.id,
          playedBy: activePlayer.id,
          playedCard: card,
        };
        actionDescription += ` — Wild Draw Four! ${nextPlayer.name} may challenge.`;
      } else {
        sound = 'power_wild4';
        const nextHand = room.playerHands.get(nextPlayer.id) ?? [];
        const drawn = this.drawFromPile(room, 4);
        nextHand.push(...drawn);
        nextPlayer.cardCount = nextHand.length;
        actionDescription += ` — ${nextPlayer.name} draws 4 and loses turn!`;
        publicState.activePlayerIndex = this.getNextActivePlayerIndex(room, publicState.activePlayerIndex, 2);
      }
    }
    // 5. Flip
    else if (card.type === 'flip') {
      sound = 'flip';
      publicState.activeFlipSide = publicState.activeFlipSide === 'light' ? 'dark' : 'light';
      room.drawPile = room.drawPile.map((c) => c.flipSide || c);
      room.discardPile = room.discardPile.map((c) => c.flipSide || c);
      for (const [pid, h] of room.playerHands.entries()) {
        room.playerHands.set(pid, h.map((c) => c.flipSide || c));
      }
      const flippedDiscard = card.flipSide || card;
      publicState.topDiscard = flippedDiscard;
      if (flippedDiscard.color === 'wild') {
        publicState.currentColor = publicState.activeFlipSide === 'dark' ? 'teal' : 'red';
      } else {
        publicState.currentColor = flippedDiscard.color;
      }
      actionDescription += ` — 🔄 FLIP! Everything flipped to the ${publicState.activeFlipSide.toUpperCase()} side!`;
      publicState.activePlayerIndex = this.getNextActivePlayerIndex(room, publicState.activePlayerIndex, 1);
    }
    // 6. Draw 1
    else if (card.type === 'draw1') {
      sound = 'card_draw';
      const nextIdx = this.getNextActivePlayerIndex(room, publicState.activePlayerIndex, 1);
      const nextPlayer = publicState.players[nextIdx];
      const nextHand = room.playerHands.get(nextPlayer.id) ?? [];
      const drawn = this.drawFromPile(room, 1);
      nextHand.push(...drawn);
      nextPlayer.cardCount = nextHand.length;
      actionDescription += ` — ${nextPlayer.name} draws 1 and loses turn!`;
      publicState.activePlayerIndex = this.getNextActivePlayerIndex(room, publicState.activePlayerIndex, 2);
    }
    // 7. Draw 5
    else if (card.type === 'draw5') {
      sound = 'card_draw';
      const nextIdx = this.getNextActivePlayerIndex(room, publicState.activePlayerIndex, 1);
      const nextPlayer = publicState.players[nextIdx];
      const nextHand = room.playerHands.get(nextPlayer.id) ?? [];
      const drawn = this.drawFromPile(room, 5);
      nextHand.push(...drawn);
      nextPlayer.cardCount = nextHand.length;
      actionDescription += ` — ${nextPlayer.name} draws 5 and loses turn!`;
      publicState.activePlayerIndex = this.getNextActivePlayerIndex(room, publicState.activePlayerIndex, 2);
    }
    // 8. Skip All
    else if (card.type === 'skip_all') {
      sound = 'skip';
      actionDescription += ` — ⊘ SKIP ALL! Everyone was skipped!`;
      if (activePlayer.isFinished || (room.playerHands.get(activePlayer.id)?.length || 0) === 0) {
        publicState.activePlayerIndex = this.getNextActivePlayerIndex(room, publicState.activePlayerIndex, 1);
      }
      // If not finished, activePlayer stays active and plays again
    }
    // 9. Wild Draw Color
    else if (card.type === 'wild_draw_color') {
      sound = 'card_draw';
      const nextIdx = this.getNextActivePlayerIndex(room, publicState.activePlayerIndex, 1);
      const nextPlayer = publicState.players[nextIdx];
      const nextHand = room.playerHands.get(nextPlayer.id) ?? [];
      let drawnCount = 0;
      let matched = false;
      while (!matched && drawnCount < 15) {
        const drawn = this.drawFromPile(room, 1);
        if (drawn.length === 0) break;
        drawnCount++;
        nextHand.push(drawn[0]);
        if (drawn[0].color === chosenColor) {
          matched = true;
        }
      }
      nextPlayer.cardCount = nextHand.length;
      actionDescription += ` — ${nextPlayer.name} drew ${drawnCount} cards until getting ${chosenColor?.toUpperCase()}!`;
      publicState.activePlayerIndex = this.getNextActivePlayerIndex(room, publicState.activePlayerIndex, 2);
    }
    // 10. Skip 2
    else if (card.type === 'skip2') {
      sound = 'skip';
      const activePlayersCount = publicState.players.filter(
        (p) => !p.isFinished && (room.playerHands.get(p.id)?.length || 0) > 0
      ).length;

      if (activePlayersCount <= 2) {
        // In 1v1 (2 players left): Opponent is skipped twice, meaning Player 1 gets 2 more cards/turns after this Double Skip!
        const opponent = publicState.players[this.getNextActivePlayerIndex(room, publicState.activePlayerIndex, 1)];
        room.extraTurnsRemaining = { playerId: activePlayer.id, count: 2 };
        actionDescription += ` — ⏩ DOUBLE SKIP! ${opponent.name} was skipped twice! ${activePlayer.name} can play 2 more cards!`;
        // Keep activePlayerIndex on activePlayer so they play their first extra turn immediately
        publicState.activePlayerIndex = publicState.activePlayerIndex;
      } else {
        const s1 = publicState.players[this.getNextActivePlayerIndex(room, publicState.activePlayerIndex, 1)];
        const s2 = publicState.players[this.getNextActivePlayerIndex(room, publicState.activePlayerIndex, 2)];
        actionDescription += ` — ${s1.name} & ${s2.name} were skipped!`;
        publicState.activePlayerIndex = this.getNextActivePlayerIndex(room, publicState.activePlayerIndex, 3);
      }
    }
    // 11. Targeted Draw 2
    else if (card.type === 'targeted_draw2') {
      sound = 'power_targeted_draw2';
      const defaultTargetId = publicState.players[this.getNextActivePlayerIndex(room, publicState.activePlayerIndex, 1)].id;
      const targetId = targetPlayerId || defaultTargetId;
      const targetPlayer = publicState.players.find((p) => p.id === targetId);
      const targetHand = room.playerHands.get(targetId) ?? [];
      const drawn = this.drawFromPile(room, 2);
      targetHand.push(...drawn);
      if (targetPlayer) targetPlayer.cardCount = targetHand.length;
      actionDescription += ` — ${targetPlayer?.name} was targeted and drew 2 cards!`;
      publicState.activePlayerIndex = this.getNextActivePlayerIndex(room, publicState.activePlayerIndex, 1);
    }
    // 12. Forced Swap
    else if (card.type === 'forced_swap') {
      sound = 'power_swap';
      const defaultTargetId = publicState.players[this.getNextActivePlayerIndex(room, publicState.activePlayerIndex, 1)].id;
      const targetId = targetPlayerId || defaultTargetId;
      this.executeSevenSwap(room, activePlayer.id, targetId);
      const targetPlayer = publicState.players.find((p) => p.id === targetId);
      actionDescription += ` — FORCED SWAP with ${targetPlayer?.name}!`;
      publicState.activePlayerIndex = this.getNextActivePlayerIndex(room, publicState.activePlayerIndex, 1);
    }
    // 13. Dare & Wild Dare
    else if (card.type === 'dare' || card.type === 'wild_dare') {
      sound = 'dare';
      const nextIdx = this.getNextActivePlayerIndex(room, publicState.activePlayerIndex, 1);
      const nextPlayer = publicState.players[nextIdx];
      const penaltyCount = card.type === 'wild_dare' ? 4 : 2;
      const dareText = card.dareText || 'Sing the chorus of your favorite song!';

      if (nextPlayer.isBot) {
        if (Math.random() < 0.75) {
          actionDescription += ` — ${nextPlayer.name} COMPLETED THE DARE: "${dareText}" and escaped penalty!`;
          publicState.activePlayerIndex = this.getNextActivePlayerIndex(room, publicState.activePlayerIndex, 2);
        } else {
          const nextHand = room.playerHands.get(nextPlayer.id) ?? [];
          const drawn = this.drawFromPile(room, penaltyCount);
          nextHand.push(...drawn);
          nextPlayer.cardCount = nextHand.length;
          actionDescription += ` — ${nextPlayer.name} declined the dare and drew ${penaltyCount} cards!`;
          publicState.activePlayerIndex = this.getNextActivePlayerIndex(room, publicState.activePlayerIndex, 2);
        }
      } else {
        publicState.pendingDare = {
          targetPlayerId: nextPlayer.id,
          playedBy: activePlayer.id,
          penaltyDrawCount: penaltyCount,
          dareText,
        };
        actionDescription += ` — DARE! ${nextPlayer.name} must Accept the Dare or Draw ${penaltyCount}!`;
      }
    }
    // 14. Seven-Zero Rule
    else if (publicState.houseRules.sevenZero && card.type === 'number' && card.value === 7) {
      sound = 'power_swap';
      if (targetPlayerId && targetPlayerId !== activePlayer.id) {
        this.executeSevenSwap(room, activePlayer.id, targetPlayerId);
        actionDescription += ` — ${activePlayer.name} swapped hands!`;
        publicState.activePlayerIndex = this.getNextActivePlayerIndex(room, publicState.activePlayerIndex, 1);
      } else {
        publicState.pendingSevenSwap = { playerId: activePlayer.id };
        actionDescription += ` — Choose a player to swap hands with!`;
      }
    } else if (publicState.houseRules.sevenZero && card.type === 'number' && card.value === 0) {
      this.executeZeroRotate(room);
      actionDescription += ` — 0 played! All hands rotated ${publicState.direction === 1 ? 'clockwise' : 'counter-clockwise'}!`;
      publicState.activePlayerIndex = this.getNextActivePlayerIndex(room, publicState.activePlayerIndex, 1);
    }
    // 15. Power-Up Cards played directly from Hand!
    else if (card.type === 'power_shield') {
      sound = 'power_draw2';
      if (publicState.pendingDrawPenalty > 0) {
        const blocked = publicState.pendingDrawPenalty;
        publicState.pendingDrawPenalty = 0;
        actionDescription = `🛡️ SHIELD ACTIVATED! ${activePlayer.name} blocked the +${blocked} penalty completely!`;
      } else {
        actionDescription = `🛡️ SHIELD PLAYED! ${activePlayer.name} is protected!`;
      }
      publicState.activePlayerIndex = this.getNextActivePlayerIndex(room, publicState.activePlayerIndex, 1);
    } else if (card.type === 'power_swap') {
      sound = 'power_swap';
      const validOpponents = publicState.players.filter(
        (p) => p.id !== activePlayer.id && !p.isFinished && (room.playerHands.get(p.id)?.length || 0) > 0
      );
      const target =
        validOpponents.find((p) => p.id === targetPlayerId) ||
        validOpponents[Math.floor(Math.random() * validOpponents.length)];

      const myHand = room.playerHands.get(activePlayer.id) || [];
      const theirHand = target ? room.playerHands.get(target.id) || [] : [];

      if (target && myHand.length > 0 && theirHand.length > 0) {
        const myRandomIndex = Math.floor(Math.random() * myHand.length);
        const theirRandomIndex = Math.floor(Math.random() * theirHand.length);

        const myCard = myHand.splice(myRandomIndex, 1)[0];
        const theirCard = theirHand.splice(theirRandomIndex, 1)[0];

        myHand.push(theirCard);
        theirHand.push(myCard);

        activePlayer.cardCount = myHand.length;
        target.cardCount = theirHand.length;

        actionDescription = `🔄 CARD SWAP! ${activePlayer.name} randomly swapped 1 card with ${target.name}!`;
      } else {
        actionDescription = `🔄 CARD SWAP played!`;
      }
      publicState.activePlayerIndex = this.getNextActivePlayerIndex(room, publicState.activePlayerIndex, 1);
    } else if (card.type === 'power_reverse') {
      sound = 'power_reverse';
      publicState.direction = (publicState.direction * -1) as 1 | -1;
      actionDescription = `🔁 REVERSE MASTER! ${activePlayer.name} reversed the game direction!`;
      const activeCount = publicState.players.filter(
        (p) => !p.isFinished && (room.playerHands.get(p.id)?.length || 0) > 0
      ).length;
      if (activeCount === 2) {
        publicState.activePlayerIndex = this.getNextActivePlayerIndex(room, publicState.activePlayerIndex, 2);
      } else {
        publicState.activePlayerIndex = this.getNextActivePlayerIndex(room, publicState.activePlayerIndex, 1);
      }
    } else if (card.type === 'power_color') {
      sound = 'power_wild';
      const validColors: CardColor[] =
        publicState.activeFlipSide === 'dark'
          ? ['teal', 'orange', 'purple', 'pink']
          : ['red', 'blue', 'green', 'yellow'];
      const newColor = chosenColor && validColors.includes(chosenColor) ? chosenColor : validColors[0];
      publicState.currentColor = newColor;
      actionDescription = `🎨 COLOR CHANGER! ${activePlayer.name} changed table color to ${newColor.toUpperCase()}!`;
      publicState.activePlayerIndex = this.getNextActivePlayerIndex(room, publicState.activePlayerIndex, 1);
    } else if (card.type === 'power_extra_turn') {
      sound = 'power_general';
      actionDescription = `⚡ EXTRA TURN! ${activePlayer.name} takes another turn immediately!`;
      // Keeps activePlayerIndex unchanged so active player plays again!
    } else if (card.type === 'power_peek') {
      sound = 'power_general';
      const opponents = publicState.players.filter(
        (p) => p.id !== activePlayer.id && !p.isFinished && (room.playerHands.get(p.id)?.length || 0) > 0
      );
      const target =
        opponents.find((p) => p.id === targetPlayerId) ||
        opponents[Math.floor(Math.random() * opponents.length)];

      if (target) {
        const targetHand = room.playerHands.get(target.id) || [];
        if (targetHand.length > 0) {
          const peekedCard = targetHand[Math.floor(Math.random() * targetHand.length)];
          const client = room.sockets.get(activePlayer.id);
          if (client && client.readyState === WebSocket.OPEN) {
            client.send(
              JSON.stringify({
                type: 'PEEK_RESULT',
                targetPlayerName: target.name,
                card: peekedCard,
              })
            );
          }
        }
      }
      actionDescription = `👁️ PEEK CARD! ${activePlayer.name} peeked at an opponent's card!`;
      publicState.activePlayerIndex = this.getNextActivePlayerIndex(room, publicState.activePlayerIndex, 1);
    } else if (card.type === 'power_booster') {
      sound = 'power_general';
      if (!publicState.activeCoinBoosters) {
        publicState.activeCoinBoosters = [];
      }
      if (!publicState.activeCoinBoosters.includes(activePlayer.id)) {
        publicState.activeCoinBoosters.push(activePlayer.id);
      }
      actionDescription = `💰 COIN BOOSTER ACTIVE! ${activePlayer.name}'s victory reward will be doubled to ₱400!`;
      publicState.activePlayerIndex = this.getNextActivePlayerIndex(room, publicState.activePlayerIndex, 1);
    } else if (card.type === 'power_reflect') {
      sound = 'power_draw2';
      if (publicState.pendingDrawPenalty > 0) {
        const reflectedPenalty = publicState.pendingDrawPenalty;
        publicState.pendingDrawPenalty = 0;

        const attackerIdx =
          (publicState.activePlayerIndex - publicState.direction + publicState.players.length) %
          publicState.players.length;
        const attacker = publicState.players[attackerIdx];
        const attackerHand = room.playerHands.get(attacker.id) || [];

        const drawn = this.drawFromPile(room, reflectedPenalty);
        attackerHand.push(...drawn);
        attacker.cardCount = attackerHand.length;

        actionDescription = `🪞 ATTACK REFLECT! ${activePlayer.name} reflected +${reflectedPenalty} back to ${attacker.name}!`;
      } else {
        actionDescription = `🪞 ATTACK REFLECT played by ${activePlayer.name}!`;
      }
      publicState.activePlayerIndex = this.getNextActivePlayerIndex(room, publicState.activePlayerIndex, 1);
    }
    // Standard number or Wild
    else {
      if (room.extraTurnsRemaining && room.extraTurnsRemaining.playerId === activePlayer.id && room.extraTurnsRemaining.count > 0) {
        room.extraTurnsRemaining.count--;
        actionDescription += ` (Extra Turn Remaining: ${room.extraTurnsRemaining.count})`;
        if (room.extraTurnsRemaining.count > 0) {
          // Keep turn on active player for next card
          publicState.activePlayerIndex = publicState.activePlayerIndex;
        } else {
          room.extraTurnsRemaining = null;
          publicState.activePlayerIndex = this.getNextActivePlayerIndex(room, publicState.activePlayerIndex, 1);
        }
      } else {
        publicState.activePlayerIndex = this.getNextActivePlayerIndex(room, publicState.activePlayerIndex, 1);
      }
    }

    return { sound, actionDescription };
  }

  /**
   * Execute 7 swap hands between two players.
   */
  public executeSevenSwap(room: InternalRoomState, playerAId: string, playerBId: string) {
    const handA = room.playerHands.get(playerAId) || [];
    const handB = room.playerHands.get(playerBId) || [];

    room.playerHands.set(playerAId, [...handB]);
    room.playerHands.set(playerBId, [...handA]);

    const playerA = room.publicState.players.find((p) => p.id === playerAId);
    const playerB = room.publicState.players.find((p) => p.id === playerBId);
    if (playerA) playerA.cardCount = handB.length;
    if (playerB) playerB.cardCount = handA.length;

    room.publicState.pendingSevenSwap = null;
  }

  /**
   * Execute 0 rotate hands in direction of play.
   */
  public executeZeroRotate(room: InternalRoomState) {
    const players = room.publicState.players;
    const n = players.length;
    const currentHands = players.map((p) => ({
      id: p.id,
      hand: room.playerHands.get(p.id) || [],
    }));

    for (let i = 0; i < n; i++) {
      const targetIndex = (i + room.publicState.direction + n) % n;
      const targetPlayer = players[targetIndex];
      const fromHand = currentHands[i].hand;

      room.playerHands.set(targetPlayer.id, [...fromHand]);
      targetPlayer.cardCount = fromHand.length;
    }
  }

  /**
   * Resolve Wild Draw 4 challenge.
   */
  public resolveWD4Challenge(
    roomId: string,
    challengerId: string,
    doChallenge: boolean
  ): { success: boolean; message?: string } {
    const room = this.rooms.get(roomId);
    if (!room || !room.publicState.pendingChallenge) {
      return { success: false, message: 'No challenge pending.' };
    }

    const { challengerId: expectedChallenger, playedBy } = room.publicState.pendingChallenge;
    if (challengerId !== expectedChallenger) {
      return { success: false, message: 'You are not the designated challenger.' };
    }

    const challenger = room.publicState.players.find((p) => p.id === challengerId);
    const playedByPlayer = room.publicState.players.find((p) => p.id === playedBy);
    const challengerHand = room.playerHands.get(challengerId) ?? [];
    const playedByHand = room.playerHands.get(playedBy) ?? [];

    let desc = '';
    let sound: SoundEffectType = 'card_draw';

    const penaltyBase = room.publicState.pendingDrawPenalty > 0 ? room.publicState.pendingDrawPenalty : 4;

    if (!doChallenge) {
      // Challenger accepted the penalty
      const drawn = this.drawFromPile(room, penaltyBase);
      challengerHand.push(...drawn);
      if (challenger) challenger.cardCount = challengerHand.length;
      desc = `${challenger?.name} accepted the +${penaltyBase} penalty and forfeited their turn.`;
      room.publicState.pendingDrawPenalty = 0;
      room.publicState.activePlayerIndex = this.getNextActivePlayerIndex(
        room,
        room.publicState.activePlayerIndex,
        1
      );
    } else {
      // Challenge initiated!
      // Check if playedBy held cards of the previous color
      const prevColor = room.publicState.currentColor;
      const wasBluffing = hasColorInHand(playedByHand, prevColor);

      if (wasBluffing) {
        // Challenge SUCCESS: playedBy was bluffing and must draw penaltyBase!
        const drawn = this.drawFromPile(room, penaltyBase);
        playedByHand.push(...drawn);
        if (playedByPlayer) playedByPlayer.cardCount = playedByHand.length;
        desc = `CHALLENGE WON! ${playedByPlayer?.name} had ${prevColor.toUpperCase()} cards and draws ${penaltyBase} cards as penalty!`;
        sound = 'uno_penalty';
        room.publicState.pendingDrawPenalty = 0;
        // Challenger plays normally
      } else {
        // Challenge FAILED: challenger draws penaltyBase + 2 cards!
        const totalFailedPenalty = penaltyBase + 2;
        const drawn = this.drawFromPile(room, totalFailedPenalty);
        challengerHand.push(...drawn);
        if (challenger) challenger.cardCount = challengerHand.length;
        desc = `CHALLENGE FAILED! ${playedByPlayer?.name} had no ${prevColor.toUpperCase()} cards! ${challenger?.name} draws ${totalFailedPenalty} cards!`;
        sound = 'uno_penalty';
        room.publicState.pendingDrawPenalty = 0;
        // Challenger loses turn
        room.publicState.activePlayerIndex = this.getNextActivePlayerIndex(
          room,
          room.publicState.activePlayerIndex,
          1
        );
      }
    }

    room.publicState.pendingChallenge = null;
    room.publicState.lastActionText = desc;
    this.startTurnTimer(room);
    this.broadcastState(roomId);
    this.broadcastToast(roomId, desc, sound);

    this.checkTriggerBot(roomId);
    return { success: true };
  }

  /**
   * Resolve Uno Dare challenge decision.
   */
  public resolveDare(
    roomId: string,
    targetPlayerId: string,
    acceptDare: boolean
  ): { success: boolean; message?: string } {
    const room = this.rooms.get(roomId);
    if (!room || !room.publicState.pendingDare) {
      return { success: false, message: 'No dare challenge pending.' };
    }

    const { targetPlayerId: expectedTarget, penaltyDrawCount, dareText } = room.publicState.pendingDare;
    if (targetPlayerId !== expectedTarget) {
      return { success: false, message: 'You are not the targeted player for this dare.' };
    }

    const player = room.publicState.players.find((p) => p.id === targetPlayerId);
    const hand = room.playerHands.get(targetPlayerId) ?? [];
    let desc = '';
    let sound: SoundEffectType = 'dare';

    if (acceptDare) {
      desc = `🎉 ${player?.name} ACCEPTED AND COMPLETED THE DARE: "${dareText}"! No penalty drawn!`;
      sound = 'game_win';
      // Player takes their normal turn next
      room.publicState.activePlayerIndex = room.publicState.players.findIndex((p) => p.id === targetPlayerId);
    } else {
      const drawn = this.drawFromPile(room, penaltyDrawCount);
      hand.push(...drawn);
      if (player) player.cardCount = hand.length;
      desc = `${player?.name} declined the dare and drew ${penaltyDrawCount} penalty cards!`;
      sound = 'card_draw';
      // Forfeits turn
      room.publicState.activePlayerIndex = this.getNextActivePlayerIndex(
        room,
        room.publicState.activePlayerIndex,
        2
      );
    }

    room.publicState.pendingDare = null;
    room.publicState.lastActionText = desc;
    this.startTurnTimer(room);
    this.broadcastState(roomId);
    this.broadcastToast(roomId, desc, sound);

    this.checkTriggerBot(roomId);
    return { success: true };
  }

  /**
   * Resolve Targeted Draw 2 (All Wild).
   */
  public resolveTargetedDraw2(
    roomId: string,
    playedById: string,
    targetPlayerId: string
  ): { success: boolean; message?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false };

    const targetPlayer = room.publicState.players.find((p) => p.id === targetPlayerId);
    const targetHand = room.playerHands.get(targetPlayerId) ?? [];
    const drawn = this.drawFromPile(room, 2);
    targetHand.push(...drawn);
    if (targetPlayer) targetPlayer.cardCount = targetHand.length;

    const desc = `🎯 ${targetPlayer?.name} was targeted and drew 2 cards!`;
    room.publicState.pendingTargetedDraw2 = null;
    room.publicState.lastActionText = desc;
    this.startTurnTimer(room);
    this.broadcastState(roomId);
    this.broadcastToast(roomId, desc, 'power_targeted_draw2');

    this.checkTriggerBot(roomId);
    return { success: true };
  }

  /**
   * Draw card when on turn.
   * Auto-passes turn to the next player immediately upon drawing.
   */
  public drawCard(roomId: string, playerId: string, targetCardIndex?: number): { success: boolean; message?: string } {
    const room = this.rooms.get(roomId);
    if (!room || room.publicState.phase !== 'playing') {
      return { success: false, message: 'Game is not active.' };
    }

    if (room.startGracePeriodUntil && Date.now() < room.startGracePeriodUntil) {
      return { success: false, message: 'Game is starting, please wait for the countdown to complete!' };
    }

    const { publicState } = room;
    const activePlayer = publicState.players[publicState.activePlayerIndex];

    if (activePlayer.id !== playerId) {
      return { success: false, message: "It's not your turn!" };
    }

    const hand = room.playerHands.get(playerId) ?? [];

    // If there is a pending draw penalty (from +2 or +4 stacking)
    if (publicState.pendingDrawPenalty > 0) {
      const penaltyCount = publicState.pendingDrawPenalty;
      const drawn = this.drawFromPile(room, penaltyCount);
      hand.push(...drawn);
      activePlayer.cardCount = hand.length;
      publicState.pendingDrawPenalty = 0;

      const desc = `${activePlayer.name} drew ${penaltyCount} penalty cards.`;
      publicState.lastActionText = desc;
      publicState.activePlayerIndex = this.getNextActivePlayerIndex(
        room,
        publicState.activePlayerIndex,
        1
      );

      this.startTurnTimer(room);
      this.broadcastState(roomId);
      this.checkTriggerBot(roomId);
      return { success: true };
    }

    // Normal draw: draw 1 card (or take selected card from next player if deck is 0)
    const drawn = this.drawFromPile(room, 1, targetCardIndex);
    if (drawn.length === 0) {
      return { success: false, message: 'No cards available to draw.' };
    }

    const singleCard = drawn[0];
    hand.push(singleCard);
    activePlayer.cardCount = hand.length;

    // Check if drawn card matches the table discard (by color or number/type, or is Wild)
    const isPlayableDrawn = isCardPlayable(
      singleCard,
      publicState.topDiscard,
      publicState.currentColor,
      publicState.pendingDrawPenalty,
      publicState.houseRules.stacking,
      publicState.variant
    );

    if (isPlayableDrawn) {
      // If the player is a BOT, automatically play the drawn card if playable
      if (activePlayer.isBot) {
        publicState.lastActionText = `${activePlayer.name} drew and played ${singleCard.color.toUpperCase()} ${singleCard.type}!`;
        this.broadcastState(roomId);
        this.broadcastToast(roomId, `${activePlayer.name} drew a matching card and played it!`, 'card_play');
        // Small delay for bot to play
        setTimeout(() => {
          this.playCard(roomId, activePlayer.id, singleCard.id);
        }, 500);
        return { success: true };
      }

      // For human player: provide Keep or Play option!
      publicState.pendingKeepOrPlay = {
        playerId: activePlayer.id,
        drawnCard: singleCard,
      };

      const desc = `${activePlayer.name} drew a matching card (${singleCard.color.toUpperCase()} ${singleCard.type})! Keep or Play?`;
      publicState.lastActionText = desc;

      this.startTurnTimer(room);
      this.broadcastState(roomId);
      this.broadcastToast(roomId, desc, 'card_draw');
      return { success: true };
    }

    // If card is not playable on table, auto-pass turn to next player
    publicState.pendingKeepOrPlay = null;
    room.extraTurnsRemaining = null;
    const desc = `${activePlayer.name} drew a card.`;
    publicState.lastActionText = desc;

    publicState.activePlayerIndex = this.getNextActivePlayerIndex(
      room,
      publicState.activePlayerIndex,
      1
    );

    this.startTurnTimer(room);
    this.checkDeadlock(room);
    this.broadcastState(roomId);
    this.broadcastToast(roomId, desc, 'card_draw');

    this.checkTriggerBot(roomId);
    return { success: true };
  }

  /**
   * Pass turn after drawing a card.
   */
  public passTurn(roomId: string, playerId: string): { success: boolean; message?: string } {
    const room = this.rooms.get(roomId);
    if (!room || room.publicState.phase !== 'playing') {
      return { success: false, message: 'Game is not active.' };
    }

    const { publicState } = room;
    const activePlayer = publicState.players[publicState.activePlayerIndex];

    if (activePlayer.id !== playerId) {
      return { success: false, message: "It's not your turn!" };
    }

    if (publicState.pendingDrawPenalty > 0) {
      return { success: false, message: 'Must draw pending penalty cards or stack!' };
    }

    const wasPendingKeep = publicState.pendingKeepOrPlay?.playerId === playerId;
    publicState.pendingKeepOrPlay = null;
    room.extraTurnsRemaining = null;

    publicState.activePlayerIndex = this.getNextActivePlayerIndex(
      room,
      publicState.activePlayerIndex,
      1
    );

    const desc = wasPendingKeep
      ? `${activePlayer.name} kept the drawn card and ended turn.`
      : `${activePlayer.name} passed turn.`;
    publicState.lastActionText = desc;

    this.startTurnTimer(room);
    this.checkDeadlock(room);
    this.broadcastState(roomId);
    this.broadcastToast(roomId, desc);

    this.checkTriggerBot(roomId);
    return { success: true };
  }

  /**
   * Declare UNO for oneself.
   */
  public callUno(roomId: string, playerId: string): { success: boolean; message?: string } {
    const room = this.rooms.get(roomId);
    if (!room || room.publicState.phase !== 'playing') return { success: false };

    const player = room.publicState.players.find((p) => p.id === playerId);
    if (!player) return { success: false };

    const hand = room.playerHands.get(playerId) || [];
    // Allow UNO call if player has 1 card OR (has 2 cards, it's their turn, and has at least one playable card)
    const isPlayerTurn = room.publicState.players[room.publicState.activePlayerIndex]?.id === playerId;
    const hasPlayableCard = hand.some((c) =>
      isCardPlayable(
        c,
        room.publicState.topDiscard,
        room.publicState.currentColor,
        room.publicState.pendingDrawPenalty,
        room.publicState.houseRules.stacking,
        room.publicState.variant
      )
    );
    const canCallUno = hand.length === 1 || (hand.length === 2 && isPlayerTurn && hasPlayableCard);

    if (!canCallUno) {
      // False UNO penalty: Player called UNO when they don't have exactly 1 card or a playable 2nd card!
      const drawn = this.drawFromPile(room, 1);
      hand.push(...drawn);
      player.cardCount = hand.length;
      player.calledUno = false;

      const desc = `⚠️ FALSE UNO! Hindi pa pwede mag-UNO si ${player.name}! (+1 Penalty Card)`;
      room.publicState.lastActionText = desc;
      this.broadcastState(roomId);
      this.broadcastToast(roomId, desc, 'uno_penalty');
      return { success: false, message: 'Hindi pa pwede mag-UNO! +1 penalty card.' };
    }

    player.calledUno = true;
    if (room.publicState.unoCallWindow?.targetPlayerId === playerId) {
      room.publicState.unoCallWindow = null;
    }

    const desc = `🔥 ${player.name} SHOUTED UNO! 🔥`;
    room.publicState.lastActionText = desc;
    this.broadcastState(roomId);
    this.broadcastToast(roomId, desc, 'uno_call');
    this.broadcastUnoShout(roomId, player.id, player.name);
    return { success: true };
  }

  /**
   * Catch another player who forgot to call UNO.
   */
  public catchUno(
    roomId: string,
    callerId: string,
    targetPlayerId: string
  ): { success: boolean; message?: string } {
    const room = this.rooms.get(roomId);
    if (!room || room.publicState.phase !== 'playing') return { success: false };

    const caller = room.publicState.players.find((p) => p.id === callerId);
    const target = room.publicState.players.find((p) => p.id === targetPlayerId);

    if (!caller || !target) return { success: false };

    const targetHand = room.playerHands.get(targetPlayerId) || [];

    // Target must have exactly 1 card and have not called UNO
    if (targetHand.length === 1 && !target.calledUno) {
      // Penalty: target draws 1 penalty card
      const drawn = this.drawFromPile(room, 1);
      targetHand.push(...drawn);
      target.cardCount = targetHand.length;
      room.publicState.unoCallWindow = null;

      const desc = `🚨 ${caller.name} NAHULI SI ${target.name} NA HINDI NAG-UNO! +1 penalty card!`;
      room.publicState.lastActionText = desc;
      this.broadcastState(roomId);
      this.broadcastToast(roomId, desc, 'uno_penalty');
      return { success: true };
    }

    return { success: false, message: 'Target player has not missed an UNO call.' };
  }

  /**
   * Handle game win.
   */
  private handleGameWin(room: InternalRoomState, winner: PublicPlayer) {
    room.publicState.phase = 'ended';
    room.publicState.winnerId = winner.id;
    room.publicState.endedAt = Date.now();
    winner.isFinished = true;
    winner.finishRank = 1;
    room.publicState.finishOrder = [winner.id];

    // Universal Pungot Rule: The last player remaining holding cards (or with the most cards) loses the match!
    let loser: PublicPlayer | null = null;
    let maxCards = -1;
    for (const p of room.publicState.players) {
      if (p.id !== winner.id && p.cardCount > maxCards) {
        maxCards = p.cardCount;
        loser = p;
      }
    }
    room.publicState.loserId = loser ? loser.id : null;
    if (loser) {
      loser.isFinished = true;
      loser.finishRank = room.publicState.players.length;
      room.publicState.finishOrder.push(loser.id);
    }

    // Calculate score
    let roundPoints = 0;
    for (const [id, hand] of room.playerHands.entries()) {
      if (id !== winner.id) {
        roundPoints += calculateHandScore(hand);
      }
    }
    winner.score += roundPoints;

    if (room.timerInterval) clearInterval(room.timerInterval);
    if (room.botTimeout) clearTimeout(room.botTimeout);
    if (room.unoTimeout) clearTimeout(room.unoTimeout);

    const loserMsg = loser ? ` • 💀 ${loser.name} has the most cards (${loser.cardCount}) and LOST (Pungot)!` : '';
    const desc = `🏆 ${winner.name} WON THE MATCH (+${roundPoints} pts)!${loserMsg}`;
    room.publicState.lastActionText = desc;

    this.broadcastState(room.publicState.roomId);
    this.broadcastToast(room.publicState.roomId, desc, 'game_win');
  }

  /**
   * Reset game to lobby for rematch.
   */
  public restartGame(roomId: string, hostId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.publicState.hostId !== hostId) return false;

    room.publicState.phase = 'lobby';
    room.publicState.winnerId = null;
    room.publicState.loserId = null;
    room.publicState.topDiscard = null;
    room.publicState.pendingDrawPenalty = 0;
    room.publicState.pendingChallenge = null;
    room.publicState.pendingSevenSwap = null;
    room.publicState.unoCallWindow = null;
    room.playerHands.clear();

    room.payoutsProcessed = false;
    room.publicState.payoutResults = undefined;

    // For entry fee rooms, reset payment so players pay again for rematch
    if (room.publicState.entryFee > 0) {
      room.publicState.prizePool = room.publicState.entryFee;
    }

    room.publicState.finishOrder = [];
    for (const p of room.publicState.players) {
      p.cardCount = 0;
      p.calledUno = false;
      p.isFinished = false;
      p.finishRank = null;
      p.isReady = p.isHost || p.isBot;
    }

    this.broadcastState(roomId);
    this.broadcastToast(roomId, 'Room reset. Host can start a new match!', 'turn_alert');
    return true;
  }

  /**
   * Turn timer management.
   */
  private startTurnTimer(room: InternalRoomState, delayMs: number = 0) {
    if (room.timerInterval) {
      clearInterval(room.timerInterval);
      room.timerInterval = null;
    }

    const { houseRules } = room.publicState;
    if (houseRules.turnTimer <= 0) {
      room.publicState.turnDeadline = null;
      return;
    }

    const deadline = Date.now() + delayMs + houseRules.turnTimer * 1000;
    room.publicState.turnDeadline = deadline;

    room.timerInterval = setInterval(() => {
      if (Date.now() >= deadline) {
        if (room.timerInterval) clearInterval(room.timerInterval);
        this.handleTurnTimeout(room);
      }
    }, 1000);
  }

  private handleTurnTimeout(room: InternalRoomState) {
    if (room.publicState.phase !== 'playing') return;

    const activePlayer = room.publicState.players[room.publicState.activePlayerIndex];
    if (!activePlayer) return;

    // Auto-draw or auto-pass
    this.drawCard(room.publicState.roomId, activePlayer.id);
  }

  /**
   * Trigger bot AI move when it is a bot's turn.
   */
  private checkTriggerBot(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room || room.publicState.phase !== 'playing') return;

    const activePlayer = room.publicState.players[room.publicState.activePlayerIndex];
    if (!activePlayer || !activePlayer.isBot) return;

    if (room.botTimeout) clearTimeout(room.botTimeout);

    // Realistic bot delay: on turn 1, respect 10s countdown grace period before playing
    const isFirstTurn = room.publicState.turnCount === 1;
    let baseDelay = isFirstTurn ? 1000 + Math.random() * 500 : 1000 + Math.random() * 500;
    if (room.startGracePeriodUntil && Date.now() < room.startGracePeriodUntil) {
      baseDelay += Math.max(0, room.startGracePeriodUntil - Date.now());
    }

    room.botTimeout = setTimeout(() => {
      const currentActive = room.publicState.players[room.publicState.activePlayerIndex];
      if (!currentActive || currentActive.id !== activePlayer.id) return;

      const botHand = room.playerHands.get(activePlayer.id) || [];
      const decision = makeBotMove(botHand, room.publicState, room.publicState.houseRules);

      if (decision.action === 'play' && decision.cardId) {
        this.playCard(
          roomId,
          activePlayer.id,
          decision.cardId,
          decision.chosenColor,
          decision.targetPlayerId
        );
      } else {
        this.drawCard(roomId, activePlayer.id);
      }
    }, baseDelay);
  }

  /**
   * Chat message handling.
   */
  public sendChat(roomId: string, senderId: string, text: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    let sender = room.publicState.players.find((p) => p.id === senderId);
    let senderName = sender?.name;
    let senderAvatar = sender?.avatar;

    // Check if sender is a spectator
    if (!sender && room.spectators?.has(senderId)) {
      const spec = room.spectators.get(senderId)!;
      senderName = `[Spectator] ${spec.name}`;
      senderAvatar = spec.avatar;
    }

    if (!senderName) return;

    const msg: ChatMessage = {
      id: `chat-${Date.now()}-${Math.random()}`,
      senderId,
      senderName,
      senderAvatar: senderAvatar || '💬',
      text: text.slice(0, 200), // Protect against spam length
      timestamp: Date.now(),
    };

    const payload = JSON.stringify({ type: 'CHAT_MESSAGE', message: msg });
    for (const ws of room.sockets.values()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
    if (room.spectators) {
      for (const spec of room.spectators.values()) {
        if (spec.ws.readyState === WebSocket.OPEN) {
          spec.ws.send(payload);
        }
      }
    }
  }

  /**
   * Quick emoji reaction handling.
   */
  public sendReaction(roomId: string, senderId: string, emoji: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    let sender = room.publicState.players.find((p) => p.id === senderId);
    let senderName = sender?.name;

    if (!sender && room.spectators?.has(senderId)) {
      senderName = room.spectators.get(senderId)!.name;
    }

    if (!senderName) return;

    const event: ReactionEvent = {
      senderId,
      senderName,
      emoji,
      timestamp: Date.now(),
    };

    const payload = JSON.stringify({ type: 'REACTION', event });
    for (const ws of room.sockets.values()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
    if (room.spectators) {
      for (const spec of room.spectators.values()) {
        if (spec.ws.readyState === WebSocket.OPEN) {
          spec.ws.send(payload);
        }
      }
    }
  }

  /**
   * Disconnect handling.
   */
  public handleDisconnect(roomId: string, playerId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // Check if spectator disconnected
    if (room.spectators?.has(playerId)) {
      room.spectators.delete(playerId);
      room.publicState.spectators = Array.from(room.spectators.values()).map((s) => ({
        id: s.id,
        name: s.name,
        avatar: s.avatar,
      }));
      room.publicState.spectatorCount = room.spectators.size;
      this.broadcastState(roomId);
      return;
    }

    const player = room.publicState.players.find((p) => p.id === playerId);
    if (player) {
      player.isDisconnected = true;
      room.sockets.delete(playerId);

      // If disconnected during lobby phase and had paid entry fee, refund it back immediately
      if (room.publicState.phase === 'lobby' && player.hasPaidEntry && room.publicState.entryFee > 0) {
        player.hasPaidEntry = false;
        player.isReady = false;
        economyManager.refundEntryFee(playerId, roomId, room.publicState.entryFee);
      }

      this.broadcastState(roomId);
      this.broadcastToast(roomId, `${player.name} disconnected.`, 'error');

      // If everyone disconnected or host left in lobby, handle cleanup after delay (3 minutes grace period for weak mobile internet)
      const allDisconnected = room.publicState.players.every((p) => p.isBot || p.isDisconnected);
      if (allDisconnected) {
        setTimeout(() => {
          const check = this.rooms.get(roomId);
          if (check && check.publicState.players.every((p) => p.isBot || p.isDisconnected)) {
            this.cleanupRoom(roomId);
          }
        }, 180000); // 3 minutes cleanup grace period
      }
    }
  }

  private cleanupRoom(roomId: string) {
    const room = this.rooms.get(roomId);
    if (room) {
      if (room.timerInterval) clearInterval(room.timerInterval);
      if (room.botTimeout) clearTimeout(room.botTimeout);
      if (room.unoTimeout) clearTimeout(room.unoTimeout);
      this.rooms.delete(roomId);
    }
  }

  /**
   * Authoritative broadcast to all connected clients.
   * STRICT PRIVACY: Sends publicState to all, but each player ONLY gets their OWN hand!
   */
  public broadcastState(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    for (const [playerId, ws] of room.sockets.entries()) {
      if (ws.readyState === WebSocket.OPEN) {
        const yourHand = room.playerHands.get(playerId) || [];
        ws.send(
          JSON.stringify({
            type: 'SYNC_STATE',
            publicState: room.publicState,
            yourHand: [...yourHand],
            yourPlayerId: playerId,
          })
        );
      }
    }

    // Also send SYNC_STATE to spectators (with empty hand)
    if (room.spectators) {
      for (const [specId, spec] of room.spectators.entries()) {
        if (spec.ws.readyState === WebSocket.OPEN) {
          spec.ws.send(
            JSON.stringify({
              type: 'SYNC_STATE',
              publicState: room.publicState,
              yourHand: [],
              yourPlayerId: specId,
            })
          );
        }
      }
    }
  }

  /**
   * Broadcast toast and sound effect.
   */
  public broadcastToast(roomId: string, text: string, sound?: SoundEffectType) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const payload = JSON.stringify({
      type: 'TOAST',
      text,
      sound,
    });

    for (const ws of room.sockets.values()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }

    if (room.spectators) {
      for (const spec of room.spectators.values()) {
        if (spec.ws.readyState === WebSocket.OPEN) {
          spec.ws.send(payload);
        }
      }
    }
  }

  /**
   * Broadcast dedicated UNO shout event to trigger visual bubble and shout sound for all players.
   */
  public broadcastUnoShout(roomId: string, playerId: string, playerName: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const payload = JSON.stringify({
      type: 'UNO_SHOUT',
      playerId,
      playerName,
    });

    for (const ws of room.sockets.values()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  }

  /**
   * Check if a 2-player deadlock state is reached:
   * 1. Only 2 active players left with cards (and draw deck is 0)
   * 2. Neither player has any playable card matching top discard/active color
   */
  public checkDeadlock(room: InternalRoomState): boolean {
    const { publicState } = room;
    if (publicState.phase !== 'playing') return false;

    const remainingPlayers = publicState.players.filter(
      (p) => !p.isFinished && (room.playerHands.get(p.id)?.length || 0) > 0
    );

    // Rule: Must be exactly the 2 remaining players
    if (remainingPlayers.length !== 2) {
      publicState.isDeadlockAvailable = false;
      return false;
    }

    // Must have no cards left to draw from draw pile
    if (room.drawPile.length > 0) {
      publicState.isDeadlockAvailable = false;
      return false;
    }

    // Check if player 1 has any playable card
    const hand1 = room.playerHands.get(remainingPlayers[0].id) || [];
    const hasPlayable1 = hand1.some((c) =>
      isCardPlayable(
        c,
        publicState.topDiscard,
        publicState.currentColor,
        publicState.pendingDrawPenalty,
        publicState.houseRules.stacking,
        publicState.variant
      )
    );

    // Check if player 2 has any playable card
    const hand2 = room.playerHands.get(remainingPlayers[1].id) || [];
    const hasPlayable2 = hand2.some((c) =>
      isCardPlayable(
        c,
        publicState.topDiscard,
        publicState.currentColor,
        publicState.pendingDrawPenalty,
        publicState.houseRules.stacking,
        publicState.variant
      )
    );

    // Deadlock is true if neither player has any playable card!
    const isDeadlock = !hasPlayable1 && !hasPlayable2;
    publicState.isDeadlockAvailable = isDeadlock;
    return isDeadlock;
  }

  /**
   * Declare DEADLOCK:
   * Counts the cards of the 2 remaining players.
   * Player with FEWEST remaining cards wins!
   * Player with MORE remaining cards is Ang Pungot (Loser)!
   */
  public declareDeadlock(roomId: string, requestedById: string): { success: boolean; message?: string } {
    const room = this.rooms.get(roomId);
    if (!room || room.publicState.phase !== 'playing') {
      return { success: false, message: 'Game is not active.' };
    }

    const { publicState } = room;
    const remainingPlayers = publicState.players.filter(
      (p) => !p.isFinished && (room.playerHands.get(p.id)?.length || 0) > 0
    );

    if (remainingPlayers.length !== 2) {
      return { success: false, message: 'Deadlock can only be declared when 2 players remain.' };
    }

    const [p1, p2] = remainingPlayers;
    const hand1 = room.playerHands.get(p1.id) || [];
    const hand2 = room.playerHands.get(p2.id) || [];

    // Fewer cards wins!
    let winnerPlayer = p1;
    let loserPlayer = p2;

    if (hand2.length < hand1.length) {
      winnerPlayer = p2;
      loserPlayer = p1;
    } else if (hand1.length === hand2.length) {
      // Tie-breaker: lowest card face points or requester
      const score1 = calculateHandScore(hand1);
      const score2 = calculateHandScore(hand2);
      if (score2 < score1) {
        winnerPlayer = p2;
        loserPlayer = p1;
      }
    }

    // Set rankings
    const finishRankWinner = publicState.finishOrder.length + 1;
    winnerPlayer.isFinished = true;
    winnerPlayer.finishRank = finishRankWinner;
    publicState.finishOrder.push(winnerPlayer.id);
    if (!publicState.winnerId) {
      publicState.winnerId = winnerPlayer.id;
    }

    const finishRankLoser = publicState.players.length;
    loserPlayer.isFinished = true;
    loserPlayer.finishRank = finishRankLoser;
    publicState.finishOrder.push(loserPlayer.id);
    publicState.loserId = loserPlayer.id;

    publicState.phase = 'ended';
    publicState.endedAt = Date.now();
    publicState.isDeadlockAvailable = false;

    if (room.timerInterval) clearInterval(room.timerInterval);
    if (room.botTimeout) clearTimeout(room.botTimeout);
    if (room.unoTimeout) clearTimeout(room.unoTimeout);

    const desc = `⚠️ DEADLOCK DECLARED! Walang playable cards! Bilangan ng baraha: 🏆 ${winnerPlayer.name} (${hand1.length < hand2.length ? hand1.length : hand2.length} cards) WINS! 💀 ${loserPlayer.name} (${hand1.length < hand2.length ? hand2.length : hand1.length} cards) is ANG PUNGOT!`;
    publicState.lastActionText = desc;

    // Award deadlock XP & send wallet updates
    const allHumanIds = publicState.players.filter((p) => !p.isBot).map((p) => p.id);
    const playerMetadata: Record<string, { name: string; avatar: string }> = {};
    for (const p of publicState.players) {
      playerMetadata[p.id] = { name: p.name, avatar: p.avatar };
    }

    const { updatedWallets, levelUps, xpGains } = economyManager.awardMatchFinish(
      winnerPlayer.id,
      loserPlayer.id,
      allHumanIds,
      false,
      publicState.finishOrder,
      playerMetadata
    );

    for (const p of publicState.players) {
      if (updatedWallets[p.id]) {
        p.level = updatedWallets[p.id].level;
        p.experience = updatedWallets[p.id].experience;
        p.xpGained = xpGains[p.id] || 0;
      }
    }

    for (const [pid, updatedWallet] of Object.entries(updatedWallets)) {
      const client = room.sockets.get(pid);
      if (client && client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            type: 'WALLET_UPDATE',
            wallet: updatedWallet,
            levelUp: levelUps[pid],
            xpGained: xpGains[pid] || 0,
          })
        );
      }
    }

    this.broadcastState(roomId);
    this.broadcastToast(roomId, desc, 'game_win');
    return { success: true };
  }

  /**
   * Relay WebRTC audio signaling messages between players in the same room.
   */
  public relayVoiceSignal(roomId: string, senderId: string, targetId: string, signal: unknown) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const targetClient = room.sockets.get(targetId);
    if (targetClient && targetClient.readyState === WebSocket.OPEN) {
      targetClient.send(
        JSON.stringify({
          type: 'VOICE_SIGNAL',
          senderId,
          targetId,
          signal,
        })
      );
    }
  }

  /**
   * Authoritative Power-Up Activation & Execution
   */
  public usePowerUp(
    roomId: string,
    playerId: string,
    powerUpId: PowerUpId,
    targetPlayerId?: string,
    chosenColor?: CardColor
  ): { success: boolean; message?: string; wallet?: PlayerWallet } {
    const room = this.rooms.get(roomId);
    if (!room || room.publicState.phase !== 'playing') {
      return { success: false, message: 'Game is not currently active.' };
    }

    const { publicState } = room;
    const player = publicState.players.find((p) => p.id === playerId);
    if (!player) {
      return { success: false, message: 'Player not found in room.' };
    }

    // 1. Check max 2 uses per match rule
    if (!publicState.matchPowerUpUses) {
      publicState.matchPowerUpUses = {};
    }
    const currentUses = publicState.matchPowerUpUses[playerId] || 0;
    if (currentUses >= 2) {
      return {
        success: false,
        message: 'Naabot mo na ang limit na 2 Power-Ups bawat laban!',
      };
    }

    // 2. Turn order checks:
    const activePlayer = publicState.players[publicState.activePlayerIndex];
    const isPlayerTurn = activePlayer?.id === playerId;

    // Reactive power-ups allowed when facing pending penalties or incoming attack:
    const isReactive = powerUpId === 'shield' || powerUpId === 'reflect';
    if (!isPlayerTurn && !isReactive) {
      return { success: false, message: 'Maaari mo lamang gamitin ang Power-Up na ito sa iyong turn!' };
    }

    // Shield or reflect requires an active incoming attack/draw penalty or being on turn
    if (isReactive && !isPlayerTurn && publicState.pendingDrawPenalty <= 0) {
      return {
        success: false,
        message: 'Maaari mo lamang gamitin ang Shield o Reflect kung may paparating na parusa o sa iyong turn!',
      };
    }

    // 3. Server Inventory verification & deduction
    const consumeRes = economyManager.consumePowerUp(playerId, powerUpId);
    if (!consumeRes.success) {
      return { success: false, message: consumeRes.message || 'Wala kang sapat na Power-Up sa iyong imbentaryo.' };
    }

    // Record match usage
    publicState.matchPowerUpUses[playerId] = currentUses + 1;

    let toastText = '';
    let sound: SoundEffectType = 'power_general';

    switch (powerUpId) {
      // 1. SHIELD PROTECTION: Blocks incoming Draw 2 / Draw 4 penalty completely
      case 'shield': {
        sound = 'power_draw2';
        if (publicState.pendingDrawPenalty > 0) {
          const blocked = publicState.pendingDrawPenalty;
          publicState.pendingDrawPenalty = 0;
          toastText = `🛡️ SHIELD ACTIVATED! ${player.name} blocked the +${blocked} penalty completely!`;
        } else {
          toastText = `🛡️ SHIELD READY! ${player.name} activated Shield Protection!`;
        }
        break;
      }

      // 2. CARD SWAP: Exchange 1 random card with a selected opponent
      case 'swap': {
        sound = 'card_deal';
        const validOpponents = publicState.players.filter(
          (p) => p.id !== playerId && !p.isFinished && (room.playerHands.get(p.id)?.length || 0) > 0
        );
        if (validOpponents.length === 0) {
          return { success: false, message: 'Walang kalaban na may hawak na baraha para makipagpalit.' };
        }
        const target =
          validOpponents.find((p) => p.id === targetPlayerId) ||
          validOpponents[Math.floor(Math.random() * validOpponents.length)];

        const myHand = room.playerHands.get(playerId) || [];
        const theirHand = room.playerHands.get(target.id) || [];

        if (myHand.length > 0 && theirHand.length > 0) {
          const myRandomIndex = Math.floor(Math.random() * myHand.length);
          const theirRandomIndex = Math.floor(Math.random() * theirHand.length);

          const myCard = myHand.splice(myRandomIndex, 1)[0];
          const theirCard = theirHand.splice(theirRandomIndex, 1)[0];

          myHand.push(theirCard);
          theirHand.push(myCard);

          player.cardCount = myHand.length;
          target.cardCount = theirHand.length;

          toastText = `🔄 CARD SWAP! ${player.name} randomly swapped 1 card with ${target.name}!`;
        } else {
          toastText = `🔄 CARD SWAP attempted, ngunit walang barahang maipapalit.`;
        }
        break;
      }

      // 3. REVERSE MASTER: Reverse the playing direction immediately
      case 'reverse': {
        sound = 'power_reverse';
        publicState.direction = (publicState.direction * -1) as 1 | -1;
        toastText = `🔁 REVERSE MASTER! ${player.name} reversed the game direction!`;
        break;
      }

      // 4. COLOR CHANGER: Select a new active color
      case 'color': {
        sound = 'power_wild';
        const validColors: CardColor[] =
          publicState.activeFlipSide === 'dark'
            ? ['teal', 'orange', 'purple', 'pink']
            : ['red', 'blue', 'green', 'yellow'];
        const newColor = chosenColor && validColors.includes(chosenColor) ? chosenColor : validColors[0];
        publicState.currentColor = newColor;
        toastText = `🎨 COLOR CHANGER! ${player.name} changed table color to ${newColor.toUpperCase()}!`;
        break;
      }

      // 5. EXTRA TURN: Grant one additional turn
      case 'extra_turn': {
        sound = 'power_general';
        toastText = `⚡ EXTRA TURN! ${player.name} takes another turn immediately!`;
        // Reset turn timer for extra turn
        this.startTurnTimer(room);
        break;
      }

      // 6. PEEK CARD: Reveal 1 random opponent card privately to user
      case 'peek': {
        sound = 'power_general';
        const opponents = publicState.players.filter(
          (p) => p.id !== playerId && !p.isFinished && (room.playerHands.get(p.id)?.length || 0) > 0
        );
        const target =
          opponents.find((p) => p.id === targetPlayerId) ||
          opponents[Math.floor(Math.random() * opponents.length)];

        if (target) {
          const targetHand = room.playerHands.get(target.id) || [];
          if (targetHand.length > 0) {
            const peekedCard = targetHand[Math.floor(Math.random() * targetHand.length)];
            const client = room.sockets.get(playerId);
            if (client && client.readyState === WebSocket.OPEN) {
              client.send(
                JSON.stringify({
                  type: 'PEEK_RESULT',
                  targetPlayerName: target.name,
                  card: peekedCard,
                })
              );
            }
          }
        }
        toastText = `👁️ PEEK CARD! ${player.name} peeked at an opponent's card!`;
        break;
      }

      // 7. COIN BOOSTER: Double match victory reward
      case 'booster': {
        sound = 'power_general';
        if (!publicState.activeCoinBoosters) {
          publicState.activeCoinBoosters = [];
        }
        if (!publicState.activeCoinBoosters.includes(playerId)) {
          publicState.activeCoinBoosters.push(playerId);
        }
        toastText = `💰 COIN BOOSTER ACTIVE! ${player.name}'s victory reward will be doubled to ₱400!`;
        break;
      }

      // 8. ATTACK REFLECT: Reflect incoming Draw 2 or Draw 4 to the attacker
      case 'reflect': {
        sound = 'power_draw2';
        if (publicState.pendingDrawPenalty > 0) {
          const reflectedPenalty = publicState.pendingDrawPenalty;
          publicState.pendingDrawPenalty = 0;

          // Find the previous player index who attacked
          const attackerIdx = (publicState.activePlayerIndex - publicState.direction + publicState.players.length) % publicState.players.length;
          const attacker = publicState.players[attackerIdx];
          const attackerHand = room.playerHands.get(attacker.id) || [];

          const drawn = this.drawFromPile(room, reflectedPenalty);
          attackerHand.push(...drawn);
          attacker.cardCount = attackerHand.length;

          toastText = `🪞 ATTACK REFLECT! ${player.name} reflected +${reflectedPenalty} back to ${attacker.name}!`;
        } else {
          toastText = `🪞 ATTACK REFLECT activated by ${player.name}!`;
        }
        break;
      }
    }

    publicState.lastActionText = toastText;
    this.broadcastState(roomId);
    this.broadcastToast(roomId, toastText, sound);

    // Send updated wallet directly to the user socket so client inventory decrements in real time
    if (consumeRes.wallet) {
      const client = room.sockets.get(playerId);
      if (client && client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            type: 'WALLET_UPDATE',
            wallet: consumeRes.wallet,
          })
        );
      }
    }

    return { success: true, wallet: consumeRes.wallet };
  }

  /**
   * Helper to construct a tangible Card object for a given PowerUpId
   */
  public createPowerUpCard(powerUpId: PowerUpId): Card {
    const typeMap: Record<PowerUpId, CardType> = {
      skip2: 'skip2',
      targeted_draw2: 'targeted_draw2',
      forced_swap: 'forced_swap',
      wild4: 'wild4',
      draw2: 'draw2',
      reverse: 'reverse',
      skip: 'skip',
      wild: 'wild',
      shield: 'power_shield',
      swap: 'power_swap',
      color: 'power_color',
      extra_turn: 'power_extra_turn',
      peek: 'power_peek',
      booster: 'power_booster',
      reflect: 'power_reflect',
    };

    return {
      id: `pcard-${powerUpId}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      color: 'wild',
      type: typeMap[powerUpId] || (powerUpId as CardType),
      powerUpId,
    };
  }

  /**
   * Directly inject a purchased power-up card into the active player's hand!
   */
  public addPowerUpCardToHand(playerId: string, powerUpId: PowerUpId): boolean {
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.publicState.phase === 'playing') {
        const player = room.publicState.players.find((p) => p.id === playerId);
        if (player) {
          const hand = room.playerHands.get(playerId) || [];
          const card = this.createPowerUpCard(powerUpId);
          hand.push(card);
          room.playerHands.set(playerId, hand);
          player.cardCount = hand.length;

          // Consume inventory item since it became a card in hand
          economyManager.consumePowerUp(playerId, powerUpId);

          const itemName = economyManager.getCatalog()[powerUpId]?.name || 'Power-Up';
          const toastText = `🃏 ${player.name} bought and drew a ${itemName} card!`;
          room.publicState.lastActionText = toastText;

          this.broadcastState(roomId);
          this.broadcastToast(roomId, toastText, 'power_general');
          return true;
        }
      }
    }
    return false;
  }
}


