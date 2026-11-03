import { Card, CardColor, GameVariant, HouseRules } from './types';

/**
 * Checks if a card is playable given the current top discard, active color,
 * pending draw penalty, stacking rule, and game variant.
 */
export function isCardPlayable(
  card: Card,
  topDiscard: Card | null,
  currentColor: CardColor,
  pendingDrawPenalty: number,
  stackingEnabled: boolean,
  variant: GameVariant = 'classic'
): boolean {
  if (!topDiscard) return true;

  // 1. Stacking logic when penalty is pending (enforced across ALL variants when stacking is enabled)
  if (pendingDrawPenalty > 0) {
    // Defensive Power-Up Cards: Shield and Reflect can always counter incoming pending draw penalty!
    if (card.type === 'power_shield' || card.type === 'power_reflect') {
      return true;
    }

    if (!stackingEnabled) return false;

    // +2 on +2
    if (topDiscard.type === 'draw2' && card.type === 'draw2') return true;
    // +4 on +4 or +4 on +2
    if (card.type === 'wild4') return true;
    // +2 on +4 (if stacking enabled in All Wild or Classic)
    if (topDiscard.type === 'wild4' && card.type === 'draw2') return true;
    // Draw 1 on Draw 1 (Uno Flip)
    if (topDiscard.type === 'draw1' && card.type === 'draw1') return true;
    // Draw 5 on Draw 5 (Uno Flip)
    if (topDiscard.type === 'draw5' && card.type === 'draw5') return true;
    // Dare on Dare (Uno Dare)
    if (topDiscard.type === 'dare' && card.type === 'dare') return true;

    return false;
  }

  // 2. Power-Up Cards: all power cards are playable on player's turn like wild action cards
  if (card.type.startsWith('power_')) {
    return true;
  }

  // 3. Uno All Wild: Every card is wild, so any card can be played when there's no pending penalty
  if (variant === 'all_wild') {
    return true;
  }

  // 4. Wilds can always be played
  if (
    card.color === 'wild' ||
    card.type === 'wild' ||
    card.type === 'wild4' ||
    card.type === 'wild_draw_color' ||
    card.type === 'wild_dare'
  ) {
    return true;
  }

  // 4. Matches current active color
  if (card.color === currentColor) {
    return true;
  }

  // 5. Matches action symbol (Skip, Reverse, Draw Two, Flip, Draw 1, Draw 5, Skip All, Dare)
  if (card.type !== 'number' && card.type === topDiscard.type) {
    return true;
  }

  // 6. Matches numeric value
  if (card.type === 'number' && topDiscard.type === 'number' && card.value === topDiscard.value) {
    return true;
  }

  return false;
}

/**
 * Calculate the next player index taking into account direction and skips.
 */
export function getNextPlayerIndex(
  currentIndex: number,
  playerCount: number,
  direction: 1 | -1,
  steps: number = 1
): number {
  if (playerCount <= 0) return 0;
  let next = (currentIndex + direction * steps) % playerCount;
  if (next < 0) {
    next += playerCount;
  }
  return next === 0 ? 0 : next;
}

/**
 * Check if a player's hand contains any card of a specific color
 */
export function hasColorInHand(hand: Card[], color: CardColor): boolean {
  return hand.some((c) => c.color === color);
}

/**
 * Calculates standard Uno score for cards remaining in a hand.
 */
export function calculateHandScore(cards: Card[]): number {
  return cards.reduce((sum, card) => {
    if (card.type === 'number') {
      return sum + (card.value ?? 0);
    }
    if (
      card.type === 'wild' ||
      card.type === 'wild4' ||
      card.type === 'wild_draw_color' ||
      card.type === 'wild_dare' ||
      card.type === 'forced_swap'
    ) {
      return sum + 50;
    }
    if (card.type === 'draw5' || card.type === 'skip_all' || card.type === 'targeted_draw2' || card.type === 'skip2') {
      return sum + 30;
    }
    if (card.type === 'draw1') {
      return sum + 10;
    }
    // skip, reverse, draw2, flip, dare
    return sum + 20;
  }, 0);
}

/**
 * Get playable cards from hand.
 */
export function getPlayableCards(
  hand: Card[],
  topDiscard: Card | null,
  currentColor: CardColor,
  pendingDrawPenalty: number,
  houseRules: HouseRules,
  variant: GameVariant = 'classic'
): Card[] {
  return hand.filter((card) =>
    isCardPlayable(card, topDiscard, currentColor, pendingDrawPenalty, houseRules.stacking, variant)
  );
}
