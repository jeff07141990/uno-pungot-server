import { networkManager } from './networkManager';

export interface VoicePeer {
  playerId: string;
  pc: RTCPeerConnection;
  audioElement?: HTMLAudioElement;
  stream?: MediaStream;
}

export type VoiceStateListener = (speakingPlayers: Set<string>, isMuted: boolean, isConnected: boolean) => void;

class VoiceManager {
  private localStream: MediaStream | null = null;
  private peers: Map<string, VoicePeer> = new Map();
  private roomId: string | null = null;
  private myPlayerId: string | null = null;
  private isMuted: boolean = true; // Muted by default for safety
  private isInitialized: boolean = false;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private speakingPlayers: Set<string> = new Set();
  private remoteAnalysers: Map<string, AnalyserNode> = new Map();
  private listeners: Set<VoiceStateListener> = new Set();
  private animationFrameId: number | null = null;

  private rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ],
  };

  constructor() {
    // Listen to signaling messages from networkManager
    networkManager.setCallbacks({
      onVoiceSignal: (senderId: string, signal: unknown) => {
        this.handleRemoteSignal(senderId, signal);
      },
    });
  }

  public subscribe(listener: VoiceStateListener): () => void {
    this.listeners.add(listener);
    listener(new Set(this.speakingPlayers), this.isMuted, this.isInitialized);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((cb) => cb(new Set(this.speakingPlayers), this.isMuted, this.isInitialized));
  }

  /**
   * Initialize voice chat for a given room and player
   */
  public async init(roomId: string, playerId: string): Promise<boolean> {
    if (this.isInitialized && this.roomId === roomId && this.myPlayerId === playerId) {
      return true;
    }

    this.leaveRoom();
    this.roomId = roomId;
    this.myPlayerId = playerId;

    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        console.warn('getUserMedia not supported in this environment');
        return false;
      }

      // Request microphone access
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      // Mute microphone by default
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !this.isMuted;
      });

      // Setup Web Audio Analyser for local speech detection
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
        const source = this.audioContext.createMediaStreamSource(this.localStream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        source.connect(this.analyser);
      }

      this.isInitialized = true;
      this.startVoiceVolumeLoop();
      this.notify();
      return true;
    } catch (err) {
      console.warn('Microphone permission denied or audio device not found:', err);
      this.isInitialized = false;
      this.notify();
      return false;
    }
  }

  /**
   * Connect with other human players in the room
   */
  public syncPlayers(playerIds: string[]) {
    if (!this.roomId || !this.myPlayerId) return;

    // Remove peers that have left the room
    const currentActiveIds = new Set(playerIds.filter((id) => id !== this.myPlayerId));
    for (const [id, peer] of this.peers.entries()) {
      if (!currentActiveIds.has(id)) {
        this.cleanupPeer(id);
      }
    }

    // Connect to new players: initiate offer if our ID is alphabetically higher (to prevent duel-offers)
    for (const targetId of currentActiveIds) {
      if (!this.peers.has(targetId)) {
        if (this.myPlayerId > targetId) {
          this.initiatePeerConnection(targetId, true);
        }
      }
    }
  }

  private createPeerConnection(targetId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection(this.rtcConfig);

    // Add local audio tracks if available
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // Send ICE candidates to the other player
    pc.onicecandidate = (event) => {
      if (event.candidate && this.roomId && this.myPlayerId) {
        networkManager.sendVoiceSignal(this.roomId, this.myPlayerId, targetId, {
          type: 'candidate',
          candidate: event.candidate,
        });
      }
    };

    // Receive remote audio track
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteStream) {
        const audio = new Audio();
        audio.srcObject = remoteStream;
        audio.autoplay = true;
        audio.play().catch(() => {});

        const peer = this.peers.get(targetId);
        if (peer) {
          peer.audioElement = audio;
          peer.stream = remoteStream;
        }

        // Setup remote analyser to detect when targetId is speaking
        this.setupRemoteAnalyser(targetId, remoteStream);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected' || pc.connectionState === 'closed') {
        this.cleanupPeer(targetId);
      }
    };

    return pc;
  }

  private async initiatePeerConnection(targetId: string, isInitiator: boolean) {
    if (!this.roomId || !this.myPlayerId) return;

    const pc = this.createPeerConnection(targetId);
    this.peers.set(targetId, { playerId: targetId, pc });

    if (isInitiator) {
      try {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
        });
        await pc.setLocalDescription(offer);

        networkManager.sendVoiceSignal(this.roomId, this.myPlayerId, targetId, {
          type: 'offer',
          sdp: offer,
        });
      } catch (err) {
        console.warn('Failed to create WebRTC offer:', err);
      }
    }
  }

  private async handleRemoteSignal(senderId: string, signal: unknown) {
    if (!signal || typeof signal !== 'object' || !this.roomId || !this.myPlayerId) return;
    const payload = signal as { type?: string; sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit };

    let peer = this.peers.get(senderId);

    if (payload.type === 'offer' && payload.sdp) {
      if (!peer) {
        const pc = this.createPeerConnection(senderId);
        peer = { playerId: senderId, pc };
        this.peers.set(senderId, peer);
      }
      try {
        await peer.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        const answer = await peer.pc.createAnswer();
        await peer.pc.setLocalDescription(answer);

        networkManager.sendVoiceSignal(this.roomId, this.myPlayerId, senderId, {
          type: 'answer',
          sdp: answer,
        });
      } catch (err) {
        console.warn('Failed handling WebRTC offer:', err);
      }
    } else if (payload.type === 'answer' && payload.sdp) {
      if (peer) {
        try {
          await peer.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        } catch (err) {
          console.warn('Failed setting remote description for answer:', err);
        }
      }
    } else if (payload.type === 'candidate' && payload.candidate) {
      if (peer) {
        try {
          await peer.pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } catch (err) {
          console.warn('Failed adding ICE candidate:', err);
        }
      }
    }
  }

  private setupRemoteAnalyser(playerId: string, stream: MediaStream) {
    try {
      if (!this.audioContext) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) this.audioContext = new AudioCtx();
      }
      if (this.audioContext && stream.getAudioTracks().length > 0) {
        const source = this.audioContext.createMediaStreamSource(stream);
        const analyser = this.audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        this.remoteAnalysers.set(playerId, analyser);
      }
    } catch (e) {
      // AudioContext policy fallback
    }
  }

  private cleanupPeer(playerId: string) {
    const peer = this.peers.get(playerId);
    if (peer) {
      try {
        peer.pc.close();
        if (peer.audioElement) {
          peer.audioElement.pause();
          peer.audioElement.srcObject = null;
        }
      } catch (e) {}
      this.peers.delete(playerId);
    }
    this.remoteAnalysers.delete(playerId);
    this.speakingPlayers.delete(playerId);
    this.notify();
  }

  private startVoiceVolumeLoop() {
    if (this.animationFrameId) return;

    const dataArray = new Uint8Array(128);

    const checkVolume = () => {
      let stateChanged = false;

      // Check local player speaking
      if (this.analyser && !this.isMuted && this.myPlayerId) {
        this.analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((acc, v) => acc + v, 0) / dataArray.length;
        const isSpeaking = avg > 20;

        if (isSpeaking && !this.speakingPlayers.has(this.myPlayerId)) {
          this.speakingPlayers.add(this.myPlayerId);
          stateChanged = true;
        } else if (!isSpeaking && this.speakingPlayers.has(this.myPlayerId)) {
          this.speakingPlayers.delete(this.myPlayerId);
          stateChanged = true;
        }
      } else if (this.myPlayerId && this.speakingPlayers.has(this.myPlayerId)) {
        this.speakingPlayers.delete(this.myPlayerId);
        stateChanged = true;
      }

      // Check remote players speaking
      for (const [playerId, analyser] of this.remoteAnalysers.entries()) {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((acc, v) => acc + v, 0) / dataArray.length;
        const isSpeaking = avg > 22;

        if (isSpeaking && !this.speakingPlayers.has(playerId)) {
          this.speakingPlayers.add(playerId);
          stateChanged = true;
        } else if (!isSpeaking && this.speakingPlayers.has(playerId)) {
          this.speakingPlayers.delete(playerId);
          stateChanged = true;
        }
      }

      if (stateChanged) {
        this.notify();
      }

      this.animationFrameId = requestAnimationFrame(checkVolume);
    };

    this.animationFrameId = requestAnimationFrame(checkVolume);
  }

  /**
   * Toggle microphone state (Mute / Unmute)
   */
  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
    if (this.audioContext && this.audioContext.state === 'suspended' && !muted) {
      this.audioContext.resume().catch(() => {});
    }
    if (muted && this.myPlayerId) {
      this.speakingPlayers.delete(this.myPlayerId);
    }
    this.notify();
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getIsInitialized(): boolean {
    return this.isInitialized;
  }

  public isPlayerSpeaking(playerId: string): boolean {
    return this.speakingPlayers.has(playerId);
  }

  public leaveRoom() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    for (const id of Array.from(this.peers.keys())) {
      this.cleanupPeer(id);
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.analyser = null;
    this.remoteAnalysers.clear();
    this.speakingPlayers.clear();
    this.roomId = null;
    this.myPlayerId = null;
    this.isInitialized = false;
    this.notify();
  }
}

export const voiceManager = new VoiceManager();
