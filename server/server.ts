import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { RoomManager } from './roomManager';
import { economyManager } from './economyManager';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../dist');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static assets from dist if present
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

const roomManager = new RoomManager();

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: Date.now(), service: 'UNO Pungot Authoritative Game Server' });
});

// Public rooms list
app.get('/api/rooms', (_req, res) => {
  const rooms = roomManager.getAllPublicRooms();
  res.json({ rooms });
});

// Create room via REST
app.post('/api/rooms', (req, res) => {
  const { hostId, hostName, hostAvatar, options } = req.body;
  if (!hostId) {
    res.status(400).json({ error: 'hostId is required' });
    return;
  }
  const roomId = roomManager.createRoom(hostId, hostName, hostAvatar, options || {});
  res.json({ roomId });
});

// App version and automatic update check endpoint
app.get('/api/app-version', (_req, res) => {
  res.json({
    latestVersion: '1.0.13',
    latestVersionCode: 14,
    minSupportedVersion: '1.0.10',
    title: 'Bagong Update: UNO Pungot Edition v1.0.13',
    releaseNotes: [
      '⏱️ Fixed Turn Timer: Ganap nang sumusunod sa 30s at 60s settings',
      '🤖 Play-by-Bot on Mobile: Gumagana na ang bot autoplay at bawiin control',
      '🎵 Card Distribution Audio: Inalis ang nagpapatong at putol-putol na tunog',
      '✨ General gameplay & stability enhancements'
    ],
    downloadUrl: 'https://uno-pungot-server.onrender.com/download/uno-latest.apk'
  });
});

// Direct APK download route - redirects to Google Drive host
const GOOGLE_DRIVE_APK_URL = 'https://drive.google.com/uc?export=download&id=19GnR9qJ17DcFMGZWBZyaOtEuHDBYLGJP';

app.get('/download/uno-latest.apk', (_req, res) => {
  const localApk = path.resolve(__dirname, '../UNO-Pungot-Updated.apk');
  if (fs.existsSync(localApk)) {
    res.download(localApk, 'UNO-Pungot-Edition-v1.0.13.apk');
  } else {
    res.redirect(GOOGLE_DRIVE_APK_URL);
  }
});

// --- VIRTUAL PESO COIN ECONOMY REST ENDPOINTS ---

// 1. Get or create player wallet & inventory
app.get('/api/economy/wallet/:playerId', (req, res) => {
  try {
    const { playerId } = req.params;
    const name = (req.query.name as string) || 'Player';
    const avatar = (req.query.avatar as string) || '🦊';
    const wallet = economyManager.getOrCreateWallet(playerId, name, avatar);
    const catalog = economyManager.getCatalog();
    const missions = economyManager.getDailyMissions(playerId);
    res.json({ wallet, catalog, missions });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Claim daily ₱100 login reward
app.post('/api/economy/daily-reward', (req, res) => {
  try {
    const { playerId, name, avatar } = req.body;
    if (!playerId) {
      res.status(400).json({ error: 'playerId is required' });
      return;
    }
    const result = economyManager.claimDailyReward(playerId, name, avatar);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Buy Power-Up from Shop
app.post('/api/economy/buy-powerup', (req, res) => {
  try {
    const { playerId, powerUpId, quantity } = req.body;
    if (!playerId || !powerUpId) {
      res.status(400).json({ error: 'playerId and powerUpId are required' });
      return;
    }
    const result = economyManager.buyPowerUp(playerId, powerUpId, quantity || 1);
    
    // If the player is currently playing in an active room, directly inject the purchased power-up card into their hand!
    if (result.success) {
      roomManager.addPowerUpCardToHand(playerId, powerUpId);
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Claim completed Daily Mission reward
app.post('/api/economy/claim-mission', (req, res) => {
  try {
    const { playerId, missionId } = req.body;
    if (!playerId || !missionId) {
      res.status(400).json({ error: 'playerId and missionId are required' });
      return;
    }
    const result = economyManager.claimMissionReward(playerId, missionId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Leaderboard rankings
app.get('/api/economy/leaderboard', (_req, res) => {
  try {
    const rankings = economyManager.getLeaderboards();
    res.json(rankings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Admin review transactions
app.get('/api/economy/admin/transactions', (req, res) => {
  try {
    const limit = Number(req.query.limit) || 100;
    const txs = economyManager.getTransactions(limit);
    res.json({ transactions: txs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Admin adjust balance or promo coins
app.post('/api/economy/admin/adjust-balance', (req, res) => {
  try {
    const { playerId, amount, reason } = req.body;
    if (!playerId || typeof amount !== 'number') {
      res.status(400).json({ error: 'playerId and amount are required' });
      return;
    }
    const result = economyManager.adminAdjustBalance(playerId, amount, reason || 'Promotional award');
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7b. Add XP to player wallet
app.post('/api/economy/add-xp', (req, res) => {
  try {
    const { playerId, xp, reason } = req.body;
    if (!playerId || typeof xp !== 'number') {
      res.status(400).json({ error: 'playerId and xp are required' });
      return;
    }
    const result = economyManager.addInGameExperience(playerId, xp, reason || 'Activity');
    res.json(result || { success: false });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Admin configure item price or toggle enable/disable
app.post('/api/economy/admin/config-item', (req, res) => {
  try {
    const { powerUpId, updates } = req.body;
    if (!powerUpId || !updates) {
      res.status(400).json({ error: 'powerUpId and updates are required' });
      return;
    }
    const result = economyManager.adminUpdateCatalogItem(powerUpId, updates);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws: WebSocket) => {
  let boundRoomId: string | null = null;
  let boundPlayerId: string | null = null;

  // Heartbeat ping
  let isAlive = true;
  ws.on('pong', () => {
    isAlive = true;
  });

  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message.toString());

      switch (data.type) {
        case 'PING': {
          isAlive = true;
          ws.send(JSON.stringify({ type: 'PONG' }));
          break;
        }

        case 'JOIN_ROOM': {
          const { roomId, playerId, playerName, playerAvatar, asSpectator } = data;
          boundRoomId = roomId;
          boundPlayerId = playerId;
          const result = roomManager.joinRoom(roomId, playerId, playerName, playerAvatar, ws, asSpectator);
          if (!result.success) {
            ws.send(JSON.stringify({ type: 'ERROR', message: result.message }));
          }
          break;
        }

        case 'UPDATE_RULES': {
          const { roomId, playerId, rules, variant } = data;
          roomManager.updateRules(roomId, playerId, rules, variant);
          break;
        }

        case 'SET_READY': {
          const { roomId, playerId, isReady } = data;
          roomManager.setReady(roomId, playerId, isReady);
          break;
        }

        case 'ADD_BOT': {
          const { roomId, hostId } = data;
          roomManager.addBot(roomId, hostId);
          break;
        }

        case 'REMOVE_PLAYER': {
          const { roomId, hostId, targetPlayerId } = data;
          roomManager.removePlayer(roomId, hostId, targetPlayerId);
          break;
        }

        case 'CONFIRM_ENTRY_PAYMENT': {
          const { roomId, playerId } = data;
          const result = roomManager.confirmEntryPayment(roomId, playerId);
          if (!result.success) {
            ws.send(JSON.stringify({ type: 'ERROR', message: result.message }));
          }
          break;
        }

        case 'UPDATE_ENTRY_FEE': {
          const { roomId, hostId, entryFee } = data;
          const result = roomManager.updateEntryFee(roomId, hostId, entryFee);
          if (!result.success) {
            ws.send(JSON.stringify({ type: 'ERROR', message: result.message }));
          }
          break;
        }

        case 'START_GAME': {
          const { roomId, hostId } = data;
          const result = roomManager.startGame(roomId, hostId);
          if (!result.success) {
            ws.send(JSON.stringify({ type: 'ERROR', message: result.message }));
          }
          break;
        }

        case 'PLAY_CARD': {
          const { roomId, playerId, cardId, chosenColor, targetPlayerId } = data;
          const result = roomManager.playCard(roomId, playerId, cardId, chosenColor, targetPlayerId, true);
          if (!result.success) {
            ws.send(JSON.stringify({ type: 'ERROR', message: result.message }));
          }
          break;
        }

        case 'DRAW_CARD': {
          const { roomId, playerId, targetCardIndex } = data;
          const result = roomManager.drawCard(roomId, playerId, typeof targetCardIndex === 'number' ? targetCardIndex : undefined, true);
          if (!result.success) {
            ws.send(JSON.stringify({ type: 'ERROR', message: result.message }));
          }
          break;
        }

        case 'PASS_TURN': {
          const { roomId, playerId } = data;
          const result = roomManager.passTurn(roomId, playerId);
          if (!result.success) {
            ws.send(JSON.stringify({ type: 'ERROR', message: result.message }));
          }
          break;
        }

        case 'CALL_UNO': {
          const { roomId, playerId } = data;
          const result = roomManager.callUno(roomId, playerId);
          if (!result.success && result.message) {
            ws.send(JSON.stringify({ type: 'ERROR', message: result.message }));
          }
          break;
        }

        case 'CATCH_UNO': {
          const { roomId, callerId, targetPlayerId } = data;
          const result = roomManager.catchUno(roomId, callerId, targetPlayerId);
          if (!result.success && result.message) {
            ws.send(JSON.stringify({ type: 'ERROR', message: result.message }));
          }
          break;
        }

        case 'DECLARE_DEADLOCK': {
          const { roomId, playerId } = data;
          const result = roomManager.declareDeadlock(roomId, playerId);
          if (!result.success && result.message) {
            ws.send(JSON.stringify({ type: 'ERROR', message: result.message }));
          }
          break;
        }

        case 'CHALLENGE_WD4': {
          const { roomId, challengerId, acceptChallenge } = data;
          roomManager.resolveWD4Challenge(roomId, challengerId, acceptChallenge);
          break;
        }

        case 'RESOLVE_SEVEN': {
          const { roomId, playerId, targetPlayerId } = data;
          const room = roomManager.getRoom(roomId);
          if (room && room.publicState.pendingSevenSwap?.playerId === playerId) {
            roomManager.executeSevenSwap(room, playerId, targetPlayerId);
            room.publicState.activePlayerIndex = (room.publicState.activePlayerIndex + room.publicState.direction + room.publicState.players.length) % room.publicState.players.length;
            roomManager.broadcastState(roomId);
            roomManager.broadcastToast(roomId, 'Hands swapped!', 'power_swap');
          }
          break;
        }

        case 'RESOLVE_DARE': {
          const { roomId, targetPlayerId, acceptDare } = data;
          roomManager.resolveDare(roomId, targetPlayerId, acceptDare);
          break;
        }

        case 'RESOLVE_TARGETED_DRAW2': {
          const { roomId, playedById, targetPlayerId } = data;
          roomManager.resolveTargetedDraw2(roomId, playedById, targetPlayerId);
          break;
        }

        case 'SEND_CHAT': {
          const { roomId, senderId, text } = data;
          roomManager.sendChat(roomId, senderId, text);
          break;
        }

        case 'SEND_REACTION': {
          const { roomId, senderId, emoji } = data;
          roomManager.sendReaction(roomId, senderId, emoji);
          break;
        }

        case 'RESTART_GAME': {
          const { roomId, hostId } = data;
          roomManager.restartGame(roomId, hostId);
          break;
        }

        case 'RESUME_CONTROL': {
          const { roomId, playerId } = data;
          roomManager.resumePlayerControl(roomId, playerId);
          break;
        }

        case 'VOICE_SIGNAL': {
          const { roomId, senderId, targetId, signal } = data;
          roomManager.relayVoiceSignal(roomId, senderId, targetId, signal);
          break;
        }

        case 'USE_POWERUP': {
          const { roomId, playerId, powerUpId, targetPlayerId, chosenColor } = data;
          const result = roomManager.usePowerUp(roomId, playerId, powerUpId, targetPlayerId, chosenColor);
          if (!result.success) {
            ws.send(JSON.stringify({ type: 'ERROR', message: result.message }));
          }
          break;
        }

        case 'SPAWN_POWERUP_CARD': {
          const { roomId, playerId, powerUpId } = data;
          const ok = roomManager.addPowerUpCardToHand(playerId, powerUpId);
          if (!ok) {
            ws.send(JSON.stringify({ type: 'ERROR', message: 'Hindi mailipat ang card sa kamay.' }));
          }
          break;
        }
      }
    } catch (err) {
      console.error('Socket message parse error:', err);
    }
  });

  ws.on('close', () => {
    if (boundRoomId && boundPlayerId) {
      roomManager.handleDisconnect(boundRoomId, boundPlayerId);
    }
  });
});

// Periodic ping interval to keep connections alive and detect stale sockets
const pingInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    ws.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(pingInterval);
});

// Fallback for SPA routing
if (fs.existsSync(distPath)) {
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🎮 UNO Pungot Authoritative Game Server running on port ${PORT}`);
});
