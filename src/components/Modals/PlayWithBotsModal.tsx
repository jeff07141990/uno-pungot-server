import React, { useState } from 'react';
import { X, Bot, Play, Sparkles } from 'lucide-react';
import { GameVariant } from '../../engine/types';

interface PlayWithBotsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (botCount: number, variant: GameVariant) => void;
}

export const PlayWithBotsModal: React.FC<PlayWithBotsModalProps> = ({
  isOpen,
  onClose,
  onStart,
}) => {
  const [botCount, setBotCount] = useState<number>(3);
  const [variant, setVariant] = useState<GameVariant>('classic');

  if (!isOpen) return null;

  const VARIANTS: { id: GameVariant; name: string; icon: string; desc: string; badge: string; color: string }[] = [
    {
      id: 'classic',
      name: 'Classic UNO',
      icon: '🎴',
      desc: 'Standard color and number matching with standard action cards.',
      badge: 'Classic',
      color: 'border-amber-400/80 bg-amber-500/15 text-amber-300',
    },
    {
      id: 'all_wild',
      name: 'UNO All Wild',
      icon: '🌈',
      desc: 'Every card is wild! Targeted +2, Skip Two, and Wild Swaps.',
      badge: 'High Chaos',
      color: 'border-purple-400/80 bg-purple-500/15 text-purple-300',
    },
    {
      id: 'flip',
      name: 'UNO Flip!',
      icon: '🔄',
      desc: 'Two-sided cards! Flip between Light Side and tough Dark Side.',
      badge: 'Two-Sided',
      color: 'border-cyan-400/80 bg-cyan-500/15 text-cyan-300',
    },
    {
      id: 'dare',
      name: 'UNO Dare!',
      icon: '⚡',
      desc: 'Take a spicy Dare or draw penalty cards when Dare cards drop!',
      badge: 'Party',
      color: 'border-rose-400/80 bg-rose-500/15 text-rose-300',
    },
  ];

  const handleStart = () => {
    onStart(botCount, variant);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 animate-fadeIn">
      <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-5 sm:p-6 max-w-lg w-full text-left shadow-2xl relative max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center">
              <Bot className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-wide flex items-center gap-1.5">
                <span>PLAY WITH BOTS</span>
                <span className="text-[10px] font-bold text-purple-300 bg-purple-950/80 px-2 py-0.5 rounded-full border border-purple-700/60 uppercase">
                  Solo Practice
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">Piliin ang game mode at bilang ng mga bot na makakalaban mo.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-3.5 space-y-4 pr-1">
          {/* Game Variant Selection */}
          <div>
            <label className="text-xs font-black uppercase text-slate-300 tracking-wider block mb-2 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Piliin ang Game Mode</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {VARIANTS.map((v) => {
                const isSelected = variant === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVariant(v.id)}
                    className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? `${v.color} shadow-lg ring-2 ring-white/20 scale-[1.01]`
                        : 'border-slate-800 bg-slate-950/70 hover:border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xl">{v.icon}</span>
                        <span className={`text-sm font-black ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                          {v.name}
                        </span>
                      </div>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border ${
                        isSelected ? 'bg-white/20 border-white/40 text-white' : 'bg-slate-900 border-slate-800 text-slate-500'
                      }`}>
                        {v.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">{v.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Number of Bot Opponents */}
          <div className="bg-slate-950/80 rounded-2xl border border-slate-800 p-3.5">
            <div className="flex items-center justify-between mb-2">
              <div>
                <label className="text-xs font-black uppercase text-slate-300 tracking-wider block">
                  Bilang ng Kalabang Bots
                </label>
                <p className="text-[10px] text-slate-500">Pumili mula 1 hanggang 9 na AI bots</p>
              </div>
              <div className="text-right">
                <span className="text-xl font-black text-amber-400">{botCount}</span>
                <span className="text-xs text-slate-400 font-bold ml-1">{botCount === 1 ? 'Bot' : 'Bots'}</span>
              </div>
            </div>

            <div className="grid grid-cols-9 gap-1.5 pt-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
                const isSelected = botCount === num;
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setBotCount(num)}
                    className={`h-9 rounded-xl font-black text-xs transition cursor-pointer flex items-center justify-center ${
                      isSelected
                        ? 'bg-gradient-to-tr from-purple-600 to-indigo-500 text-white shadow-lg ring-2 ring-purple-300 scale-105'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                    }`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleStart}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs sm:text-sm shadow-xl flex items-center gap-2 transition hover:scale-[1.02] active:scale-95 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Simulan ang Laro ({botCount} Bots)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
