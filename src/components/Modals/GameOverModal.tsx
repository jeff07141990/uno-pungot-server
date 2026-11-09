import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { PlayerWallet, PublicGameState } from '../../engine/types';
import { Trophy, RotateCcw, Share2, Award, Zap } from 'lucide-react';
import { getXPProgress } from '../../utils/levelUtils';
import { economyService } from '../../services/economyService';

interface GameOverModalProps {
  isOpen: boolean;
  gameState: PublicGameState;
  currentUserId: string;
  wallet?: PlayerWallet | null;
  onPlayAgain: () => void;
  onLeave: () => void;
  onToast: (msg: string) => void;
}

/** Safely display emoji or base64 profile photo image */
const AvatarDisplay: React.FC<{ avatar?: string; className?: string }> = ({ avatar = '🤖', className = '' }) => {
  if (avatar && avatar.startsWith('data:image')) {
    return (
      <img
        src={avatar}
        alt="avatar"
        className={`w-full h-full object-cover rounded-[inherit] ${className}`}
      />
    );
  }
  return <span>{avatar}</span>;
};

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  gameState,
  currentUserId,
  wallet,
  onPlayAgain,
  onLeave,
  onToast,
}) => {
  // Animated XP state
  const currentUserPlayer = gameState.players.find((p) => p.id === currentUserId);
  const earnedXP = currentUserPlayer?.xpGained ?? (gameState.winnerId === currentUserId ? 120 : 35);
  const totalExperience = wallet?.experience ?? currentUserPlayer?.experience ?? 0;
  const currentProgress = getXPProgress(totalExperience);

  // Animation values: start at (total - earnedXP) and smoothly animate up
  const previousExperience = Math.max(0, totalExperience - earnedXP);
  const prevProgress = getXPProgress(previousExperience);

  const [displayXP, setDisplayXP] = useState(previousExperience);
  const [animatedPercent, setAnimatedPercent] = useState(prevProgress.percent);
  const [didLevelUp, setDidLevelUp] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Confetti on open
    const duration = 3.5 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 60,
        origin: { x: 0, y: 0.7 },
        colors: ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#FCD34D'],
        zIndex: 9999,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 60,
        origin: { x: 1, y: 0.7 },
        colors: ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#FCD34D'],
        zIndex: 9999,
      });
      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();

    // Reset initial animation state
    setDisplayXP(previousExperience);
    setAnimatedPercent(prevProgress.percent);
    setDidLevelUp(currentProgress.level > prevProgress.level);

    // Live animated filling of the XP bar after a brief 300ms pause
    const timer = setTimeout(() => {
      const startTime = performance.now();
      const animDuration = 1400; // 1.4 seconds animation

      const step = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / animDuration);
        // Easing out cubic
        const easeOut = 1 - Math.pow(1 - progress, 3);

        const currentAnimatedXP = Math.round(previousExperience + (totalExperience - previousExperience) * easeOut);
        setDisplayXP(currentAnimatedXP);

        const info = getXPProgress(currentAnimatedXP);
        setAnimatedPercent(info.percent);

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          setDisplayXP(totalExperience);
          setAnimatedPercent(currentProgress.percent);
          if (currentProgress.level > prevProgress.level) {
            confetti({
              particleCount: 40,
              spread: 100,
              origin: { y: 0.5 },
              zIndex: 9999,
            });
          }
        }
      };

      requestAnimationFrame(step);
    }, 350);

    return () => clearTimeout(timer);
  }, [isOpen, totalExperience, earnedXP]);

  const cachedWallet = economyService.getCachedWallet(currentUserId);
  const activeBalance = Math.max(wallet?.balance ?? 0, cachedWallet?.balance ?? 0);

  if (!isOpen) return null;

  const winner = gameState.players.find((p) => p.id === gameState.winnerId);
  const loser = gameState.players.find((p) => p.id === gameState.loserId);
  const isHost = gameState.hostId === currentUserId;
  const isCurrentUserWinner = gameState.winnerId === currentUserId;
  const isCurrentUserLoser = gameState.loserId === currentUserId;

  const handleShare = async () => {
    const text = `🎮 UNO The Pungot Edition: ${winner?.name} won the match in room ${gameState.roomId}! Can you beat them? Play now!`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'UNO: The Pungot Edition Result',
          text,
          url: window.location.href,
        });
        return;
      } catch {}
    }
    await navigator.clipboard.writeText(text);
    onToast('Result copied to clipboard!');
  };

  const sortedPlayers = [...gameState.players].sort((a, b) => {
    const rankA = a.finishRank ?? (a.id === gameState.winnerId ? 1 : a.id === gameState.loserId ? 99 : 50);
    const rankB = b.finishRank ?? (b.id === gameState.winnerId ? 1 : b.id === gameState.loserId ? 99 : 50);
    return rankA - rankB;
  });

  const animatedInfo = getXPProgress(displayXP);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-slate-950 via-[#0B1120] to-slate-950 text-white animate-fadeIn overflow-hidden p-2 sm:p-4 select-none">
      {/* Background Animated Glows */}
      <div className="fixed top-1/4 left-1/4 w-[400px] h-[400px] bg-amber-500/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-10 right-10 w-[350px] h-[350px] bg-blue-600/10 rounded-full blur-[90px] pointer-events-none" />

      {/* Main Single-Screen Grid: Left Dashboard (Winner & Live XP) & Right Scoreboard */}
      <div className="relative z-10 w-full max-w-6xl mx-auto flex-1 flex flex-col justify-between overflow-hidden">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80 shrink-0 gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm sm:text-base font-black text-amber-400 flex items-center gap-1.5">
              <span>🏆</span>
              <span>MATCH SUMMARY</span>
            </span>
            <span className="text-[11px] font-semibold text-slate-400 bg-slate-800/80 px-2.5 py-0.5 rounded-full border border-slate-700">
              Room {gameState.roomId}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Total Wallet Balance Pill */}
            <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 via-yellow-500/30 to-amber-500/20 border border-amber-400/80 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full shadow-[0_0_12px_rgba(250,204,21,0.35)]">
              <img
                src="/play online modal and buttons/icon_coins.png"
                alt="Coins"
                className="w-4 h-4 sm:w-5 sm:h-5 object-contain drop-shadow"
              />
              <div className="flex items-baseline gap-1">
                <span className="text-[9px] sm:text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                  Total Wallet:
                </span>
                <span className="font-mono font-black text-xs sm:text-sm text-yellow-300 drop-shadow">
                  ₱{activeBalance.toLocaleString()}
                </span>
              </div>
            </div>

            <span className="hidden sm:inline-block text-[11px] font-semibold text-slate-400 bg-slate-800/80 px-2.5 py-0.5 rounded-full border border-slate-700">
              {gameState.turnCount} turns played
            </span>
          </div>
        </div>

        {/* Center Split Screen: Left = Winner Hero & Live XP Animation | Right = Rankings Table */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-2 sm:gap-3 my-1.5 overflow-hidden min-h-0">
          
          {/* LEFT COLUMN: Main Dashboard (1st Winner + Live XP Progression) */}
          <div className="md:col-span-5 flex flex-col justify-between gap-1.5 bg-slate-900/90 backdrop-blur-md rounded-2xl p-2.5 sm:p-3.5 border-2 border-amber-500/40 shadow-xl overflow-y-auto">
            {/* Player's Personal Profile & Match Standing */}
            <div className="flex flex-col items-center text-center">
              {/* User Avatar with Personal Rank Badge */}
              <div className="relative inline-block mb-1">
                <div className={`absolute -inset-1.5 rounded-2xl blur-sm opacity-80 pointer-events-none ${
                  isCurrentUserWinner
                    ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 animate-pulse'
                    : isCurrentUserLoser
                    ? 'bg-gradient-to-r from-red-600 via-rose-500 to-red-700'
                    : 'bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-500'
                }`} />
                <div className={`relative w-14 h-14 sm:w-20 sm:h-20 rounded-2xl border-2 flex items-center justify-center text-3xl sm:text-4xl shadow-lg overflow-hidden ${
                  isCurrentUserWinner
                    ? 'bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-200 border-yellow-100 shadow-[0_0_25px_rgba(250,204,21,0.5)]'
                    : isCurrentUserLoser
                    ? 'bg-gradient-to-tr from-red-900 via-red-800 to-rose-700 border-red-400 shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                    : 'bg-gradient-to-tr from-slate-800 via-slate-700 to-cyan-900 border-cyan-400/80 shadow-[0_0_20px_rgba(6,182,212,0.35)]'
                }`}>
                  <AvatarDisplay avatar={currentUserPlayer?.avatar || wallet?.playerAvatar || '🦊'} />
                </div>
                {/* Floating Rank Badge Icon */}
                <div className={`absolute -bottom-1.5 -right-1.5 rounded-full p-1 border shadow-md text-xs sm:text-sm font-black flex items-center justify-center ${
                  isCurrentUserWinner
                    ? 'bg-amber-500 text-slate-950 border-white'
                    : isCurrentUserLoser
                    ? 'bg-red-600 text-white border-white'
                    : 'bg-cyan-600 text-white border-white'
                }`}>
                  {isCurrentUserWinner ? '🥇' : isCurrentUserLoser ? '💀' : currentUserPlayer?.finishRank === 2 ? '🥈' : currentUserPlayer?.finishRank === 3 ? '🥉' : `🎖️`}
                </div>
              </div>

              {/* Player Name & Personal Standing Title */}
              <div className="flex items-center gap-1.5">
                <span className="text-sm sm:text-base font-black text-white truncate max-w-[150px]">
                  {currentUserPlayer?.name || wallet?.playerName || 'You'}
                </span>
                <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-blue-600/60 text-blue-200 border border-blue-400/60">
                  YOU
                </span>
              </div>

              <h2 className={`text-base sm:text-xl font-black leading-tight mt-0.5 ${
                isCurrentUserWinner
                  ? 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-400 drop-shadow'
                  : isCurrentUserLoser
                  ? 'text-red-400 drop-shadow'
                  : 'text-cyan-300 drop-shadow'
              }`}>
                {isCurrentUserWinner
                  ? '🏆 VICTORY IS YOURS! 🏆'
                  : isCurrentUserLoser
                  ? '💀 IKAW ANG PUNGOT!'
                  : currentUserPlayer?.finishRank
                  ? `✨ RANK #${currentUserPlayer.finishRank} (LIGTAS!)`
                  : '✨ MATCH FINISHED!'}
              </h2>

              {/* Match Winner Reference if someone else won */}
              {!isCurrentUserWinner && winner && (
                <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                  <span>Nanalo:</span>
                  <span className="text-amber-300 font-bold">🏆 {winner.name}</span>
                </div>
              )}

              {/* Casual / Tournament Reward Banner */}
              {gameState.entryFee && gameState.entryFee > 0 && gameState.payoutResults ? (
                <div className="mt-1 w-full py-1 px-2.5 rounded-xl bg-amber-500/15 border border-amber-400/50 text-[11px] font-bold text-amber-200">
                  {(() => {
                    const userPayout = gameState.payoutResults.find((p) => p.playerId === currentUserId);
                    return userPayout ? (
                      <span>Napanalunan: <b className="text-yellow-300 font-mono">+₱{userPayout.prize.toLocaleString()}</b> (Rank #{userPayout.rank})</span>
                    ) : (
                      <span>Prize Pool: ₱{gameState.prizePool?.toLocaleString()}</span>
                    );
                  })()}
                </div>
              ) : isCurrentUserWinner && (
                <div className="mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-400 text-xs font-black text-amber-300">
                  <span>💰 +₱200 Virtual Peso Coins!</span>
                </div>
              )}

              {/* Loser / Pungot Callout if user is loser */}
              {isCurrentUserLoser && (
                <div className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-red-950/80 border border-red-500/60 text-[10px] font-bold text-red-200">
                  <span>💀 Natira kang may pinakamaraming baraha ({currentUserPlayer?.cardCount || 0} cards)</span>
                </div>
              )}
            </div>

            {/* LIVE ANIMATED XP PROGRESSION CARD */}
            <div className="w-full bg-slate-950/80 rounded-xl p-2.5 border border-cyan-500/40 shadow-inner flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase text-cyan-300 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
                  <span>XP Gained This Match</span>
                </span>
                <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/40 animate-pulse">
                  +{earnedXP} XP
                </span>
              </div>

              {/* Level & XP Numbers */}
              <div className="flex items-center justify-between text-xs mt-0.5">
                <span className="font-black text-white px-2 py-0.5 rounded-md bg-cyan-600/30 text-cyan-200 border border-cyan-500/50">
                  Level {animatedInfo.level}
                </span>
                <span className="font-mono font-bold text-[11px] text-slate-300">
                  <span className="text-cyan-300 font-black">{animatedInfo.currentLevelXP}</span> / {animatedInfo.neededXPForNext} XP ({animatedPercent}%)
                </span>
              </div>

              {/* Animated Progress Bar */}
              <div className="relative w-full h-3 sm:h-3.5 rounded-full bg-slate-800/90 border border-slate-700 overflow-hidden shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 transition-all duration-300 ease-out shadow-[0_0_12px_rgba(34,211,238,0.8)]"
                  style={{ width: `${animatedPercent}%` }}
                />
              </div>

              {/* Level Up Celebration Banner */}
              {didLevelUp && (
                <div className="mt-0.5 p-1.5 rounded-lg bg-gradient-to-r from-amber-500/30 via-yellow-400/20 to-amber-500/30 border border-amber-400 text-center animate-bounce shadow">
                  <span className="text-xs font-black text-amber-200">
                    🎉 LEVEL UP! Naging Level {currentProgress.level} ka na! (+₱{currentProgress.level * 100} Coins)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Full Ranking Scoreboard */}
          <div className="md:col-span-7 flex flex-col justify-between bg-slate-900/90 backdrop-blur-md rounded-2xl p-2.5 sm:p-3.5 border-2 border-slate-800 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 shrink-0">
              <span className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                <span>Player Standings & Rewards</span>
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Rewards • Cards • Result</span>
            </div>

            {/* Scrollable list fitting remaining space */}
            <div className="flex-1 overflow-y-auto space-y-1.5 my-1.5 pr-0.5">
              {sortedPlayers.map((player) => {
                const isWinner = player.id === winner?.id;
                const isLoser = player.id === loser?.id;
                const rank = player.finishRank;
                const isSelf = player.id === currentUserId;

                return (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-1.5 sm:p-2 rounded-xl transition-all ${
                      isWinner
                        ? 'bg-amber-500/20 border-2 border-amber-400/80 text-amber-200 shadow-md'
                        : isLoser
                        ? 'bg-red-950/50 border border-red-500/50 text-red-200'
                        : isSelf
                        ? 'bg-blue-950/40 border border-blue-500/50 text-white'
                        : 'bg-slate-950/70 border border-slate-800/80 text-slate-200'
                    }`}
                  >
                    {/* Left: Medal, Avatar, Name & Level */}
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base sm:text-lg font-black w-6 text-center">
                        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : isLoser ? '💀' : `${rank || '-'}`}
                      </span>

                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-base sm:text-lg shrink-0 overflow-hidden shadow">
                        <AvatarDisplay avatar={player.avatar} />
                      </div>

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs sm:text-sm font-black truncate max-w-[90px] sm:max-w-[140px] ${
                            isWinner ? 'text-amber-300' : isLoser ? 'text-red-300' : 'text-white'
                          }`}>
                            {player.name}
                          </span>
                          {isSelf && (
                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-blue-600/60 text-blue-200 border border-blue-400/60">
                              YOU
                            </span>
                          )}
                          {(() => {
                            const lvl = isSelf
                              ? getXPProgress(wallet?.experience ?? player.experience ?? 0).level
                              : (player.experience !== undefined ? getXPProgress(player.experience).level : player.level);
                            return lvl ? (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                Lv.{lvl}
                              </span>
                            ) : null;
                          })()}
                        </div>

                        <span className="text-[9px] text-slate-400">
                          {isWinner ? '1st Place Winner' : isLoser ? 'Ang Pungot' : `Rank ${rank || '-'}`}
                        </span>
                      </div>
                    </div>

                    {/* Right: Coins won, XP gained, Cards & Standing Pill */}
                    <div className="flex items-center gap-1.5 shrink-0 ml-1.5">
                      {(() => {
                        let coinsWon = 0;
                        if (gameState.payoutResults && gameState.payoutResults.length > 0) {
                          const payout = gameState.payoutResults.find((p) => p.playerId === player.id);
                          coinsWon = payout?.prize ?? 0;
                        } else if (isWinner) {
                          coinsWon = 200; // Default casual/offline victory reward
                        }

                        if (coinsWon > 0) {
                          return (
                            <span className="text-[10px] sm:text-[11px] font-mono font-black text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-lg border border-amber-400/60 shadow-[0_0_8px_rgba(250,204,21,0.25)] flex items-center gap-1">
                              <img
                                src="/play online modal and buttons/icon_coins.png"
                                alt="Coins"
                                className="w-3.5 h-3.5 object-contain inline-block drop-shadow"
                              />
                              <span>+₱{coinsWon.toLocaleString()}</span>
                            </span>
                          );
                        } else {
                          return (
                            <span className="text-[9px] sm:text-[10px] font-mono font-bold text-slate-400 bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-800">
                              ₱0
                            </span>
                          );
                        }
                      })()}

                      {player.xpGained !== undefined && (
                        <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/30">
                          +{player.xpGained} XP
                        </span>
                      )}

                      <span className="text-[10px] font-mono text-slate-300 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
                        {player.cardCount === 0 ? '0' : player.cardCount} cards
                      </span>

                      {isWinner ? (
                        <span className="font-black text-amber-950 text-[10px] px-2 py-0.5 rounded-lg bg-gradient-to-r from-amber-400 to-yellow-300 shadow border border-yellow-200">
                          PANALO
                        </span>
                      ) : isLoser ? (
                        <span className="font-bold text-red-200 text-[10px] px-2 py-0.5 rounded-lg bg-red-950/80 border border-red-500/60">
                          PUNGOT
                        </span>
                      ) : (
                        <span className="font-bold text-emerald-300 text-[10px] px-2 py-0.5 rounded-lg bg-emerald-950/60 border border-emerald-500/50">
                          LIGTAS
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="w-full flex items-center justify-center gap-2 pt-1 border-t border-slate-800/80 shrink-0">
          {isHost ? (
            <button
              onClick={onPlayAgain}
              className="py-2 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.4)] active:scale-95 transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Play Again</span>
            </button>
          ) : (
            <div className="py-2 px-3 rounded-xl bg-slate-800/90 text-slate-300 text-[11px] font-bold border border-slate-700">
              Waiting for host to restart match...
            </div>
          )}

          <button
            onClick={handleShare}
            className="py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 border border-slate-700 active:scale-95 transition cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share</span>
          </button>

          <button
            onClick={onLeave}
            className="py-2 px-3.5 rounded-xl bg-red-950/80 hover:bg-red-900 text-red-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 border border-red-700/60 active:scale-95 transition cursor-pointer"
          >
            <img src="/home screen in game icons/home.png" alt="Home" className="w-4 h-4 object-contain" />
            <span>Leave</span>
          </button>
        </div>
      </div>
    </div>
  );
};
