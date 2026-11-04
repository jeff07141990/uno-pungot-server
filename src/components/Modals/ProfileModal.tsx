import React, { useState, useRef } from 'react';
import { X, UserCheck, Flame, Trophy, Percent, Camera, Upload, Trash2, Coins, Star, Shield, Award } from 'lucide-react';
import { PlayerStats } from '../../services/historyService';
import { PlayerWallet, PowerUpId, PowerUpItem } from '../../engine/types';
import { getXPProgress } from '../../utils/levelUtils';

interface ProfileModalProps {
  isOpen: boolean;
  currentName: string;
  currentAvatar: string;
  stats: PlayerStats | null;
  wallet: PlayerWallet | null;
  catalog?: Record<PowerUpId, PowerUpItem> | null;
  onSave: (name: string, avatar: string) => void;
  onClose: () => void;
}

const AVATAR_OPTIONS = [
  '🦊', '🐼', '🐯', '🦁', '🐸', '🐨', '🦄', '🐲',
  '🤖', '👾', '🚀', '🔥', '⚡', '👑', '🧙‍♂️', '🕶️',
  '🎯', '🎪', '🎭', '🃏', '🏆', '💎', '🌟', '🎮',
];

const isImageAvatar = (avatar: string) => avatar.startsWith('data:image');

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  currentName,
  currentAvatar,
  stats,
  wallet,
  catalog,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState(currentName);
  const [avatar, setAvatar] = useState(currentAvatar);
  const [tab, setTab] = useState<'emoji' | 'photo'>('emoji');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSave = () => {
    const trimmed = name.trim() || 'Player';
    onSave(trimmed, avatar);
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Invalid file type. Please upload an image (JPG, PNG, GIF, WebP).');
      return;
    }
    // 2MB limit
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('Image too large. Please use an image smaller than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      // Resize to a small square for performance
      const img = new Image();
      img.onload = () => {
        const size = 128;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        // Draw center-cropped square
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        setAvatar(dataUrl);
        setTab('photo');
      };
      img.src = result;
    };
    reader.readAsDataURL(file);

    // Reset so same file can be re-selected
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <h2 className="text-xl font-black text-white tracking-wide">PLAYER PROFILE</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* Virtual Coin & Level Card */}
          {wallet && (() => {
            const xp = getXPProgress(wallet.experience || 0);
            return (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-500/20 border-2 border-amber-400/80 shadow-md space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">💰</span>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                        Virtual Peso Balance
                      </span>
                      <span className="text-lg font-black text-amber-300">
                        ₱{wallet.balance.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 inline-block mb-0.5 shadow">
                      Level {xp.level}
                    </span>
                    <span className="block text-[11px] text-slate-300 font-mono font-bold">
                      {wallet.experience.toLocaleString()} Total XP
                    </span>
                  </div>
                </div>

                {/* Level Progress Bar & Info */}
                <div className="pt-1 border-t border-amber-400/20">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 mb-1">
                    <span className="text-cyan-300">Level {xp.level} Progress</span>
                    <span className="font-mono">{xp.currentLevelXP} / {xp.neededXPForNext} XP ({xp.percent}%)</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-900 overflow-hidden border border-slate-700/80 shadow-inner">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 transition-all duration-300 shadow-[0_0_8px_rgba(34,211,238,0.7)]"
                      style={{ width: `${xp.percent}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                    <span>Kailangan para sa Lvl {xp.level + 1}: <b className="text-amber-300 font-mono">{xp.neededXPForNext - xp.currentLevelXP} XP</b></span>
                    <span className="text-amber-400 font-bold">🎁 Level Up Bonus: +₱{xp.bonusCoinsForNext}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Avatar Preview & Name Input */}
          <div className="flex items-center gap-4">
            {/* Avatar Preview */}
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 border-2 border-white flex items-center justify-center text-3xl shadow-lg overflow-hidden">
                {isImageAvatar(avatar) ? (
                  <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span>{avatar}</span>
                )}
              </div>
              {/* Quick upload button overlay */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500 hover:bg-amber-400 flex items-center justify-center shadow-lg border-2 border-slate-900 transition active:scale-90"
                title="Upload photo"
              >
                <Camera className="w-3 h-3 text-slate-950" />
              </button>
            </div>

            <div className="flex-1">
              <label className="text-xs font-semibold text-slate-400 block mb-1">Nickname</label>
              <input
                type="text"
                value={name}
                maxLength={18}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter nickname..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold text-sm focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Tab: Emoji vs Photo */}
          <div className="flex bg-slate-950 rounded-xl p-1 border border-slate-800">
            <button
              type="button"
              onClick={() => setTab('emoji')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                tab === 'emoji'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              😎 Choose Emoji
            </button>
            <button
              type="button"
              onClick={() => setTab('photo')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                tab === 'photo'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📷 Upload Photo
            </button>
          </div>

          {/* Emoji Grid */}
          {tab === 'emoji' && (
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-2">Choose Avatar</label>
              <div className="grid grid-cols-8 gap-1.5 bg-slate-950 p-2.5 rounded-2xl border border-slate-800">
                {AVATAR_OPTIONS.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => setAvatar(av)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-xl transition-transform hover:scale-110 active:scale-90 ${
                      !isImageAvatar(avatar) && avatar === av
                        ? 'bg-amber-500/30 border-2 border-amber-400 shadow'
                        : 'hover:bg-slate-800'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Photo Upload */}
          {tab === 'photo' && (
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-2">Profile Photo</label>
              <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 flex flex-col items-center gap-3">
                {/* Current photo preview */}
                {isImageAvatar(avatar) && (
                  <div className="relative">
                    <img
                      src={avatar}
                      alt="Profile preview"
                      className="w-24 h-24 rounded-2xl object-cover border-2 border-amber-400 shadow-lg"
                    />
                    <button
                      type="button"
                      onClick={() => setAvatar('🦊')}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center border-2 border-slate-900 shadow transition"
                      title="Remove photo"
                    >
                      <Trash2 className="w-3 h-3 text-white" />
                    </button>
                  </div>
                )}

                {/* Upload button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm px-5 py-2.5 rounded-xl shadow-lg transition active:scale-95"
                >
                  <Upload className="w-4 h-4" />
                  <span>{isImageAvatar(avatar) ? 'Change Photo' : 'Upload Photo'}</span>
                </button>

                <p className="text-[10px] text-slate-500 text-center">
                  JPG, PNG, GIF, WebP • Max 2MB<br />Will be cropped to a square
                </p>

                {uploadError && (
                  <p className="text-xs text-red-400 font-bold text-center">{uploadError}</p>
                )}
              </div>
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Stats Overview */}
          <div className="pt-3 border-t border-slate-800">
            <label className="text-xs font-semibold text-slate-400 block mb-2">Career Stats</label>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                  <Flame className="w-3 h-3 text-amber-500" />
                  <span>Games</span>
                </div>
                <div className="text-base font-black text-white">
                  {stats?.gamesPlayed ?? (wallet ? wallet.totalWins + wallet.totalLosses : 0)}
                </div>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                  <Trophy className="w-3 h-3 text-yellow-400" />
                  <span>Wins</span>
                </div>
                <div className="text-base font-black text-emerald-400">
                  {stats?.wins ?? wallet?.totalWins ?? 0}
                </div>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                  <Flame className="w-3 h-3 text-orange-400" />
                  <span>Streak</span>
                </div>
                <div className="text-base font-black text-orange-400">
                  {wallet?.winStreak ?? 0}
                </div>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                  <Percent className="w-3 h-3 text-cyan-400" />
                  <span>Win %</span>
                </div>
                <div className="text-base font-black text-cyan-400">
                  {stats?.winPercentage ?? 0}%
                </div>
              </div>
            </div>
          </div>

          {/* Owned Power-Up Inventory */}
          {wallet && (
            <div className="pt-3 border-t border-slate-800">
              <label className="text-xs font-semibold text-slate-400 block mb-2">
                Power-Up Inventory (Imbentaryo)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {catalog &&
                  Object.values(catalog).map((item) => {
                    const count = wallet.inventory[item.id] || 0;
                    return (
                      <div
                        key={item.id}
                        className="bg-slate-950 p-2 rounded-xl border border-slate-800 flex flex-col items-center text-center shadow-inner"
                      >
                        <span className="text-xl">{item.icon}</span>
                        <span className="text-[9px] font-black text-white truncate max-w-full">
                          {item.name}
                        </span>
                        <span className="text-[10px] font-black text-amber-300 mt-0.5">
                          {count}x
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Achievements Badges */}
          {wallet?.achievements && wallet.achievements.length > 0 && (
            <div className="pt-3 border-t border-slate-800">
              <label className="text-xs font-semibold text-slate-400 block mb-2">
                Achievement Badges
              </label>
              <div className="flex flex-wrap gap-1.5">
                {wallet.achievements.map((ach) => (
                  <span
                    key={ach}
                    className="text-[10px] font-black px-2.5 py-1 rounded-full bg-slate-950 text-amber-300 border border-amber-400/40 flex items-center gap-1"
                  >
                    <span>🎖️</span>
                    <span>{ach.replace(/_/g, ' ').toUpperCase()}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 text-right flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="py-2.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-md transition flex items-center gap-1.5"
          >
            <UserCheck className="w-4 h-4" />
            <span>Save Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
};
