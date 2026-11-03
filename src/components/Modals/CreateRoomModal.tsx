import React, { useState } from 'react';
import { X, Plus, Shield, Timer, Layers, Shuffle, Flame, Sparkles, RefreshCw, Zap } from 'lucide-react';
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
  const [roomName, setRoomName] = useState('');
  const [variant, setVariant] = useState<GameVariant>('classic');
  const [entryFee, setEntryFee] = useState<EntryFeeAmount>(0);
  const [isPrivate, setIsPrivate] = useState(false);
  const [turnTimer, setTurnTimer] = useState<0 | 15 | 30 | 60>(30);
  const [startingHandSize, setStartingHandSize] = useState<number>(7);
  const [stacking, setStacking] = useState<boolean>(true);
  const [sevenZero, setSevenZero] = useState<boolean>(false);
  const [wildDraw4Challenge, setWildDraw4Challenge] = useState<boolean>(true);
  const [allowSpectators, setAllowSpectators] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({
      roomName: roomName.trim() || 'Custom Match',
      isPrivate,
      variant,
      entryFee,
      houseRules: {
        turnTimer,
        startingHandSize,
        stacking,
        sevenZero,
        wildDraw4Challenge,
        allowSpectators,
      },
    });
  };

  const VARIANTS: { id: GameVariant; name: string; icon: string; desc: string; badge: string; color: string }[] = [
    {
      id: 'classic',
      name: 'Classic UNO',
      icon: '🎴',
      desc: 'Standard color and number matching with full house rules.',
      badge: 'Classic',
      color: 'border-amber-400 bg-amber-500/10 text-amber-300',
    },
    {
      id: 'all_wild',
      name: 'UNO All Wild',
      icon: '🌈',
      desc: '100% Wild cards! Targeted Draw 2, Skip Two, and Forced Swap.',
      badge: 'High Chaos',
      color: 'border-purple-400 bg-purple-500/10 text-purple-300',
    },
    {
      id: 'flip',
      name: 'UNO Flip!',
      icon: '🔄',
      desc: 'Double-sided cards! Flips between Light Side and brutal Dark Side.',
      badge: 'Dark Side',
      color: 'border-cyan-400 bg-cyan-500/10 text-cyan-300',
    },
    {
      id: 'dare',
      name: 'UNO Dare',
      icon: '⚡',
      desc: 'Dare Draw 2 cards: Accept fun dares or take penalty cards!',
      badge: 'Party Fun',
      color: 'border-red-400 bg-red-500/10 text-red-300',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-black text-white tracking-wide">CREATE ROOM</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* Room Name */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Room Name</label>
            <input
              type="text"
              value={roomName}
              maxLength={24}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="e.g. Pungot Championship"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold text-sm focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Game Variant Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-2">
              Select UNO Variant
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {VARIANTS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVariant(v.id)}
                  className={`p-3 rounded-2xl border text-left transition-all relative ${
                    variant === v.id
                      ? `${v.color} border-2 shadow-lg scale-[1.02]`
                      : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xl">{v.icon}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                      {v.badge}
                    </span>
                  </div>
                  <div className="font-bold text-xs text-white">{v.name}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">{v.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Virtual Coin Entry Fee & Five-Place Prize Pool Selection */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/15 via-purple-900/20 to-slate-950 border-2 border-amber-400/50 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
                <span>💰</span>
                <span>Entry Fee & Prize Pool (5 Players)</span>
              </label>
              {entryFee > 0 && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-slate-950">
                  Pool: ₱{entryFee * 5}
                </span>
              )}
            </div>

            {/* Entry Fee Buttons */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {([0, 100, 200, 300, 400, 500] as EntryFeeAmount[]).map((fee) => (
                <button
                  key={fee}
                  type="button"
                  onClick={() => setEntryFee(fee)}
                  className={`py-2 px-1 rounded-xl text-xs font-black transition-all ${
                    entryFee === fee
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 shadow-[0_0_12px_rgba(250,204,21,0.6)] scale-105 border-2 border-white'
                      : 'bg-slate-950/80 text-slate-300 border border-slate-800 hover:border-amber-400/60'
                  }`}
                >
                  {fee === 0 ? 'Free' : `₱${fee}`}
                </button>
              ))}
            </div>

            {/* Prize Pool Breakdown Preview */}
            {entryFee > 0 ? (
              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-amber-400/30 text-[10px] space-y-1">
                <div className="font-bold text-amber-200 flex justify-between border-b border-slate-800 pb-1">
                  <span>🏆 5-Place Prize Distribution:</span>
                  <span className="font-black text-yellow-300">Total: ₱{entryFee * 5} (100%)</span>
                </div>
                <div className="grid grid-cols-5 gap-1 text-center pt-1 font-semibold text-slate-300">
                  <div className="p-1 rounded bg-amber-500/20 border border-amber-400/40">
                    <span className="text-amber-300 block font-black">1st (50%)</span>
                    <span>₱{Math.floor(entryFee * 5 * 0.5)}</span>
                  </div>
                  <div className="p-1 rounded bg-blue-500/20 border border-blue-400/40">
                    <span className="text-blue-300 block font-black">2nd (25%)</span>
                    <span>₱{Math.floor(entryFee * 5 * 0.25)}</span>
                  </div>
                  <div className="p-1 rounded bg-purple-500/20 border border-purple-400/40">
                    <span className="text-purple-300 block font-black">3rd (15%)</span>
                    <span>₱{Math.floor(entryFee * 5 * 0.15)}</span>
                  </div>
                  <div className="p-1 rounded bg-emerald-500/20 border border-emerald-400/40">
                    <span className="text-emerald-300 block font-black">4th (7%)</span>
                    <span>₱{Math.floor(entryFee * 5 * 0.07)}</span>
                  </div>
                  <div className="p-1 rounded bg-rose-500/20 border border-rose-400/40">
                    <span className="text-rose-300 block font-black">5th (3%)</span>
                    <span>₱{entryFee * 5 - (Math.floor(entryFee * 5 * 0.5) + Math.floor(entryFee * 5 * 0.25) + Math.floor(entryFee * 5 * 0.15) + Math.floor(entryFee * 5 * 0.07))}</span>
                  </div>
                </div>
                <p className="text-[9px] text-amber-300/80 italic text-center pt-0.5">
                  *Nangangailangan ng eksaktong 5 players upang masimulan ang match.
                </p>
              </div>
            ) : (
              <p className="text-[10px] text-slate-400 italic">
                Casual / Free Match: Walang entry fee. Standard coin victory reward (+₱200) ang ipagkakaloob.
              </p>
            )}
          </div>

          {/* Universal Defeat Rule Notice */}
          <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-500/30 flex items-center gap-2 text-[11px] text-red-300">
            <span className="text-base">💀</span>
            <div>
              <strong className="text-red-400">Pungot Defeat Rule Active:</strong> Across all variants, the last player with cards will lose the match!
            </div>
          </div>

          {/* Privacy Toggle */}
          <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                <span>Room Visibility</span>
              </div>
              <div className="text-[11px] text-slate-400">
                {isPrivate ? 'Private (Invite or code only)' : 'Public (Visible in room list)'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsPrivate(!isPrivate)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                isPrivate
                  ? 'bg-purple-600/30 text-purple-300 border-purple-500'
                  : 'bg-emerald-600/30 text-emerald-300 border-emerald-500'
              }`}
            >
              {isPrivate ? 'Private' : 'Public'}
            </button>
          </div>

          {/* Turn Timer */}
          <div>
            <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 mb-1.5">
              <Timer className="w-3.5 h-3.5 text-amber-400" />
              <span>Turn Timer</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {([0, 15, 30, 60] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTurnTimer(t)}
                  className={`py-2 rounded-xl text-xs font-bold border transition ${
                    turnTimer === t
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {t === 0 ? 'Off' : `${t}s`}
                </button>
              ))}
            </div>
          </div>

          {/* Starting Hand Size */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span>Starting Hand Size</span>
              </label>
              <span className="text-xs font-mono font-bold text-amber-400">{startingHandSize} Cards</span>
            </div>
            <input
              type="range"
              min="3"
              max="10"
              value={startingHandSize}
              onChange={(e) => setStartingHandSize(parseInt(e.target.value, 10))}
              className="w-full accent-amber-500 h-2 bg-slate-950 rounded-lg cursor-pointer"
            />
          </div>

          {/* House Rules Toggles (applicable to Classic and Dare) */}
          {variant !== 'all_wild' && (
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                House Rules
              </span>

              {/* Stacking */}
              <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-red-400" />
                    Stacking (+2 on +2, +4 on +4/+2)
                  </div>
                  <div className="text-[10px] text-slate-400">Pass draw penalties to the next player</div>
                </div>
                <input
                  type="checkbox"
                  checked={stacking}
                  onChange={(e) => setStacking(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
              </div>

              {/* Seven-Zero Rule */}
              {variant === 'classic' && (
                <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1">
                      <Shuffle className="w-3.5 h-3.5 text-yellow-400" />
                      Seven-Zero Rule
                    </div>
                    <div className="text-[10px] text-slate-400">7 swaps hands, 0 rotates all hands</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={sevenZero}
                    onChange={(e) => setSevenZero(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                </div>
              )}

              {/* WD4 Challenge */}
              {variant === 'classic' && (
                <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-purple-400" />
                      Wild Draw Four Challenge
                    </div>
                    <div className="text-[10px] text-slate-400">Allow players to challenge illegal +4 plays</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={wildDraw4Challenge}
                    onChange={(e) => setWildDraw4Challenge(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                </div>
              )}
            </div>
          )}

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="py-2.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition"
            >
              Create & Open Lobby
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
