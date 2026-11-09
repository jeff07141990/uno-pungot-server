import React from 'react';
import { PublicPlayer } from '../../engine/types';

interface SevenSwapModalProps {
  isOpen: boolean;
  opponents: PublicPlayer[];
  onSelectPlayer: (targetId: string) => void;
  onClose?: () => void;
}

export const SevenSwapModal: React.FC<SevenSwapModalProps> = ({
  isOpen,
  opponents,
  onSelectPlayer,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-4 animate-fadeIn overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-slate-900 border-2 border-amber-500 rounded-2xl p-4 sm:p-6 max-w-md w-full text-center shadow-2xl my-auto max-h-[92vh] flex flex-col"
      >
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-black text-sm cursor-pointer border border-slate-700 transition z-10 shadow"
            title="Isara (Cancel)"
            aria-label="Cancel"
          >
            ✕
          </button>
        )}

        <div className="shrink-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center text-xl sm:text-2xl font-black text-amber-400">
            7
          </div>
          <h3 className="text-lg sm:text-xl font-black text-white tracking-wide mb-1">SEVEN RULE: SWAP HANDS</h3>
          <p className="text-xs text-slate-400 mb-4">Choose an opponent to swap your entire hand with</p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 overflow-y-auto max-h-[58vh] pr-1 flex-1">
          {opponents.map((player) => (
            <button
              key={player.id}
              onClick={() => onSelectPlayer(player.id)}
              className="p-2 sm:p-3 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 hover:border-amber-400 rounded-xl flex items-center gap-2 sm:gap-3 transition-transform hover:scale-105 active:scale-95 text-left"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden flex items-center justify-center shrink-0 text-xl sm:text-2xl">
                {player.avatar && player.avatar.startsWith('data:image') ? (
                  <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
                ) : (
                  <span>{player.avatar}</span>
                )}
              </div>
              <div className="overflow-hidden min-w-0">
                <div className="font-bold text-xs sm:text-sm text-white truncate">{player.name}</div>
                <div className="text-[10px] sm:text-xs text-amber-400 font-semibold">{player.cardCount} cards</div>
              </div>
            </button>
          ))}
        </div>

        {onClose && (
          <div className="shrink-0 pt-1">
            <button
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-white px-4 py-1.5 rounded-full hover:bg-slate-800 transition cursor-pointer font-bold border border-slate-700"
            >
              ✕ Huwag Muna (Cancel)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
