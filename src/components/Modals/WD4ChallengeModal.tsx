import React from 'react';

interface WD4ChallengeModalProps {
  isOpen: boolean;
  playedByName: string;
  currentColor: string;
  onRespond: (acceptChallenge: boolean) => void;
}

export const WD4ChallengeModal: React.FC<WD4ChallengeModalProps> = ({
  isOpen,
  playedByName,
  currentColor,
  onRespond,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-slate-900 border-2 border-purple-500 rounded-2xl p-6 max-w-md w-full text-center shadow-2xl">
        <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-purple-600/30 border border-purple-400 flex items-center justify-center text-2xl font-black text-purple-300">
          +4
        </div>
        <h3 className="text-xl font-black text-white tracking-wide mb-2">WILD DRAW FOUR CHALLENGE</h3>
        <p className="text-sm text-slate-300 mb-4">
          <span className="font-bold text-amber-400">{playedByName}</span> played a Wild Draw 4. By rule, they are only allowed to play it if they have <span className="underline font-bold text-white">NO</span> cards matching <span className="font-bold text-cyan-400">{currentColor.toUpperCase()}</span>.
        </p>

        <div className="bg-slate-950/80 rounded-xl p-3 text-xs text-slate-400 mb-6 text-left space-y-1 border border-slate-800">
          <p>• <strong className="text-emerald-400">If you Challenge and they bluffed:</strong> They draw 4 cards instead!</p>
          <p>• <strong className="text-red-400">If you Challenge and they were honest:</strong> You draw 6 cards (4 + 2 penalty)!</p>
          <p>• <strong className="text-slate-300">If you Accept:</strong> You draw 4 cards and skip turn normally.</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => onRespond(false)}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-600 active:scale-95 transition"
          >
            Accept (+4 Cards)
          </button>
          <button
            onClick={() => onRespond(true)}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black border border-purple-400 shadow-lg active:scale-95 transition"
          >
            Challenge Bluff!
          </button>
        </div>
      </div>
    </div>
  );
};
