import React, { useState } from 'react';
import {
  X,
  Gift,
  CheckCircle2,
  Calendar,
  Sparkles,
  Trophy,
  ArrowRight,
  Flame,
} from 'lucide-react';
import { DailyMission, PlayerWallet } from '../../engine/types';

interface MissionsModalProps {
  isOpen: boolean;
  wallet: PlayerWallet | null;
  missions: DailyMission[];
  onClaimDailyLogin: () => Promise<void>;
  onClaimMission: (missionId: string) => Promise<void>;
  onClose: () => void;
  onOpenShop?: () => void;
}

export const MissionsModal: React.FC<MissionsModalProps> = ({
  isOpen,
  wallet,
  missions,
  onClaimDailyLogin,
  onClaimMission,
  onClose,
  onOpenShop,
}) => {
  const [claimingDaily, setClaimingDaily] = useState(false);
  const [claimingMissionId, setClaimingMissionId] = useState<string | null>(null);

  if (!isOpen) return null;

  const todayKey = (() => {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(
      now.getUTCDate()
    ).padStart(2, '0')}`;
  })();

  const isDailyClaimed = wallet?.lastDailyClaimDate === todayKey;

  const handleClaimDaily = async () => {
    setClaimingDaily(true);
    try {
      await onClaimDailyLogin();
    } finally {
      setClaimingDaily(false);
    }
  };

  const handleClaimMission = async (id: string) => {
    setClaimingMissionId(id);
    try {
      await onClaimMission(id);
    } finally {
      setClaimingMissionId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border-2 border-amber-500/70 rounded-3xl p-4 sm:p-6 max-w-xl w-full shadow-[0_0_50px_rgba(245,158,11,0.25)] relative max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-slate-950 shadow-md">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-wide flex items-center gap-2">
                <span>DAILY REWARDS & MISSIONS</span>
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-400 font-medium">
                Mag-login araw-araw at tapusin ang mga misyon para sa libreng barya!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-amber-500/20 border-2 border-amber-400/80 px-3 py-1 rounded-full shadow-inner">
              <span className="text-base">💰</span>
              <span className="font-black text-amber-300 text-xs sm:text-sm">
                ₱{(wallet?.balance ?? 0).toLocaleString()}
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pr-1 py-3 space-y-3.5">
          {/* Daily Login Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 border-2 border-amber-400/60 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-center sm:text-left">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-slate-950 text-2xl shadow shrink-0">
                <span>🎁</span>
              </div>
              <div>
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <h3 className="font-black text-sm text-white">Araw-Araw na Pabuya (Daily Login)</h3>
                  <span className="text-[9px] font-black px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    +₱100
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Mag-claim ng ₱100 virtual coins isang beses bawat 24 oras!
                </p>
              </div>
            </div>

            <button
              disabled={isDailyClaimed || claimingDaily}
              onClick={handleClaimDaily}
              className={`px-5 py-2.5 rounded-xl font-black text-xs shadow-md transition-all active:scale-95 shrink-0 ${
                isDailyClaimed
                  ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-slate-950 cursor-pointer animate-pulse'
              }`}
            >
              {isDailyClaimed ? 'Nakuha Na (Bukas Ulit)' : claimingDaily ? 'Kinukuha...' : 'KUNIN ₱100'}
            </button>
          </div>

          {/* Win Streak Card */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-xl text-orange-400">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-white">Kasulukuyang Win Streak</h4>
                <p className="text-[11px] text-slate-400">
                  Manalo nang sunod-sunod para sa karagdagang bonus coins hanggang +₱200 bawat panalo!
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-base font-black text-amber-400">
                🔥 {wallet?.winStreak ?? 0}
              </span>
              <span className="block text-[10px] text-slate-500 font-semibold">
                Pinakamataas: {wallet?.bestWinStreak ?? 0}
              </span>
            </div>
          </div>

          {/* Missions List */}
          <div>
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>Arawang Mga Misyon (Daily Tasks)</span>
            </h4>

            <div className="space-y-2">
              {missions.map((mission) => {
                const progressPct = Math.min(
                  Math.round((mission.currentCount / mission.targetCount) * 100),
                  100
                );
                const isClaiming = claimingMissionId === mission.id;

                return (
                  <div
                    key={mission.id}
                    className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-white">{mission.title}</span>
                        <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-400/30">
                          +₱{mission.rewardCoins}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{mission.description}</p>

                      {/* Progress Bar */}
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-300"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-300">
                          {mission.currentCount}/{mission.targetCount}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {mission.isClaimed ? (
                        <span className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-500 text-xs font-bold flex items-center gap-1 border border-slate-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                          <span>Tapos</span>
                        </span>
                      ) : mission.isCompleted ? (
                        <button
                          disabled={isClaiming}
                          onClick={() => handleClaimMission(mission.id)}
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 text-slate-950 text-xs font-black shadow-md active:scale-95 transition cursor-pointer animate-bounce"
                        >
                          {isClaiming ? 'Kinukuha...' : `Kunin ₱${mission.rewardCoins}`}
                        </button>
                      ) : (
                        <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 text-xs font-bold">
                          Patuloy
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        {onOpenShop && (
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 shrink-0">
            <span>Gamitin ang iyong naipong barya sa Power-Up Shop!</span>
            <button
              onClick={() => {
                onClose();
                onOpenShop();
              }}
              className="text-amber-400 hover:text-yellow-300 font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>Buksan ang Tindahan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
