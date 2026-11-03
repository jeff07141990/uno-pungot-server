import React, { useEffect, useState, useMemo } from 'react';
import { Crown, Volume2, VolumeX, Shield, Trophy, Coins } from 'lucide-react';
import { PlayerWallet, PublicGameState, PublicPlayer } from '../engine/types';
import { soundManager } from '../audio/soundManager';

interface VsTransitionScreenProps {
  gameState: PublicGameState;
  currentUserId: string;
  wallet?: PlayerWallet | null;
  onFinish: () => void;
}

const AvatarDisplay: React.FC<{ avatar?: string; className?: string }> = ({
  avatar = '🐼',
  className = '',
}) => {
  if (avatar && avatar.startsWith('data:image')) {
    return (
      <img
        src={avatar}
        alt="avatar"
        className={`w-full h-full object-cover rounded-full ${className}`}
      />
    );
  }
  return <span>{avatar}</span>;
};

export const VsTransitionScreen: React.FC<VsTransitionScreenProps> = ({
  gameState,
  currentUserId,
  wallet,
  onFinish,
}) => {
  const [animStage, setAnimStage] = useState<
    'background' | 'cards_vs' | 'players' | 'settings' | 'countdown' | 'start' | 'exiting'
  >('cards_vs');
  const [countdownNum, setCountdownNum] = useState<number | 'START'>(5);
  const [isMuted, setIsMuted] = useState<boolean>(() => soundManager.getMuted());
  const videoRef = React.useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
      videoRef.current.volume = isMuted ? 0 : 0.85;
      if (!isMuted) {
        videoRef.current.play().catch(() => {});
      }
    }
  }, [isMuted]);

  const players = gameState.players;
  const isFeeMatch = (gameState.entryFee ?? 0) > 0;
  const entryFee = gameState.entryFee ?? 0;
  const prizePool = gameState.prizePool ?? entryFee * 5;

  const modeName = useMemo(() => {
    switch (gameState.variant) {
      case 'all_wild':
        return 'All Wild Mode';
      case 'flip':
        return 'Flip Mode';
      case 'dare':
        return 'Dare Mode';
      case 'classic':
      default:
        return 'Classic Mode';
    }
  }, [gameState.variant]);

  // Dynamically split players into Left Wing (Blue) and Right Wing (Red)
  // Ensure current user is on Left Wing
  const { leftPlayers, rightPlayers } = useMemo(() => {
    const me = players.find((p) => p.id === currentUserId) || players[0];
    const others = players.filter((p) => p.id !== me.id);

    const leftTotal = Math.ceil(players.length / 2);
    const left: PublicPlayer[] = [me, ...others.slice(0, Math.max(0, leftTotal - 1))];
    const right: PublicPlayer[] = others.slice(Math.max(0, leftTotal - 1));

    return { leftPlayers: left, rightPlayers: right };
  }, [players, currentUserId]);

  const toggleSound = () => {
    const nextMuted = soundManager.toggleMute();
    setIsMuted(nextMuted);
  };

  // Dynamic scale & layout adjustments for 2-10 players
  const totalCount = players.length;
  const isHighCount = totalCount >= 6;
  const isTenPlayers = totalCount >= 8;

  // Adaptive avatar ring sizes tuned for even spacing without collision
  const avatarSizeClass = isTenPlayers
    ? 'w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20'
    : isHighCount
    ? 'w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24'
    : 'w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28';

  const avatarTextSize = isTenPlayers
    ? 'text-xl sm:text-2xl'
    : isHighCount
    ? 'text-2xl sm:text-3xl'
    : 'text-3xl sm:text-4xl';

  // Even, balanced alternating offsets for Left and Right Wings with consistent breathing room
  const getLeftArcPosition = (idx: number, count: number) => {
    if (count <= 1) return '';
    if (count === 2) {
      return idx === 0 ? '-translate-y-2 translate-x-2' : 'translate-y-2 -translate-x-2';
    }
    // Staggered alternate positioning with balanced, even offsets (X & Y)
    const arc = [
      '-translate-x-3 sm:-translate-x-5 -translate-y-1',
      'translate-x-3 sm:translate-x-5 translate-y-1',
      '-translate-x-2 sm:-translate-x-4 translate-y-2',
      'translate-x-2 sm:translate-x-4 -translate-y-2',
      'translate-x-0 translate-y-1',
    ];
    return arc[idx % arc.length];
  };

  const getRightArcPosition = (idx: number, count: number) => {
    if (count <= 1) return '';
    if (count === 2) {
      return idx === 0 ? '-translate-y-2 -translate-x-2' : 'translate-y-2 translate-x-2';
    }
    const arc = [
      'translate-x-3 sm:translate-x-5 -translate-y-1',
      '-translate-x-3 sm:-translate-x-5 translate-y-1',
      'translate-x-2 sm:translate-x-4 translate-y-2',
      '-translate-x-2 sm:-translate-x-4 -translate-y-2',
      'translate-x-0 translate-y-1',
    ];
    return arc[idx % arc.length];
  };

  // Master Orchestration Timeline:
  // Starts with VS and banners prominent, avatars slide in smoothly, and countdown ticks down
  const onFinishRef = React.useRef(onFinish);
  onFinishRef.current = onFinish;

  useEffect(() => {
    // 0.2s: VS impact sound
    const tSound = setTimeout(() => {
      soundManager.play('vs_impact');
    }, 200);

    // 0.8s: Avatars slide in and lock in place
    const tAvatars = setTimeout(() => {
      setAnimStage('players');
      soundManager.play('card_deal');
    }, 800);

    // 2.0s: Countdown starts at 5
    const t5 = setTimeout(() => {
      setAnimStage('countdown');
      setCountdownNum(5);
      soundManager.play('countdown_tick');
    }, 2000);

    const t4 = setTimeout(() => {
      setCountdownNum(4);
      soundManager.play('countdown_tick');
    }, 3000);

    const t3 = setTimeout(() => {
      setCountdownNum(3);
      soundManager.play('countdown_tick');
    }, 4000);

    const t2 = setTimeout(() => {
      setCountdownNum(2);
      soundManager.play('countdown_tick');
    }, 5000);

    const t1 = setTimeout(() => {
      setCountdownNum(1);
      soundManager.play('countdown_tick');
    }, 6000);

    // 7.0s: START!
    const tStart = setTimeout(() => {
      setCountdownNum('START');
      setAnimStage('start');
      soundManager.play('match_start');
    }, 7000);

    // 7.5s (1 second before finish): Smooth Audio Fadeout of Video Sound
    let fadeInterval: number | null = null;
    const tFadeAudio = setTimeout(() => {
      const v = videoRef.current;
      if (v) {
        const startVol = v.volume;
        const steps = 10;
        let currentStep = 0;
        fadeInterval = window.setInterval(() => {
          currentStep++;
          if (v) {
            v.volume = Math.max(0, startVol * (1 - currentStep / steps));
          }
          if (currentStep >= steps && fadeInterval) {
            clearInterval(fadeInterval);
            fadeInterval = null;
          }
        }, 100); // 10 steps of 100ms = 1000ms (1 second fadeout)
      }
    }, 7500);

    // 8.0s: Smooth fade exit
    const tExit = setTimeout(() => {
      setAnimStage('exiting');
    }, 8000);

    // 8.5s: Finished -> hand off to game table
    const tFinish = setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.pause();
      }
      onFinishRef.current();
    }, 8500);

    return () => {
      if (fadeInterval) clearInterval(fadeInterval);
      clearTimeout(tSound);
      clearTimeout(tAvatars);
      clearTimeout(t5);
      clearTimeout(t4);
      clearTimeout(t3);
      clearTimeout(t2);
      clearTimeout(t1);
      clearTimeout(tStart);
      clearTimeout(tFadeAudio);
      clearTimeout(tExit);
      clearTimeout(tFinish);
    };
  }, []);

  // Compute player level display
  const getPlayerLevel = (player: PublicPlayer, idx: number) => {
    if (player.id === currentUserId && wallet?.level) {
      return wallet.level;
    }
    // Consistent virtual level for bots/opponents
    const hash = player.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return 10 + ((hash + idx * 3) % 15);
  };

  return (
    <div
      className={`fixed inset-0 z-50 overflow-hidden flex flex-col justify-between select-none bg-[#070b19] transition-all duration-500 ${
        animStage === 'exiting' ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* 1. CINEMATIC VIDEO ARENA BACKGROUND (VS SCREEN.mp4 - Ultra HD 2.5K 2560x1440 Crystal Clear) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden bg-slate-950">
        <video
          ref={videoRef}
          autoPlay
          loop
          playsInline
          className="w-full h-full object-cover select-none pointer-events-none"
          style={{
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
          }}
          src="/vs animation screen/VS SCREEN.mp4"
        />
      </div>

      {/* 2. TOP HEADER HUD (Brand Logo, Match Title & Player Count Pill) */}
      <header className="relative z-30 w-full px-4 sm:px-8 pt-1 sm:pt-2 flex items-center justify-between">
        {/* Left: Multiplayer Match Banner - Extra Large & Prominent (Shifted Left & Up) with CSS Slide-in Animation */}
        <div className="flex items-center -ml-2 sm:-ml-4 md:-ml-6 -mt-2 sm:-mt-3 md:-mt-4 anim-vs-banner">
          <div className="h-24 sm:h-32 md:h-44 lg:h-52 max-w-[340px] sm:max-w-[500px] md:max-w-[650px] lg:max-w-[750px] flex items-center">
            <img
              src="/vs animation screen/multiplayer match.png"
              alt="UNO Multiplayer Match"
              className="h-full w-auto object-contain select-none pointer-events-none drop-shadow-[0_8px_30px_rgba(250,204,21,0.9)] filter hover:scale-105 transition-transform"
            />
          </div>
        </div>

        {/* Right: Players Count & Mode Pill + Audio Toggle */}
        <div className="flex items-center gap-2 sm:gap-3 anim-vs-banner">
          {/* Dynamic 8 PLAYERS Classic Mode pill */}
          <div className="flex items-center gap-2 bg-gradient-to-r from-amber-500/20 via-slate-900/90 to-amber-500/20 border-2 border-amber-400/80 px-3 sm:px-4 py-1.5 rounded-2xl shadow-[0_0_20px_rgba(250,204,21,0.35)] backdrop-blur-md">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-400/20 flex items-center justify-center text-base sm:text-lg">
              👥
            </div>
            <div className="flex flex-col text-left">
              <span className="font-black text-xs sm:text-sm text-yellow-300 uppercase tracking-wider">
                {players.length} PLAYERS
              </span>
              <span className="text-[9px] sm:text-[11px] text-slate-300 font-semibold -mt-0.5">
                {modeName}
              </span>
            </div>
          </div>

          {/* Sound Toggle Button */}
          <button
            onClick={toggleSound}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-slate-900/90 border border-slate-700/80 hover:border-amber-400/80 text-amber-300 flex items-center justify-center transition active:scale-95 shadow-lg cursor-pointer"
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </header>

      {/* 3. MAIN CENTER STAGE: LEFT WING, 3D VS CENTERPIECE, RIGHT WING */}
      <main className="relative z-20 flex-1 w-full max-w-7xl mx-auto px-2 sm:px-6 flex items-center justify-between min-h-0 my-auto">
        {/* LEFT WING - Slides in from left at 0.6s, then stays 100% steady */}
        <div className="flex-1 flex flex-wrap items-center justify-evenly content-center gap-x-8 sm:gap-x-12 md:gap-x-14 gap-y-8 sm:gap-y-10 max-w-xl px-3 sm:px-6 anim-vs-avatar-left">
          {leftPlayers.map((player, idx) => {
            const isMe = player.id === currentUserId;
            const level = getPlayerLevel(player, idx);
            const isHost = player.isHost;
            const arcOffset = getLeftArcPosition(idx, leftPlayers.length);

            return (
              <div
                key={player.id}
                className={`flex flex-col items-center group transform hover:scale-110 transition-all ${arcOffset} z-10 m-2 sm:m-2.5`}
              >
                {/* Circular Avatar with Glowing Championship Ring */}
                <div className="relative">
                  {/* Host Crown */}
                  {isHost && (
                    <div className="absolute -top-4 sm:-top-5 left-1/2 -translate-x-1/2 z-20 text-yellow-300 drop-shadow-[0_2px_10px_rgba(250,204,21,1)] animate-bounce">
                      <Crown className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 fill-amber-400 text-yellow-200" />
                    </div>
                  )}

                  {/* Outer Thick Glowing Championship Neon Ring */}
                  <div
                    className={`relative ${avatarSizeClass} rounded-full p-1 sm:p-1.5 bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 shadow-[0_0_20px_rgba(250,204,21,0.7)] border-2 border-white/90 ${
                      isMe ? 'ring-4 ring-yellow-400 animate-pulse' : ''
                    }`}
                  >
                    <div className={`w-full h-full rounded-full bg-slate-950 overflow-hidden flex items-center justify-center ${avatarTextSize}`}>
                      <AvatarDisplay avatar={player.avatar} />
                    </div>
                  </div>

                  {/* Overlapping Bottom Pill: Name & Level Badge */}
                  <div className="absolute -bottom-3 sm:-bottom-3.5 left-1/2 -translate-x-1/2 z-20 w-[88px] sm:w-[105px] md:w-[115px]">
                    <div className="py-0.5 sm:py-1 px-1 rounded-full bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-2 border-amber-400 shadow-[0_4px_14px_rgba(0,0,0,0.85)] flex flex-col items-center justify-center text-center backdrop-blur-md">
                      <span className="font-black text-[9px] sm:text-[11px] text-white truncate max-w-[75px] sm:max-w-[95px] leading-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                        {player.name}
                      </span>
                      <div className="flex items-center justify-center gap-0.5 text-[8px] sm:text-[9px] font-black text-amber-300 leading-none mt-0.5">
                        <span className="text-yellow-400">★</span>
                        <span>Lv.{level}</span>
                        {isMe && (
                          <span className="ml-0.5 text-[6.5px] bg-yellow-400 text-slate-950 px-1 rounded-full uppercase font-black">
                            YOU
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CENTER ARENA SPACER (VS is rendered directly in the video background) */}
        <div className={`relative z-30 shrink-0 my-auto ${isTenPlayers ? 'w-24 sm:w-36 md:w-48' : 'w-28 sm:w-44 md:w-60'} pointer-events-none`} />

        {/* RIGHT WING - Slides in from right at 0.6s, then stays 100% steady */}
        <div className="flex-1 flex flex-wrap items-center justify-evenly content-center gap-x-8 sm:gap-x-12 md:gap-x-14 gap-y-8 sm:gap-y-10 max-w-xl px-3 sm:px-6 anim-vs-avatar-right">
          {rightPlayers.map((player, idx) => {
            const isMe = player.id === currentUserId;
            const level = getPlayerLevel(player, idx + leftPlayers.length);
            const isHost = player.isHost;
            const arcOffset = getRightArcPosition(idx, rightPlayers.length);

            return (
              <div
                key={player.id}
                className={`flex flex-col items-center group transform hover:scale-110 transition-all ${arcOffset} z-10 m-2 sm:m-2.5`}
              >
                {/* Circular Avatar with Glowing Championship Ring */}
                <div className="relative">
                  {/* Host Crown */}
                  {isHost && (
                    <div className="absolute -top-4 sm:-top-5 left-1/2 -translate-x-1/2 z-20 text-yellow-300 drop-shadow-[0_2px_10px_rgba(250,204,21,1)] animate-bounce">
                      <Crown className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 fill-amber-400 text-yellow-200" />
                    </div>
                  )}

                  {/* Outer Thick Glowing Championship Neon Ring */}
                  <div
                    className={`relative ${avatarSizeClass} rounded-full p-1 sm:p-1.5 bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 shadow-[0_0_20px_rgba(250,204,21,0.7)] border-2 border-white/90 ${
                      isMe ? 'ring-4 ring-yellow-400 animate-pulse' : ''
                    }`}
                  >
                    <div className={`w-full h-full rounded-full bg-slate-950 overflow-hidden flex items-center justify-center ${avatarTextSize}`}>
                      <AvatarDisplay avatar={player.avatar} />
                    </div>
                  </div>

                  {/* Overlapping Bottom Pill: Name & Level Badge */}
                  <div className="absolute -bottom-3 sm:-bottom-3.5 left-1/2 -translate-x-1/2 z-20 w-[88px] sm:w-[105px] md:w-[115px]">
                    <div className="py-0.5 sm:py-1 px-1 rounded-full bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-2 border-amber-400 shadow-[0_4px_14px_rgba(0,0,0,0.85)] flex flex-col items-center justify-center text-center backdrop-blur-md">
                      <span className="font-black text-[9px] sm:text-[11px] text-white truncate max-w-[75px] sm:max-w-[95px] leading-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                        {player.name}
                      </span>
                      <div className="flex items-center justify-center gap-0.5 text-[8px] sm:text-[9px] font-black text-amber-300 leading-none mt-0.5">
                        <span className="text-yellow-400">★</span>
                        <span>Lv.{level}</span>
                        {isMe && (
                          <span className="ml-0.5 text-[6.5px] bg-yellow-400 text-slate-950 px-1 rounded-full uppercase font-black">
                            YOU
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* 4. BOTTOM HUD: MATCH SETTINGS GLASS PANEL & COUNTDOWN PILL */}
      <footer className="relative z-30 w-full px-4 pb-4 sm:pb-6 flex flex-col items-center justify-center gap-2.5">
        {/* MATCH SETTINGS GLASS HUD PANEL (Restored matching reference) */}
        <div className="w-full max-w-xl bg-gradient-to-r from-blue-950/90 via-slate-900/95 to-red-950/90 border-2 border-yellow-400/80 rounded-3xl p-2.5 sm:p-3 shadow-[0_10px_35px_rgba(0,0,0,0.85),0_0_25px_rgba(250,204,21,0.35)] backdrop-blur-md">
          {/* Header Title */}
          <div className="text-center mb-1">
            <span className="text-[11px] sm:text-xs font-black italic uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-300 to-yellow-400 drop-shadow">
              MATCH SETTINGS
            </span>
          </div>

          <div className="grid grid-cols-3 divide-x divide-slate-700/80 text-center">
            {/* Item 1: Entry Fee */}
            <div className="flex items-center justify-center gap-2 px-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-300 shrink-0">
                <Coins className="w-5 h-5 fill-amber-400 text-amber-300" />
              </div>
              <div className="text-left">
                <div className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400">Entry Fee</div>
                <div className="text-xs sm:text-sm font-black text-amber-300 font-mono">
                  {isFeeMatch ? `₱${entryFee.toLocaleString()}` : 'FREE'}
                </div>
              </div>
            </div>

            {/* Item 2: Prize Pool */}
            <div className="flex items-center justify-center gap-2 px-2">
              <div className="w-8 h-8 rounded-xl bg-yellow-500/20 flex items-center justify-center text-yellow-300 shrink-0">
                <Trophy className="w-5 h-5 fill-yellow-400 text-yellow-300" />
              </div>
              <div className="text-left">
                <div className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400">Prize Pool</div>
                <div className="text-xs sm:text-sm font-black text-yellow-300 font-mono">
                  {isFeeMatch ? `₱${prizePool.toLocaleString()}` : 'Casual'}
                </div>
              </div>
            </div>

            {/* Item 3: Game Mode */}
            <div className="flex items-center justify-center gap-2 px-2">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center text-cyan-300 shrink-0">
                <Shield className="w-5 h-5 fill-cyan-400 text-cyan-300" />
              </div>
              <div className="text-left">
                <div className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400">Mode</div>
                <div className="text-xs sm:text-sm font-black text-cyan-300 truncate max-w-[85px]">
                  {modeName.replace(' Mode', '')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AUTHORITATIVE COUNTDOWN GOLDEN PILL (5..4..3..2..1..START!) */}
        <div
          className={`relative flex items-center gap-3 bg-gradient-to-r from-amber-950/95 via-yellow-950/90 to-amber-950/95 border-2 border-yellow-400 px-5 sm:px-8 py-1.5 sm:py-2 rounded-full shadow-[0_0_25px_rgba(250,204,21,0.6)] backdrop-blur-md transition-all duration-300 ${
            animStage === 'countdown' || animStage === 'start'
              ? 'scale-105 opacity-100'
              : 'scale-95 opacity-90'
          }`}
        >
          <div className="flex items-center gap-2 text-yellow-300">
            <span className="text-sm sm:text-base animate-spin">⏱️</span>
            <span className="font-black text-[11px] sm:text-xs tracking-wider uppercase text-yellow-200">
              {animStage === 'start' ? 'BATTLE COMMENCING!' : 'GAME STARTING SOON...'}
            </span>
          </div>

          {/* Animated Countdown Number Circle */}
          <div className="relative flex items-center justify-center">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-200 border-2 border-yellow-100 flex items-center justify-center shadow-[0_0_15px_rgba(250,204,21,0.9)] animate-pulse">
              <span
                key={String(countdownNum)}
                className={`font-black italic text-slate-950 animate-scaleIn ${
                  countdownNum === 'START' ? 'text-[10px] sm:text-xs' : 'text-base sm:text-xl'
                }`}
              >
                {countdownNum}
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

