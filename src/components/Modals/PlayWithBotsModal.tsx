import React, { useState } from 'react';
import { X } from 'lucide-react';
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

  const VARIANTS: { id: GameVariant | 'no_mercy' | 'dos'; name: string; image: string; comingSoon?: boolean; glowColor: string }[] = [
    { id: 'classic', name: 'Classic', image: '/uno cards buttons/classic.png', glowColor: 'shadow-[0_0_20px_rgba(239,68,68,0.9)] ring-amber-400' },
    { id: 'all_wild', name: 'All Wild', image: '/uno cards buttons/all wild.png', glowColor: 'shadow-[0_0_20px_rgba(168,85,247,0.9)] ring-amber-400' },
    { id: 'flip', name: 'Flip!', image: '/uno cards buttons/FLIP.png', glowColor: 'shadow-[0_0_20px_rgba(6,182,212,0.9)] ring-amber-400' },
    { id: 'dare', name: 'Dare', image: '/uno cards buttons/DARE.png', glowColor: 'shadow-[0_0_20px_rgba(245,158,11,0.9)] ring-amber-400' },
    { id: 'no_mercy', name: 'No Mercy', image: '/uno cards buttons/NO MERCY.png', comingSoon: true, glowColor: '' },
    { id: 'dos', name: 'DOS', image: '/uno cards buttons/DOS.png', comingSoon: true, glowColor: '' },
  ];

  const handleStart = () => {
    onStart(botCount, variant);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center select-none overflow-hidden p-2 sm:p-4 bg-slate-950 text-white">
      {/* Background Image: modal background.jpg */}
      <img
        src="/play online modal and buttons/modal background.jpg"
        alt="Background"
        className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none"
        draggable={false}
      />
      {/* Subtle overlay for contrast */}
      <div className="absolute inset-0 bg-[#06041c]/40 backdrop-blur-[1px] pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-5xl max-h-[96vh] flex flex-col justify-between overflow-hidden">
        
        {/* Top Header Controls */}
        <div className="flex items-center justify-between pb-1 shrink-0 px-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-amber-300/90 drop-shadow">
              PLAY WITH BOTS (SOLO PRACTICE)
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-900/80 hover:bg-red-600 text-white border border-slate-700 hover:border-red-500 transition cursor-pointer shadow-lg"
            title="Close"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Center Content: Two Columns separated by Gold Divider */}
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-5 items-center px-1 sm:px-3 py-1">
          
          {/* ================= LEFT SIDE: GAME SELECT (3x2 Grid) ================= */}
          <div className="md:col-span-5 flex flex-col justify-center">
            <h2 className="text-xs sm:text-sm md:text-base font-black uppercase tracking-wider text-white mb-1.5 drop-shadow-[0_3px_6px_rgba(0,0,0,0.9)] flex items-center gap-1.5">
              <span>GAME SELECT</span>
            </h2>

            {/* 3x2 Grid of Uno Cards - perfectly sized */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 max-w-[320px] sm:max-w-none">
              {VARIANTS.map((v) => {
                const isSelected = variant === v.id;
                const isComingSoon = v.comingSoon;
                return (
                  <button
                    key={v.id}
                    type="button"
                    disabled={isComingSoon}
                    onClick={() => !isComingSoon && setVariant(v.id as GameVariant)}
                    className={`relative rounded-xl transition-all duration-200 focus:outline-none flex flex-col items-center ${
                      isComingSoon
                        ? 'opacity-40 cursor-not-allowed'
                        : 'cursor-pointer hover:scale-105 active:scale-95'
                    } ${
                      isSelected && !isComingSoon
                        ? 'scale-105 z-20'
                        : 'hover:brightness-110 z-10'
                    }`}
                  >
                    {/* Rotating light beam wrapper for selected card */}
                    {isSelected && !isComingSoon && (
                      <div className="absolute -inset-[3px] rounded-xl overflow-hidden pointer-events-none z-0">
                        <div
                          className="w-[200%] h-[200%] -top-1/2 -left-1/2 absolute anim-rotating-light"
                          style={{
                            background:
                              'conic-gradient(from 0deg, transparent 0deg, #facc15 60deg, #ffffff 120deg, #38bdf8 180deg, transparent 240deg, #facc15 360deg)',
                          }}
                        />
                      </div>
                    )}

                    <div
                      className={`relative w-full aspect-[2/3] rounded-xl overflow-hidden transition-all duration-200 z-10 ${
                        isSelected && !isComingSoon
                          ? 'shadow-[0_0_20px_rgba(250,204,21,0.95)] border-2 border-white'
                          : 'shadow-md border border-white/80 hover:border-amber-300'
                      }`}
                    >
                      <img
                        src={v.image}
                        alt={v.name}
                        className="w-full h-full object-cover select-none pointer-events-none"
                        draggable={false}
                      />
                      {isComingSoon && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[1px]">
                          <img
                            src="/uno cards buttons/COMING SOON.png"
                            alt="Coming Soon"
                            className="w-[85%] h-auto drop-shadow-lg"
                            draggable={false}
                          />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ================= VERTICAL GOLD DIVIDER ================= */}
          <div className="hidden md:flex md:col-span-1 justify-center h-full items-center">
            <div className="w-[2.5px] h-[80%] bg-gradient-to-b from-amber-400/20 via-amber-400 to-amber-400/20 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
          </div>

          {/* ================= RIGHT SIDE: BOT OPPONENTS & SETTINGS ================= */}
          <div className="md:col-span-6 flex flex-col justify-center gap-3 sm:gap-4">
            
            {/* BOT COUNT SELECTION */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-purple-500/20 border-2 border-purple-400/50 flex items-center justify-center shadow">
                  <span className="text-xl sm:text-2xl">🤖</span>
                </div>
                <div>
                  <span className="text-sm sm:text-base font-black uppercase text-white tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] block leading-none">
                    BILANG NG KALABANG BOTS
                  </span>
                  <span className="text-[10px] text-amber-300 font-semibold mt-0.5 block">
                    Pumili ng 1 hanggang 9 na AI Bots
                  </span>
                </div>
                <div className="ml-auto w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-b from-[#1b1040] to-[#0d0728] border-2 border-amber-400 flex items-center justify-center font-black text-sm sm:text-base text-white shadow-[0_0_12px_rgba(251,191,36,0.6)] shrink-0">
                  {botCount}
                </div>
              </div>

              {/* 3D Glossy Gold Buttons for Bot Count: 1 to 9 */}
              <div className="grid grid-cols-9 gap-1 sm:gap-1.5 pt-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
                  const isSelected = botCount === num;
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setBotCount(num)}
                      className={`relative py-2 sm:py-2.5 rounded-xl font-black text-xs sm:text-base tracking-wide transition-all duration-150 cursor-pointer text-center select-none ${
                        isSelected
                          ? 'bg-gradient-to-b from-[#FFF275] via-[#FFC000] to-[#E68A00] text-slate-950 shadow-[0_4px_14px_rgba(245,158,11,0.8),inset_0_2px_3px_rgba(255,255,255,0.9)] border-2 border-white scale-105 z-10'
                          : 'bg-gradient-to-b from-[#D49300] via-[#A86F00] to-[#784E00] text-amber-100/90 shadow-[0_2px_6px_rgba(0,0,0,0.5),inset_0_1px_2px_rgba(255,255,255,0.3)] border border-amber-600/70 hover:brightness-125'
                      }`}
                    >
                      <span className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]">
                        {num}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PRACTICE MODE PERKS BANNER */}
            <div className="p-2.5 rounded-2xl bg-purple-950/40 border border-purple-500/30 flex items-center gap-2.5 shadow-inner">
              <span className="text-2xl">⚡</span>
              <div className="text-[10px] sm:text-xs text-slate-300">
                <span className="text-amber-300 font-bold block">Solo Offline Training</span>
                Walang entry fee, walang bawas sa coins, at magandang paraan para matuto at subukan ang bawat variant!
              </div>
            </div>

            {/* BOTTOM START GAME BUTTON */}
            <div className="pt-2 flex items-center justify-center sm:justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 font-bold text-xs sm:text-sm border border-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStart}
                className="px-8 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 hover:from-amber-300 hover:to-yellow-200 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_4px_20px_rgba(251,191,36,0.7),inset_0_2px_4px_rgba(255,255,255,0.9)] border-2 border-white hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>SIMULAN ANG LARO ({botCount} BOTS)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
