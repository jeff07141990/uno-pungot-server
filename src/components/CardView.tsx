import React, { useState, useEffect } from 'react';
import { Card, CardColor, GameVariant } from '../engine/types';
import { getCustomCardSkins, CustomCardSkinMap } from '../utils/cardSkins';

interface CardViewProps {
  card?: Card | null;
  isBack?: boolean;
  isPlayable?: boolean;
  isSelected?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  ignorePowerSkin?: boolean;
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
  ignorePowerSkin = false,
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

  // Responsive size dimensions - preserving exact 2:3 card aspect ratio (no distortion or squishing)
  const sizeClasses = {
    xs: 'w-6 aspect-[2/3] sm:w-7 md:w-9 rounded text-[6px] shadow-xs',
    sm: 'w-9 aspect-[2/3] sm:w-12 md:w-14 rounded-md sm:rounded-lg text-[9px] sm:text-xs shadow-md',
    md: 'w-12 aspect-[2/3] sm:w-15 md:w-18 rounded-lg sm:rounded-xl text-xs sm:text-sm md:text-base shadow-lg',
    lg: 'w-16 aspect-[2/3] sm:w-20 md:w-24 rounded-lg sm:rounded-xl md:rounded-2xl text-sm sm:text-base md:text-xl shadow-xl',
    xl: 'w-24 aspect-[2/3] sm:w-28 md:w-32 rounded-xl sm:rounded-2xl text-base sm:text-lg md:text-2xl shadow-2xl',
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
        className={`relative ${sizeClasses} flex items-center justify-center cursor-pointer transition-all duration-200 select-none shadow-md ${className}`}
      >
        <img
          src={backSrc}
          alt="UNO Card Back"
          className="w-full h-full object-contain select-none pointer-events-none rounded-[inherit]"
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
  const powerSkinKey = !ignorePowerSkin && card.powerUpId ? skins[`power_${card.powerUpId}`] : undefined;
  const customSkinSrc =
    skins[specificKey] ||
    skins[card.type] ||
    powerSkinKey ||
    (card.type === 'power_shield' || card.powerUpId === 'shield'
      ? skins.power_shield || '/cards/shield.png'
      : card.type === 'power_extra_turn' || card.powerUpId === 'extra_turn'
      ? skins.power_extra_turn || '/cards/extra_turn.png'
      : card.type === 'power_swap' || card.powerUpId === 'swap'
      ? skins.power_swap || '/cards/swap.png'
      : card.type === 'power_color' || card.powerUpId === 'color'
      ? skins.power_color || '/cards/color.png'
      : card.type === 'power_reverse' || card.powerUpId === 'reverse'
      ? skins.power_reverse || '/cards/reverse_power.png'
      : card.type === 'power_peek' || card.powerUpId === 'peek'
      ? skins.power_peek || '/cards/peek.png'
      : card.type === 'power_booster' || card.powerUpId === 'booster'
      ? skins.power_booster || '/cards/booster.png'
      : card.type === 'power_reflect' || card.powerUpId === 'reflect'
      ? skins.power_reflect || '/cards/reflect.png'
      : card.type === 'skip'
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
    const isFull3DCardPng =
      customSkinSrc.includes('shield.png') ||
      customSkinSrc.includes('Sheild protection.png') ||
      customSkinSrc.includes('extra_turn.png') ||
      customSkinSrc.includes('Extra Turn.png') ||
      customSkinSrc.includes('swap.png') ||
      customSkinSrc.includes('Card Swap.png') ||
      customSkinSrc.includes('color.png') ||
      customSkinSrc.includes('Color Changer.png') ||
      customSkinSrc.includes('reverse_power.png') ||
      customSkinSrc.includes('Reverse master.png') ||
      customSkinSrc.includes('peek.png') ||
      customSkinSrc.includes('Peek Card.png') ||
      customSkinSrc.includes('booster.png') ||
      customSkinSrc.includes('Coin Booster.png') ||
      customSkinSrc.includes('reflect.png') ||
      customSkinSrc.includes('Attack Reflect.png');

    return (
      <div
        onClick={isPlayable ? onClick : undefined}
        style={style}
        className={`relative ${sizeClasses} flex items-center justify-center select-none transition-all duration-200 ${
          isFull3DCardPng ? '' : 'shadow-xl'
        } ${
          isPlayable
            ? 'cursor-pointer hover:-translate-y-4 hover:shadow-2xl hover:scale-105 active:scale-95'
            : 'cursor-not-allowed opacity-90'
        } ${isSelected ? '-translate-y-5 ring-4 ring-cyan-400' : ''} ${className}`}
      >
        <img
          src={customSkinSrc}
          alt={card.type}
          className={`w-full h-full select-none pointer-events-none ${
            isFull3DCardPng
              ? 'object-contain filter drop-shadow-[0_12px_20px_rgba(0,0,0,0.85)] scale-105'
              : 'object-contain rounded-[inherit]'
          }`}
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
              fontSize: size === 'lg' ? 'clamp(2.4rem, 6vw, 4.4rem)' : size === 'md' ? 'clamp(1.8rem, 4.5vw, 3.2rem)' : size === 'sm' ? 'clamp(1.3rem, 3.2vw, 2.2rem)' : 'clamp(1rem, 2.5vw, 1.5rem)',
              color: '#ffffff',
              WebkitTextStroke: '1.5px #000000',
              textShadow: '2px 3px 0 #000000',
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
      case 'power_shield':
        return (
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Uno iconic diagonal dark blue aura oval behind shield */}
            <div className="absolute w-[86%] h-[72%] rounded-[50%/35%] bg-gradient-to-tr from-[#1e40af] via-[#2563eb] to-[#3b82f6] opacity-90 rotate-[-28deg] shadow-[inset_0_2px_6px_rgba(255,255,255,0.4)]" />
            <div className="relative z-10 flex flex-col items-center justify-center filter drop-shadow-[0_4px_12px_rgba(30,58,138,0.9)]">
              <svg className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20" viewBox="0 0 100 100" fill="none">
                {/* Outer White Bevel Shield */}
                <path
                  d="M50 12 L84 25 C84 60 50 88 50 88 C50 88 16 60 16 25 Z"
                  fill="#ffffff"
                  stroke="#93c5fd"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                {/* Inner Metallic Blue Shield */}
                <path
                  d="M50 18 L78 29 C78 57 50 81 50 81 C50 81 22 57 22 29 Z"
                  fill="url(#shieldMetallic)"
                  stroke="#3b82f6"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                {/* Center Gleam Flare */}
                <circle cx="50" cy="46" r="16" fill="url(#shieldGleam)" opacity="0.85" />
                <defs>
                  <linearGradient id="shieldMetallic" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#93c5fd" />
                    <stop offset="35%" stopColor="#60a5fa" />
                    <stop offset="70%" stopColor="#2563eb" />
                    <stop offset="100%" stopColor="#1e40af" />
                  </linearGradient>
                  <radialGradient id="shieldGleam" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                    <stop offset="60%" stopColor="#60a5fa" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                  </radialGradient>
                </defs>
              </svg>
            </div>
          </div>
        );
      case 'power_extra_turn':
        return (
          <div className="flex flex-col items-center justify-center filter drop-shadow-[0_2px_8px_rgba(245,158,11,0.95)]">
            <span
              className="font-black italic text-white tracking-tighter"
              style={{
                fontSize: size === 'lg' ? '2.8rem' : size === 'md' ? '2.1rem' : size === 'sm' ? '1.5rem' : '1.1rem',
                WebkitTextStroke: '2px #b45309',
                textShadow: '0 3px 0 #78350f, 0 4px 6px rgba(0,0,0,0.8)',
              }}
            >
              +1
            </span>
            <svg className="w-7 h-4 sm:w-10 sm:h-6 -mt-1" viewBox="0 0 50 25" fill="none">
              <path
                d="M5 18 C15 5 35 5 45 15"
                stroke="#ffffff"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path d="M40 7 L46 16 L36 18 Z" fill="#ffffff" />
            </svg>
          </div>
        );
      case 'power_swap':
        return (
          <div className="flex flex-col items-center justify-center filter drop-shadow-[0_2px_8px_rgba(168,85,247,0.95)]">
            <svg className="w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16" viewBox="0 0 100 100">
              <path
                d="M26 64 C26 42 42 30 64 28 L64 16 L88 34 L64 52 L64 40 C48 40 38 48 38 64 Z"
                fill="#ffffff"
                stroke="#581c87"
                strokeWidth="3.5"
                strokeLinejoin="round"
              />
              <path
                d="M74 36 C74 58 58 70 36 72 L36 84 L12 66 L36 48 L36 60 C52 60 62 52 62 36 Z"
                fill="#ffffff"
                stroke="#581c87"
                strokeWidth="3.5"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        );
      case 'power_color':
        return (
          <div className="relative w-11 h-11 sm:w-15 sm:h-15 md:w-18 md:h-18 flex items-center justify-center filter drop-shadow-[0_2px_10px_rgba(236,72,153,0.9)]">
            <div className="w-full h-full rounded-full border-3 border-white shadow-lg overflow-hidden grid grid-cols-2 grid-rows-2 rotate-45">
              <div className="bg-[#ef4444]" />
              <div className="bg-[#3b82f6]" />
              <div className="bg-[#22c55e]" />
              <div className="bg-[#eab308]" />
            </div>
            <div className="absolute inset-2 rounded-full border-2 border-white/60 pointer-events-none" />
          </div>
        );
      case 'power_reverse':
        return (
          <div className="flex flex-col items-center justify-center filter drop-shadow-[0_2px_8px_rgba(34,197,94,0.95)]">
            <svg className="w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16" viewBox="0 0 100 100">
              <path
                d="M26 64 C26 42 42 30 64 28 L64 16 L88 34 L64 52 L64 40 C48 40 38 48 38 64 Z"
                fill="#ffffff"
                stroke="#14532d"
                strokeWidth="3.5"
                strokeLinejoin="round"
              />
              <path
                d="M74 36 C74 58 58 70 36 72 L36 84 L12 66 L36 48 L36 60 C52 60 62 52 62 36 Z"
                fill="#ffffff"
                stroke="#14532d"
                strokeWidth="3.5"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        );
      case 'power_peek':
        return (
          <div className="flex flex-col items-center justify-center filter drop-shadow-[0_2px_8px_rgba(239,68,68,0.95)]">
            <svg className="w-11 h-8 sm:w-15 sm:h-11 md:w-18 md:h-13" viewBox="0 0 100 65" fill="none">
              <path
                d="M8 32.5 C25 8 75 8 92 32.5 C75 57 25 57 8 32.5 Z"
                fill="#ffffff"
                stroke="#7f1d1d"
                strokeWidth="4"
              />
              <circle cx="50" cy="32.5" r="16" fill="#3b82f6" stroke="#1e3a8a" strokeWidth="2.5" />
              <circle cx="50" cy="32.5" r="9" fill="#0f172a" />
              <circle cx="53" cy="29" r="3" fill="#ffffff" />
            </svg>
          </div>
        );
      case 'power_booster':
        return (
          <div className="flex flex-col items-center justify-center filter drop-shadow-[0_2px_8px_rgba(234,179,8,1)]">
            <div className="relative w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 flex items-center justify-center">
              {/* Gold coins stack */}
              <div className="absolute -top-1 -right-1 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-600 border-2 border-white shadow flex items-center justify-center font-black text-amber-900 text-xs sm:text-sm">
                ₱
              </div>
              <div className="absolute -bottom-1 -left-1 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-yellow-200 via-amber-400 to-yellow-500 border-2 border-white shadow flex items-center justify-center font-black text-amber-900 text-xs sm:text-sm z-10">
                ₱
              </div>
            </div>
          </div>
        );
      case 'power_reflect':
        return (
          <div className="flex flex-col items-center justify-center filter drop-shadow-[0_2px_8px_rgba(168,85,247,0.95)]">
            <svg className="w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16" viewBox="0 0 100 100" fill="none">
              {/* Starburst in center */}
              <polygon
                points="50,15 57,38 80,26 67,48 90,60 67,65 75,90 53,74 40,92 40,68 15,70 33,52 18,34 40,40"
                fill="url(#starGrad)"
                stroke="#ffffff"
                strokeWidth="2.5"
              />
              {/* Opposing curved reflective arrows */}
              <path
                d="M25 32 C15 50 25 70 42 78"
                stroke="#67e8f9"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path
                d="M75 68 C85 50 75 30 58 22"
                stroke="#67e8f9"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="starGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
              </defs>
            </svg>
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
      case 'power_shield':
        return (
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" viewBox="0 0 100 100" fill="none">
            <path
              d="M50 12 L82 24 C82 58 50 86 50 86 C50 86 18 58 18 24 Z"
              fill="#ffffff"
              stroke="#1e3a8a"
              strokeWidth="6"
              strokeLinejoin="round"
            />
          </svg>
        );
      case 'power_swap':
        return (
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" viewBox="0 0 100 100">
            <path
              d="M26 64 C26 42 42 30 64 28 L64 16 L88 34 L64 52 L64 40 C48 40 38 48 38 64 Z"
              fill="#ffffff"
            />
            <path
              d="M74 36 C74 58 58 70 36 72 L36 84 L12 66 L36 48 L36 60 C52 60 62 52 62 36 Z"
              fill="#ffffff"
            />
          </svg>
        );
      case 'power_reverse':
        return (
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" viewBox="0 0 100 100">
            <path
              d="M26 64 C26 42 42 30 64 28 L64 16 L88 34 L64 52 L64 40 C48 40 38 48 38 64 Z"
              fill="#ffffff"
            />
            <path
              d="M74 36 C74 58 58 70 36 72 L36 84 L12 66 L36 48 L36 60 C52 60 62 52 62 36 Z"
              fill="#ffffff"
            />
          </svg>
        );
      case 'power_color':
        return (
          <div className="w-3.5 h-3.5 rounded-full border border-white shadow overflow-hidden grid grid-cols-2 grid-rows-2 rotate-45">
            <div className="bg-[#ef4444]" />
            <div className="bg-[#3b82f6]" />
            <div className="bg-[#22c55e]" />
            <div className="bg-[#eab308]" />
          </div>
        );
      case 'power_extra_turn':
        return (
          <span className="font-black italic text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] text-[10px] sm:text-xs">
            +1
          </span>
        );
      case 'power_peek':
        return (
          <svg className="w-4 h-3 filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" viewBox="0 0 100 65" fill="none">
            <path
              d="M8 32.5 C25 8 75 8 92 32.5 C75 57 25 57 8 32.5 Z"
              fill="#ffffff"
            />
            <circle cx="50" cy="32.5" r="14" fill="#1e3a8a" />
          </svg>
        );
      case 'power_booster':
        return (
          <div className="w-3.5 h-3.5 rounded-full bg-yellow-300 border border-amber-600 flex items-center justify-center text-[8px] font-black text-amber-950">
            ₱
          </div>
        );
      case 'power_reflect':
        return (
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" viewBox="0 0 100 100">
            <path
              d="M26 64 C26 42 42 30 64 28 L64 16 L88 34 L64 52 L64 40 C48 40 38 48 38 64 Z"
              fill="#ffffff"
            />
            <path
              d="M74 36 C74 58 58 70 36 72 L36 84 L12 66 L36 48 L36 60 C52 60 62 52 62 36 Z"
              fill="#ffffff"
            />
          </svg>
        );
      default:
        return '';
    }
  };

  const isPowerCard = card.type.startsWith('power_');

  // Specific power card theme gradients matching reference
  const powerCardTheme: Record<string, { bg: string; border: string; shadow: string }> = {
    power_shield: {
      bg: 'bg-gradient-to-b from-[#38bdf8] via-[#2563eb] to-[#1e3a8a]',
      border: 'border-white',
      shadow: 'shadow-[0_0_20px_rgba(59,130,246,0.6)]',
    },
    power_extra_turn: {
      bg: 'bg-gradient-to-b from-[#fde047] via-[#f59e0b] to-[#b45309]',
      border: 'border-white',
      shadow: 'shadow-[0_0_20px_rgba(245,158,11,0.6)]',
    },
    power_swap: {
      bg: 'bg-gradient-to-b from-[#c084fc] via-[#9333ea] to-[#581c87]',
      border: 'border-white',
      shadow: 'shadow-[0_0_20px_rgba(168,85,247,0.6)]',
    },
    power_color: {
      bg: 'bg-gradient-to-b from-[#f43f5e] via-[#e11d48] to-[#881337]',
      border: 'border-white',
      shadow: 'shadow-[0_0_20px_rgba(244,63,94,0.6)]',
    },
    power_reverse: {
      bg: 'bg-gradient-to-b from-[#4ade80] via-[#16a34a] to-[#14532d]',
      border: 'border-white',
      shadow: 'shadow-[0_0_20px_rgba(34,197,94,0.6)]',
    },
    power_peek: {
      bg: 'bg-gradient-to-b from-[#f87171] via-[#dc2626] to-[#991b1b]',
      border: 'border-white',
      shadow: 'shadow-[0_0_20px_rgba(239,68,68,0.6)]',
    },
    power_booster: {
      bg: 'bg-gradient-to-b from-[#fef08a] via-[#eab308] to-[#854d0e]',
      border: 'border-white',
      shadow: 'shadow-[0_0_20px_rgba(234,179,8,0.6)]',
    },
    power_reflect: {
      bg: 'bg-gradient-to-b from-[#818cf8] via-[#6366f1] to-[#312e81]',
      border: 'border-white',
      shadow: 'shadow-[0_0_20px_rgba(99,102,241,0.6)]',
    },
  };
  const currentPowerTheme = powerCardTheme[card.type] || {
    bg: 'bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900',
    border: 'border-amber-400',
    shadow: 'shadow-[0_0_15px_rgba(245,158,11,0.5)]',
  };

  return (
    <div
      onClick={isPlayable ? onClick : undefined}
      style={style}
      className={`relative ${sizeClasses} ${
        isPowerCard
          ? `${currentPowerTheme.bg} border-3 sm:border-4 border-white ${currentPowerTheme.shadow}`
          : `${bgGradient} border-3 sm:border-4 border-white shadow-xl`
      } flex flex-col items-center justify-between p-1 sm:p-1.5 select-none transition-all duration-200 overflow-hidden rounded-lg sm:rounded-xl md:rounded-2xl ${
        isPlayable
          ? 'cursor-pointer hover:-translate-y-4 hover:shadow-2xl hover:scale-105 ring-2 ring-amber-300 ring-offset-2 ring-offset-slate-900 active:scale-95'
          : 'cursor-not-allowed opacity-90'
      } ${isSelected ? '-translate-y-5 ring-4 ring-cyan-400' : ''} ${className}`}
    >
      {/* Top Left Pip */}
      <div className="self-start text-xs sm:text-sm font-black text-white drop-shadow leading-none z-10 pl-0.5 pt-0.5">
        {renderCornerPip()}
      </div>

      {/* Center Iconic Uno Oval or Power Card Face */}
      {isPowerCard ? (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-1 sm:p-2">
          {renderSymbol()}
        </div>
      ) : (
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
      )}

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
