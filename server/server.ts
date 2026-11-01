import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import { RoomManager } from './roomManager';

const app = express();
app.use(cors());
app.use(express.json());

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
        case 'JOIN_ROOM': {
          const { roomId, playerId, playerName, playerAvatar } = data;
          boundRoomId = roomId;
          boundPlayerId = playerId;
          const result = roomManager.joinRoom(roomId, playerId, playerName, playerAvatar, ws);
          if (!result.success) {
            ws.send(JSON.stringify({ type: 'ERROR', message: result.message }));
          }
          break;
        }

        case 'UPDATE_RULES': {
          const { roomId, playerId, rules } = data;
          roomManager.updateRules(roomId, playerId, rules);
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
          const result = roomManager.playCard(roomId, playerId, cardId, chosenColor, targetPlayerId);
          if (!result.success) {
            ws.send(JSON.stringify({ type: 'ERROR', message: result.message }));
          }
          break;
        }

        case 'DRAW_CARD': {
          const { roomId, playerId, targetCardIndex } = data;
          const result = roomManager.drawCard(roomId, playerId, typeof targetCardIndex === 'number' ? targetCardIndex : undefined);
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
            roomManager.broadcastToast(roomId, 'Hands swapped!', 'card_play');
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

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🎮 UNO Pungot Authoritative Game Server running on port ${PORT}`);
});
