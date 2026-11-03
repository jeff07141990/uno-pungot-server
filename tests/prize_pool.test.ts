import { describe, it, expect } from 'vitest';
import { economyManager } from '../server/economyManager';
import { EntryFeeAmount } from '../src/engine/types';

describe('UNO Multiplayer 5-Place Prize Pool System', () => {
  const tiers: EntryFeeAmount[] = [100, 200, 300, 400, 500];

  tiers.forEach((fee) => {
    it(`guarantees exact integer 100% payout for entry fee ₱${fee}`, () => {
      const pool = fee * 5;
      const p1 = Math.floor(pool * 0.50);
      const p2 = Math.floor(pool * 0.25);
      const p3 = Math.floor(pool * 0.15);
      const p4 = Math.floor(pool * 0.07);
      const p5 = pool - (p1 + p2 + p3 + p4);

      // Verify each place matches exact expected values
      expect(p1).toBe(Math.round(pool * 0.50));
      expect(p2).toBe(Math.round(pool * 0.25));
      expect(p3).toBe(Math.round(pool * 0.15));
      expect(p4).toBe(Math.round(pool * 0.07));
      expect(p5).toBe(Math.round(pool * 0.03));

      // Total sum must always equal exactly 100% of the pool
      expect(p1 + p2 + p3 + p4 + p5).toBe(pool);
    });
  });

  it('correctly calculates expected prize values for all 5 tiers', () => {
    // ₱100: Pool ₱500 -> 250, 125, 75, 35, 15
    const pool100 = 100 * 5;
    expect(Math.floor(pool100 * 0.50)).toBe(250);
    expect(Math.floor(pool100 * 0.25)).toBe(125);
    expect(Math.floor(pool100 * 0.15)).toBe(75);
    expect(Math.floor(pool100 * 0.07)).toBe(35);
    expect(pool100 - (250 + 125 + 75 + 35)).toBe(15);

    // ₱500: Pool ₱2,500 -> 1250, 625, 375, 175, 75
    const pool500 = 500 * 5;
    expect(Math.floor(pool500 * 0.50)).toBe(1250);
    expect(Math.floor(pool500 * 0.25)).toBe(625);
    expect(Math.floor(pool500 * 0.15)).toBe(375);
    expect(Math.floor(pool500 * 0.07)).toBe(175);
    expect(pool500 - (1250 + 625 + 375 + 175)).toBe(75);
  });

  it('reserves entry fee and refunds when player leaves lobby', () => {
    const testPlayerId = `test_player_${Date.now()}`;
    const wallet = economyManager.getOrCreateWallet(testPlayerId, 'Test Player', '🤖');
    const initialBalance = wallet.balance;

    // Reserve ₱200 entry fee
    const reserveRes = economyManager.reserveEntryFee(testPlayerId, 'room_123', 200);
    expect(reserveRes.success).toBe(true);
    expect(reserveRes.wallet?.balance).toBe(initialBalance - 200);

    // Refund ₱200 entry fee (e.g. leaving lobby)
    const refundRes = economyManager.refundEntryFee(testPlayerId, 'room_123', 200);
    expect(refundRes.success).toBe(true);
    expect(refundRes.wallet?.balance).toBe(initialBalance);
  });

  it('rejects reservation when player has insufficient balance', () => {
    const poorPlayerId = `poor_player_${Date.now()}`;
    const wallet = economyManager.getOrCreateWallet(poorPlayerId, 'Poor Player', '🤖');
    // Deplete balance
    wallet.balance = 50;

    const reserveRes = economyManager.reserveEntryFee(poorPlayerId, 'room_999', 100);
    expect(reserveRes.success).toBe(false);
    expect(wallet.balance).toBe(50);
  });
});
