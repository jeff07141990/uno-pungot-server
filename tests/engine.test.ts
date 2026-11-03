import { describe, it, expect, beforeEach } from 'vitest';
import { Card, CardColor, HouseRules, PublicGameState, PublicPlayer } from '../src/engine/types';
import { createStandardDeck, reshuffleDiscards, shuffleDeck } from '../src/engine/deck';
import {
  calculateHandScore,
  getNextPlayerIndex,
  hasColorInHand,
  isCardPlayable,
} from '../src/engine/rules';
import { makeBotMove, getMostFrequentColor } from '../src/engine/botAi';
import { RoomManager } from '../server/roomManager';

describe('Deck and Card Generation', () => {
  it('creates standard 108-card Uno deck with correct distribution', () => {
    const deck = createStandardDeck();
    expect(deck.length).toBe(108);

    const wilds = deck.filter((c) => c.type === 'wild');
    const wild4s = deck.filter((c) => c.type === 'wild4');
    expect(wilds.length).toBe(4);
    expect(wild4s.length).toBe(4);

    const colors: CardColor[] = ['red', 'blue', 'green', 'yellow'];
    for (const color of colors) {
      const colorCards = deck.filter((c) => c.color === color);
      expect(colorCards.length).toBe(25);

      // 1 zero
      const zeros = colorCards.filter((c) => c.type === 'number' && c.value === 0);
      expect(zeros.length).toBe(1);

      // 2 of each 1-9
      for (let v = 1; v <= 9; v++) {
        const numbers = colorCards.filter((c) => c.type === 'number' && c.value === v);
        expect(numbers.length).toBe(2);
      }

      // 2 Skips, 2 Reverses, 2 Draw 2s
      expect(colorCards.filter((c) => c.type === 'skip').length).toBe(2);
      expect(colorCards.filter((c) => c.type === 'reverse').length).toBe(2);
      expect(colorCards.filter((c) => c.type === 'draw2').length).toBe(2);
    }
  });

  it('shuffles deck properly without losing cards', () => {
    const deck = createStandardDeck();
    const shuffled = shuffleDeck(deck);
    expect(shuffled.length).toBe(108);
    // Unique card IDs preserved
    const uniqueIds = new Set(shuffled.map((c) => c.id));
    expect(uniqueIds.size).toBe(108);
  });

  it('reshuffles discard pile while preserving top discard', () => {
    const topCard: Card = { id: 'c1', color: 'red', type: 'number', value: 5 };
    const discards: Card[] = [
      { id: 'c2', color: 'blue', type: 'number', value: 3 },
      { id: 'c3', color: 'green', type: 'skip' },
      { id: 'c4', color: 'yellow', type: 'reverse' },
      topCard,
    ];

    const result = reshuffleDiscards([], discards);
    expect(result.newDiscardPile).toEqual([topCard]);
    expect(result.newDrawPile.length).toBe(3);
  });
});

describe('Card Playability and Matching Rules', () => {
  it('matches cards by color, number, and action type', () => {
    const topRed5: Card = { id: 'top', color: 'red', type: 'number', value: 5 };

    // Same color, different number -> PLAYABLE
    expect(isCardPlayable({ id: '1', color: 'red', type: 'number', value: 8 }, topRed5, 'red', 0, false)).toBe(true);

    // Different color, same number -> PLAYABLE
    expect(isCardPlayable({ id: '2', color: 'blue', type: 'number', value: 5 }, topRed5, 'red', 0, false)).toBe(true);

    // Different color, different number -> NOT PLAYABLE
    expect(isCardPlayable({ id: '3', color: 'green', type: 'number', value: 9 }, topRed5, 'red', 0, false)).toBe(false);

    // Wild / Wild Draw 4 -> ALWAYS PLAYABLE
    expect(isCardPlayable({ id: '4', color: 'wild', type: 'wild' }, topRed5, 'red', 0, false)).toBe(true);
    expect(isCardPlayable({ id: '5', color: 'wild', type: 'wild4' }, topRed5, 'red', 0, false)).toBe(true);

    // Action matching action (e.g. blue skip on red skip)
    const topRedSkip: Card = { id: 'skip1', color: 'red', type: 'skip' };
    expect(isCardPlayable({ id: 'skip2', color: 'blue', type: 'skip' }, topRedSkip, 'red', 0, false)).toBe(true);
  });

  it('enforces stacking rules when pending draw penalty exists', () => {
    const topDraw2: Card = { id: 'd1', color: 'red', type: 'draw2' };

    // Stacking disabled: cannot play anything, must draw penalty
    expect(isCardPlayable({ id: 'd2', color: 'blue', type: 'draw2' }, topDraw2, 'red', 2, false)).toBe(false);

    // Stacking enabled: +2 on +2 is allowed
    expect(isCardPlayable({ id: 'd2', color: 'blue', type: 'draw2' }, topDraw2, 'red', 2, true)).toBe(true);

    // +4 on +2 is allowed when stacking enabled
    expect(isCardPlayable({ id: 'w4', color: 'wild', type: 'wild4' }, topDraw2, 'red', 2, true)).toBe(true);

    // Normal cards not allowed during stacking penalty
    expect(isCardPlayable({ id: 'n1', color: 'red', type: 'number', value: 2 }, topDraw2, 'red', 2, true)).toBe(false);
  });
});

describe('Turn Order and Direction', () => {
  it('advances clockwise and counter-clockwise correctly with modulo wrapping', () => {
    // 4 players (0, 1, 2, 3)
    expect(getNextPlayerIndex(0, 4, 1, 1)).toBe(1);
    expect(getNextPlayerIndex(3, 4, 1, 1)).toBe(0); // wrap clockwise

    expect(getNextPlayerIndex(0, 4, -1, 1)).toBe(3); // wrap counter-clockwise
    expect(getNextPlayerIndex(1, 4, -1, 1)).toBe(0);

    // Skip steps = 2
    expect(getNextPlayerIndex(0, 4, 1, 2)).toBe(2);
    expect(getNextPlayerIndex(3, 4, 1, 2)).toBe(1);
  });
});

describe('Wild Draw 4 Challenge and Hand Scoring', () => {
  it('detects if hand contains matching color for WD4 bluff check', () => {
    const hand: Card[] = [
      { id: '1', color: 'red', type: 'number', value: 3 },
      { id: '2', color: 'blue', type: 'number', value: 7 },
    ];
    expect(hasColorInHand(hand, 'red')).toBe(true);
    expect(hasColorInHand(hand, 'green')).toBe(false);
  });

  it('calculates Uno scoring correctly', () => {
    const hand: Card[] = [
      { id: '1', color: 'red', type: 'number', value: 7 }, // 7 pts
      { id: '2', color: 'blue', type: 'skip' }, // 20 pts
      { id: '3', color: 'wild', type: 'wild4' }, // 50 pts
    ];
    expect(calculateHandScore(hand)).toBe(77);
  });
});

describe('Bot AI Logic', () => {
  it('selects the most frequent color in hand', () => {
    const hand: Card[] = [
      { id: '1', color: 'green', type: 'number', value: 1 },
      { id: '2', color: 'green', type: 'number', value: 4 },
      { id: '3', color: 'blue', type: 'number', value: 2 },
    ];
    expect(getMostFrequentColor(hand)).toBe('green');
  });

  it('bot chooses legal move matching current color or top card', () => {
    const botHand: Card[] = [
      { id: 'c1', color: 'yellow', type: 'number', value: 5 },
      { id: 'c2', color: 'blue', type: 'number', value: 9 },
    ];

    const mockGameState: PublicGameState = {
      roomId: 'TEST01',
      roomName: 'Test Room',
      variant: 'classic',
      activeFlipSide: 'light',
      isPrivate: false,
      hostId: 'p1',
      phase: 'playing',
      players: [
        { id: 'p1', name: 'P1', avatar: '🦊', cardCount: 5, isReady: true, isHost: true, isBot: false, isDisconnected: false, calledUno: false, score: 0 },
        { id: 'b1', name: 'Bot', avatar: '🤖', cardCount: 2, isReady: true, isHost: false, isBot: true, isDisconnected: false, calledUno: false, score: 0 },
      ],
      activePlayerIndex: 1,
      direction: 1,
      topDiscard: { id: 'top', color: 'yellow', type: 'number', value: 2 },
      currentColor: 'yellow',
      drawPileCount: 90,
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
      houseRules: {
        turnTimer: 30,
        stacking: true,
        sevenZero: false,
        wildDraw4Challenge: true,
        startingHandSize: 7,
        allowSpectators: true,
      },
      lastActionText: null,
      turnCount: 5,
      startedAt: Date.now(),
      endedAt: null,
      entryFee: 0,
      prizePool: 0,
      isEntryFeeLocked: false,
    };

    const decision = makeBotMove(botHand, mockGameState, mockGameState.houseRules);
    expect(decision.action).toBe('play');
    expect(decision.cardId).toBe('c1'); // yellow 5 matches yellow color
  });
});

describe('Authoritative Room Manager & Hand Confidentiality', () => {
  let manager: RoomManager;

  beforeEach(() => {
    manager = new RoomManager();
  });

  it('creates room and manages lobby properly', () => {
    const roomId = manager.createRoom('host123', 'Host Alice', '🦊', { roomName: 'Wonderland' });
    const room = manager.getRoom(roomId);
    expect(room).toBeDefined();
    expect(room?.publicState.roomName).toBe('Wonderland');
    expect(room?.publicState.players.length).toBe(1);
    expect(room?.publicState.phase).toBe('lobby');
  });

  it('adds bots to room lobby', () => {
    const roomId = manager.createRoom('host123', 'Host Alice', '🦊', {});
    expect(manager.addBot(roomId, 'host123')).toBe(true);
    const room = manager.getRoom(roomId);
    expect(room?.publicState.players.length).toBe(2);
    expect(room?.publicState.players[1].isBot).toBe(true);
  });

  it('starts game and deals starting hands strictly in secret', () => {
    const roomId = manager.createRoom('host123', 'Host Alice', '🦊', {});
    manager.addBot(roomId, 'host123');

    const startRes = manager.startGame(roomId, 'host123');
    expect(startRes.success).toBe(true);

    const room = manager.getRoom(roomId)!;
    expect(room.publicState.phase).toBe('playing');
    expect(room.publicState.topDiscard).not.toBeNull();

    // Verify secret hands exist in room.playerHands
    const hostHand = room.playerHands.get('host123');
    const botPlayer = room.publicState.players[1];
    const botHand = room.playerHands.get(botPlayer.id);

    // Starting hands are 7 cards (plus 2 if initial card was Draw 2)
    expect(hostHand?.length).toBeGreaterThanOrEqual(7);
    expect(botHand?.length).toBeGreaterThanOrEqual(7);

    // CRITICAL SECURITY CHECK:
    // In publicState, opponents ONLY see cardCount, never hidden cards array!
    expect(room.publicState.players[0].cardCount).toBeGreaterThanOrEqual(7);
    expect(room.publicState.players[1].cardCount).toBeGreaterThanOrEqual(7);
    expect((room.publicState.players[0] as unknown as { hand?: unknown }).hand).toBeUndefined();
    expect((room.publicState.players[1] as unknown as { hand?: unknown }).hand).toBeUndefined();
  });

  it('prevents non-active players from playing out of turn', () => {
    const roomId = manager.createRoom('host123', 'Host Alice', '🦊', {});
    manager.addBot(roomId, 'host123');
    manager.startGame(roomId, 'host123');

    const room = manager.getRoom(roomId)!;
    const activeIndex = room.publicState.activePlayerIndex;
    const inactiveIndex = activeIndex === 0 ? 1 : 0;
    const inactivePlayerId = room.publicState.players[inactiveIndex].id;

    // Attempt move from player who is NOT active
    const moveRes = manager.playCard(roomId, inactivePlayerId, 'any-card');
    expect(moveRes.success).toBe(false);
    expect(moveRes.message).toContain("It's not your turn");
  });

  it('correctly executes Seven-Zero hand swapping and rotation', () => {
    const roomId = manager.createRoom('p1', 'Player 1', '🦊', {
      houseRules: { sevenZero: true }
    });
    manager.addBot(roomId, 'p1');
    const room = manager.getRoom(roomId)!;
    const botId = room.publicState.players[1].id;

    // Set custom hands for testing
    room.playerHands.set('p1', [
      { id: 'c1', color: 'red', type: 'number', value: 1 },
      { id: 'c2', color: 'red', type: 'number', value: 2 },
    ]);
    room.playerHands.set(botId, [
      { id: 'c3', color: 'blue', type: 'number', value: 9 },
    ]);

    // Swap hands between p1 and bot
    manager.executeSevenSwap(room, 'p1', botId);

    // p1 should now have 1 card, bot should have 2 cards
    expect(room.playerHands.get('p1')?.length).toBe(1);
    expect(room.playerHands.get(botId)?.length).toBe(2);
    expect(room.playerHands.get('p1')![0].id).toBe('c3');

    // Test 0 rotation
    manager.executeZeroRotate(room);
    // After rotation in direction 1, hands rotate
    expect(room.playerHands.get('p1')?.length).toBe(2);
    expect(room.playerHands.get(botId)?.length).toBe(1);
  });

  it('correctly catches missed UNO and enforces penalty', () => {
    const roomId = manager.createRoom('p1', 'Alice', '🦊', {});
    manager.addBot(roomId, 'p1');
    manager.startGame(roomId, 'p1');

    const room = manager.getRoom(roomId)!;
    const botId = room.publicState.players[1].id;

    // Put bot down to 1 card without calling UNO
    room.playerHands.set(botId, [{ id: 'card1', color: 'red', type: 'number', value: 5 }]);
    room.publicState.players[1].cardCount = 1;
    room.publicState.players[1].calledUno = false;

    // Alice catches bot!
    const catchRes = manager.catchUno(roomId, 'p1', botId);
    expect(catchRes.success).toBe(true);

    // Bot should have received 1 penalty card (now 2 cards in hand)
    expect(room.playerHands.get(botId)?.length).toBe(2);
    expect(room.publicState.players[1].cardCount).toBe(2);
  });

  it('resolves Wild Draw 4 challenges correctly (bluff check)', () => {
    const roomId = manager.createRoom('p1', 'Alice', '🦊', {
      houseRules: { wildDraw4Challenge: true }
    });
    manager.addBot(roomId, 'p1');
    manager.startGame(roomId, 'p1');
    const room = manager.getRoom(roomId)!;
    const botId = room.publicState.players[1].id;

    // Simulate WD4 played by p1 against bot
    room.publicState.currentColor = 'blue';
    room.publicState.pendingChallenge = {
      challengerId: botId,
      playedBy: 'p1',
      playedCard: { id: 'wd4', color: 'wild', type: 'wild4' },
    };

    // Case 1: Alice was BLUFFING (Alice actually has a blue card in hand)
    room.playerHands.set('p1', [{ id: 'b1', color: 'blue', type: 'number', value: 4 }]);
    const p1InitialCards = room.playerHands.get('p1')!.length;

    // Bot challenges bluff
    const challengeRes = manager.resolveWD4Challenge(roomId, botId, true);
    expect(challengeRes.success).toBe(true);
    // Alice caught bluffing -> Alice draws 4 cards
    expect(room.playerHands.get('p1')?.length).toBe(p1InitialCards + 4);
  });

  it('declares the last player with cards as the loser (Pungot) when match ends', () => {
    const roomId = manager.createRoom('p1', 'Alice', '🦊', {});
    manager.addBot(roomId, 'p1');
    manager.addBot(roomId, 'p1');

    const room = manager.getRoom(roomId)!;
    manager.startGame(roomId, 'p1');

    const [p1, p2, p3] = room.publicState.players;

    // Alice has 1 playable card left
    const winningCard: Card = { id: 'win_c', color: 'red', type: 'number', value: 8 };
    room.playerHands.set(p1.id, [winningCard]);
    p1.cardCount = 1;

    // p2 has 1 card, p3 has 6 cards
    room.playerHands.set(p2.id, [
      { id: 'p2_1', color: 'red', type: 'number', value: 8 },
    ]);
    p2.cardCount = 1;

    room.playerHands.set(p3.id, [
      { id: 'p3_1', color: 'green', type: 'number', value: 3 },
      { id: 'p3_2', color: 'green', type: 'number', value: 4 },
      { id: 'p3_3', color: 'green', type: 'number', value: 5 },
      { id: 'p3_4', color: 'green', type: 'number', value: 6 },
      { id: 'p3_5', color: 'green', type: 'number', value: 7 },
      { id: 'p3_6', color: 'green', type: 'number', value: 8 },
    ]);
    p3.cardCount = 6;

    room.publicState.activePlayerIndex = 0;
    room.publicState.currentColor = 'red';
    room.publicState.topDiscard = { id: 'top_c', color: 'red', type: 'number', value: 5 };

    // Alice plays her last card to finish 1st (Panalo)
    const playRes = manager.playCard(roomId, p1.id, winningCard.id);
    expect(playRes.success).toBe(true);

    // Alice is 1st Place (Panalo)
    expect(p1.isFinished).toBe(true);
    expect(p1.finishRank).toBe(1);
    expect(room.publicState.winnerId).toBe(p1.id);
    // No points awarded
    expect(p1.score).toBe(0);

    // Since p2 and p3 still hold cards, the match CONTINUES for survival!
    expect(room.publicState.phase).toBe('playing');

    // Turn advances to p2. Now p2 plays their last card to become Safe (Rank 2)
    room.publicState.currentColor = 'red';
    const playRes2 = manager.playCard(roomId, p2.id, 'p2_1');
    expect(playRes2.success).toBe(true);
    expect(p2.isFinished).toBe(true);
    expect(p2.finishRank).toBe(2);

    // Now Charlie (p3) is the ONLY player with cards remaining!
    // Charlie is declared Ang Pungot (The Loser) and match officially ends!
    expect(room.publicState.phase).toBe('ended');
    expect(room.publicState.loserId).toBe(p3.id);
    expect(p3.isFinished).toBe(true);
    expect(p3.finishRank).toBe(3);
    expect(room.publicState.lastActionText).toContain('Pungot');
  });
});
