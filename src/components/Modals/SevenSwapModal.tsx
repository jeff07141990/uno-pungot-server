import React from 'react';
import { PublicPlayer } from '../../engine/types';

interface SevenSwapModalProps {
  isOpen: boolean;
  opponents: PublicPlayer[];
  onSelectPlayer: (targetId: string) => void;
}

export const SevenSwapModal: React.FC<SevenSwapModalProps> = ({
  isOpen,
  opponents,
  onSelectPlayer,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-slate-900 border-2 border-amber-500 rounded-2xl p-6 max-w-md w-full text-center shadow-2xl">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center text-2xl font-black text-amber-400">
          7
        </div>
        <h3 className="text-xl font-black text-white tracking-wide mb-1">SEVEN RULE: SWAP HANDS</h3>
        <p className="text-xs text-slate-400 mb-5">Choose an opponent to swap your entire hand with</p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {opponents.map((player) => (
            <button
              key={player.id}
              onClick={() => onSelectPlayer(player.id)}
              className="p-3 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 hover:border-amber-400 rounded-xl flex items-center gap-3 transition-transform hover:scale-105 active:scale-95 text-left"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center shrink-0 text-2xl">
                {player.avatar && player.avatar.startsWith('data:image') ? (
                  <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
                ) : (
                  <span>{player.avatar}</span>
                )}
              </div>
              <div className="overflow-hidden">
                <div className="font-bold text-sm text-white truncate">{player.name}</div>
                <div className="text-xs text-amber-400 font-semibold">{player.cardCount} cards</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
