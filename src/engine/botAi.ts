import { Card, CardColor, HouseRules, PublicGameState } from './types';
import { COLORS, DARK_COLORS } from './deck';
import { getPlayableCards as getPlayables } from './rules';

export interface BotDecision {
  action: 'play' | 'draw' | 'pass';
  cardId?: string;
  chosenColor?: CardColor;
  targetPlayerId?: string;
  shouldCallUno?: boolean;
}

/**
 * Counts how many cards of each color the bot holds.
 */
export function getMostFrequentColor(hand: Card[], isDarkSide: boolean = false): CardColor {
  const targetColors = isDarkSide ? DARK_COLORS : COLORS;
  const counts: Record<string, number> = {};

  for (const c of targetColors) {
    counts[c] = 0;
  }

  for (const card of hand) {
    if (card.color !== 'wild' && counts[card.color] !== undefined) {
      counts[card.color]++;
    }
  }

  let bestColor: CardColor = targetColors[0];
  let maxCount = -1;

  for (const c of targetColors) {
    if ((counts[c] ?? 0) > maxCount) {
      maxCount = counts[c];
      bestColor = c;
    }
  }

  return bestColor;
}

/**
 * Intelligent decision maker for bot players.
 */
export function makeBotMove(
  botHand: Card[],
  gameState: PublicGameState,
  houseRules: HouseRules
): BotDecision {
  const { topDiscard, currentColor, pendingDrawPenalty, players, activePlayerIndex, direction, variant, activeFlipSide } = gameState;

  const isDark = activeFlipSide === 'dark';
  const playable = getPlayables(botHand, topDiscard, currentColor, pendingDrawPenalty, houseRules, variant);

  if (playable.length === 0) {
    return { action: 'draw' };
  }

  let nextPlayerIndex = (activePlayerIndex + direction + players.length) % players.length;
  for (let i = 0; i < players.length; i++) {
    const candidate = players[nextPlayerIndex];
    if (candidate && !candidate.isFinished && candidate.cardCount > 0) {
      break;
    }
    nextPlayerIndex = (nextPlayerIndex + direction + players.length) % players.length;
  }
  const nextPlayer = players[nextPlayerIndex];
  const nextPlayerIsDanger = nextPlayer && nextPlayer.cardCount <= 2;

  // Prioritize attack cards if next player has few cards
  let chosenCard: Card | null = null;

  if (nextPlayerIsDanger) {
    const attackCards = playable.filter(
      (c) =>
        c.type === 'draw2' ||
        c.type === 'wild4' ||
        c.type === 'skip' ||
        c.type === 'draw5' ||
        c.type === 'skip_all' ||
        c.type === 'targeted_draw2' ||
        c.type === 'skip2' ||
        c.type === 'dare'
    );
    if (attackCards.length > 0) {
      chosenCard = attackCards[0];
    }
  }

  // If no attack card chosen, prioritize non-wild cards matching dominant color
  if (!chosenCard) {
    const nonWilds = playable.filter((c) => c.color !== 'wild');
    if (nonWilds.length > 0) {
      const dominantColor = getMostFrequentColor(botHand, isDark);
      const matchingDominant = nonWilds.filter((c) => c.color === dominantColor);
      if (matchingDominant.length > 0) {
        chosenCard = matchingDominant[0];
      } else {
        chosenCard = nonWilds[0];
      }
    } else {
      chosenCard = playable[0];
    }
  }

  // Determine chosen color if it's a Wild card
  let chosenColor: CardColor | undefined;
  if (
    chosenCard.color === 'wild' ||
    chosenCard.type === 'wild' ||
    chosenCard.type === 'wild4' ||
    chosenCard.type === 'wild_draw_color' ||
    chosenCard.type === 'wild_dare'
  ) {
    const remainingHand = botHand.filter((c) => c.id !== chosenCard!.id);
    chosenColor = getMostFrequentColor(remainingHand, isDark);
  }

  // Targeted actions: 7-0 swap, Targeted Draw 2, Forced Swap
  let targetPlayerId: string | undefined;
  const opponents = players.filter((p, idx) => idx !== activePlayerIndex && p.cardCount > 0 && !p.isFinished);
  const sortedByLowestCards = [...opponents].sort((a, b) => a.cardCount - b.cardCount);

  if (
    (houseRules.sevenZero && chosenCard.type === 'number' && chosenCard.value === 7) ||
    chosenCard.type === 'forced_swap' ||
    chosenCard.type === 'targeted_draw2'
  ) {
    if (sortedByLowestCards.length > 0) {
      targetPlayerId = sortedByLowestCards[0].id;
    }
  }

  // UNO declaration: bot calls UNO 95% of the time
  const willHaveOneCard = botHand.length === 2;
  const shouldCallUno = willHaveOneCard && Math.random() < 0.95;

  return {
    action: 'play',
    cardId: chosenCard.id,
    chosenColor,
    targetPlayerId,
    shouldCallUno,
  };
}
