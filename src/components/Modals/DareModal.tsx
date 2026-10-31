import React from 'react';
import { Zap, Check, AlertCircle } from 'lucide-react';

interface DareModalProps {
  isOpen: boolean;
  dareText: string;
  penaltyCount: number;
  playedByName: string;
  onRespond: (acceptDare: boolean) => void;
}

export const DareModal: React.FC<DareModalProps> = ({
  isOpen,
  dareText,
  penaltyCount,
  playedByName,
  onRespond,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-slate-900 border-2 border-amber-500 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl relative">
        <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-3xl shadow-lg animate-bounce">
          ⚡
        </div>

        <h3 className="text-xl sm:text-2xl font-black text-white tracking-wide mb-1">
          UNO DARE CHALLENGE!
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          <strong className="text-amber-400">{playedByName}</strong> played a Dare card on you!
        </p>

        {/* Dare Prompt Card */}
        <div className="p-4 bg-gradient-to-br from-amber-500/10 via-purple-500/10 to-slate-950 border-2 border-amber-400/50 rounded-2xl mb-6 shadow-inner text-center">
          <div className="text-[11px] font-bold text-amber-400 uppercase tracking-widest mb-1">
            YOUR DARE:
          </div>
          <div className="text-base sm:text-lg font-black text-white italic">
            "{dareText}"
          </div>
        </div>

        <p className="text-xs text-slate-300 mb-6">
          Do you dare to accept the challenge, or will you draw <strong className="text-red-400">+{penaltyCount} penalty cards</strong>?
        </p>

        {/* Decision Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => onRespond(false)}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 active:scale-95 transition"
          >
            Draw +{penaltyCount} Cards
          </button>
          <button
            onClick={() => onRespond(true)}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs shadow-lg active:scale-95 transition flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>I Accept the Dare!</span>
          </button>
        </div>
      </div>
    </div>
  );
};
