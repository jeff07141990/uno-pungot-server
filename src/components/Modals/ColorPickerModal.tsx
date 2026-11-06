import React from 'react';
import { CardColor } from '../../engine/types';
import { soundManager } from '../../audio/soundManager';

interface ColorPickerModalProps {
  isOpen: boolean;
  onSelectColor: (color: CardColor) => void;
  variant?: string;
}

export const ColorPickerModal: React.FC<ColorPickerModalProps> = ({ isOpen, onSelectColor, variant = 'classic' }) => {
  if (!isOpen) return null;

  const colors: { name: string; value: CardColor; bg: string; hover: string; border: string }[] = [
    { name: 'RED', value: 'red', bg: 'bg-red-500', hover: 'hover:bg-red-600', border: 'border-red-400' },
    { name: 'BLUE', value: 'blue', bg: 'bg-blue-500', hover: 'hover:bg-blue-600', border: 'border-blue-400' },
    { name: 'YELLOW', value: 'yellow', bg: 'bg-amber-400', hover: 'hover:bg-amber-500', border: 'border-amber-300' },
    { name: 'GREEN', value: 'green', bg: 'bg-emerald-500', hover: 'hover:bg-emerald-600', border: 'border-emerald-400' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-slate-900 border-2 border-slate-700 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
        <h3 className="text-xl font-black text-white tracking-wide mb-1">CHOOSE ACTIVE COLOR</h3>
        <p className="text-xs text-slate-400 mb-6">Select the new color for the next players</p>

        <div className="grid grid-cols-2 gap-4">
          {colors.map((c) => (
            <button
              key={c.value}
              onClick={() => {
                if (variant === 'classic') {
                  soundManager.playColorVoice(c.value);
                }
                onSelectColor(c.value);
              }}
              className={`${c.bg} ${c.hover} text-white font-black text-lg py-6 rounded-xl border-2 ${c.border} shadow-lg transition-transform hover:scale-105 active:scale-95 flex flex-col items-center justify-center gap-1`}
            >
              <div className="w-5 h-5 rounded-full bg-white/30 border border-white/50"></div>
              <span>{c.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
