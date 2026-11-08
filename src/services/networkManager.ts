import { Card, CardColor, ChatMessage, GameVariant, HouseRules, PowerUpId, PublicGameState, ReactionEvent, SoundEffectType } from '../engine/types';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'reconnecting';

export interface NetworkCallbacks {
  onSyncState: (publicState: PublicGameState, yourHand: Card[], yourPlayerId: string) => void;
  onToast: (text: string, sound?: SoundEffectType) => void;
  onChat: (msg: ChatMessage) => void;
  onReaction: (event: ReactionEvent) => void;
  onError: (msg: string) => void;
  onStatusChange: (status: ConnectionStatus) => void;
  onVoiceSignal: (senderId: string, signal: unknown) => void;
  onUnoShout: (playerId: string, playerName: string) => void;
  onPeekResult?: (targetPlayerName: string, card: Card) => void;
  onWalletUpdate?: (wallet: any, levelUp?: any, xpGained?: number) => void;
}

class NetworkManager {
  private ws: WebSocket | null = null;
  private status: ConnectionStatus = 'disconnected';
  private callbacks: Partial<NetworkCallbacks> = {};
  private currentRoomId: string | null = null;
  private currentPlayer: { id: string; name: string; avatar: string } | null = null;
  private reconnectAttempts = 0;
  private reconnectTimeout: number | null = null;
  private heartbeatInterval: number | null = null;
  private isSpectator = false;

  constructor() {
    if (typeof window !== 'undefined') {
      // Reconnect immediately when user returns to app (e.g., from switching apps/unlocking screen)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.currentRoomId && this.currentPlayer) {
          if (!this.ws || this.ws.readyState === WebSocket.CLOSED || this.ws.readyState === WebSocket.CLOSING) {
            console.log('App returned to foreground, reconnecting WebSocket...');
            if (this.reconnectTimeout) {
              clearTimeout(this.reconnectTimeout);
              this.reconnectTimeout = null;
            }
            this.reconnectAttempts = 0;
            this.connect(this.currentRoomId, this.currentPlayer, this.isSpectator);
          }
        }
      });

      // Also listen to online event
      window.addEventListener('online', () => {
        if (this.currentRoomId && this.currentPlayer) {
          if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.log('Network back online, reconnecting...');
            this.reconnectAttempts = 0;
            this.connect(this.currentRoomId, this.currentPlayer, this.isSpectator);
          }
        }
      });
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    // Send keepalive ping every 10 seconds to prevent mobile sleep & telco NAT drop
    this.heartbeatInterval = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'PING' });
      }
    }, 10000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private getCustomServer(): string | null {
    if (typeof window === 'undefined') return null;
    const custom = localStorage.getItem('uno_custom_server');
    if (custom) {
      return custom.trim().replace(/\/$/, '');
    }
    return null;
  }

  private detectedWorkingHost: string | null = null;

  public getCandidateHosts(): string[] {
    const list: string[] = [];
    const custom = this.getCustomServer();
    if (custom) list.push(custom);

    // If currently running in a browser, prioritize same-origin or localhost:3001 immediately
    if (typeof window !== 'undefined') {
      const { hostname, protocol } = window.location;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        list.push(`http://${hostname}:3001`);
      } else if (hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
        list.push(`http://${hostname}:3001`);
      }
    }

    if (this.detectedWorkingHost) list.push(this.detectedWorkingHost);

    // Common local network addresses
    list.push('http://localhost:3001');
    list.push('http://192.168.1.80:3001');
    list.push('http://192.168.1.2:3001');

    // Cloud production server as backup
    list.push('https://uno-pungot-server.onrender.com');

    return Array.from(new Set(list));
  }

  public setWorkingHost(host: string) {
    this.detectedWorkingHost = host.trim().replace(/\/$/, '');
    if (typeof window !== 'undefined') {
      localStorage.setItem('uno_active_server', this.detectedWorkingHost);
    }
  }

  private getServerUrl(): string {
    const customServer = this.getCustomServer();
    if (customServer) {
      return customServer.replace(/^http/, 'ws');
    }
    if (this.detectedWorkingHost) {
      return this.detectedWorkingHost.replace(/^http/, 'ws');
    }
    if (typeof window !== 'undefined') {
      const active = localStorage.getItem('uno_active_server');
      if (active) return active.replace(/^http/, 'ws');
    }
    if (import.meta.env.VITE_SERVER_URL) {
      const url = import.meta.env.VITE_SERVER_URL;
      return url.replace(/^http/, 'ws');
    }
    if (typeof window !== 'undefined') {
      const { hostname, protocol } = window.location;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        const isCapacitor = (window as any).Capacitor !== undefined || !window.location.port;
        if (isCapacitor) {
          return 'wss://uno-pungot-server.onrender.com';
        }
        const wsProto = protocol === 'https:' ? 'wss:' : 'ws:';
        return `${wsProto}//${hostname}:3001`;
      }
      if (hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
        const wsProto = protocol === 'https:' ? 'wss:' : 'ws:';
        return `${wsProto}//${hostname}:3001`;
      }
    }
    return 'wss://uno-pungot-server.onrender.com';
  }

  public getHttpApiUrl(): string {
    const customServer = this.getCustomServer();
    if (customServer) {
      return customServer;
    }
    if (this.detectedWorkingHost) {
      return this.detectedWorkingHost;
    }
    if (typeof window !== 'undefined') {
      const active = localStorage.getItem('uno_active_server');
      if (active) return active;
    }
    if (import.meta.env.VITE_SERVER_URL) {
      return import.meta.env.VITE_SERVER_URL;
    }
    if (typeof window !== 'undefined') {
      const { hostname, protocol } = window.location;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        const isCapacitor = (window as any).Capacitor !== undefined || !window.location.port;
        if (isCapacitor) {
          return 'https://uno-pungot-server.onrender.com';
        }
        return `${protocol}//${hostname}:3001`;
      }
      if (hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
        return `${protocol}//${hostname}:3001`;
      }
    }
    return 'https://uno-pungot-server.onrender.com';
  }

  private voiceSignalListeners: Set<(senderId: string, signal: unknown) => void> = new Set();

  public onVoiceSignal(listener: (senderId: string, signal: unknown) => void): () => void {
    this.voiceSignalListeners.add(listener);
    return () => this.voiceSignalListeners.delete(listener);
  }

  public setCallbacks(cbs: Partial<NetworkCallbacks>) {
    this.callbacks = { ...this.callbacks, ...cbs };
  }

  public connect(roomId: string, player: { id: string; name: string; avatar: string }, asSpectator = false) {
    this.currentRoomId = roomId;
    this.currentPlayer = player;
    this.isSpectator = asSpectator;

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      this.send({
        type: 'JOIN_ROOM',
        roomId,
        playerId: player.id,
        playerName: player.name,
        playerAvatar: player.avatar,
        asSpectator: this.isSpectator,
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
        this.startHeartbeat();
        if (this.currentRoomId && this.currentPlayer) {
          this.send({
            type: 'JOIN_ROOM',
            roomId: this.currentRoomId,
            playerId: this.currentPlayer.id,
            playerName: this.currentPlayer.name,
            playerAvatar: this.currentPlayer.avatar,
            asSpectator: this.isSpectator,
          });
        }

        // Flush any buffered messages
        while (this.pendingQueue.length > 0) {
          const item = this.pendingQueue.shift();
          if (item && this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(item));
          }
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          switch (msg.type) {
            case 'PONG':
              // Heartbeat acknowledged by server
              break;
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
              this.voiceSignalListeners.forEach((fn) => {
                try {
                  fn(msg.senderId, msg.signal);
                } catch (e) {
                  console.warn('Error in voiceSignalListener:', e);
                }
              });
              break;
            case 'UNO_SHOUT':
              this.callbacks.onUnoShout?.(msg.playerId, msg.playerName);
              break;
            case 'PEEK_RESULT':
              this.callbacks.onPeekResult?.(msg.targetPlayerName, msg.card);
              break;
            case 'WALLET_UPDATE':
              this.callbacks.onWalletUpdate?.(msg.wallet, msg.levelUp, msg.xpGained);
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
        this.stopHeartbeat();
        this.setStatus('disconnected');
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.warn('WebSocket connection error:', err);
      };
    } catch (err) {
      console.error('Failed to establish WebSocket connection:', err);
      this.stopHeartbeat();
      this.setStatus('disconnected');
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (!this.currentRoomId || !this.currentPlayer) return;
    if (this.reconnectTimeout) return;

    this.reconnectAttempts++;
    // Aggressive retry for mobile & weak networks: max 4s backoff so players reconnect promptly
    const delay = Math.min(1000 * Math.pow(1.3, this.reconnectAttempts), 4000);

    this.setStatus('reconnecting');
    this.reconnectTimeout = window.setTimeout(() => {
      this.reconnectTimeout = null;
      if (this.currentRoomId && this.currentPlayer) {
        this.connect(this.currentRoomId, this.currentPlayer, this.isSpectator);
      }
    }, delay);
  }

  public disconnect() {
    this.stopHeartbeat();
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

  private pendingQueue: Record<string, unknown>[] = [];

  private send(data: Record<string, unknown>) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      // Buffer outgoing action until socket connects
      this.pendingQueue.push(data);
    }
  }

  // Authoritative action calls
  public updateRules(roomId: string, playerId: string, rules: Partial<HouseRules>, variant?: GameVariant) {
    this.send({ type: 'UPDATE_RULES', roomId, playerId, rules, variant });
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

  public confirmEntryPayment(roomId: string, playerId: string) {
    this.send({ type: 'CONFIRM_ENTRY_PAYMENT', roomId, playerId });
  }

  public updateEntryFee(roomId: string, hostId: string, entryFee: number) {
    this.send({ type: 'UPDATE_ENTRY_FEE', roomId, hostId, entryFee });
  }

  public usePowerUp(
    roomId: string,
    playerId: string,
    powerUpId: PowerUpId,
    targetPlayerId?: string,
    chosenColor?: CardColor
  ) {
    this.send({
      type: 'USE_POWERUP',
      roomId,
      playerId,
      powerUpId,
      targetPlayerId,
      chosenColor,
    });
  }

  public spawnPowerUpCard(roomId: string, playerId: string, powerUpId: PowerUpId) {
    this.send({
      type: 'SPAWN_POWERUP_CARD',
      roomId,
      playerId,
      powerUpId,
    });
  }
}

export const networkManager = new NetworkManager();
