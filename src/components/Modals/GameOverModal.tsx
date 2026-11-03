import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { PublicGameState } from '../../engine/types';
import { Trophy, RotateCcw, Home, Share2, Award } from 'lucide-react';

interface GameOverModalProps {
  isOpen: boolean;
  gameState: PublicGameState;
  currentUserId: string;
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
  onPlayAgain,
  onLeave,
  onToast,
}) => {
  useEffect(() => {
    if (isOpen) {
      // Trigger festive multi-burst confetti with zIndex above the modal (zIndex 9999)
      const duration = 3.5 * 1000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 70,
          origin: { x: 0, y: 0.7 },
          colors: ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#FCD34D'],
          zIndex: 9999,
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 70,
          origin: { x: 1, y: 0.7 },
          colors: ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#FCD34D'],
          zIndex: 9999,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();

      // Extra center blast
      confetti({
        particleCount: 80,
        spread: 100,
        origin: { y: 0.4 },
        zIndex: 9999,
      });
    }
  }, [isOpen]);

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
      } catch {
        // Fallback to clipboard
      }
    }
    await navigator.clipboard.writeText(text);
    onToast('Result copied to clipboard!');
  };

  const sortedPlayers = [...gameState.players].sort((a, b) => {
    const rankA = a.finishRank ?? (a.id === gameState.winnerId ? 1 : a.id === gameState.loserId ? 99 : 50);
    const rankB = b.finishRank ?? (b.id === gameState.winnerId ? 1 : b.id === gameState.loserId ? 99 : 50);
    return rankA - rankB;
  });

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white animate-fadeIn overflow-y-auto p-4 sm:p-6 md:p-8">
      {/* Background Animated Glows */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-10 left-10 w-80 h-80 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-10 right-10 w-80 h-80 bg-red-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Full-Screen Content Container */}
      <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center flex-1 my-auto py-2">
        {/* Top Header: Winner Crown & Trophy Hero */}
        <div className="flex flex-col items-center text-center mb-4">
          <div className="relative inline-block mb-3">
            {/* Glowing Ring Around Winner Avatar */}
            <div className="absolute -inset-2 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 rounded-3xl blur-md opacity-80 animate-pulse pointer-events-none" />
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-200 border-4 border-yellow-100 flex items-center justify-center text-5xl sm:text-6xl shadow-[0_0_40px_rgba(250,204,21,0.6)] overflow-hidden">
              <AvatarDisplay avatar={winner?.avatar || '🏆'} />
            </div>
            <div className="absolute -bottom-3 -right-3 bg-red-600 rounded-full p-2.5 border-2 border-white shadow-xl animate-bounce">
              <Trophy className="w-5 h-5 text-amber-300" />
            </div>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-400 tracking-tight drop-shadow-[0_2px_10px_rgba(250,204,21,0.4)]">
            {isCurrentUserWinner ? '🏆 VICTORY IS YOURS! 🏆' : `🏆 ${winner?.name || 'Player'} WINS! 🏆`}
          </h1>

          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs sm:text-sm font-semibold text-slate-300 bg-slate-800/80 px-3.5 py-1 rounded-full border border-slate-700 shadow">
              Room {gameState.roomId}
            </span>
            <span className="text-xs sm:text-sm font-semibold text-slate-300 bg-slate-800/80 px-3.5 py-1 rounded-full border border-slate-700 shadow">
              {gameState.turnCount} turns played
            </span>
          </div>

          {/* 5-Place Prize Pool Match Results Banner */}
          {gameState.entryFee && gameState.entryFee > 0 && gameState.payoutResults && gameState.payoutResults.length > 0 ? (
            <div className="mt-3 w-full max-w-xl p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/90 via-slate-900/90 to-amber-950/90 border-2 border-amber-400/80 shadow-[0_0_30px_rgba(250,204,21,0.35)] text-center animate-fadeIn">
              <div className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center justify-center gap-1.5 mb-1">
                <span>🏆</span>
                <span>5-Place Prize Pool Distribution (₱{gameState.prizePool?.toLocaleString()} Pool)</span>
              </div>
              {(() => {
                const userPayout = gameState.payoutResults.find((p) => p.playerId === currentUserId);
                if (userPayout) {
                  return (
                    <div className="text-xs sm:text-sm font-black text-amber-200">
                      Napanalunan Mo: <span className="text-yellow-300 font-mono text-base font-black">+₱{userPayout.prize.toLocaleString()}</span> ({userPayout.rank === 1 ? '1st Place 50%' : userPayout.rank === 2 ? '2nd Place 25%' : userPayout.rank === 3 ? '3rd Place 15%' : userPayout.rank === 4 ? '4th Place 7%' : '5th Place 3%'})!
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          ) : (
            /* Coin Reward Banner for Winner in Casual Match */
            isCurrentUserWinner && (
              <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500/25 via-yellow-500/20 to-amber-500/25 border-2 border-amber-400 text-xs sm:text-sm font-black text-amber-300 shadow-[0_0_25px_rgba(250,204,21,0.4)] animate-bounce">
                <span className="text-lg">💰</span>
                <span>
                  NAPANALUNAN: +₱200 Virtual Peso Coins! {gameState.activeCoinBoosters?.includes(currentUserId) ? '(2x Booster Active: ₱400!)' : ''}
                </span>
              </div>
            )
          )}

          {/* Loser / Pungot Announcement Banner */}
          {loser && (
            <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-red-950/80 border-2 border-red-500/70 text-xs sm:text-sm font-black text-red-200 shadow-[0_0_20px_rgba(239,68,68,0.35)] animate-pulse">
              <span className="text-lg">💀</span>
              <span>
                {isCurrentUserLoser
                  ? 'YOU HAD THE MOST CARDS AND LOST (IKAW ANG PUNGOT)!'
                  : `${loser.name} lost the match (Ang Pungot) with ${loser.cardCount} cards left!`}
              </span>
            </div>
          )}
        </div>

        {/* Players Elimination & Finish Ladder Scoreboard (Full Details & Winners Highlighted) */}
        <div className="w-full bg-slate-900/90 backdrop-blur-md rounded-3xl p-4 sm:p-6 border-2 border-amber-500/40 shadow-2xl mb-6">
          <div className="flex items-center justify-between text-xs sm:text-sm font-black text-amber-300 uppercase tracking-wider pb-3 border-b border-slate-800 px-2 sm:px-4">
            <span className="flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" />
              Standing & Player
            </span>
            <span>Cards & Result</span>
          </div>

          <div className="space-y-2.5 mt-3 max-h-[46vh] sm:max-h-[50vh] overflow-y-auto pr-1">
            {sortedPlayers.map((player) => {
              const isWinner = player.id === winner?.id;
              const isLoser = player.id === loser?.id;
              const rank = player.finishRank;

              return (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-3 sm:p-4 rounded-2xl transition-all shadow-md ${
                    isWinner
                      ? 'bg-gradient-to-r from-amber-500/30 via-yellow-500/20 to-amber-500/30 border-2 border-amber-400/90 text-amber-200 ring-2 ring-yellow-400/50 shadow-[0_0_25px_rgba(250,204,21,0.35)] scale-[1.01]'
                      : isLoser
                      ? 'bg-red-950/60 border-2 border-red-500/60 text-red-200 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                      : 'bg-slate-950/70 border border-slate-800 text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {/* Left: Medal, Avatar, Name & Status Badges */}
                  <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
                    <span className="text-xl sm:text-2xl font-black w-8 text-center drop-shadow">
                      {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : isLoser ? '💀' : `${rank || '-'}`}
                    </span>

                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl sm:text-3xl shrink-0 shadow overflow-hidden">
                      <AvatarDisplay avatar={player.avatar} />
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm sm:text-base font-black truncate max-w-[120px] sm:max-w-[220px] ${
                          isWinner ? 'text-amber-300' : isLoser ? 'text-red-300' : 'text-white'
                        }`}>
                          {player.name}
                        </span>
                        {player.id === currentUserId && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-600/60 text-blue-200 border border-blue-400/60">
                            YOU
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 mt-0.5">
                        {isWinner && (
                          <span className="text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-500/40 text-amber-200 border border-amber-400/80 shadow-[0_0_8px_rgba(250,204,21,0.4)]">
                            🏆 1ST PLACE (PANALO)
                          </span>
                        )}
                        {!isWinner && !isLoser && rank && (
                          <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/50">
                            RANK {rank} (LIGTAS)
                          </span>
                        )}
                        {isLoser && (
                          <span className="text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full bg-red-600/50 text-red-200 border border-red-500/80 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]">
                            💀 ANG PUNGOT
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Card Count, Prize Payout & Result Badge */}
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-2">
                    {(() => {
                      const payout = gameState.payoutResults?.find((p) => p.playerId === player.id);
                      if (payout && payout.prize > 0) {
                        return (
                          <span className="font-mono font-black text-xs sm:text-sm text-amber-300 bg-amber-500/20 px-2.5 py-1 rounded-xl border border-amber-500/40 shadow">
                            +₱{payout.prize.toLocaleString()}
                          </span>
                        );
                      }
                      return null;
                    })()}

                    <span className="text-xs sm:text-sm font-mono text-slate-300 bg-slate-900/90 px-2.5 py-1 rounded-xl border border-slate-700">
                      {player.cardCount === 0 ? '0 cards' : `${player.cardCount} left`}
                    </span>

                    {isWinner ? (
                      <span className="font-black text-amber-950 text-xs sm:text-sm px-3 py-1 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 shadow-[0_0_15px_rgba(250,204,21,0.8)] border border-yellow-200">
                        PANALO
                      </span>
                    ) : isLoser ? (
                      <span className="font-black text-red-200 text-xs sm:text-sm px-3 py-1 rounded-xl bg-red-950/80 border border-red-500/70 shadow">
                        PUNGOT
                      </span>
                    ) : (
                      <span className="font-bold text-emerald-300 text-xs sm:text-sm px-3 py-1 rounded-xl bg-emerald-950/60 border border-emerald-500/50">
                        LIGTAS
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-lg">
          {isHost ? (
            <button
              onClick={onPlayAgain}
              className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-base flex items-center justify-center gap-2.5 shadow-[0_0_25px_rgba(16,185,129,0.5)] active:scale-95 transition cursor-pointer"
            >
              <RotateCcw className="w-5 h-5" />
              <span>Play Again</span>
            </button>
          ) : (
            <div className="w-full sm:flex-1 py-3.5 px-4 rounded-2xl bg-slate-800/90 text-slate-300 text-xs sm:text-sm font-bold flex items-center justify-center border border-slate-700 text-center">
              Waiting for host to restart match...
            </div>
          )}

          <button
            onClick={handleShare}
            className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm flex items-center justify-center gap-2 border border-slate-700 active:scale-95 transition cursor-pointer shadow-lg"
          >
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </button>

          <button
            onClick={onLeave}
            className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-red-950/80 hover:bg-red-900 text-red-200 font-bold text-sm flex items-center justify-center gap-2 border border-red-700/60 active:scale-95 transition cursor-pointer shadow-lg"
          >
            <img src="/home screen in game icons/home.png" alt="Home" className="w-5 h-5 object-contain" />
            <span>Leave</span>
          </button>
        </div>
      </div>
    </div>
  );
};
