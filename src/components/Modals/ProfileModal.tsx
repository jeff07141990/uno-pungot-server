import React, { useState, useRef, useEffect } from 'react';
import { X, UserCheck, Flame, Trophy, Percent, Camera, Upload, Trash2, Coins, Star, Shield, Award } from 'lucide-react';
import { PlayerStats } from '../../services/historyService';
import { PlayerWallet, PowerUpId, PowerUpItem } from '../../engine/types';
import { getXPProgress } from '../../utils/levelUtils';
import { firebaseState, signInWithGoogle, logoutUser } from '../../firebase/config';

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

  useEffect(() => {
    setName(currentName);
    setAvatar(currentAvatar);
    if (isImageAvatar(currentAvatar)) {
      setTab('photo');
    }
  }, [currentName, currentAvatar, isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Pumili ng tamang image file (JPG, PNG, GIF, WebP).');
      return;
    }
    // 10MB limit (will be compressed to 128x128 thumbnail anyway)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Masyadong malaki ang image. Gamitin ang mas maliit sa 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
      setUploadError('Hindi mabasa ang image file. Subukan ulit.');
    };
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      if (!result) return;
      // Resize to square for performance
      const img = new Image();
      img.onerror = () => {
        setUploadError('Hindi ma-decode ang larawan.');
      };
      img.onload = () => {
        try {
          const size = 128;
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            setAvatar(result);
            setTab('photo');
            return;
          }
          // Draw center-cropped square
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;
          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setAvatar(dataUrl);
          setTab('photo');
        } catch (_) {
          setAvatar(result);
          setTab('photo');
        }
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

          {/* Google Account Cloud / Phone Memory Link Card */}
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shrink-0 shadow">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-white truncate">
                    {firebaseState.auth?.currentUser && !firebaseState.auth.currentUser.isAnonymous
                      ? firebaseState.auth.currentUser.displayName || firebaseState.auth.currentUser.email
                      : 'Guest Account'}
                  </span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                    firebaseState.auth?.currentUser && !firebaseState.auth.currentUser.isAnonymous
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  }`}>
                    {firebaseState.auth?.currentUser && !firebaseState.auth.currentUser.isAnonymous ? 'Saved to Phone' : 'Temporary'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 block truncate">
                  {firebaseState.auth?.currentUser && !firebaseState.auth.currentUser.isAnonymous
                    ? 'Naka-bind ang coins at level sa phone storage.'
                    : 'I-bind sa Google para hindi mawala ang level at coins!'}
                </span>
              </div>
            </div>

            {firebaseState.auth?.currentUser && !firebaseState.auth.currentUser.isAnonymous ? (
              <button
                type="button"
                onClick={async () => {
                  await logoutUser();
                  window.location.reload();
                }}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 text-xs font-bold rounded-xl border border-slate-700 transition shrink-0"
              >
                Logout
              </button>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  try {
                    const user = await signInWithGoogle();
                    if (user) {
                      setName(user.displayName || name);
                      window.location.reload();
                    }
                  } catch (err: any) {
                    alert('Google Sign-In: ' + (err.message || 'Error occurred'));
                  }
                }}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-900 text-xs font-black rounded-xl shadow transition shrink-0 flex items-center gap-1.5 active:scale-95"
              >
                <span>Bind Google</span>
              </button>
            )}
          </div>

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
