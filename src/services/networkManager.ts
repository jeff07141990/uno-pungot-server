import { Card, CardColor, ChatMessage, HouseRules, PublicGameState, ReactionEvent, SoundEffectType } from '../engine/types';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'reconnecting';

export interface NetworkCallbacks {
  onSyncState: (publicState: PublicGameState, yourHand: Card[], yourPlayerId: string) => void;
  onToast: (text: string, sound?: SoundEffectType) => void;
  onChat: (msg: ChatMessage) => void;
  onReaction: (event: ReactionEvent) => void;
  onError: (msg: string) => void;
  onStatusChange: (status: ConnectionStatus) => void;
  onVoiceSignal: (senderId: string, signal: unknown) => void;
}

class NetworkManager {
  private ws: WebSocket | null = null;
  private status: ConnectionStatus = 'disconnected';
  private callbacks: Partial<NetworkCallbacks> = {};
  private currentRoomId: string | null = null;
  private currentPlayer: { id: string; name: string; avatar: string } | null = null;
  private reconnectAttempts = 0;
  private reconnectTimeout: number | null = null;

  private getServerUrl(): string {
    const customServer = typeof window !== 'undefined' ? localStorage.getItem('uno_custom_server') : null;
    if (customServer) {
      return customServer.replace(/^http/, 'ws');
    }
    if (import.meta.env.VITE_SERVER_URL) {
      const url = import.meta.env.VITE_SERVER_URL;
      return url.replace(/^http/, 'ws');
    }
    // Default to Live Render Server URL
    return 'wss://uno-pungot-server.onrender.com';
  }

  public getHttpApiUrl(): string {
    const customServer = typeof window !== 'undefined' ? localStorage.getItem('uno_custom_server') : null;
    if (customServer) {
      return customServer;
    }
    if (import.meta.env.VITE_SERVER_URL) {
      return import.meta.env.VITE_SERVER_URL;
    }
    // Default to Live Render Server URL
    return 'https://uno-pungot-server.onrender.com';
  }

  public setCallbacks(cbs: Partial<NetworkCallbacks>) {
    this.callbacks = { ...this.callbacks, ...cbs };
  }

  public connect(roomId: string, player: { id: string; name: string; avatar: string }) {
    this.currentRoomId = roomId;
    this.currentPlayer = player;

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      this.send({
        type: 'JOIN_ROOM',
        roomId,
        playerId: player.id,
        playerName: player.name,
        playerAvatar: player.avatar,
      });
      return;
    }

    this.setStatus(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting');

    try {
      const wsUrl = this.getServerUrl();
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.setStatus('connected');
        if (this.currentRoomId && this.currentPlayer) {
          this.send({
            type: 'JOIN_ROOM',
            roomId: this.currentRoomId,
            playerId: this.currentPlayer.id,
            playerName: this.currentPlayer.name,
            playerAvatar: this.currentPlayer.avatar,
          });
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          switch (msg.type) {
            case 'SYNC_STATE':
              this.callbacks.onSyncState?.(msg.publicState, msg.yourHand, msg.yourPlayerId);
              break;
            case 'TOAST':
              this.callbacks.onToast?.(msg.text, msg.sound);
              break;
            case 'CHAT_MESSAGE':
              this.callbacks.onChat?.(msg.message);
              break;
            case 'REACTION':
              this.callbacks.onReaction?.(msg.event);
              break;
            case 'VOICE_SIGNAL':
              this.callbacks.onVoiceSignal?.(msg.senderId, msg.signal);
              break;
            case 'ERROR':
              this.callbacks.onError?.(msg.message);
              break;
            case 'KICKED':
              this.callbacks.onError?.(msg.message || 'You have been removed from the room.');
              this.disconnect();
              break;
          }
        } catch (e) {
          console.error('Failed to parse incoming WebSocket message', e);
        }
      };

      this.ws.onclose = () => {
        this.setStatus('disconnected');
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.warn('WebSocket connection error:', err);
      };
    } catch (err) {
      console.error('Failed to establish WebSocket connection:', err);
      this.setStatus('disconnected');
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (!this.currentRoomId || !this.currentPlayer) return;
    if (this.reconnectTimeout) return;

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 8000);

    this.setStatus('reconnecting');
    this.reconnectTimeout = window.setTimeout(() => {
      this.reconnectTimeout = null;
      if (this.currentRoomId && this.currentPlayer) {
        this.connect(this.currentRoomId, this.currentPlayer);
      }
    }, delay);
  }

  public disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.currentRoomId = null;
    this.currentPlayer = null;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('disconnected');
  }

  private setStatus(s: ConnectionStatus) {
    this.status = s;
    this.callbacks.onStatusChange?.(s);
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  private send(data: Record<string, unknown>) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  // Authoritative action calls
  public updateRules(roomId: string, playerId: string, rules: Partial<HouseRules>) {
    this.send({ type: 'UPDATE_RULES', roomId, playerId, rules });
  }

  public setReady(roomId: string, playerId: string, isReady: boolean) {
    this.send({ type: 'SET_READY', roomId, playerId, isReady });
  }

  public addBot(roomId: string, hostId: string) {
    this.send({ type: 'ADD_BOT', roomId, hostId });
  }

  public removePlayer(roomId: string, hostId: string, targetPlayerId: string) {
    this.send({ type: 'REMOVE_PLAYER', roomId, hostId, targetPlayerId });
  }

  public startGame(roomId: string, hostId: string) {
    this.send({ type: 'START_GAME', roomId, hostId });
  }

  public playCard(roomId: string, playerId: string, cardId: string, chosenColor?: CardColor, targetPlayerId?: string) {
    this.send({ type: 'PLAY_CARD', roomId, playerId, cardId, chosenColor, targetPlayerId });
  }

  public drawCard(roomId: string, playerId: string, targetCardIndex?: number) {
    this.send({ type: 'DRAW_CARD', roomId, playerId, targetCardIndex });
  }

  public passTurn(roomId: string, playerId: string) {
    this.send({ type: 'PASS_TURN', roomId, playerId });
  }

  public callUno(roomId: string, playerId: string) {
    this.send({ type: 'CALL_UNO', roomId, playerId });
  }

  public catchUno(roomId: string, callerId: string, targetPlayerId: string) {
    this.send({ type: 'CATCH_UNO', roomId, callerId, targetPlayerId });
  }

  public challengeWD4(roomId: string, challengerId: string, acceptChallenge: boolean) {
    this.send({ type: 'CHALLENGE_WD4', roomId, challengerId, acceptChallenge });
  }

  public resolveSeven(roomId: string, playerId: string, targetPlayerId: string) {
    this.send({ type: 'RESOLVE_SEVEN', roomId, playerId, targetPlayerId });
  }

  public resolveDare(roomId: string, targetPlayerId: string, acceptDare: boolean) {
    this.send({ type: 'RESOLVE_DARE', roomId, targetPlayerId, acceptDare });
  }

  public resolveTargetedDraw2(roomId: string, playedById: string, targetPlayerId: string) {
    this.send({ type: 'RESOLVE_TARGETED_DRAW2', roomId, playedById, targetPlayerId });
  }

  public sendChat(roomId: string, senderId: string, text: string) {
    this.send({ type: 'SEND_CHAT', roomId, senderId, text });
  }

  public sendReaction(roomId: string, senderId: string, emoji: string) {
    this.send({ type: 'SEND_REACTION', roomId, senderId, emoji });
  }

  public declareDeadlock(roomId: string, playerId: string) {
    this.send({ type: 'DECLARE_DEADLOCK', roomId, playerId });
  }

  public restartGame(roomId: string, hostId: string) {
    this.send({ type: 'RESTART_GAME', roomId, hostId });
  }

  public sendVoiceSignal(roomId: string, senderId: string, targetId: string, signal: unknown) {
    this.send({ type: 'VOICE_SIGNAL', roomId, senderId, targetId, signal });
  }
}

export const networkManager = new NetworkManager();
