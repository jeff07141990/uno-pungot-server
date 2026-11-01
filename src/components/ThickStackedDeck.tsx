import React from 'react';
import { CardView } from './CardView';
import { GameVariant } from '../engine/types';

interface ThickStackedDeckProps {
  count?: number;
  isInteractive?: boolean;
  variant?: GameVariant;
  onClick?: () => void;
  className?: string;
  showTapPrompt?: boolean;
}

// 8 distinct physical card tiers matching the reference photo
const STACK_TIERS = [
  { id: 8, y: 26.0, z: 11, isBottom: true },
  { id: 7, y: 22.5, z: 12 },
  { id: 6, y: 19.0, z: 13 },
  { id: 5, y: 15.5, z: 14 },
  { id: 4, y: 12.0, z: 15 },
  { id: 3, y: 8.5, z: 16 },
  { id: 2, y: 5.5, z: 17 },
  { id: 1, y: 2.5, z: 18 },
];

export const ThickStackedDeck: React.FC<ThickStackedDeckProps> = ({
  count = 108,
  isInteractive = false,
  variant,
  onClick,
  className = '',
  showTapPrompt = false,
}) => {
  return (
    <div
      onClick={isInteractive ? () => onClick?.() : undefined}
      className={`relative select-none group inline-block ${
        isInteractive ? 'cursor-pointer' : 'cursor-default'
      } ${className}`}
      title={isInteractive ? 'Click to draw a card' : 'Draw Deck'}
    >
      {/* Deck Empty Slot Outline when count === 0 */}
      {count === 0 ? (
        <div
          onClick={isInteractive ? () => onClick?.() : undefined}
          className={`w-10 aspect-[2/3] sm:w-13 md:w-16 rounded-lg sm:rounded-xl md:rounded-2xl border-2 border-dashed border-red-500/60 bg-red-950/20 backdrop-blur-xs flex flex-col items-center justify-center p-1 sm:p-2 text-center transition-all ${
            isInteractive ? 'cursor-pointer hover:border-amber-400 hover:bg-amber-500/10' : ''
          }`}
        >
          <span className="text-sm sm:text-lg">📭</span>
          <span className="text-[7px] sm:text-[8px] font-black text-red-400 uppercase tracking-widest mt-0.5">UBOS NA</span>
          <span className="text-[6px] sm:text-[7px] text-amber-300 font-bold leading-tight mt-0.5">Bunot sa Katabi</span>
        </div>
      ) : (
        <>
          {/* 3D Deep Ground Shadow resting on the felt table */}
          <div
            className="absolute inset-0 w-9 aspect-[2/3] sm:w-12 md:w-14 rounded-md sm:rounded-lg bg-black/90 blur-md pointer-events-none"
            style={{
              transform: 'translateY(16px) scale(0.96)',
            }}
          />

          {/* 8 Stacked Card Layers - Perfectly flush with the top card */}
          {STACK_TIERS.map((tier) => (
            <div
              key={tier.id}
              className="absolute inset-0 w-9 aspect-[2/3] sm:w-12 md:w-14 rounded-md sm:rounded-lg pointer-events-none transition-transform"
              style={{
                zIndex: tier.z,
                transform: `translateY(${tier.y * 0.65}px)`,
                background:
                  'linear-gradient(to right, #808b96 0%, #a6b1bc 3%, #d5dde6 8%, #f1f5f9 22%, #ffffff 50%, #f1f5f9 78%, #d5dde6 92%, #a6b1bc 97%, #808b96 100%)',
                borderBottom: '1.5px solid #475569',
                borderTop: '1px solid rgba(255, 255, 255, 0.95)',
                borderLeft: '1px solid #718096',
                borderRight: '1px solid #718096',
                boxShadow: tier.isBottom
                  ? '0 18px 24px -2px rgba(0,0,0,0.85), 0 8px 12px -2px rgba(0,0,0,0.65)'
                  : '0 1px 1.5px rgba(0,0,0,0.22)',
              }}
            />
          ))}

          {/* Top Card (Authentic Uno Back resting flush on top of the stack) */}
          <div
            className={`relative z-20 transition-all duration-200 ${
              isInteractive
                ? 'group-hover:-translate-y-2 group-hover:drop-shadow-[0_12px_16px_rgba(0,0,0,0.7)] active:translate-y-0.5'
                : ''
            }`}
          >
            <CardView isBack={true} size="sm" variant={variant} className="shadow-lg" />

            {/* Deck Count Badge */}
            <div className="absolute -bottom-2 -right-2 bg-slate-950 text-amber-300 font-mono text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full border border-amber-400/80 shadow-2xl flex items-center gap-1 z-30">
              <span className="text-[9px]">🃏</span>
              <span>{count}</span>
            </div>
          </div>
        </>
      )}

      {/* "Tap to Draw" Prompt when it's the player's turn */}
      {showTapPrompt && (
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-amber-400 text-slate-950 text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full shadow-2xl border border-yellow-200 animate-bounce z-40">
          {count === 0 ? 'Bunot sa Katabi' : 'Kumuha (Draw)'}
        </div>
      )}
    </div>
  );
};
