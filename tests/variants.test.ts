import { describe, it, expect, beforeEach } from 'vitest';
import { Card, CardColor, HouseRules, PublicGameState } from '../src/engine/types';
import {
  createAllWildDeck,
  createFlipDeck,
  createDareDeck,
  createDeckForVariant,
  DARE_PROMPTS,
} from '../src/engine/deck';
import { isCardPlayable, getNextPlayerIndex } from '../src/engine/rules';
import { RoomManager } from '../server/roomManager';

describe('Uno All Wild Variant', () => {
  it('generates 112-card all-wild deck with all wild colors', () => {
    const deck = createAllWildDeck();
    expect(deck.length).toBe(112);
    expect(deck.every((c) => c.color === 'wild')).toBe(true);

    const wilds = deck.filter((c) => c.type === 'wild');
    const reverses = deck.filter((c) => c.type === 'reverse');
    const skips = deck.filter((c) => c.type === 'skip');
    const skip2s = deck.filter((c) => c.type === 'skip2');
    const targetedDraw2s = deck.filter((c) => c.type === 'targeted_draw2');
    const forcedSwaps = deck.filter((c) => c.type === 'forced_swap');

    expect(wilds.length).toBe(68);
    expect(reverses.length).toBe(14);
    expect(skips.length).toBe(10);
    expect(skip2s.length).toBe(6);
    expect(targetedDraw2s.length).toBe(4);
    expect(forcedSwaps.length).toBe(2);
  });

  it('allows any card to be played in all_wild variant', () => {
    const topCard: Card = { id: 'top', color: 'wild', type: 'wild' };
    const anyCard: Card = { id: 'any', color: 'wild', type: 'targeted_draw2' };

    expect(isCardPlayable(anyCard, topCard, 'wild', 0, true, 'all_wild')).toBe(true);
  });

  it('handles Targeted Draw 2 correctly in roomManager', () => {
    const rm = new RoomManager();
    const roomId = rm.createRoom('p1', 'Player 1', '🦊', { variant: 'all_wild' });
    rm.addBot(roomId, 'p1');
    rm.addBot(roomId, 'p1');

    const room = rm.getRoom(roomId)!;
    rm.startGame(roomId, 'p1');

    const bot1 = room.publicState.players[1];
    const initialBotHandSize = room.playerHands.get(bot1.id)!.length;

    // Give active player a targeted_draw2 card
    const activePlayer = room.publicState.players[room.publicState.activePlayerIndex];
    const targetedCard: Card = {
      id: 'test-targeted-draw2',
      color: 'wild',
      type: 'targeted_draw2',
    };
    room.playerHands.get(activePlayer.id)!.push(targetedCard);

    // Play card targeting bot1
    const res = rm.playCard(roomId, activePlayer.id, targetedCard.id, undefined, bot1.id);
    expect(res.success).toBe(true);

    // Bot1 should have received 2 cards
    const newBotHandSize = room.playerHands.get(bot1.id)!.length;
    expect(newBotHandSize).toBe(initialBotHandSize + 2);
    expect(bot1.cardCount).toBe(newBotHandSize);
  });

  it('handles Forced Swap correctly in roomManager', () => {
    const rm = new RoomManager();
    const roomId = rm.createRoom('p1', 'Player 1', '🦊', { variant: 'all_wild' });
    rm.addBot(roomId, 'p1');

    const room = rm.getRoom(roomId)!;
    rm.startGame(roomId, 'p1');

    const p1 = room.publicState.players[0];
    const p2 = room.publicState.players[1];

    // Give distinct hands
    const hand1: Card[] = [
      { id: 'h1_1', color: 'wild', type: 'forced_swap' },
      { id: 'h1_2', color: 'wild', type: 'wild' },
    ];
    const hand2: Card[] = [
      { id: 'h2_1', color: 'wild', type: 'reverse' },
      { id: 'h2_2', color: 'wild', type: 'skip' },
      { id: 'h2_3', color: 'wild', type: 'skip2' },
    ];

    room.playerHands.set(p1.id, hand1);
    room.playerHands.set(p2.id, hand2);
    p1.cardCount = hand1.length;
    p2.cardCount = hand2.length;
    room.publicState.activePlayerIndex = 0;

    // Play forced swap
    const res = rm.playCard(roomId, p1.id, 'h1_1', undefined, p2.id);
    expect(res.success).toBe(true);

    // Hands should now be swapped (minus the played card from p1)
    const newHand1 = room.playerHands.get(p1.id)!;
    const newHand2 = room.playerHands.get(p2.id)!;

    expect(newHand1.length).toBe(3);
    expect(newHand2.length).toBe(1);
    expect(p1.cardCount).toBe(3);
    expect(p2.cardCount).toBe(1);
  });

  it('handles Skip 2 correctly skipping next two players', () => {
    const rm = new RoomManager();
    const roomId = rm.createRoom('p1', 'Player 1', '🦊', { variant: 'all_wild' });
    rm.addBot(roomId, 'p1');
    rm.addBot(roomId, 'p1');
    rm.addBot(roomId, 'p1');

    const room = rm.getRoom(roomId)!;
    rm.startGame(roomId, 'p1');

    room.publicState.activePlayerIndex = 0;
    room.publicState.direction = 1;
    const p0 = room.publicState.players[0];

    const skip2Card: Card = { id: 'test_skip2', color: 'wild', type: 'skip2' };
    room.playerHands.get(p0.id)!.push(skip2Card);

    rm.playCard(roomId, p0.id, skip2Card.id);

    // Skips p1 and p2 -> next active player is p3 (index 3)
    expect(room.publicState.activePlayerIndex).toBe(3);
  });

  it('handles Skip 2 in head-to-head 2-player match allowing player to take 2 more consecutive turns', () => {
    const rm = new RoomManager();
    const roomId = rm.createRoom('p1', 'Player 1', '🦊', { variant: 'all_wild' });
    rm.addBot(roomId, 'p1');

    const room = rm.getRoom(roomId)!;
    rm.startGame(roomId, 'p1');

    room.publicState.activePlayerIndex = 0;
    room.publicState.direction = 1;
    const p0 = room.publicState.players[0];

    const skip2Card: Card = { id: 'test_skip2_headtohead', color: 'wild', type: 'skip2' };
    const card2: Card = { id: 'test_card2', color: 'wild', type: 'wild' };
    const card3: Card = { id: 'test_card3', color: 'wild', type: 'wild' };
    room.playerHands.get(p0.id)!.push(skip2Card, card2, card3);

    // 1. Play Skip 2
    const res1 = rm.playCard(roomId, p0.id, skip2Card.id);
    expect(res1.success).toBe(true);
    // Extra turns remaining = 2, turn remains on p0!
    expect(room.publicState.activePlayerIndex).toBe(0);
    expect(room.extraTurnsRemaining?.count).toBe(2);

    // 2. Play 1st extra card (Card #2)
    const res2 = rm.playCard(roomId, p0.id, card2.id);
    expect(res2.success).toBe(true);
    // Extra turns remaining = 1, turn STILL remains on p0!
    expect(room.publicState.activePlayerIndex).toBe(0);
    expect(room.extraTurnsRemaining?.count).toBe(1);

    // 3. Play 2nd extra card (Card #3)
    const res3 = rm.playCard(roomId, p0.id, card3.id);
    expect(res3.success).toBe(true);
    // Now both extra turns were used, turn advances to p1 (opponent, index 1)!
    expect(room.extraTurnsRemaining).toBeNull();
    expect(room.publicState.activePlayerIndex).toBe(1);
  });
});

describe('Uno Flip Variant', () => {
  it('creates 112 double-sided cards properly paired with flipSide', () => {
    const deck = createFlipDeck();
    expect(deck.length).toBe(112);

    for (const card of deck) {
      expect(card.flipSide).toBeDefined();
      expect(card.flipSide?.flipSide).toBeDefined();

      // Light side colors: red, blue, green, yellow, wild
      expect(['red', 'blue', 'green', 'yellow', 'wild']).toContain(card.color);

      // Dark side colors: teal, orange, purple, pink, wild
      expect(['teal', 'orange', 'purple', 'pink', 'wild']).toContain(card.flipSide!.color);
    }

    // Verify dark side special cards exist
    const darkCards = deck.map((c) => c.flipSide!);
    expect(darkCards.some((c) => c.type === 'draw5')).toBe(true);
    expect(darkCards.some((c) => c.type === 'skip_all')).toBe(true);
    expect(darkCards.some((c) => c.type === 'wild_draw_color')).toBe(true);
  });

  it('flips entire room state from light to dark when FLIP card is played', () => {
    const rm = new RoomManager();
    const roomId = rm.createRoom('p1', 'Player 1', '🦊', { variant: 'flip' });
    rm.addBot(roomId, 'p1');

    const room = rm.getRoom(roomId)!;
    rm.startGame(roomId, 'p1');

    expect(room.publicState.activeFlipSide).toBe('light');

    const p0 = room.publicState.players[0];
    const flipCard = room.playerHands.get(p0.id)!.find((c) => c.type === 'flip') || {
      id: 'test_flip',
      color: 'red',
      type: 'flip' as const,
      flipSide: {
        id: 'test_flip_dark',
        color: 'teal' as const,
        type: 'flip' as const,
      },
    };

    room.playerHands.get(p0.id)!.push(flipCard);
    room.publicState.activePlayerIndex = 0;
    room.publicState.currentColor = flipCard.color;
    room.publicState.topDiscard = { id: 'top_test', color: flipCard.color, type: 'number', value: 5 };

    const res = rm.playCard(roomId, p0.id, flipCard.id);
    expect(res.success).toBe(true);

    // Active side is now dark
    expect(room.publicState.activeFlipSide).toBe('dark');
    expect(['teal', 'orange', 'purple', 'pink']).toContain(room.publicState.currentColor);
  });

  it('handles Skip All card giving active player another turn', () => {
    const rm = new RoomManager();
    const roomId = rm.createRoom('p1', 'Player 1', '🦊', { variant: 'flip' });
    rm.addBot(roomId, 'p1');
    rm.addBot(roomId, 'p1');

    const room = rm.getRoom(roomId)!;
    rm.startGame(roomId, 'p1');

    room.publicState.activeFlipSide = 'dark';
    room.publicState.currentColor = 'purple';
    room.publicState.activePlayerIndex = 0;

    const p0 = room.publicState.players[0];
    const skipAllCard: Card = { id: 'test_skip_all', color: 'purple', type: 'skip_all' };
    room.playerHands.get(p0.id)!.push(skipAllCard);

    rm.playCard(roomId, p0.id, skipAllCard.id);

    // Active player stays at index 0 because everybody else was skipped!
    expect(room.publicState.activePlayerIndex).toBe(0);
  });
});

describe('Uno Dare Variant', () => {
  it('creates 108-card deck containing Dare and Wild Dare cards with prompt text', () => {
    const deck = createDareDeck();
    expect(deck.length).toBe(108);

    const dareCards = deck.filter((c) => c.type === 'dare');
    const wildDareCards = deck.filter((c) => c.type === 'wild_dare');

    expect(dareCards.length).toBe(8);
    expect(wildDareCards.length).toBe(4);

    for (const card of dareCards) {
      expect(card.dareText).toBeDefined();
      expect(card.dareText!.length).toBeGreaterThan(0);
    }
  });

  it('initiates pendingDare when a human player is targeted by a Dare card', () => {
    const rm = new RoomManager();
    const roomId = rm.createRoom('p1', 'Player 1', '🦊', { variant: 'dare' });
    const wsDummy = { send: () => {} } as any;
    rm.joinRoom(roomId, 'p2', 'Player 2', '🐼', wsDummy);

    const room = rm.getRoom(roomId)!;
    rm.startGame(roomId, 'p1');

    room.publicState.activePlayerIndex = 0;
    const p0 = room.publicState.players[0];
    const p1 = room.publicState.players[1];

    const dareCard: Card = {
      id: 'test_dare',
      color: 'red',
      type: 'dare',
      dareText: 'Do 5 jumping jacks!',
    };
    room.playerHands.get(p0.id)!.push(dareCard);
    room.publicState.currentColor = 'red';

    const res = rm.playCard(roomId, p0.id, dareCard.id);
    expect(res.success).toBe(true);

    // Victim p1 should have a pending dare
    expect(room.publicState.pendingDare).toBeDefined();
    expect(room.publicState.pendingDare?.targetPlayerId).toBe(p1.id);
    expect(room.publicState.pendingDare?.dareText).toBe('Do 5 jumping jacks!');
    expect(room.publicState.pendingDare?.penaltyDrawCount).toBe(2);
  });

  it('resolves dare when victim accepts (escapes drawing cards)', () => {
    const rm = new RoomManager();
    const roomId = rm.createRoom('p1', 'Player 1', '🦊', { variant: 'dare' });
    const wsDummy = { send: () => {} } as any;
    rm.joinRoom(roomId, 'p2', 'Player 2', '🐼', wsDummy);

    const room = rm.getRoom(roomId)!;
    rm.startGame(roomId, 'p1');

    const p1 = room.publicState.players[1];
    const handBefore = room.playerHands.get(p1.id)!.length;

    room.publicState.pendingDare = {
      targetPlayerId: p1.id,
      playedBy: 'p1',
      penaltyDrawCount: 2,
      dareText: 'Balance a card on your nose!',
    };

    // p1 accepts the dare
    rm.resolveDare(roomId, p1.id, true);

    // Pending dare cleared
    expect(room.publicState.pendingDare).toBeNull();
    // No penalty cards drawn!
    expect(room.playerHands.get(p1.id)!.length).toBe(handBefore);
    // Turn advances to p1
    expect(room.publicState.activePlayerIndex).toBe(1);
  });

  it('resolves dare when victim declines (draws penalty cards and forfeits turn)', () => {
    const rm = new RoomManager();
    const roomId = rm.createRoom('p1', 'Player 1', '🦊', { variant: 'dare' });
    const wsDummy = { send: () => {} } as any;
    rm.joinRoom(roomId, 'p2', 'Player 2', '🐼', wsDummy);

    const room = rm.getRoom(roomId)!;
    rm.startGame(roomId, 'p1');

    const p1 = room.publicState.players[1];
    const handBefore = room.playerHands.get(p1.id)!.length;

    room.publicState.activePlayerIndex = 0;
    room.publicState.pendingDare = {
      targetPlayerId: p1.id,
      playedBy: 'p1',
      penaltyDrawCount: 2,
      dareText: 'Make a chicken sound!',
    };

    // p1 declines the dare
    rm.resolveDare(roomId, p1.id, false);

    // Pending dare cleared
    expect(room.publicState.pendingDare).toBeNull();
    // p1 drew 2 cards
    expect(room.playerHands.get(p1.id)!.length).toBe(handBefore + 2);
    // p1 lost turn, so in a 2-player match turn goes back to player 0
    expect(room.publicState.activePlayerIndex).toBe(0);
  });

  it('declares the last player with cards as loser (Pungot) in all variants', () => {
    const variants: ('all_wild' | 'flip' | 'dare')[] = ['all_wild', 'flip', 'dare'];

    for (const variant of variants) {
      const rm = new RoomManager();
      const roomId = rm.createRoom('p1', 'Player 1', '🦊', { variant });
      rm.addBot(roomId, 'p1'); // 2 players: p1 and p2 (bot)

      const room = rm.getRoom(roomId)!;
      rm.startGame(roomId, 'p1');

      const [p1, p2] = room.publicState.players;

      // Give p1 1 card, p2 3 cards
      const winCard: Card = { id: `win_${variant}`, color: 'wild', type: 'wild' };
      room.playerHands.set(p1.id, [winCard]);
      p1.cardCount = 1;

      room.playerHands.set(p2.id, [
        { id: `p2_1_${variant}`, color: 'wild', type: 'wild' },
        { id: `p2_2_${variant}`, color: 'wild', type: 'wild' },
        { id: `p2_3_${variant}`, color: 'wild', type: 'wild' },
      ]);
      p2.cardCount = 3;

      room.publicState.activePlayerIndex = 0;
      room.publicState.currentColor = 'wild';

      // p1 plays card to finish hand
      rm.playCard(roomId, p1.id, winCard.id, 'red');

      // Verify game ended: p1 won 1st, p2 is the last player with cards and lost (Pungot)
      expect(room.publicState.phase).toBe('ended');
      expect(room.publicState.winnerId).toBe(p1.id);
      expect(room.publicState.loserId).toBe(p2.id);
      expect(p1.score).toBe(0); // Zero point scoring
    }
  });
});
