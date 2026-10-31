import React from 'react';
import { CardView } from './CardView';

interface RealisticDeckShuffleProps {
  className?: string;
}

export const RealisticDeckShuffle: React.FC<RealisticDeckShuffleProps> = ({ className = '' }) => {
  // Staggered interleaved cards (4 Left, 4 Right) that flick into the center zipper
  const interleavedCards = [
    { id: 'L1', side: 'left' as const, delay: '0.28s', zIndex: 11 },
    { id: 'R1', side: 'right' as const, delay: '0.34s', zIndex: 12 },
    { id: 'L2', side: 'left' as const, delay: '0.40s', zIndex: 13 },
    { id: 'R2', side: 'right' as const, delay: '0.46s', zIndex: 14 },
    { id: 'L3', side: 'left' as const, delay: '0.52s', zIndex: 15 },
    { id: 'R3', side: 'right' as const, delay: '0.58s', zIndex: 16 },
    { id: 'L4', side: 'left' as const, delay: '0.64s', zIndex: 17 },
    { id: 'R4', side: 'right' as const, delay: '0.70s', zIndex: 18 },
  ];

  return (
    <div className={`relative flex flex-col items-center justify-center pointer-events-none select-none z-30 ${className}`}>
      {/* 3D Perspective Stage for Riffle Shuffle */}
      <div className="relative w-44 h-28 sm:w-52 sm:h-32 flex items-center justify-center">
        {/* Dynamic Table Felt Shadow */}
        <div className="absolute w-36 sm:w-44 h-12 bg-black/60 blur-md rounded-full pointer-events-none animate-shuffle-shadow" />

        {/* 1. LEFT BASE STACK (Thick 3D cut half) */}
        <div className="absolute animate-riffle-left-stack z-10 flex items-center justify-center">
          <div className="relative">
            {/* 3D Layered Card Edges (Deck thickness) */}
            <div className="absolute -top-1.5 -left-1.5 w-16 h-24 sm:w-20 sm:h-28 rounded-xl bg-slate-300 border border-slate-400 shadow-sm" />
            <div className="absolute -top-1 -left-1 w-16 h-24 sm:w-20 sm:h-28 rounded-xl bg-white/90 border border-slate-300 shadow-sm" />
            <div className="absolute -top-0.5 -left-0.5 w-16 h-24 sm:w-20 sm:h-28 rounded-xl bg-slate-100 border border-slate-300 shadow-sm" />
            <CardView isBack={true} size="md" className="shadow-2xl" />
          </div>
        </div>

        {/* 2. RIGHT BASE STACK (Thick 3D cut half) */}
        <div className="absolute animate-riffle-right-stack z-10 flex items-center justify-center">
          <div className="relative">
            {/* 3D Layered Card Edges (Deck thickness) */}
            <div className="absolute -top-1.5 -right-1.5 w-16 h-24 sm:w-20 sm:h-28 rounded-xl bg-slate-300 border border-slate-400 shadow-sm" />
            <div className="absolute -top-1 -right-1 w-16 h-24 sm:w-20 sm:h-28 rounded-xl bg-white/90 border border-slate-300 shadow-sm" />
            <div className="absolute -top-0.5 -right-0.5 w-16 h-24 sm:w-20 sm:h-28 rounded-xl bg-slate-100 border border-slate-300 shadow-sm" />
            <CardView isBack={true} size="md" className="shadow-2xl" />
          </div>
        </div>

        {/* 3. INTERLEAVING CARDS (The realistic alternating riffle zipper) */}
        {interleavedCards.map((c) => (
          <div
            key={c.id}
            className={`absolute flex items-center justify-center ${
              c.side === 'left' ? 'animate-riffle-card-left' : 'animate-riffle-card-right'
            }`}
            style={{
              zIndex: c.zIndex,
              animationDelay: c.delay,
            }}
          >
            <div className="relative">
              <CardView isBack={true} size="md" className="shadow-xl" />
            </div>
          </div>
        ))}

        {/* 4. BRIDGE ARCH TENSION GLOW HIGHLIGHT */}
        <div className="absolute w-20 h-24 rounded-2xl bg-amber-400/25 blur-xl pointer-events-none animate-bridge-glow z-20" />

        {/* 5. TABLE TAP SHOCKWAVE (Fires when deck squares up on felt table at ~1.4s) */}
        <div className="absolute w-28 h-20 rounded-full border border-amber-300/50 bg-amber-400/15 animate-riffle-tap-ripple pointer-events-none z-0" />
      </div>

      {/* Shuffling Status Pill */}
      <div className="absolute -bottom-8 whitespace-nowrap px-3.5 py-1 rounded-full bg-slate-950/95 border border-amber-400/80 shadow-2xl flex items-center gap-1.5 animate-bounce">
        <span className="text-xs">🔀</span>
        <span className="text-[10px] sm:text-xs font-black text-amber-300 tracking-wider uppercase">
          Shuffling Deck...
        </span>
      </div>
    </div>
  );
};
