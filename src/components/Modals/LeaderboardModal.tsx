import React, { useState, useEffect } from 'react';
import {
  X,
  Trophy,
  Flame,
  Star,
  Award,
  Crown,
  Coins,
} from 'lucide-react';
import { PlayerWallet } from '../../engine/types';
import { economyService } from '../../services/economyService';

interface LeaderboardModalProps {
  isOpen: boolean;
  currentUserId: string;
  onClose: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  currentUserId,
  onClose,
}) => {
  const [tab, setTab] = useState<'wins' | 'streak' | 'level' | 'coins'>('wins');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    topWins: PlayerWallet[];
    topStreaks: PlayerWallet[];
    topLevels: PlayerWallet[];
    topCoins: PlayerWallet[];
  }>({
    topWins: [],
    topStreaks: [],
    topLevels: [],
    topCoins: [],
  });

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      economyService.getLeaderboards().then((res) => {
        setData(res);
        setLoading(false);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getActiveList = () => {
    switch (tab) {
      case 'wins':
        return data.topWins;
      case 'streak':
        return data.topStreaks;
      case 'level':
        return data.topLevels;
      case 'coins':
        return data.topCoins;
    }
  };

  const list = getActiveList();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border-2 border-amber-500/70 rounded-3xl p-4 sm:p-6 max-w-xl w-full shadow-[0_0_50px_rgba(245,158,11,0.25)] relative max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-slate-950 shadow-md">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-wide">
                LEADERBOARDS
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-400 font-medium">
                Talaan ng mga Pinakamagagaling na Manlalaro sa UNO Pungot
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="grid grid-cols-4 gap-1 sm:gap-2 my-3 shrink-0">
          <button
            onClick={() => setTab('wins')}
            className={`py-2 px-1 sm:px-2 rounded-xl font-black text-[11px] sm:text-xs transition flex flex-col items-center gap-0.5 cursor-pointer ${
              tab === 'wins'
                ? 'bg-amber-400 text-slate-950 shadow'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Panalo</span>
          </button>

          <button
            onClick={() => setTab('streak')}
            className={`py-2 px-1 sm:px-2 rounded-xl font-black text-[11px] sm:text-xs transition flex flex-col items-center gap-0.5 cursor-pointer ${
              tab === 'streak'
                ? 'bg-amber-400 text-slate-950 shadow'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Win Streak</span>
          </button>

          <button
            onClick={() => setTab('level')}
            className={`py-2 px-1 sm:px-2 rounded-xl font-black text-[11px] sm:text-xs transition flex flex-col items-center gap-0.5 cursor-pointer ${
              tab === 'level'
                ? 'bg-amber-400 text-slate-950 shadow'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <Star className="w-3.5 h-3.5" />
            <span>Level</span>
          </button>

          <button
            onClick={() => setTab('coins')}
            className={`py-2 px-1 sm:px-2 rounded-xl font-black text-[11px] sm:text-xs transition flex flex-col items-center gap-0.5 cursor-pointer ${
              tab === 'coins'
                ? 'bg-amber-400 text-slate-950 shadow'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>₱ Coins</span>
          </button>
        </div>

        {/* Rankings List */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2">
          {loading ? (
            <div className="text-center py-10 text-slate-400 text-xs font-bold animate-pulse">
              Ikinakarga ang leaderboard...
            </div>
          ) : list.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">
              Wala pang talaan. Maging una sa listahan sa pamamagitan ng paglalaro!
            </div>
          ) : (
            list.map((player, idx) => {
              const isSelf = player.playerId === currentUserId;
              const rank = idx + 1;

              return (
                <div
                  key={player.playerId}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition ${
                    isSelf
                      ? 'bg-amber-500/15 border-amber-400/80 shadow-md'
                      : rank === 1
                      ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border-amber-400/50'
                      : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Rank Badge */}
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shadow-inner ${
                        rank === 1
                          ? 'bg-amber-400 text-slate-950 font-black'
                          : rank === 2
                          ? 'bg-slate-300 text-slate-950 font-black'
                          : rank === 3
                          ? 'bg-amber-700 text-amber-100 font-black'
                          : 'bg-slate-800 text-slate-400 font-bold'
                      }`}
                    >
                      {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                    </div>

                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-lg overflow-hidden shrink-0">
                      {player.playerAvatar && player.playerAvatar.startsWith('data:image') ? (
                        <img src={player.playerAvatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span>{player.playerAvatar || '🐼'}</span>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-xs sm:text-sm text-white truncate max-w-[120px] sm:max-w-[160px]">
                          {player.playerName}
                        </span>
                        {isSelf && (
                          <span className="text-[9px] font-black text-amber-300 bg-amber-500/20 px-1.5 py-0.2 rounded border border-amber-500/40">
                            IKAW
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">
                        Lvl {player.level} • {player.totalWins}W - {player.totalLosses}L
                      </span>
                    </div>
                  </div>

                  {/* Stat display */}
                  <div className="text-right">
                    {tab === 'wins' && (
                      <div>
                        <span className="text-sm font-black text-amber-300">{player.totalWins}</span>
                        <span className="block text-[9px] text-slate-400 uppercase font-bold">Panalo</span>
                      </div>
                    )}
                    {tab === 'streak' && (
                      <div>
                        <span className="text-sm font-black text-orange-400">🔥 {player.bestWinStreak}</span>
                        <span className="block text-[9px] text-slate-400 uppercase font-bold">Best Streak</span>
                      </div>
                    )}
                    {tab === 'level' && (
                      <div>
                        <span className="text-sm font-black text-cyan-300">Level {player.level}</span>
                        <span className="block text-[9px] text-slate-400 uppercase font-bold">{player.experience} XP</span>
                      </div>
                    )}
                    {tab === 'coins' && (
                      <div>
                        <span className="text-sm font-black text-amber-400">₱{player.balance.toLocaleString()}</span>
                        <span className="block text-[9px] text-slate-400 uppercase font-bold">Barya</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
