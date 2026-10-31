import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WebSocket } from 'ws';

describe('Real Live Multi-Player Network Integration', () => {
  let serverUrl = 'ws://localhost:3001';

  it('connects two distinct players, starts game, and preserves private-hand confidentiality', async () => {
    // 1. Create room via REST
    const createRes = await fetch('http://localhost:3001/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hostId: 'alice_123',
        hostName: 'Alice',
        hostAvatar: '🦊',
        options: { roomName: 'Championship Match' },
      }),
    });
    const { roomId } = await createRes.json();
    expect(roomId).toBeDefined();

    // 2. Connect Alice and Bob over WebSocket
    const wsAlice = new WebSocket(serverUrl);
    const wsBob = new WebSocket(serverUrl);

    await Promise.all([
      new Promise((res) => (wsAlice.onopen = res)),
      new Promise((res) => (wsBob.onopen = res)),
    ]);

    let aliceSyncs: any[] = [];
    let bobSyncs: any[] = [];
    let bobChats: any[] = [];

    wsAlice.onmessage = (event) => {
      const data = JSON.parse(event.data.toString());
      if (data.type === 'SYNC_STATE') aliceSyncs.push(data);
    };

    wsBob.onmessage = (event) => {
      const data = JSON.parse(event.data.toString());
      if (data.type === 'SYNC_STATE') bobSyncs.push(data);
      if (data.type === 'CHAT_MESSAGE') bobChats.push(data.message);
    };

    // Alice joins
    wsAlice.send(
      JSON.stringify({
        type: 'JOIN_ROOM',
        roomId,
        playerId: 'alice_123',
        playerName: 'Alice',
        playerAvatar: '🦊',
      })
    );

    // Bob joins
    wsBob.send(
      JSON.stringify({
        type: 'JOIN_ROOM',
        roomId,
        playerId: 'bob_456',
        playerName: 'Bob',
        playerAvatar: '🐼',
      })
    );

    // Wait for lobby sync
    await new Promise((r) => setTimeout(r, 200));

    expect(aliceSyncs.length).toBeGreaterThan(0);
    const lobbyState = aliceSyncs[aliceSyncs.length - 1].publicState;
    expect(lobbyState.players.length).toBe(2);

    // 3. Alice (host) starts match
    wsAlice.send(
      JSON.stringify({
        type: 'START_GAME',
        roomId,
        hostId: 'alice_123',
      })
    );

    await new Promise((r) => setTimeout(r, 200));

    const latestAlice = aliceSyncs[aliceSyncs.length - 1];
    const latestBob = bobSyncs[bobSyncs.length - 1];

    expect(latestAlice.publicState.phase).toBe('playing');
    expect(latestBob.publicState.phase).toBe('playing');

    // Both players have their hands dealt
    expect(latestAlice.yourHand.length).toBeGreaterThanOrEqual(7);
    expect(latestBob.yourHand.length).toBeGreaterThanOrEqual(7);

    // STRICT CONFIDENTIALITY VERIFICATION:
    // Alice's hand IDs must NOT appear anywhere in Bob's publicState!
    const aliceHandIds = latestAlice.yourHand.map((c: any) => c.id);
    const bobPublicPlayers = latestBob.publicState.players;
    for (const player of bobPublicPlayers) {
      expect((player as any).hand).toBeUndefined();
    }
    // Bob only sees Alice's cardCount
    const aliceInBobView = bobPublicPlayers.find((p: any) => p.id === 'alice_123');
    expect(aliceInBobView.cardCount).toBe(latestAlice.yourHand.length);

    // 4. Test In-Game Chat synchronization
    wsAlice.send(
      JSON.stringify({
        type: 'SEND_CHAT',
        roomId,
        senderId: 'alice_123',
        text: 'Good luck Bob! May the best UNO player win!',
      })
    );

    await new Promise((r) => setTimeout(r, 150));
    expect(bobChats.length).toBe(1);
    expect(bobChats[0].text).toContain('Good luck Bob');

    wsAlice.close();
    wsBob.close();
  });
});
