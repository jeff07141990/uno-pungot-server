import { SoundEffectType } from '../engine/types';

class SoundManager {
  private ctx: AudioContext | null = null;
  private volume: number = 0.7;
  private isMuted: boolean = false;

  constructor() {
    // Lazy initialize AudioContext on first user interaction
    const savedMute = localStorage.getItem('uno_muted');
    if (savedMute !== null) {
      this.isMuted = savedMute === 'true';
    }
    const savedVol = localStorage.getItem('uno_volume');
    if (savedVol !== null) {
      this.volume = parseFloat(savedVol);
    }
  }

  private initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    localStorage.setItem('uno_volume', this.volume.toString());
  }

  public getVolume(): number {
    return this.volume;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    localStorage.setItem('uno_muted', muted.toString());
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public play(type: SoundEffectType) {
    if (this.isMuted || this.volume <= 0) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      switch (type) {
        case 'card_play':
          this.playCardPlay(ctx);
          break;
        case 'card_draw':
          this.playCardDraw(ctx);
          break;
        case 'card_deal':
          this.playCardDeal(ctx);
          break;
        case 'turn_alert':
          this.playTurnAlert(ctx);
          break;
        case 'uno_call':
          this.playUnoCall(ctx);
          break;
        case 'uno_penalty':
          this.playUnoPenalty(ctx);
          break;
        case 'game_win':
          this.playGameWin(ctx);
          break;
        case 'error':
          this.playError(ctx);
          break;
        case 'timer_tick':
          this.playTimerTick(ctx);
          break;
        case 'reverse':
        case 'skip':
          this.playWhoosh(ctx);
          break;
        case 'shuffle':
          this.playShuffle(ctx);
          break;
        case 'power_skip':
          this.playPowerSkip(ctx);
          break;
        case 'power_reverse':
          this.playPowerReverse(ctx);
          break;
        case 'power_draw2':
          this.playPowerDraw2(ctx);
          break;
        case 'power_wild4':
        case 'power_draw5':
          this.playPowerWild4(ctx);
          break;
        case 'power_wild':
          this.playPowerWild(ctx);
          break;
        case 'power_flip':
          this.playPowerFlip(ctx);
          break;
        case 'power_general':
        case 'flip':
        case 'dare':
          this.playPowerGeneral(ctx);
          break;
      }
    } catch (e) {
      console.warn('Audio playback error', e);
    }
  }

  // --- POWER CARDS SOUND EFFECTS (Synthesized Web Audio) ---

  // 1. SKIP: Sharp buzzer whistle & freeze whip
  private playPowerSkip(ctx: AudioContext) {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(650, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.22);

    gain.gain.setValueAtTime(0.4 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  // 2. REVERSE: Double resonant swish with pitch spin
  private playPowerReverse(ctx: AudioContext) {
    const now = ctx.currentTime;
    [0, 0.09].forEach((delay, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + delay;

      osc.type = 'sine';
      if (idx === 0) {
        osc.frequency.setValueAtTime(260, t);
        osc.frequency.exponentialRampToValueAtTime(800, t + 0.14);
      } else {
        osc.frequency.setValueAtTime(750, t);
        osc.frequency.exponentialRampToValueAtTime(320, t + 0.16);
      }

      gain.gain.setValueAtTime(0.35 * this.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.16);
    });
  }

  // 3. DRAW 2: Double punchy impact boom
  private playPowerDraw2(ctx: AudioContext) {
    const now = ctx.currentTime;
    [0, 0.11].forEach((delay) => {
      const t = now + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(240, t);
      osc.frequency.exponentialRampToValueAtTime(60, t + 0.12);

      gain.gain.setValueAtTime(0.45 * this.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.12);
    });
  }

  // 4. WILD DRAW 4 / MEGA DRAW 5: Dramatic bass drop & power surge
  private playPowerWild4(ctx: AudioContext) {
    const now = ctx.currentTime;
    // Sub-bass heavy drop
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sawtooth';
    subOsc.frequency.setValueAtTime(300, now);
    subOsc.frequency.exponentialRampToValueAtTime(45, now + 0.45);

    subGain.gain.setValueAtTime(0.5 * this.volume, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.45);

    // High sparkling chromatic arpeggio (C5 -> E5 -> G5 -> C6)
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + idx * 0.06;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.35 * this.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  }

  // 5. WILD: Magical color chime shimmer
  private playPowerWild(ctx: AudioContext) {
    const now = ctx.currentTime;
    const freqs = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + idx * 0.05;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.32 * this.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.25);
    });
  }

  // 6. FLIP: Metallic dimensional deck rotation swoosh
  private playPowerFlip(ctx: AudioContext) {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.18);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.35);

    gain.gain.setValueAtTime(0.35 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  // 7. GENERAL POWER CARD: Energetic cosmic pop
  private playPowerGeneral(ctx: AudioContext) {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(350, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.16);

    gain.gain.setValueAtTime(0.35 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  private playCardPlay(_ctx: AudioContext) {
    // Card lay down sound muted per user request
  }

  private playCardDraw(ctx: AudioContext) {
    const bufferSize = ctx.sampleRate * 0.1;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, ctx.currentTime);
    filter.frequency.linearRampToValueAtTime(1400, ctx.currentTime + 0.1);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2 * this.volume, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.1);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start();
  }

  private playCardDeal(ctx: AudioContext) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);

    gain.gain.setValueAtTime(0.25 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  private playTurnAlert(ctx: AudioContext) {
    const now = ctx.currentTime;
    const notes = [523.25, 659.25]; // C5, E5

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + idx * 0.08;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.35 * this.volume, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.25);
    });
  }

  private playUnoCall(ctx: AudioContext) {
    const now = ctx.currentTime;

    // 1. Browser Speech Synthesis vocal shout "UNO!"
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance('UNO!');
        utterance.volume = Math.min(1, this.volume * 1.5);
        utterance.rate = 1.35;
        utterance.pitch = 1.45;
        utterance.lang = 'en-US';

        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          const pref = voices.find(
            (v) =>
              v.lang.startsWith('en') &&
              (v.name.includes('Natural') ||
                v.name.includes('Google') ||
                v.name.includes('David') ||
                v.name.includes('Zira') ||
                v.name.includes('Samantha'))
          );
          if (pref) utterance.voice = pref;
        }

        window.speechSynthesis.speak(utterance);
      } catch (e) {
        // Fallback to Web Audio synthesis
      }
    }

    // 2. Web Audio Formant Synthesizer shouting "OO-NO!"
    // Vocal Source Oscillator (modulating pitch from 340Hz -> 480Hz -> 300Hz)
    const vocalOsc = ctx.createOscillator();
    const vocalGain = ctx.createGain();
    vocalOsc.type = 'sawtooth';

    vocalOsc.frequency.setValueAtTime(340, now);
    vocalOsc.frequency.exponentialRampToValueAtTime(480, now + 0.1);
    vocalOsc.frequency.exponentialRampToValueAtTime(300, now + 0.38);

    // Formant 1: Vowel transition from "OO" (320Hz) to "NO/OH" (580Hz)
    const f1 = ctx.createBiquadFilter();
    f1.type = 'bandpass';
    f1.Q.value = 6;
    f1.frequency.setValueAtTime(320, now);
    f1.frequency.exponentialRampToValueAtTime(580, now + 0.12);

    // Formant 2: Vowel transition from "OO" (850Hz) to "NO/OH" (1150Hz)
    const f2 = ctx.createBiquadFilter();
    f2.type = 'bandpass';
    f2.Q.value = 7;
    f2.frequency.setValueAtTime(850, now);
    f2.frequency.exponentialRampToValueAtTime(1150, now + 0.12);

    vocalGain.gain.setValueAtTime(0.55 * this.volume, now);
    vocalGain.gain.setValueAtTime(0.65 * this.volume, now + 0.1);
    vocalGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    vocalOsc.connect(f1);
    vocalOsc.connect(f2);
    f1.connect(vocalGain);
    f2.connect(vocalGain);
    vocalGain.connect(ctx.destination);

    vocalOsc.start(now);
    vocalOsc.stop(now + 0.4);

    // 3. Energetic fanfare punch chord (C5, G5, C6)
    const fanfareNotes = [523.25, 783.99, 1046.5];
    fanfareNotes.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.35 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.45);
    });
  }

  private playUnoPenalty(ctx: AudioContext) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.linearRampToValueAtTime(90, now + 0.3);

    gain.gain.setValueAtTime(0.4 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  private playGameWin(ctx: AudioContext) {
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + idx * 0.12;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.45 * this.volume, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.6);
    });
  }

  private playError(ctx: AudioContext) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);

    gain.gain.setValueAtTime(0.3 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  private playTimerTick(ctx: AudioContext) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);

    gain.gain.setValueAtTime(0.15 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  }

  private playWhoosh(ctx: AudioContext) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(250, now);
    osc.frequency.exponentialRampToValueAtTime(700, now + 0.15);

    gain.gain.setValueAtTime(0.3 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  private playShuffle(ctx: AudioContext) {
    const now = ctx.currentTime;

    // 1. Initial cut & split whoosh (cards sliding apart into two stacks)
    try {
      const splitLen = Math.floor(ctx.sampleRate * 0.16);
      const splitBuf = ctx.createBuffer(1, splitLen, ctx.sampleRate);
      const splitData = splitBuf.getChannelData(0);
      for (let j = 0; j < splitLen; j++) splitData[j] = Math.random() * 2 - 1;
      const splitNoise = ctx.createBufferSource();
      splitNoise.buffer = splitBuf;

      const splitFilter = ctx.createBiquadFilter();
      splitFilter.type = 'bandpass';
      splitFilter.frequency.setValueAtTime(800, now + 0.03);
      splitFilter.frequency.exponentialRampToValueAtTime(1600, now + 0.18);
      splitFilter.Q.setValueAtTime(2.0, now + 0.03);

      const splitGain = ctx.createGain();
      splitGain.gain.setValueAtTime(0.22 * this.volume, now + 0.03);
      splitGain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);

      splitNoise.connect(splitFilter);
      splitFilter.connect(splitGain);
      splitGain.connect(ctx.destination);
      splitNoise.start(now + 0.03);
      splitNoise.stop(now + 0.19);
    } catch {
      // Audio fallback
    }

    // 2. Interleaving riffle clicks (cards thumbed and interleaving in rapid succession)
    const cardClicks = 18;
    const startClickTime = now + 0.28;
    const clickDuration = 0.62;
    const clickInterval = clickDuration / cardClicks;

    for (let i = 0; i < cardClicks; i++) {
      const clickTime = startClickTime + i * clickInterval + (Math.random() * 0.006 - 0.003);
      const bufferSize = Math.floor(ctx.sampleRate * 0.022);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let j = 0; j < bufferSize; j++) {
        data[j] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      // Alternate frequencies slightly to simulate left and right thumb clicks
      const baseFreq = i % 2 === 0 ? 1750 : 1350;
      filter.frequency.setValueAtTime(baseFreq + Math.random() * 300, clickTime);
      filter.Q.setValueAtTime(3.8, clickTime);

      const gain = ctx.createGain();
      const progress = i / cardClicks;
      const clickVol = (0.22 + 0.38 * Math.sin(progress * Math.PI)) * this.volume;
      gain.gain.setValueAtTime(clickVol, clickTime);
      gain.gain.exponentialRampToValueAtTime(0.001, clickTime + 0.022);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(clickTime);
      noise.stop(clickTime + 0.022);
    }

    // 3. Waterfall bridge sweep (cards cascading together from the arch into a flat stack)
    const bridgeTime = now + 0.96;
    const bridgeDuration = 0.34;
    try {
      const bridgeLen = Math.floor(ctx.sampleRate * bridgeDuration);
      const bridgeBuffer = ctx.createBuffer(1, bridgeLen, ctx.sampleRate);
      const bridgeData = bridgeBuffer.getChannelData(0);
      for (let j = 0; j < bridgeData.length; j++) {
        bridgeData[j] = Math.random() * 2 - 1;
      }
      const bridgeNoise = ctx.createBufferSource();
      bridgeNoise.buffer = bridgeBuffer;

      const bridgeFilter = ctx.createBiquadFilter();
      bridgeFilter.type = 'bandpass';
      bridgeFilter.frequency.setValueAtTime(2200, bridgeTime);
      bridgeFilter.frequency.exponentialRampToValueAtTime(450, bridgeTime + bridgeDuration);
      bridgeFilter.Q.setValueAtTime(2.4, bridgeTime);

      const bridgeGain = ctx.createGain();
      bridgeGain.gain.setValueAtTime(0.38 * this.volume, bridgeTime);
      bridgeGain.gain.exponentialRampToValueAtTime(0.001, bridgeTime + bridgeDuration);

      bridgeNoise.connect(bridgeFilter);
      bridgeFilter.connect(bridgeGain);
      bridgeGain.connect(ctx.destination);

      bridgeNoise.start(bridgeTime);
      bridgeNoise.stop(bridgeTime + bridgeDuration);
    } catch {
      // Audio fallback
    }

    // 4. Solid table tap impact (cards squared up and tapped firmly on the felt table)
    const tapTime = now + 1.40;
    try {
      // Low thud
      const tapOsc = ctx.createOscillator();
      const tapGain = ctx.createGain();
      tapOsc.type = 'triangle';
      tapOsc.frequency.setValueAtTime(180, tapTime);
      tapOsc.frequency.exponentialRampToValueAtTime(55, tapTime + 0.09);

      tapGain.gain.setValueAtTime(0.4 * this.volume, tapTime);
      tapGain.gain.exponentialRampToValueAtTime(0.001, tapTime + 0.09);

      tapOsc.connect(tapGain);
      tapGain.connect(ctx.destination);
      tapOsc.start(tapTime);
      tapOsc.stop(tapTime + 0.09);

      // Card slap click
      const slapBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.03), ctx.sampleRate);
      const slapData = slapBuf.getChannelData(0);
      for (let j = 0; j < slapData.length; j++) slapData[j] = Math.random() * 2 - 1;
      const slapNoise = ctx.createBufferSource();
      slapNoise.buffer = slapBuf;

      const slapFilter = ctx.createBiquadFilter();
      slapFilter.type = 'highpass';
      slapFilter.frequency.setValueAtTime(1400, tapTime);

      const slapGain = ctx.createGain();
      slapGain.gain.setValueAtTime(0.28 * this.volume, tapTime);
      slapGain.gain.exponentialRampToValueAtTime(0.001, tapTime + 0.03);

      slapNoise.connect(slapFilter);
      slapFilter.connect(slapGain);
      slapGain.connect(ctx.destination);
      slapNoise.start(tapTime);
      slapNoise.stop(tapTime + 0.03);
    } catch {
      // Audio fallback
    }
  }
}

export const soundManager = new SoundManager();
