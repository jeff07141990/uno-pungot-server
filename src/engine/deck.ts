import { Card, CardColor, CardType, GameVariant } from './types';

export const COLORS: CardColor[] = ['red', 'blue', 'green', 'yellow'];
export const DARK_COLORS: CardColor[] = ['teal', 'orange', 'purple', 'pink'];

export const DARE_PROMPTS = [
  'Speak in a pirate or robot accent until your next turn! 🏴‍☠️',
  'Compliment every opponent around the table! 💖',
  'Say "I am the UNO Champion" before every sentence this round! 👑',
  'Sing the chorus of your favorite song right now! 🎤',
  'Reveal your most embarrassing card game blunder! 🙈',
  'Bark like a happy puppy or meow like a cat! 🐶',
  'Hold your breath for 10 seconds or take the penalty! ⏱️',
  'Pretend you are a famous commentator casting the current match! 🎙️',
];

/**
 * Creates a standard 108-card Uno deck.
 */
export function createStandardDeck(): Card[] {
  const deck: Card[] = [];
  let idCounter = 1;

  for (const color of COLORS) {
    // One '0' per color
    deck.push({
      id: `card-${idCounter++}`,
      color,
      type: 'number',
      value: 0,
    });

    // Two of each 1-9
    for (let val = 1; val <= 9; val++) {
      deck.push({ id: `card-${idCounter++}`, color, type: 'number', value: val });
      deck.push({ id: `card-${idCounter++}`, color, type: 'number', value: val });
    }

    // Two Skip, two Reverse, two Draw 2
    for (let i = 0; i < 2; i++) {
      deck.push({ id: `card-${idCounter++}`, color, type: 'skip' });
      deck.push({ id: `card-${idCounter++}`, color, type: 'reverse' });
      deck.push({ id: `card-${idCounter++}`, color, type: 'draw2' });
    }
  }

  // 4 Wild cards
  for (let i = 0; i < 4; i++) {
    deck.push({ id: `card-${idCounter++}`, color: 'wild', type: 'wild' });
  }

  // 4 Wild Draw Four cards
  for (let i = 0; i < 4; i++) {
    deck.push({ id: `card-${idCounter++}`, color: 'wild', type: 'wild4' });
  }

  return deck;
}

/**
 * Creates an Uno All Wild deck (112 cards, every card is Wild!).
 */
export function createAllWildDeck(): Card[] {
  const deck: Card[] = [];
  let idCounter = 1;

  // 68 Classic Wilds
  for (let i = 0; i < 68; i++) {
    deck.push({ id: `wild-${idCounter++}`, color: 'wild', type: 'wild' });
  }

  // 14 Wild Reverse
  for (let i = 0; i < 14; i++) {
    deck.push({ id: `wild-${idCounter++}`, color: 'wild', type: 'reverse' });
  }

  // 10 Wild Skip
  for (let i = 0; i < 10; i++) {
    deck.push({ id: `wild-${idCounter++}`, color: 'wild', type: 'skip' });
  }

  // 6 Wild Skip Two (skips next 2 players)
  for (let i = 0; i < 6; i++) {
    deck.push({ id: `wild-${idCounter++}`, color: 'wild', type: 'skip2' });
  }

  // 4 Wild Draw Two
  for (let i = 0; i < 4; i++) {
    deck.push({ id: `wild-${idCounter++}`, color: 'wild', type: 'draw2' });
  }

  // 4 Wild Draw Four
  for (let i = 0; i < 4; i++) {
    deck.push({ id: `wild-${idCounter++}`, color: 'wild', type: 'wild4' });
  }

  // 4 Wild Targeted Draw Two (victim chosen by player)
  for (let i = 0; i < 4; i++) {
    deck.push({ id: `wild-${idCounter++}`, color: 'wild', type: 'targeted_draw2' });
  }

  // 2 Wild Forced Swap
  for (let i = 0; i < 2; i++) {
    deck.push({ id: `wild-${idCounter++}`, color: 'wild', type: 'forced_swap' });
  }

  return deck;
}

/**
 * Creates an Uno Flip deck (112 double-sided cards: Light Side and Dark Side).
 */
export function createFlipDeck(): Card[] {
  const lightDeck: Card[] = [];
  const darkDeck: Card[] = [];
  let idCounter = 1;

  // 1. Build Light Side cards (112 cards)
  for (const color of COLORS) {
    for (let val = 1; val <= 9; val++) {
      lightDeck.push({ id: `flip-l-${idCounter++}`, color, type: 'number', value: val });
      lightDeck.push({ id: `flip-l-${idCounter++}`, color, type: 'number', value: val });
    }
    for (let i = 0; i < 2; i++) {
      lightDeck.push({ id: `flip-l-${idCounter++}`, color, type: 'draw1' });
      lightDeck.push({ id: `flip-l-${idCounter++}`, color, type: 'reverse' });
      lightDeck.push({ id: `flip-l-${idCounter++}`, color, type: 'skip' });
      lightDeck.push({ id: `flip-l-${idCounter++}`, color, type: 'flip' });
    }
  }
  for (let i = 0; i < 4; i++) {
    lightDeck.push({ id: `flip-l-${idCounter++}`, color: 'wild', type: 'wild' });
    lightDeck.push({ id: `flip-l-${idCounter++}`, color: 'wild', type: 'draw2' }); // Light Wild Draw 2
  }

  // 2. Build Dark Side cards (112 cards)
  let darkIdCounter = 1;
  for (const color of DARK_COLORS) {
    for (let val = 1; val <= 9; val++) {
      darkDeck.push({ id: `flip-d-${darkIdCounter++}`, color, type: 'number', value: val });
      darkDeck.push({ id: `flip-d-${darkIdCounter++}`, color, type: 'number', value: val });
    }
    for (let i = 0; i < 2; i++) {
      darkDeck.push({ id: `flip-d-${darkIdCounter++}`, color, type: 'draw5' }); // Harsh Draw 5!
      darkDeck.push({ id: `flip-d-${darkIdCounter++}`, color, type: 'reverse' });
      darkDeck.push({ id: `flip-d-${darkIdCounter++}`, color, type: 'skip_all' }); // Skip Everyone!
      darkDeck.push({ id: `flip-d-${darkIdCounter++}`, color, type: 'flip' });
    }
  }
  for (let i = 0; i < 4; i++) {
    darkDeck.push({ id: `flip-d-${darkIdCounter++}`, color: 'wild', type: 'wild' });
    darkDeck.push({ id: `flip-d-${darkIdCounter++}`, color: 'wild', type: 'wild_draw_color' }); // Draw until matching color
  }

  // 3. Shuffle dark side independently and pair each light card with its dark flipSide
  const shuffledDark = shuffleDeck(darkDeck);
  for (let i = 0; i < lightDeck.length; i++) {
    lightDeck[i].flipSide = shuffledDark[i];
    shuffledDark[i].flipSide = lightDeck[i];
  }

  return lightDeck;
}

/**
 * Creates an Uno Dare deck (112 cards with Dare Draw 2 and Wild Dare challenges).
 */
export function createDareDeck(): Card[] {
  const deck: Card[] = [];
  let idCounter = 1;
  let dareIdx = 0;

  for (const color of COLORS) {
    deck.push({ id: `dare-${idCounter++}`, color, type: 'number', value: 0 });

    for (let val = 1; val <= 9; val++) {
      deck.push({ id: `dare-${idCounter++}`, color, type: 'number', value: val });
      deck.push({ id: `dare-${idCounter++}`, color, type: 'number', value: val });
    }

    // Skips, Reverses, and Dare Draw 2
    for (let i = 0; i < 2; i++) {
      deck.push({ id: `dare-${idCounter++}`, color, type: 'skip' });
      deck.push({ id: `dare-${idCounter++}`, color, type: 'reverse' });
      // Dare Card
      deck.push({
        id: `dare-${idCounter++}`,
        color,
        type: 'dare',
        dareText: DARE_PROMPTS[dareIdx++ % DARE_PROMPTS.length],
      });
    }
  }

  // 4 Wild cards
  for (let i = 0; i < 4; i++) {
    deck.push({ id: `dare-${idCounter++}`, color: 'wild', type: 'wild' });
  }

  // 4 Wild Dare cards
  for (let i = 0; i < 4; i++) {
    deck.push({
      id: `dare-${idCounter++}`,
      color: 'wild',
      type: 'wild_dare',
      dareText: DARE_PROMPTS[dareIdx++ % DARE_PROMPTS.length],
    });
  }

  return deck;
}

/**
 * Creates deck based on the chosen game variant.
 */
export function createDeckForVariant(variant: GameVariant): Card[] {
  switch (variant) {
    case 'all_wild':
      return createAllWildDeck();
    case 'flip':
      return createFlipDeck();
    case 'dare':
      return createDareDeck();
    case 'classic':
    default:
      return createStandardDeck();
  }
}

/**
 * Fisher-Yates shuffle algorithm.
 */
export function shuffleDeck(cards: Card[]): Card[] {
  const copy = [...cards];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Reshuffle discard pile when draw pile is low/empty.
 * Preserves the current top card on the discard pile.
 */
export function reshuffleDiscards(
  drawPile: Card[],
  discardPile: Card[]
): { newDrawPile: Card[]; newDiscardPile: Card[] } {
  if (discardPile.length <= 1) {
    return { newDrawPile: drawPile, newDiscardPile: discardPile };
  }

  const topCard = discardPile[discardPile.length - 1];
  const eligibleDiscards = discardPile.slice(0, discardPile.length - 1);

  const cleanedDiscards = eligibleDiscards.map((c) => {
    if (c.type === 'wild' || c.type === 'wild4' || c.type === 'wild_draw_color' || c.type === 'wild_dare') {
      return { ...c, color: 'wild' as CardColor };
    }
    return { ...c };
  });

  const shuffledNewDraw = shuffleDeck([...drawPile, ...cleanedDiscards]);

  return {
    newDrawPile: shuffledNewDraw,
    newDiscardPile: [topCard],
  };
}
