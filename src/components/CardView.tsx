import React, { useState, useEffect } from 'react';
import { Card, CardColor, GameVariant } from '../engine/types';
import { getCustomCardSkins, CustomCardSkinMap } from '../utils/cardSkins';

interface CardViewProps {
  card?: Card | null;
  isBack?: boolean;
  isPlayable?: boolean;
  isSelected?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: GameVariant;
  backCountBadge?: number;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

const COLOR_BG_MAP: Record<CardColor, string> = {
  red: 'bg-[#d7261e] border-white text-white',
  blue: 'bg-[#0066cc] border-white text-white',
  green: 'bg-[#009933] border-white text-white',
  yellow: 'bg-[#ffcc00] border-white text-black',
  // Dark Side colors for Uno Flip
  teal: 'bg-[#008080] border-white text-white',
  orange: 'bg-[#ff6600] border-white text-white',
  purple: 'bg-[#660099] border-white text-white',
  pink: 'bg-[#e6007e] border-white text-white',
  wild: 'bg-black border-white text-white',
};

const COLOR_BORDER_MAP: Record<CardColor, string> = {
  red: 'border-red-400',
  blue: 'border-blue-400',
  green: 'border-emerald-400',
  yellow: 'border-amber-300',
  teal: 'border-teal-300',
  orange: 'border-orange-300',
  purple: 'border-purple-300',
  pink: 'border-pink-300',
  wild: 'border-neutral-500',
};

export const CardView: React.FC<CardViewProps> = ({
  card,
  isBack = false,
  isPlayable = false,
  isSelected = false,
  size = 'md',
  variant,
  backCountBadge,
  onClick,
  className = '',
  style,
}) => {
  const [skins, setSkins] = useState<CustomCardSkinMap>(() => getCustomCardSkins());

  useEffect(() => {
    const handleUpdate = () => {
      setSkins(getCustomCardSkins());
    };
    window.addEventListener('uno_skins_updated', handleUpdate);
    return () => window.removeEventListener('uno_skins_updated', handleUpdate);
  }, []);

  // Size dimensions - increased for clear and prominent cards
  const sizeClasses = {
    xs: 'w-11 h-16 sm:w-12 sm:h-18 rounded-lg text-xs shadow-md',
    sm: 'w-14 h-22 sm:w-16 sm:h-24 md:w-18 md:h-26 rounded-xl text-sm shadow-lg',
    md: 'w-20 h-30 sm:w-24 sm:h-36 rounded-2xl text-lg shadow-xl',
    lg: 'w-24 h-36 sm:w-28 sm:h-42 md:w-32 md:h-48 rounded-2xl text-2xl shadow-2xl',
  }[size];

  if (isBack || !card) {
    const variantBackSrc =
      variant === 'all_wild'
        ? skins.card_back_all_wild
        : variant === 'flip'
        ? skins.card_back_flip
        : variant === 'dare'
        ? skins.card_back_dare
        : undefined;

    const backSrc = variantBackSrc || skins.card_back || '/uno_card_back.png';
    return (
      <div
        onClick={onClick}
        style={style}
        className={`relative ${sizeClasses} flex items-center justify-center cursor-pointer transition-all duration-200 select-none shadow-md overflow-hidden rounded-md sm:rounded-lg md:rounded-xl ${className}`}
      >
        <img
          src={backSrc}
          alt="UNO Card Back"
          className="w-full h-full object-fill select-none pointer-events-none rounded-[inherit]"
          loading="eager"
          draggable={false}
        />

        {/* Actual Card Quantity Display on Card Face */}
        {typeof backCountBadge === 'number' && (
          <div className="absolute inset-x-0 bottom-0.5 sm:bottom-1 flex items-center justify-center pointer-events-none z-10">
            <span className="bg-yellow-400 text-slate-950 font-black text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-full border border-black shadow-[0_1px_4px_rgba(0,0,0,0.9)] leading-none">
              {backCountBadge}
            </span>
          </div>
        )}
      </div>
    );
  }

  // Specific card key: e.g. "red_5", "blue_skip", "yellow_draw2", "green_reverse", "wild", "wild4", "wild_skip2", "wild_targeted_draw2", "wild_forced_swap", "flip", "draw1", "draw5", "skip_all", "wild_draw_color", "dare", "wild_dare"
  const specificKey = card.type === 'number'
    ? `${card.color}_${card.value}`
    : `${card.color}_${card.type}`;

  // Check if a custom image skin was uploaded for this specific card or general type
  const customSkinSrc =
    skins[specificKey] ||
    skins[card.type] ||
    (card.type === 'skip'
      ? skins.skip || '/cards/skip.png'
      : card.type === 'reverse'
      ? skins.reverse || '/cards/reverse.png'
      : card.type === 'draw2'
      ? skins.draw2 || '/cards/draw2.png'
      : card.type === 'wild'
      ? skins.wild
      : card.type === 'wild4'
      ? skins.wild4 || '/cards/wild4.png'
      : undefined);

  if (customSkinSrc) {
    return (
      <div
        onClick={isPlayable ? onClick : undefined}
        style={style}
        className={`relative ${sizeClasses} flex items-center justify-center select-none transition-all duration-200 overflow-hidden rounded-lg sm:rounded-xl md:rounded-2xl shadow-xl ${
          isPlayable
            ? 'cursor-pointer hover:-translate-y-4 hover:shadow-2xl hover:scale-105 ring-2 ring-amber-300 ring-offset-2 ring-offset-slate-900 active:scale-95'
            : 'cursor-not-allowed opacity-90'
        } ${isSelected ? '-translate-y-5 ring-4 ring-cyan-400' : ''} ${className}`}
      >
        <img
          src={customSkinSrc}
          alt={card.type}
          className="w-full h-full object-fill select-none pointer-events-none rounded-[inherit]"
          loading="eager"
          draggable={false}
        />

        {/* Playable Indicator Glow */}
        {isPlayable && (
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 z-20">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,1)]"></span>
          </span>
        )}
      </div>
    );
  }

  const bgGradient = COLOR_BG_MAP[card.color] || COLOR_BG_MAP.wild;
  const isWildCard = card.color === 'wild' || card.type === 'wild' || card.type === 'wild4' || card.type === 'wild_dare' || card.type === 'wild_draw_color';

  // Render symbol/value
  const renderSymbol = () => {
    switch (card.type) {
      case 'number':
        return (
          <span
            className="font-black italic tracking-tighter select-none"
            style={{
              fontSize: size === 'lg' ? '4.8rem' : size === 'md' ? '3.4rem' : size === 'sm' ? '2.4rem' : '1.7rem',
              color: '#ffffff',
              WebkitTextStroke: '2px #000000',
              textShadow: '3px 4px 0 #000000',
              transform: 'skewX(-6deg)',
            }}
          >
            {card.value}
          </span>
        );

      case 'skip':
        // Authentic Uno Skip Symbol: White slashed circle with solid black 3D shadow
        return (
          <svg className="w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 drop-shadow-[2px_3px_0_rgba(0,0,0,0.95)]" viewBox="0 0 100 100">
            {/* 3D Black Underlay */}
            <circle cx="53" cy="53" r="38" fill="none" stroke="#000000" strokeWidth="18" />
            <line x1="28" y1="28" x2="78" y2="78" stroke="#000000" strokeWidth="18" strokeLinecap="round" />
            {/* Top White Slashed Circle */}
            <circle cx="50" cy="50" r="38" fill="none" stroke="#ffffff" strokeWidth="16" />
            <line x1="25" y1="25" x2="75" y2="75" stroke="#ffffff" strokeWidth="16" strokeLinecap="round" />
            <circle cx="50" cy="50" r="38" fill="none" stroke="#000000" strokeWidth="3" />
            <line x1="25" y1="25" x2="75" y2="75" stroke="#000000" strokeWidth="3" strokeLinecap="round" />
          </svg>
        );

      case 'reverse':
        // Authentic Uno Reverse: Two opposing curved arrows with black outline and drop shadow
        return (
          <svg className="w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 filter drop-shadow-[2px_3px_0_rgba(0,0,0,0.95)]" viewBox="0 0 100 100">
            {/* Top-right pointing arrow */}
            <path
              d="M32 62 C32 40, 48 30, 68 28 L68 18 L88 34 L68 50 L68 40 C54 40, 44 48, 44 62 Z"
              fill="#ffffff"
              stroke="#000000"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            {/* Bottom-left pointing arrow */}
            <path
              d="M68 38 C68 60, 52 70, 32 72 L32 82 L12 66 L32 50 L32 60 C46 60, 56 52, 56 38 Z"
              fill="#ffffff"
              stroke="#000000"
              strokeWidth="4"
              strokeLinejoin="round"
            />
          </svg>
        );

      case 'draw2':
      case 'targeted_draw2':
        // Authentic Uno +2: Two stacked cards with black shadow
        return (
          <div className="relative w-10 h-12 sm:w-14 sm:h-16 md:w-16 md:h-20 flex items-center justify-center">
            {/* Back card */}
            <div className="absolute top-0 right-1 w-6 h-9 sm:w-8 sm:h-12 md:w-10 md:h-14 bg-white rounded-[4px] border-2 border-black shadow-[3px_4px_0_rgba(0,0,0,0.9)] transform rotate-[10deg]"></div>
            {/* Front card */}
            <div className="absolute bottom-0 left-1 w-6 h-9 sm:w-8 sm:h-12 md:w-10 md:h-14 bg-white rounded-[4px] border-2 border-black shadow-[3px_4px_0_rgba(0,0,0,0.9)] transform -rotate-[5deg]"></div>
          </div>
        );

      case 'wild':
        // Authentic Uno Wild: 4-color oval segmented into Red, Blue, Yellow, Green with black outline
        return (
          <div className="w-12 h-16 sm:w-16 sm:h-22 md:w-18 md:h-26 rounded-[50%/35%] rotate-[-28deg] border-2 sm:border-3 border-white shadow-[0_0_12px_rgba(0,0,0,0.9)] overflow-hidden grid grid-cols-2 grid-rows-2">
            <div className="bg-[#e61924]"></div>
            <div className="bg-[#0066cc]"></div>
            <div className="bg-[#ffcc00]"></div>
            <div className="bg-[#009933]"></div>
          </div>
        );

      case 'wild4':
      case 'draw5':
        // Authentic Uno Wild Draw 4: 4 staggered cards in Red, Blue, Yellow, Green with black shadows
        return (
          <div className="relative w-14 h-16 sm:w-18 sm:h-22 md:w-20 md:h-26 flex items-center justify-center">
            {/* Yellow Card (top right) */}
            <div className="absolute top-1 right-1 w-5 h-8 sm:w-6 sm:h-10 md:w-7 md:h-12 bg-[#ffcc00] rounded-[3px] border border-black shadow-[2px_3px_0_#000000]"></div>
            {/* Blue Card (top center) */}
            <div className="absolute top-3 left-4 w-5 h-8 sm:w-6 sm:h-10 md:w-7 md:h-12 bg-[#0066cc] rounded-[3px] border border-black shadow-[2px_3px_0_#000000]"></div>
            {/* Red Card (middle front) */}
            <div className="absolute top-6 left-7 w-5 h-8 sm:w-6 sm:h-10 md:w-7 md:h-12 bg-[#e61924] rounded-[3px] border border-black shadow-[2px_3px_0_#000000] z-10"></div>
            {/* Green Card (bottom left) */}
            <div className="absolute top-9 left-1 w-5 h-8 sm:w-6 sm:h-10 md:w-7 md:h-12 bg-[#009933] rounded-[3px] border border-black shadow-[2px_3px_0_#000000]"></div>
          </div>
        );

      case 'draw1':
        return (
          <span
            className="font-black italic tracking-tighter select-none"
            style={{
              fontSize: size === 'lg' ? '3rem' : size === 'md' ? '2.2rem' : '1.5rem',
              color: '#ffffff',
              WebkitTextStroke: '1.5px #000000',
              textShadow: '2px 3px 0 #000000',
            }}
          >
            +1
          </span>
        );
      case 'skip_all':
      case 'skip2':
        return (
          <div className="flex flex-col items-center">
            <svg className="w-8 h-8 sm:w-10 sm:h-10 drop-shadow-[2px_2px_0_rgba(0,0,0,0.9)]" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="38" fill="none" stroke="#ffffff" strokeWidth="16" />
              <line x1="25" y1="25" x2="75" y2="75" stroke="#ffffff" strokeWidth="16" strokeLinecap="round" />
            </svg>
            <span className="font-black text-white text-[9px] sm:text-xs tracking-tighter drop-shadow-md">
              {card.type === 'skip_all' ? 'ALL' : '2'}
            </span>
          </div>
        );
      case 'forced_swap':
        return (
          <div className="flex flex-col items-center">
            <span className="text-xl sm:text-2xl drop-shadow">🔀</span>
            <span className="font-black text-white text-[9px] sm:text-[10px] tracking-tight drop-shadow-md">SWAP</span>
          </div>
        );
      case 'flip':
        return (
          <div className="flex flex-col items-center">
            <span className="text-xl sm:text-2xl drop-shadow">🌙</span>
            <span className="font-black text-white text-[9px] sm:text-[10px] tracking-tight drop-shadow-md">FLIP</span>
          </div>
        );
      case 'dare':
      case 'wild_dare':
        return (
          <div className="flex flex-col items-center">
            <span className="text-xl sm:text-2xl drop-shadow">🎭</span>
            <span className="font-black text-white text-[9px] sm:text-[10px] tracking-tight drop-shadow-md">DARE</span>
          </div>
        );
      case 'wild_draw_color':
        return (
          <div className="flex flex-col items-center">
            <span className="text-xl sm:text-2xl drop-shadow">🎯</span>
            <span className="font-black text-white text-[9px] sm:text-[10px] tracking-tight drop-shadow-md">COLOR</span>
          </div>
        );
      default:
        return null;
    }
  };

  const renderCornerPip = () => {
    switch (card.type) {
      case 'number':
        return (
          <span
            className="font-black italic drop-shadow-[1px_1px_0_rgba(0,0,0,0.95)]"
            style={{
              WebkitTextStroke: '1px #000000',
              textShadow: '1px 1px 0 #000',
              transform: 'skewX(-4deg)',
            }}
          >
            {card.value}
          </span>
        );
      case 'skip':
      case 'skip_all':
      case 'skip2':
        return (
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 drop-shadow-[1px_1px_0_rgba(0,0,0,0.9)]" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="38" fill="none" stroke="#ffffff" strokeWidth="20" />
            <line x1="25" y1="25" x2="75" y2="75" stroke="#ffffff" strokeWidth="20" strokeLinecap="round" />
            <circle cx="50" cy="50" r="38" fill="none" stroke="#000000" strokeWidth="4" />
            <line x1="25" y1="25" x2="75" y2="75" stroke="#000000" strokeWidth="4" strokeLinecap="round" />
          </svg>
        );
      case 'reverse':
        return (
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 filter drop-shadow-[1px_1px_0_rgba(0,0,0,0.9)]" viewBox="0 0 100 100">
            <path
              d="M32 62 C32 40, 48 30, 68 28 L68 18 L88 34 L68 50 L68 40 C54 40, 44 48, 44 62 Z"
              fill="#ffffff"
              stroke="#000000"
              strokeWidth="6"
            />
            <path
              d="M68 38 C68 60, 52 70, 32 72 L32 82 L12 66 L32 50 L32 60 C46 60, 56 52, 56 38 Z"
              fill="#ffffff"
              stroke="#000000"
              strokeWidth="6"
            />
          </svg>
        );
      case 'draw2':
      case 'targeted_draw2':
        return (
          <span
            className="font-black italic text-white drop-shadow-[1px_1px_0_rgba(0,0,0,0.9)] tracking-tighter"
            style={{
              WebkitTextStroke: '1px #000000',
              textShadow: '1.5px 1.5px 0 #000',
            }}
          >
            +2
          </span>
        );
      case 'draw1':
        return '+1';
      case 'draw5':
        return '+5';
      case 'wild4':
        return (
          <span
            className="font-black italic text-white drop-shadow-[1px_1px_0_rgba(0,0,0,0.9)] tracking-tighter"
            style={{
              WebkitTextStroke: '1px #000000',
              textShadow: '1.5px 1.5px 0 #000',
            }}
          >
            +4
          </span>
        );
      case 'wild':
        // Miniature 4-color oval pip for corner
        return (
          <div className="w-3 h-4 sm:w-3.5 sm:h-4.5 rounded-[50%/35%] rotate-[-28deg] border border-white shadow overflow-hidden grid grid-cols-2 grid-rows-2">
            <div className="bg-[#e61924]"></div>
            <div className="bg-[#0066cc]"></div>
            <div className="bg-[#ffcc00]"></div>
            <div className="bg-[#009933]"></div>
          </div>
        );
      case 'flip':
        return '🔄';
      case 'dare':
      case 'wild_dare':
        return '⚡';
      default:
        return '';
    }
  };

  return (
    <div
      onClick={isPlayable ? onClick : undefined}
      style={style}
      className={`relative ${sizeClasses} ${bgGradient} border-3 sm:border-4 border-white shadow-xl flex flex-col items-center justify-between p-1 sm:p-1.5 select-none transition-all duration-200 overflow-hidden rounded-lg sm:rounded-xl md:rounded-2xl ${
        isPlayable
          ? 'cursor-pointer hover:-translate-y-4 hover:shadow-2xl hover:scale-105 ring-2 ring-amber-300 ring-offset-2 ring-offset-slate-900 active:scale-95'
          : 'cursor-not-allowed opacity-90'
      } ${isSelected ? '-translate-y-5 ring-4 ring-cyan-400' : ''} ${className}`}
    >
      {/* Top Left Pip */}
      <div className="self-start text-xs sm:text-sm font-black text-white drop-shadow leading-none z-10 pl-0.5 pt-0.5">
        {renderCornerPip()}
      </div>

      {/* Center Iconic Uno Oval */}
      <div
        className={`absolute inset-0 m-auto flex items-center justify-center overflow-hidden rotate-[-28deg] ${
          isWildCard
            ? 'w-[88%] h-[74%] rounded-[50%/35%] bg-white/95 border-2 border-white shadow-md'
            : 'w-[90%] h-[74%] rounded-[50%/38%] border-2 sm:border-3 border-white/90 bg-transparent shadow-inner'
        }`}
        style={
          !isWildCard
            ? {
                backgroundColor: 'currentColor',
              }
            : undefined
        }
      >
        <div className="rotate-[28deg] flex items-center justify-center w-full h-full text-center">
          {renderSymbol()}
        </div>
      </div>

      {/* Bottom Right Pip (Inverted) */}
      <div className="self-end text-xs sm:text-sm font-black text-white drop-shadow leading-none rotate-180 z-10 pr-0.5 pb-0.5">
        {renderCornerPip()}
      </div>

      {/* Playable Indicator Glow */}
      {isPlayable && (
        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 z-20">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,1)]"></span>
        </span>
      )}
    </div>
  );
};
