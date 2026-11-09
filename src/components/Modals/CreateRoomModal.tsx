import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { EntryFeeAmount, GameVariant, HouseRules } from '../../engine/types';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (config: {
    roomName: string;
    isPrivate: boolean;
    variant: GameVariant;
    houseRules: HouseRules;
    entryFee: EntryFeeAmount;
  }) => void;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [roomName, setRoomName] = useState<string>('Custom Match');
  const [variant, setVariant] = useState<GameVariant>('classic');
  const [entryFee, setEntryFee] = useState<EntryFeeAmount>(100);
  const [isPrivate, setIsPrivate] = useState(false);
  const [turnTimer, setTurnTimer] = useState<0 | 15 | 30 | 60>(30);
  const [startingHandSize, setStartingHandSize] = useState<number>(7);
  const [gameTable, setGameTable] = useState<string>('game table 1.jpg');
  const [stacking, setStacking] = useState<boolean>(true);
  const [sevenZero, setSevenZero] = useState<boolean>(false);
  const [wildDraw4Challenge, setWildDraw4Challenge] = useState<boolean>(true);
  const [allowSpectators, setAllowSpectators] = useState<boolean>(true);
  const [showHouseRules, setShowHouseRules] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onCreate({
      roomName: roomName.trim() || 'Custom Match',
      isPrivate,
      variant,
      entryFee,
      houseRules: {
        turnTimer,
        startingHandSize,
        gameTable,
        stacking,
        sevenZero,
        wildDraw4Challenge,
        allowSpectators,
      },
    });
  };

  const VARIANTS: { id: GameVariant | 'no_mercy' | 'dos'; name: string; image: string; comingSoon?: boolean; glowColor: string }[] = [
    { id: 'classic', name: 'Classic', image: '/uno cards buttons/classic.png', glowColor: 'shadow-[0_0_20px_rgba(239,68,68,0.9)] ring-amber-400' },
    { id: 'all_wild', name: 'All Wild', image: '/uno cards buttons/all wild.png', glowColor: 'shadow-[0_0_20px_rgba(168,85,247,0.9)] ring-amber-400' },
    { id: 'flip', name: 'Flip!', image: '/uno cards buttons/FLIP.png', glowColor: 'shadow-[0_0_20px_rgba(6,182,212,0.9)] ring-amber-400' },
    { id: 'dare', name: 'Dare', image: '/uno cards buttons/DARE.png', glowColor: 'shadow-[0_0_20px_rgba(245,158,11,0.9)] ring-amber-400' },
    { id: 'no_mercy', name: 'No Mercy', image: '/uno cards buttons/NO MERCY.png', comingSoon: true, glowColor: '' },
    { id: 'dos', name: 'DOS', image: '/uno cards buttons/DOS.png', comingSoon: true, glowColor: '' },
  ];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center select-none overflow-hidden p-1 sm:p-3 bg-slate-950 text-white animate-fadeIn"
      style={{ willChange: 'opacity, transform' }}
    >
      {/* Background Image: modal background.jpg */}
      <img
        src="/play online modal and buttons/modal background.jpg"
        alt="Background"
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none"
        draggable={false}
      />
      {/* Subtle overlay for optimal contrast and readability */}
      <div className="absolute inset-0 bg-[#06041c]/40 pointer-events-none" />

      {/* Main Container - Authentic "Play Online" Style, 100% fits on screen */}
      <div className="relative z-10 w-full max-w-5xl h-full max-h-[98vh] flex flex-col justify-between overflow-hidden py-1 px-1 sm:px-2">
        
        {/* Top Header Controls: Room Name Input, House Rules, Privacy, Close */}
        <div className="flex items-center justify-between shrink-0 px-1 py-1 gap-2 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-amber-300/90 drop-shadow whitespace-nowrap">
              MATCH:
            </span>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Name ng Match (e.g. Barkada UNO)"
              maxLength={24}
              className="px-2.5 py-1 rounded-xl bg-slate-900/80 border border-amber-400/60 focus:border-amber-300 text-xs sm:text-sm font-black text-amber-300 placeholder-slate-500 focus:outline-none shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)] w-full max-w-[240px]"
            />
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* House Rules & Privacy Pill */}
            <button
              type="button"
              onClick={() => setShowHouseRules(true)}
              className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl bg-purple-900/60 hover:bg-purple-800/80 border border-purple-400/50 text-[9px] sm:text-xs font-black text-purple-200 transition active:scale-95 cursor-pointer shadow"
            >
              ⚙️ House Rules
            </button>
            <button
              type="button"
              onClick={() => setIsPrivate(!isPrivate)}
              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl border text-[9px] sm:text-xs font-black transition active:scale-95 cursor-pointer shadow ${
                isPrivate
                  ? 'bg-purple-600/60 text-purple-200 border-purple-400'
                  : 'bg-emerald-600/60 text-emerald-200 border-emerald-400'
              }`}
            >
              {isPrivate ? '🔒 Private' : '🌐 Public'}
            </button>
            <button
              onClick={onClose}
              className="p-1 sm:p-1.5 rounded-full bg-slate-900/80 hover:bg-red-600 text-white border border-slate-700 hover:border-red-500 transition cursor-pointer shadow-lg"
              title="Close"
            >
              <X className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Center Content: Two Columns separated by Gold Divider */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-1 md:gap-3 items-center px-1 sm:px-3 overflow-hidden pb-1"
        >
          {/* ================= LEFT SIDE: GAME SELECT (3x2 Grid) ================= */}
          <div className="md:col-span-5 flex flex-col justify-center items-center md:items-start h-full">
            {/* Title: GAME SELECT in bold white with black stroke font */}
            <h2 className="text-[10px] sm:text-xs md:text-sm font-black uppercase tracking-wider text-white mb-0.5 sm:mb-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] flex items-center gap-1">
              <span>GAME SELECT</span>
            </h2>

            {/* 3x2 Grid of Uno Cards - responsive height so it never pushes the bottom button */}
            <div className="grid grid-cols-3 gap-1 sm:gap-1.5 w-full max-w-[210px] sm:max-w-[260px] md:max-w-[290px]">
              {VARIANTS.map((v) => {
                const isSelected = variant === v.id;
                const isComingSoon = v.comingSoon;
                return (
                  <button
                    key={v.id}
                    type="button"
                    disabled={isComingSoon}
                    onClick={() => !isComingSoon && setVariant(v.id as GameVariant)}
                    className={`relative rounded-lg transition-all duration-200 focus:outline-none flex flex-col items-center ${
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
                      <div className="absolute -inset-[2px] rounded-lg overflow-hidden pointer-events-none z-0">
                        <div
                          className="w-[200%] h-[200%] -top-1/2 -left-1/2 absolute anim-rotating-light"
                          style={{
                            background:
                              'conic-gradient(from 0deg, transparent 0deg, #facc15 60deg, #ffffff 120deg, #38bdf8 180deg, transparent 240deg, #facc15 360deg)',
                          }}
                        />
                      </div>
                    )}

                    {/* Card container with white border & rounded corners */}
                    <div
                      className={`relative w-full aspect-[2/3] max-h-[72px] sm:max-h-[96px] md:max-h-[115px] rounded-lg overflow-hidden transition-all duration-200 z-10 ${
                        isSelected && !isComingSoon
                          ? 'shadow-[0_0_16px_rgba(250,204,21,0.95)] border-2 border-white'
                          : 'shadow-md border border-white/80 hover:border-amber-300'
                      }`}
                    >
                      <img
                        src={v.image}
                        alt={v.name}
                        className="w-full h-full object-contain select-none pointer-events-none"
                        draggable={false}
                      />
                      {/* Coming Soon badge */}
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
            <div className="w-[2px] h-[75%] bg-gradient-to-b from-amber-400/20 via-amber-400 to-amber-400/20 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
          </div>

          {/* ================= RIGHT SIDE: ENTRY FEE, TIMER, CARDS ================= */}
          <div className="md:col-span-6 flex flex-col justify-center gap-1 sm:gap-2">
            
            {/* 1. ENTRY FEE SECTION */}
            <div className="flex flex-col gap-0.5 sm:gap-1">
              <div className="flex items-center gap-1.5">
                <img
                  src="/play online modal and buttons/icon_coins.png"
                  alt="Entry Fee"
                  className="w-5 h-5 sm:w-7 sm:h-7 object-contain drop-shadow"
                />
                <span className="text-xs sm:text-sm font-black uppercase text-white tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  ENTRY FEE
                </span>
                {entryFee === 0 && (
                  <span className="ml-auto text-[9px] font-black px-1.5 py-0.2 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-400/50">
                    Free Match
                  </span>
                )}
              </div>

              {/* 3D Glossy Gold Buttons for Entry Fee: 0, 100, 200, 300, 400, 500 */}
              <div className="grid grid-cols-6 gap-1 sm:gap-1.5">
                {([0, 100, 200, 300, 400, 500] as EntryFeeAmount[]).map((fee) => {
                  const isSelected = entryFee === fee;
                  return (
                    <button
                      key={fee}
                      type="button"
                      onClick={() => setEntryFee(fee)}
                      className={`relative py-1 sm:py-1.5 px-0.5 rounded-lg font-black text-[10px] sm:text-xs tracking-wide transition-all duration-150 cursor-pointer text-center select-none ${
                        isSelected
                          ? 'bg-gradient-to-b from-[#FFF275] via-[#FFC000] to-[#E68A00] text-slate-950 shadow-[0_3px_10px_rgba(245,158,11,0.8),inset_0_1.5px_2px_rgba(255,255,255,0.9)] border border-white scale-105 z-10'
                          : 'bg-gradient-to-b from-[#D49300] via-[#A86F00] to-[#784E00] text-amber-100/90 shadow-[0_1.5px_4px_rgba(0,0,0,0.5),inset_0_1px_1.5px_rgba(255,255,255,0.3)] border border-amber-600/70 hover:brightness-125'
                      }`}
                    >
                      <span className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]">
                        {fee === 0 ? 'Free' : fee}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. TIMER SECTION */}
            <div className="flex flex-col gap-0.5 sm:gap-1">
              <div className="flex items-center gap-1.5">
                <img
                  src="/play online modal and buttons/icon_timer.png"
                  alt="Timer"
                  className="w-5 h-5 sm:w-7 sm:h-7 object-contain drop-shadow"
                />
                <span className="text-xs sm:text-sm font-black uppercase text-white tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  TIMER
                </span>
              </div>

              {/* 3D Glossy Gold Buttons for Timer: OFF, 15s, 30s, 60s */}
              <div className="grid grid-cols-4 gap-1.5">
                {([0, 15, 30, 60] as const).map((t) => {
                  const isSelected = turnTimer === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTurnTimer(t)}
                      className={`relative py-1 sm:py-1.5 px-1.5 rounded-lg font-black text-[10px] sm:text-xs tracking-wide transition-all duration-150 cursor-pointer text-center select-none ${
                        isSelected
                          ? 'bg-gradient-to-b from-[#FFF275] via-[#FFC000] to-[#E68A00] text-slate-950 shadow-[0_3px_10px_rgba(245,158,11,0.8),inset_0_1.5px_2px_rgba(255,255,255,0.9)] border border-white scale-105 z-10'
                          : 'bg-gradient-to-b from-[#D49300] via-[#A86F00] to-[#784E00] text-amber-100/90 shadow-[0_1.5px_4px_rgba(0,0,0,0.5),inset_0_1px_1.5px_rgba(255,255,255,0.3)] border border-amber-600/70 hover:brightness-125'
                      }`}
                    >
                      <span className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]">
                        {t === 0 ? 'OFF' : `${t}s`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. CARDS SECTION */}
            <div className="flex flex-col gap-0.5 sm:gap-1">
              <div className="flex items-center gap-1.5">
                <img
                  src="/play online modal and buttons/icon_cards.png"
                  alt="Cards"
                  className="w-5 h-5 sm:w-7 sm:h-7 object-contain drop-shadow"
                />
                <span className="text-xs sm:text-sm font-black uppercase text-white tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  CARDS
                </span>
              </div>

              {/* Gold Progress/Slider Track matching the reference */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1 h-4 sm:h-5 bg-slate-950/80 rounded-full p-0.5 border border-amber-400/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] flex items-center">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.8)] transition-all duration-150"
                    style={{ width: `${((startingHandSize - 3) / 7) * 100}%` }}
                  />
                  <input
                    type="range"
                    min="3"
                    max="10"
                    value={startingHandSize}
                    onChange={(e) => setStartingHandSize(parseInt(e.target.value, 10))}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
                  />
                </div>

                {/* Round Badge with current card count */}
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-b from-[#1b1040] to-[#0d0728] border border-amber-400 flex items-center justify-center font-black text-xs sm:text-sm text-white shadow-[0_0_8px_rgba(251,191,36,0.6)] shrink-0">
                  {startingHandSize}
                </div>
              </div>
            </div>

            {/* 4. GAME TABLE SECTION */}
            <div className="flex flex-col gap-0.5 sm:gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-black uppercase text-white tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] flex items-center gap-1">
                  <span>🎲</span> GAME TABLE
                </span>
                <span className="text-[10px] sm:text-xs font-black text-amber-300 capitalize">
                  {gameTable.replace('.jpg', '')}
                </span>
              </div>

              {/* Horizontal scrollable thumbnails */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin">
                {Array.from({ length: 13 }, (_, i) => `game table ${i + 1}.jpg`).map((tableFile, idx) => {
                  const isSelected = gameTable === tableFile;
                  return (
                    <button
                      key={tableFile}
                      type="button"
                      onClick={() => setGameTable(tableFile)}
                      className={`relative group shrink-0 w-11 sm:w-14 aspect-[16/10] rounded-md overflow-hidden border transition-all cursor-pointer select-none ${
                        isSelected
                          ? 'border-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.9)] scale-105 z-10 ring-1 ring-white'
                          : 'border-slate-700/80 hover:border-slate-400 opacity-70 hover:opacity-100'
                      }`}
                      title={`Table ${idx + 1}`}
                    >
                      <img
                        src={`/game table/${tableFile}`}
                        alt={`Table ${idx + 1}`}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover select-none pointer-events-none"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-center pb-0.5">
                        <span className={`text-[7px] font-black ${isSelected ? 'text-amber-300' : 'text-slate-300'}`}>
                          #{idx + 1}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* BOTTOM CREATE BUTTON - Guaranteed fully visible above screen bottom */}
            <div className="pt-0.5 sm:pt-1 pb-1 sm:pb-2 flex items-center justify-center sm:justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1 sm:px-4 sm:py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 font-bold text-[10px] sm:text-xs border border-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 sm:px-6 sm:py-2 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 hover:from-amber-300 hover:to-yellow-200 text-slate-950 font-black text-[10px] sm:text-xs uppercase tracking-wider shadow-[0_3px_12px_rgba(251,191,36,0.7),inset_0_1.5px_3px_rgba(255,255,255,0.9)] border border-white hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-1"
              >
                <span>CREATE LOBBY</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* House Rules Modal */}
      {showHouseRules && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fadeIn p-3">
          <div className="w-full max-w-sm bg-gradient-to-b from-[#1a0f44] to-[#0c0529] rounded-3xl border-2 border-amber-400/60 shadow-[0_0_30px_rgba(0,0,0,0.9)] overflow-hidden">
            <div className="flex items-center justify-between p-3.5 border-b border-purple-500/30">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">House Rules</h3>
              <button
                onClick={() => setShowHouseRules(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 space-y-2">
              <button
                type="button"
                onClick={() => setStacking(!stacking)}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition cursor-pointer ${
                  stacking ? 'bg-amber-500/20 border-amber-400/80 text-white' : 'bg-slate-950/60 border-slate-800 text-slate-400'
                }`}
              >
                <span className="text-xs font-black">Stacking (+2/+4)</span>
                {stacking && <Check className="w-4 h-4 text-amber-400" />}
              </button>

              <button
                type="button"
                onClick={() => setSevenZero(!sevenZero)}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition cursor-pointer ${
                  sevenZero ? 'bg-amber-500/20 border-amber-400/80 text-white' : 'bg-slate-950/60 border-slate-800 text-slate-400'
                }`}
              >
                <span className="text-xs font-black">7-0 Swap Hands</span>
                {sevenZero && <Check className="w-4 h-4 text-amber-400" />}
              </button>

              <button
                type="button"
                onClick={() => setWildDraw4Challenge(!wildDraw4Challenge)}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition cursor-pointer ${
                  wildDraw4Challenge ? 'bg-amber-500/20 border-amber-400/80 text-white' : 'bg-slate-950/60 border-slate-800 text-slate-400'
                }`}
              >
                <span className="text-xs font-black">WD4 Challenge</span>
                {wildDraw4Challenge && <Check className="w-4 h-4 text-amber-400" />}
              </button>
            </div>

            <div className="p-3 border-t border-purple-500/30 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHouseRules(false)}
                className="px-5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-black text-xs shadow hover:scale-105 active:scale-95 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
