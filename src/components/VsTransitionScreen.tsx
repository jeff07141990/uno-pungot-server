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
  const [countdownNum, setCountdownNum] = useState<number | 'START'>(10);
  const [isMuted, setIsMuted] = useState<boolean>(() => soundManager.getMuted());
  const videoRef = React.useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Mobile browsers require muted autoplay. Play immediately to show background instantly!
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
      videoRef.current.volume = isMuted ? 0 : 0.85;
      videoRef.current.play().catch(() => {
        // Fallback: Force muted play if browser blocked unmuted
        if (videoRef.current) {
          videoRef.current.muted = true;
          videoRef.current.play().catch(() => {});
        }
      });
    }
  }, [isMuted]);

  const players = gameState.players;
  const isFeeMatch = (gameState.entryFee ?? 0) > 0;
  const entryFee = gameState.entryFee ?? 0;
  // Prize pool is total amount bet (entryFee * paid players or total players)
  const prizePool = gameState.prizePool ?? (entryFee * players.length);

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

  // Adaptive avatar ring sizes tuned for mobile landscape & compact displays
  const avatarSizeClass = isTenPlayers
    ? 'w-10 h-10 sm:w-13 sm:h-13 md:w-16 md:h-16'
    : isHighCount
    ? 'w-12 h-12 sm:w-15 sm:h-15 md:w-18 md:h-18'
    : 'w-14 h-14 sm:w-18 sm:h-18 md:w-22 md:h-22';

  const avatarTextSize = isTenPlayers
    ? 'text-sm sm:text-base'
    : isHighCount
    ? 'text-base sm:text-lg'
    : 'text-xl sm:text-2xl';

  // Even, balanced alternating offsets for Left and Right Wings with consistent breathing room
  const getLeftArcPosition = (idx: number, count: number) => {
    if (count <= 1) return '';
    if (count === 2) {
      return idx === 0 ? '-translate-y-1 translate-x-1' : 'translate-y-1 -translate-x-1';
    }
    const arc = [
      '-translate-x-2 -translate-y-1',
      'translate-x-2 translate-y-1',
      '-translate-x-1 translate-y-1',
      'translate-x-1 -translate-y-1',
      'translate-x-0',
    ];
    return arc[idx % arc.length];
  };

  const getRightArcPosition = (idx: number, count: number) => {
    if (count <= 1) return '';
    if (count === 2) {
      return idx === 0 ? '-translate-y-1 -translate-x-1' : 'translate-y-1 translate-x-1';
    }
    const arc = [
      'translate-x-2 -translate-y-1',
      '-translate-x-2 translate-y-1',
      'translate-x-1 translate-y-1',
      '-translate-x-1 -translate-y-1',
      'translate-x-0',
    ];
    return arc[idx % arc.length];
  };

  // 10-Second Authoritative Tournament Countdown:
  // 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, then START! -> exit to GameTable
  const onFinishRef = React.useRef(onFinish);
  onFinishRef.current = onFinish;

  useEffect(() => {
    // Play real background video immediately
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }

    // 0s: Play VS impact sound instantly
    soundManager.play('vs_impact');
    setAnimStage('players');

    const timers: NodeJS.Timeout[] = [];

    // Schedule 10 down to 1 (one per second)
    for (let i = 10; i >= 1; i--) {
      const delayMs = (10 - i) * 1000;
      timers.push(
        setTimeout(() => {
          setAnimStage('countdown');
          setCountdownNum(i);
          soundManager.play('countdown_tick');
        }, delayMs)
      );
    }

    // 10.0s: START!
    timers.push(
      setTimeout(() => {
        setCountdownNum('START');
        setAnimStage('start');
        soundManager.play('match_start');
      }, 10000)
    );

    // 10.5s: Smooth fade exit
    timers.push(
      setTimeout(() => {
        setAnimStage('exiting');
      }, 10500)
    );

    // 10.8s: Finish & transition directly into GameTable
    timers.push(
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.pause();
        }
        onFinishRef.current();
      }, 10800)
    );

    return () => {
      timers.forEach(clearTimeout);
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
      {/* 1. CINEMATIC VIDEO ARENA BACKGROUND (vs screen.mp4 - Real Video Background) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden bg-slate-950">
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="w-full h-full object-cover select-none pointer-events-none"
          style={{
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
          }}
          src="/vs animation screen/vs screen.mp4"
        />
      </div>

      {/* 2. TOP HEADER HUD (Brand Logo, Match Title & Player Count Pill) */}
      <header className="relative z-30 w-full px-2 sm:px-6 pt-1 flex items-center justify-between">
        {/* Left: Multiplayer Match Banner - Compact & Exact */}
        <div className="flex items-center -ml-1 sm:-ml-3 -mt-1 sm:-mt-2 anim-vs-banner">
          <div className="h-14 sm:h-20 md:h-28 max-w-[180px] sm:max-w-[320px] md:max-w-[450px] flex items-center">
            <img
              src="/vs animation screen/multiplayer match.png"
              alt="UNO Multiplayer Match"
              className="h-full w-auto object-contain select-none pointer-events-none drop-shadow-[0_4px_16px_rgba(250,204,21,0.8)] filter transition-transform"
            />
          </div>
        </div>

        {/* Right: Players Count & Mode Pill + Audio Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 anim-vs-banner">
          {/* Dynamic Players Count & Mode pill */}
          <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 via-slate-900/90 to-amber-500/20 border border-amber-400/80 px-2.5 sm:px-3 py-1 rounded-xl shadow-[0_0_15px_rgba(250,204,21,0.3)] backdrop-blur-md">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-amber-400/20 flex items-center justify-center text-xs sm:text-sm">
              👥
            </div>
            <div className="flex flex-col text-left">
              <span className="font-black text-[10px] sm:text-xs text-yellow-300 uppercase tracking-wider">
                {players.length} PLAYERS
              </span>
              <span className="text-[8px] sm:text-[10px] text-slate-300 font-semibold -mt-0.5">
                {modeName}
              </span>
            </div>
          </div>

          {/* Sound Toggle Button */}
          <button
            onClick={toggleSound}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-900/90 border border-slate-700/80 hover:border-amber-400/80 text-amber-300 flex items-center justify-center transition active:scale-95 shadow-md cursor-pointer"
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
          </button>
        </div>
      </header>

      {/* 3. MAIN CENTER STAGE: LEFT WING, 3D VS CENTERPIECE, RIGHT WING */}
      <main className="relative z-20 flex-1 w-full max-w-6xl mx-auto px-1 sm:px-4 flex items-center justify-between min-h-0 my-auto">
        {/* LEFT WING - Slides in snappy, steady */}
        <div className="flex-1 flex flex-wrap items-center justify-evenly content-center gap-x-4 sm:gap-x-8 gap-y-4 sm:gap-y-6 max-w-lg px-1 sm:px-3 anim-vs-avatar-left">
          {leftPlayers.map((player, idx) => {
            const isMe = player.id === currentUserId;
            const level = getPlayerLevel(player, idx);
            const isHost = player.isHost;
            const arcOffset = getLeftArcPosition(idx, leftPlayers.length);

            return (
              <div
                key={player.id}
                className={`flex flex-col items-center group ${arcOffset} z-10 m-1 sm:m-1.5`}
              >
                {/* Circular Avatar with Glowing Championship Ring */}
                <div className="relative">
                  {/* Host Crown */}
                  {isHost && (
                    <div className="absolute -top-3 sm:-top-4 left-1/2 -translate-x-1/2 z-20 text-yellow-300 drop-shadow-[0_2px_8px_rgba(250,204,21,1)]">
                      <Crown className="w-3.5 h-3.5 sm:w-5 sm:h-5 fill-amber-400 text-yellow-200" />
                    </div>
                  )}

                  {/* Outer Thick Glowing Championship Neon Ring */}
                  <div
                    className={`relative ${avatarSizeClass} rounded-full p-0.5 sm:p-1 bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 shadow-[0_0_14px_rgba(250,204,21,0.6)] border border-white/90 ${
                      isMe ? 'ring-2 sm:ring-4 ring-yellow-400' : ''
                    }`}
                  >
                    <div className={`w-full h-full rounded-full bg-slate-950 overflow-hidden flex items-center justify-center ${avatarTextSize}`}>
                      <AvatarDisplay avatar={player.avatar} />
                    </div>
                  </div>

                  {/* Overlapping Bottom Banner: Name & Level Badge */}
                  <div className="absolute -bottom-3 sm:-bottom-3.5 left-1/2 -translate-x-1/2 z-20 min-w-[75px] sm:min-w-[95px] max-w-[120px] px-2 py-0.5 rounded-full bg-slate-900/90 backdrop-blur-md border border-amber-400/70 shadow-[0_4px_12px_rgba(0,0,0,0.6)] flex flex-col items-center justify-center">
                    <span className="font-black text-[7.5px] sm:text-[9px] text-white truncate max-w-[65px] sm:max-w-[85px] leading-tight drop-shadow">
                      {player.name}
                    </span>
                    <div className="flex items-center justify-center gap-0.5 text-[6.5px] sm:text-[7.5px] font-black text-amber-300 leading-none mt-0.5">
                      <span className="text-yellow-400">★</span>
                      <span>Lv.{level}</span>
                      {isMe && (
                        <span className="ml-0.5 text-[5.5px] bg-yellow-400 text-slate-950 px-0.5 rounded-full uppercase font-black">
                          YOU
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CENTER ARENA SPACER (VS is rendered directly in the video background) */}
        <div className={`relative z-30 shrink-0 my-auto ${isTenPlayers ? 'w-16 sm:w-28 md:w-40' : 'w-20 sm:w-32 md:w-48'} pointer-events-none`} />

        {/* RIGHT WING - Slides in snappy, steady */}
        <div className="flex-1 flex flex-wrap items-center justify-evenly content-center gap-x-4 sm:gap-x-8 gap-y-4 sm:gap-y-6 max-w-lg px-1 sm:px-3 anim-vs-avatar-right">
          {rightPlayers.map((player, idx) => {
            const isMe = player.id === currentUserId;
            const level = getPlayerLevel(player, idx + leftPlayers.length);
            const isHost = player.isHost;
            const arcOffset = getRightArcPosition(idx, rightPlayers.length);

            return (
              <div
                key={player.id}
                className={`flex flex-col items-center group ${arcOffset} z-10 m-1 sm:m-1.5`}
              >
                {/* Circular Avatar with Glowing Championship Ring */}
                <div className="relative">
                  {/* Host Crown */}
                  {isHost && (
                    <div className="absolute -top-3 sm:-top-4 left-1/2 -translate-x-1/2 z-20 text-yellow-300 drop-shadow-[0_2px_8px_rgba(250,204,21,1)]">
                      <Crown className="w-3.5 h-3.5 sm:w-5 sm:h-5 fill-amber-400 text-yellow-200" />
                    </div>
                  )}

                  {/* Outer Thick Glowing Championship Neon Ring */}
                  <div
                    className={`relative ${avatarSizeClass} rounded-full p-0.5 sm:p-1 bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 shadow-[0_0_14px_rgba(250,204,21,0.6)] border border-white/90 ${
                      isMe ? 'ring-2 sm:ring-4 ring-yellow-400' : ''
                    }`}
                  >
                    <div className={`w-full h-full rounded-full bg-slate-950 overflow-hidden flex items-center justify-center ${avatarTextSize}`}>
                      <AvatarDisplay avatar={player.avatar} />
                    </div>
                  </div>

                  {/* Overlapping Bottom Banner: Name & Level Badge */}
                  <div className="absolute -bottom-3 sm:-bottom-3.5 left-1/2 -translate-x-1/2 z-20 min-w-[75px] sm:min-w-[95px] max-w-[120px] px-2 py-0.5 rounded-full bg-slate-900/90 backdrop-blur-md border border-amber-400/70 shadow-[0_4px_12px_rgba(0,0,0,0.6)] flex flex-col items-center justify-center">
                    <span className="font-black text-[7.5px] sm:text-[9px] text-white truncate max-w-[65px] sm:max-w-[85px] leading-tight drop-shadow">
                      {player.name}
                    </span>
                    <div className="flex items-center justify-center gap-0.5 text-[6.5px] sm:text-[7.5px] font-black text-amber-300 leading-none mt-0.5">
                      <span className="text-yellow-400">★</span>
                      <span>Lv.{level}</span>
                      {isMe && (
                        <span className="ml-0.5 text-[5.5px] bg-yellow-400 text-slate-950 px-0.5 rounded-full uppercase font-black">
                          YOU
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* 4. BOTTOM HUD: MATCH SETTINGS GLASS PANEL & COUNTDOWN PILL */}
      <footer className="relative z-30 w-full px-2 pb-2 sm:pb-4 flex flex-col items-center justify-center gap-1.5 sm:gap-2">
        {/* MATCH SETTINGS GLASS HUD PANEL - Ultra Slim for Landscape */}
        <div className="w-full max-w-md bg-gradient-to-r from-blue-950/90 via-slate-900/95 to-red-950/90 border border-yellow-400/80 rounded-2xl p-1.5 sm:p-2 shadow-[0_4px_20px_rgba(0,0,0,0.8)] backdrop-blur-md">
          <div className="grid grid-cols-3 divide-x divide-slate-700/80 text-center">
            {/* Item 1: Entry Fee */}
            <div className="flex items-center justify-center gap-1.5 px-1">
              <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-300 shrink-0">
                <Coins className="w-3.5 h-3.5 fill-amber-400 text-amber-300" />
              </div>
              <div className="text-left">
                <div className="text-[7.5px] sm:text-[9px] uppercase font-bold text-slate-400">Entry Fee</div>
                <div className="text-[10px] sm:text-xs font-black text-amber-300 font-mono leading-tight">
                  {isFeeMatch ? `₱${entryFee.toLocaleString()}` : 'FREE'}
                </div>
              </div>
            </div>

            {/* Item 2: Prize Pool */}
            <div className="flex items-center justify-center gap-1.5 px-1">
              <div className="w-6 h-6 rounded-lg bg-yellow-500/20 flex items-center justify-center text-yellow-300 shrink-0">
                <Trophy className="w-3.5 h-3.5 fill-yellow-400 text-yellow-300" />
              </div>
              <div className="text-left">
                <div className="text-[7.5px] sm:text-[9px] uppercase font-bold text-slate-400">Prize Pool</div>
                <div className="text-[10px] sm:text-xs font-black text-yellow-300 font-mono leading-tight">
                  {isFeeMatch ? `₱${prizePool.toLocaleString()}` : 'Casual'}
                </div>
              </div>
            </div>

            {/* Item 3: Game Mode */}
            <div className="flex items-center justify-center gap-1.5 px-1">
              <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center text-cyan-300 shrink-0">
                <Shield className="w-3.5 h-3.5 fill-cyan-400 text-cyan-300" />
              </div>
              <div className="text-left">
                <div className="text-[7.5px] sm:text-[9px] uppercase font-bold text-slate-400">Mode</div>
                <div className="text-[10px] sm:text-xs font-black text-cyan-300 truncate max-w-[70px] leading-tight">
                  {modeName.replace(' Mode', '')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AUTHORITATIVE COUNTDOWN GOLDEN PILL (3..2..1..START!) */}
        <div
          className={`relative flex items-center gap-2 bg-gradient-to-r from-amber-950/95 via-yellow-950/90 to-amber-950/95 border border-yellow-400 px-3.5 sm:px-5 py-1 rounded-full shadow-[0_0_18px_rgba(250,204,21,0.5)] backdrop-blur-md transition-all duration-300 ${
            animStage === 'countdown' || animStage === 'start'
              ? 'scale-100 opacity-100'
              : 'scale-95 opacity-90'
          }`}
        >
          <div className="flex items-center gap-1.5 text-yellow-300">
            <span className="text-xs sm:text-sm animate-spin">⏱️</span>
            <span className="font-black text-[9.5px] sm:text-xs tracking-wider uppercase text-yellow-200">
              {animStage === 'start' ? 'BATTLE COMMENCING!' : 'GAME STARTING...'}
            </span>
          </div>

          {/* Animated Countdown Number Circle */}
          <div className="relative flex items-center justify-center">
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-200 border border-yellow-100 flex items-center justify-center shadow-[0_0_10px_rgba(250,204,21,0.9)] animate-pulse">
              <span
                key={String(countdownNum)}
                className={`font-black italic text-slate-950 animate-scaleIn ${
                  countdownNum === 'START' ? 'text-[8px] sm:text-[10px]' : 'text-xs sm:text-base'
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

