/**
 * Shared Level & XP Progression Utility
 * 
 * Formula:
 * Level = Math.max(1, Math.floor(Math.sqrt(experience / 100)) + 1)
 *
 * In reverse:
 * Total XP required to reach Level L: (L - 1)^2 * 100
 * Next level is Level L + 1: L^2 * 100
 */

export function getLevelFromXP(experience: number): number {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(0, experience) / 100)) + 1);
}

export interface XPProgressInfo {
  level: number;
  currentXP: number;
  currentLevelStartXP: number;
  nextLevelXP: number;
  neededXPForNext: number;
  currentLevelXP: number;
  percent: number;
  bonusCoinsForNext: number;
}

export function getXPProgress(experience: number): XPProgressInfo {
  const currentXP = Math.max(0, Math.floor(experience || 0));
  const level = getLevelFromXP(currentXP);
  const currentLevelStartXP = Math.pow(level - 1, 2) * 100;
  const nextLevelXP = Math.pow(level, 2) * 100;
  const neededXPForNext = Math.max(1, nextLevelXP - currentLevelStartXP);
  const currentLevelXP = Math.max(0, currentXP - currentLevelStartXP);
  const percent = Math.min(100, Math.max(0, Math.floor((currentLevelXP / neededXPForNext) * 100)));

  return {
    level,
    currentXP,
    currentLevelStartXP,
    nextLevelXP,
    neededXPForNext,
    currentLevelXP,
    percent,
    bonusCoinsForNext: 100 * (level + 1),
  };
}
