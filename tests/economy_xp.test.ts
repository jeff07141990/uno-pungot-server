import { describe, it, expect } from 'vitest';
import { getLevelFromXP, getXPProgress } from '../src/utils/levelUtils';
import { economyManager } from '../server/economyManager';

describe('Player XP Progression & Level-Up System', () => {
  it('correctly calculates levels across thresholds', () => {
    expect(getLevelFromXP(0)).toBe(1);
    expect(getLevelFromXP(99)).toBe(1);
    expect(getLevelFromXP(100)).toBe(2);
    expect(getLevelFromXP(399)).toBe(2);
    expect(getLevelFromXP(400)).toBe(3);
    expect(getLevelFromXP(899)).toBe(3);
    expect(getLevelFromXP(900)).toBe(4);
    expect(getLevelFromXP(1600)).toBe(5);
  });

  it('correctly computes percentage progress within the current level', () => {
    // Level 1: 0 to 100 XP
    const p0 = getXPProgress(0);
    expect(p0.level).toBe(1);
    expect(p0.percent).toBe(0);

    const p50 = getXPProgress(50);
    expect(p50.level).toBe(1);
    expect(p50.percent).toBe(50);

    // Level 2: 100 to 400 XP (300 XP span)
    const p250 = getXPProgress(250);
    expect(p250.level).toBe(2);
    expect(p250.currentLevelXP).toBe(150);
    expect(p250.neededXPForNext).toBe(300);
    expect(p250.percent).toBe(50);
  });

  it('awards in-game card play XP and triggers level-up coin rewards', () => {
    const testId = `test_xp_${Date.now()}`;
    const wallet = economyManager.getOrCreateWallet(testId, 'XP Tester', '⚡');
    const initialCoins = wallet.balance;

    // Grant 120 XP to jump from Level 1 (0 XP) to Level 2 (120 XP >= 100)
    const res = economyManager.addExperience(wallet, 120);
    expect(res.leveledUp).toBe(true);
    expect(res.newLevel).toBe(2);
    expect(res.bonusCoins).toBe(200); // 100 * 2
    expect(wallet.balance).toBe(initialCoins + 200);
  });

  it('awards match finish XP to all participants based on standing', () => {
    const p1 = `p1_${Date.now()}`;
    const p2 = `p2_${Date.now()}`;
    const { updatedWallets, xpGains } = economyManager.awardMatchFinish(
      p1,
      p2,
      [p1, p2],
      false,
      [p1, p2]
    );

    expect(xpGains[p1]).toBe(120); // Winner
    expect(xpGains[p2]).toBe(25); // Pungot / Loser
    expect(updatedWallets[p1].experience).toBeGreaterThanOrEqual(120);
  });
});
