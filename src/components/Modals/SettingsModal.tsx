import React, { useState, useEffect, useRef } from 'react';
import { X, Volume2, VolumeX, Eye, Maximize2, Minimize2, Image, Upload, RotateCcw, Trash2, Lock, Unlock, ShieldAlert } from 'lucide-react';
import { soundManager } from '../../audio/soundManager';
import {
  getCustomCardSkins,
  saveCustomCardSkin,
  removeCustomCardSkin,
  resetAllCardSkins,
  CustomCardSkinMap,
} from '../../utils/cardSkins';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'settings' | 'card_studio';
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, initialTab }) => {
  const [volume, setVolume] = useState<number>(() => {
    try {
      return Math.round(soundManager.getVolume() * 100);
    } catch {
      return 70;
    }
  });
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    try {
      return soundManager.getMuted();
    } catch {
      return false;
    }
  });
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    try {
      return localStorage.getItem('uno_reduced_motion') === 'true';
    } catch {
      return false;
    }
  });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    try {
      return typeof document !== 'undefined' ? Boolean(document.fullscreenElement) : false;
    } catch {
      return false;
    }
  });
  const [skins, setSkins] = useState<CustomCardSkinMap>(() => {
    try {
      return getCustomCardSkins();
    } catch {
      return {};
    }
  });
  const [selectedUploadKey, setSelectedUploadKey] = useState<keyof CustomCardSkinMap | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [serverAddress, setServerAddress] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('uno_custom_server');
      if (saved) return saved;
      if (typeof window !== 'undefined') {
        const { hostname, protocol } = window.location;
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
          return `${protocol}//${hostname}:3001`;
        }
      }
      return 'https://uno-pungot-server.onrender.com';
    } catch {
      return 'https://uno-pungot-server.onrender.com';
    }
  });
  const [activeColorTab, setActiveColorTab] = useState<
    'card_back' | 'red' | 'blue' | 'green' | 'yellow' | 'wild' | 'all_wild' | 'flip' | 'dare'
  >('card_back');
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('uno_admin_authed') === 'true';
    } catch {
      return false;
    }
  });
  const [adminPinInput, setAdminPinInput] = useState<string>('');
  const [adminPinError, setAdminPinError] = useState<string>('');

  const handleUnlockAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    const storedPin = localStorage.getItem('uno_admin_pin') || '8888';
    if (adminPinInput.trim() === storedPin) {
      setIsAdminUnlocked(true);
      try {
        sessionStorage.setItem('uno_admin_authed', 'true');
      } catch {}
      setAdminPinError('');
      setAdminPinInput('');
    } else {
      setAdminPinError('Maling PIN! Admin lamang ang pinahihintulutan.');
    }
  };

  const handleLockAdmin = () => {
    setIsAdminUnlocked(false);
    try {
      sessionStorage.removeItem('uno_admin_authed');
    } catch {}
  };

  // Sync admin unlock state when modal opens or initialTab is card_studio
  useEffect(() => {
    if (isOpen) {
      try {
        const authed = sessionStorage.getItem('uno_admin_authed') === 'true';
        if (authed || initialTab === 'card_studio') {
          setIsAdminUnlocked(true);
          sessionStorage.setItem('uno_admin_authed', 'true');
        }
      } catch {}
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    const handleUpdate = () => {
      try {
        setSkins(getCustomCardSkins());
      } catch {}
    };
    window.addEventListener('uno_skins_updated', handleUpdate);
    return () => window.removeEventListener('uno_skins_updated', handleUpdate);
  }, []);

  if (!isOpen) return null;

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setVolume(val);
    try {
      soundManager.setVolume(val / 100);
      if (isMuted && val > 0) {
        setIsMuted(false);
        soundManager.setMuted(false);
      }
    } catch {}
  };

  const handleToggleMute = () => {
    try {
      const next = soundManager.toggleMute();
      setIsMuted(next);
    } catch {}
  };

  const handleTestSound = () => {
    try {
      soundManager.play('turn_alert');
    } catch {}
  };

  const handleToggleReducedMotion = () => {
    const next = !reducedMotion;
    setReducedMotion(next);
    try {
      localStorage.setItem('uno_reduced_motion', next.toString());
      if (next) {
        document.documentElement.classList.add('reduce-motion');
      } else {
        document.documentElement.classList.remove('reduce-motion');
      }
    } catch {}
  };

  const handleToggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {});
        setIsFullscreen(true);
      } else {
        document.exitFullscreen?.().catch(() => {});
        setIsFullscreen(false);
      }
    } catch {}
  };

  const triggerUpload = (key: keyof CustomCardSkinMap) => {
    setSelectedUploadKey(key);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedUploadKey) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (result) {
        try {
          saveCustomCardSkin(selectedUploadKey, result);
        } catch {}
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const cardSkinItems: {
    key: keyof CustomCardSkinMap;
    label: string;
    countPerColor: string;
    totalCount: string;
    defaultSrc: string;
    colorBadge?: string;
  }[] = [
    {
      key: 'card_back',
      label: 'Card Back (Likod)',
      countPerColor: 'Lahat ng baraha',
      totalCount: '108 baraha (Buong deck)',
      defaultSrc: '/uno_card_back.png',
      colorBadge: 'Lahat ng kulay',
    },
    {
      key: 'skip',
      label: 'Skip (⊘)',
      countPerColor: '2 piraso bawat kulay (🔴, 🔵, 🟢, 🟡)',
      totalCount: '8 piraso sa buong deck',
      defaultSrc: '/cards/skip.png',
      colorBadge: '2x bawat kulay',
    },
    {
      key: 'reverse',
      label: 'Reverse (🔄)',
      countPerColor: '2 piraso bawat kulay (🔴, 🔵, 🟢, 🟡)',
      totalCount: '8 piraso sa buong deck',
      defaultSrc: '/cards/reverse.png',
      colorBadge: '2x bawat kulay',
    },
    {
      key: 'draw2',
      label: 'Draw Two (+2)',
      countPerColor: '2 piraso bawat kulay (🔴, 🔵, 🟢, 🟡)',
      totalCount: '8 piraso sa buong deck',
      defaultSrc: '/cards/draw2.png',
      colorBadge: '2x bawat kulay',
    },
    {
      key: 'wild',
      label: 'Wild Card (🌈)',
      countPerColor: 'Special (Universal Color)',
      totalCount: '4 piraso sa buong deck',
      defaultSrc: '',
      colorBadge: '4x universal',
    },
    {
      key: 'wild4',
      label: 'Wild Draw 4 (+4)',
      countPerColor: 'Special (Universal Color)',
      totalCount: '4 piraso sa buong deck',
      defaultSrc: '/cards/wild4.png',
      colorBadge: '4x universal',
    },
  ];

  // Helper to generate colored cards for the specific color tab
  const getCardsForColor = (color: 'red' | 'blue' | 'green' | 'yellow') => {
    const list: { key: string; label: string; count: string }[] = [];
    // Number 0: 1 card
    list.push({ key: `${color}_0`, label: `${color.toUpperCase()} 0`, count: '1x sa deck' });
    // Numbers 1-9: 2 cards each
    for (let i = 1; i <= 9; i++) {
      list.push({ key: `${color}_${i}`, label: `${color.toUpperCase()} ${i}`, count: '2x sa deck' });
    }
    // Power cards for this color
    list.push({ key: `${color}_skip`, label: `${color.toUpperCase()} Skip ⊘`, count: '2x sa deck' });
    list.push({ key: `${color}_reverse`, label: `${color.toUpperCase()} Reverse 🔄`, count: '2x sa deck' });
    list.push({ key: `${color}_draw2`, label: `${color.toUpperCase()} Draw +2`, count: '2x sa deck' });
    return list;
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 animate-fadeIn"
    >
      <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-5 sm:p-7 max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl relative">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h2 className="text-xl font-black text-white tracking-wide flex items-center gap-2">
            ⚙️ {isAdminUnlocked ? 'SETTINGS & CARD CUSTOMIZER (ADMIN)' : 'GAME SETTINGS'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-3 space-y-5 overflow-y-auto pr-1">
          {/* Custom Card Pictures Section (Admin Only - Completely Hidden for regular users) */}
          {isAdminUnlocked && (
            <div className="bg-slate-950/70 p-3 sm:p-4 rounded-2xl border border-amber-500/30 animate-fadeIn">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Image className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-black text-amber-300 uppercase tracking-wide">
                    Palitan ang Larawan ng Baraha (Admin Studio)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleLockAdmin}
                    className="text-[10px] font-bold text-slate-400 hover:text-white flex items-center gap-1 transition cursor-pointer"
                    title="I-lock muli"
                  >
                    <Lock className="w-3 h-3 text-amber-400" />
                    Lock
                  </button>
                  <button
                    type="button"
                    onClick={resetAllCardSkins}
                    className="text-[10px] font-bold text-slate-400 hover:text-red-400 flex items-center gap-1 transition cursor-pointer"
                    title="Ibalik sa orihinal ang lahat"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset All
                  </button>
                </div>
              </div>

                <p className="text-[11px] text-emerald-300 mb-2 font-medium flex items-center gap-1">
                  <span>✓ Naka-unlock bilang Admin.</span>
                  <span className="text-slate-400">Pumili ng kategorya sa ibaba para mag-upload ng larawan:</span>
                </p>

                {/* Color Navigation Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 border-b border-slate-800">
              <button
                type="button"
                onClick={() => setActiveColorTab('card_back')}
                className={`px-3 py-1.5 rounded-xl font-black text-xs transition whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                  activeColorTab === 'card_back'
                    ? 'bg-amber-400 text-slate-950 shadow ring-2 ring-amber-300 font-black'
                    : 'bg-slate-800 text-amber-300 hover:bg-slate-700'
                }`}
              >
                <span>🎴</span> Card Back Only
              </button>
              <button
                type="button"
                onClick={() => setActiveColorTab('red')}
                className={`px-3 py-1.5 rounded-xl font-black text-xs transition whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                  activeColorTab === 'red'
                    ? 'bg-red-600 text-white shadow ring-2 ring-red-400'
                    : 'bg-slate-800 text-red-300 hover:bg-slate-700'
                }`}
              >
                <span>🔴</span> Red Cards (25)
              </button>
              <button
                type="button"
                onClick={() => setActiveColorTab('blue')}
                className={`px-3 py-1.5 rounded-xl font-black text-xs transition whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                  activeColorTab === 'blue'
                    ? 'bg-blue-600 text-white shadow ring-2 ring-blue-400'
                    : 'bg-slate-800 text-blue-300 hover:bg-slate-700'
                }`}
              >
                <span>🔵</span> Blue Cards (25)
              </button>
              <button
                type="button"
                onClick={() => setActiveColorTab('green')}
                className={`px-3 py-1.5 rounded-xl font-black text-xs transition whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                  activeColorTab === 'green'
                    ? 'bg-emerald-600 text-white shadow ring-2 ring-emerald-400'
                    : 'bg-slate-800 text-emerald-300 hover:bg-slate-700'
                }`}
              >
                <span>🟢</span> Green Cards (25)
              </button>
              <button
                type="button"
                onClick={() => setActiveColorTab('yellow')}
                className={`px-3 py-1.5 rounded-xl font-black text-xs transition whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                  activeColorTab === 'yellow'
                    ? 'bg-amber-400 text-slate-950 shadow ring-2 ring-yellow-300 font-black'
                    : 'bg-slate-800 text-yellow-300 hover:bg-slate-700'
                }`}
              >
                <span>🟡</span> Yellow Cards (25)
              </button>
              <button
                type="button"
                onClick={() => setActiveColorTab('wild')}
                className={`px-3 py-1.5 rounded-xl font-black text-xs transition whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                  activeColorTab === 'wild'
                    ? 'bg-purple-600 text-white shadow ring-2 ring-purple-400'
                    : 'bg-slate-800 text-purple-300 hover:bg-slate-700'
                }`}
              >
                <span>🌈</span> Wild Cards (8)
              </button>
              <button
                type="button"
                onClick={() => setActiveColorTab('all_wild')}
                className={`px-3 py-1.5 rounded-xl font-black text-xs transition whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                  activeColorTab === 'all_wild'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow ring-2 ring-pink-400'
                    : 'bg-slate-800 text-pink-300 hover:bg-slate-700'
                }`}
              >
                <span>✨</span> All Wild (7 types)
              </button>
              <button
                type="button"
                onClick={() => setActiveColorTab('flip')}
                className={`px-3 py-1.5 rounded-xl font-black text-xs transition whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                  activeColorTab === 'flip'
                    ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow ring-2 ring-cyan-400'
                    : 'bg-slate-800 text-cyan-300 hover:bg-slate-700'
                }`}
              >
                <span>🌓</span> Uno Flip (5 types)
              </button>
              <button
                type="button"
                onClick={() => setActiveColorTab('dare')}
                className={`px-3 py-1.5 rounded-xl font-black text-xs transition whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                  activeColorTab === 'dare'
                    ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white shadow ring-2 ring-orange-400'
                    : 'bg-slate-800 text-orange-300 hover:bg-slate-700'
                }`}
              >
                <span>🎭</span> Uno Dare (2 types)
              </button>
            </div>

            {/* TAB CONTENT 1: Card Back Only (For Classic & All Variants) */}
            {activeColorTab === 'card_back' && (
              <div>
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 mb-3 text-[11px] text-slate-300 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-amber-400 flex items-center gap-1.5">
                      <span>🎴</span>
                      <span>Card Backs (Likod ng Baraha para sa Bawat Variant):</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Maaari mong baguhin ang likod ng baraha para sa Classic UNO, All Wild, Uno Flip, o Uno Dare.
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    {
                      key: 'card_back',
                      title: 'Classic UNO Back',
                      subtitle: 'Standard / Classic Deck',
                      badge: 'Classic',
                      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
                      defaultSrc: '/uno_card_back.png',
                    },
                    {
                      key: 'card_back_all_wild',
                      title: 'All Wild Back',
                      subtitle: 'All Wild Edition Deck',
                      badge: 'All Wild',
                      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
                      defaultSrc: '/uno_card_back.png',
                    },
                    {
                      key: 'card_back_flip',
                      title: 'Uno Flip Back',
                      subtitle: 'Uno Flip Edition Deck',
                      badge: 'Uno Flip',
                      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
                      defaultSrc: '/uno_card_back.png',
                    },
                    {
                      key: 'card_back_dare',
                      title: 'Uno Dare Back',
                      subtitle: 'Uno Dare Edition Deck',
                      badge: 'Uno Dare',
                      badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
                      defaultSrc: '/uno_card_back.png',
                    },
                  ].map((item) => {
                    const currentImg = skins[item.key] || item.defaultSrc;
                    return (
                      <div
                        key={item.key}
                        className="flex flex-col items-center bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-lg justify-between hover:border-amber-400/50 transition"
                      >
                        <div className="w-full text-center">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border mb-1 inline-block ${item.badgeColor}`}>
                            {item.badge}
                          </span>
                          <span className="text-xs font-black text-white block truncate">
                            {item.title}
                          </span>
                          <span className="text-[9px] text-slate-400 block mb-2">
                            {item.subtitle}
                          </span>
                        </div>

                        <div className="w-16 h-24 sm:w-20 sm:h-28 bg-slate-950 rounded-xl overflow-hidden border-2 border-slate-700 shadow-xl flex items-center justify-center my-1">
                          <img
                            src={currentImg}
                            alt={item.title}
                            className="w-full h-full object-fill"
                          />
                        </div>

                        <div className="flex items-center gap-1.5 mt-3 w-full">
                          <button
                            type="button"
                            onClick={() => triggerUpload(item.key)}
                            className="flex-1 py-1.5 px-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[10px] rounded-xl flex items-center justify-center gap-1 transition active:scale-95 shadow cursor-pointer"
                          >
                            <Upload className="w-3 h-3" />
                            Upload Back
                          </button>
                          {skins[item.key] && (
                            <button
                              type="button"
                              onClick={() => removeCustomCardSkin(item.key)}
                              className="p-1.5 text-slate-400 hover:text-red-400 rounded-xl hover:bg-slate-800 transition cursor-pointer"
                              title="Ibalik sa default"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: Specific Color Cards (Red, Blue, Green, Yellow) */}
            {(activeColorTab === 'red' ||
              activeColorTab === 'blue' ||
              activeColorTab === 'green' ||
              activeColorTab === 'yellow') && (
              <div>
                <div className="text-[11px] text-slate-300 font-semibold mb-2">
                  Lahat ng baraha para sa kulay na ito (Numbers 0 hanggang 9, Skip, Reverse, Draw +2):
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {getCardsForColor(activeColorTab).map((item) => {
                    const currentImg = skins[item.key];
                    return (
                      <div
                        key={item.key}
                        className="flex flex-col items-center bg-slate-900 border border-slate-800 rounded-xl p-2 relative group hover:border-amber-400/50 transition justify-between"
                      >
                        <div className="w-full text-center">
                          <span className="text-[10px] font-bold text-slate-200 block truncate">
                            {item.label}
                          </span>
                          <span className="text-[8px] text-amber-400/90 block mb-1">
                            {item.count}
                          </span>
                        </div>

                        <div className="w-12 h-17 sm:w-13 sm:h-19 bg-slate-950 rounded-lg overflow-hidden border border-slate-700 shadow flex items-center justify-center relative my-1">
                          {currentImg ? (
                            <img
                              src={currentImg}
                              alt={item.label}
                              className="w-full h-full object-fill"
                            />
                          ) : (
                            <span className="text-[9px] font-bold text-slate-500">Default SVG</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 mt-1.5 w-full">
                          <button
                            type="button"
                            onClick={() => triggerUpload(item.key)}
                            className="flex-1 py-1 px-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[9px] rounded-lg flex items-center justify-center gap-0.5 transition active:scale-95 shadow cursor-pointer"
                          >
                            <Upload className="w-2.5 h-2.5" />
                            Upload
                          </button>
                          {skins[item.key] && (
                            <button
                              type="button"
                              onClick={() => removeCustomCardSkin(item.key)}
                              className="p-1 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                              title="Ibalik sa default"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB CONTENT 3: Wild Cards Tab */}
            {activeColorTab === 'wild' && (
              <div>
                <div className="text-[11px] text-slate-300 font-semibold mb-2">
                  Universal Wild cards (Tig-4 na piraso bawat isa sa standard deck):
                </div>
                <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
                  {[
                    { key: 'wild', label: 'Wild Card (🌈)', count: '4x piraso sa deck', defaultSrc: '' },
                    { key: 'wild4', label: 'Wild Draw 4 (+4)', count: '4x piraso sa deck', defaultSrc: '/cards/wild4.png' },
                  ].map((item) => {
                    const currentImg = skins[item.key] || item.defaultSrc;
                    return (
                      <div
                        key={item.key}
                        className="flex flex-col items-center bg-slate-900 border border-slate-800 rounded-xl p-2.5 relative group hover:border-amber-400/50 transition justify-between"
                      >
                        <div className="w-full text-center">
                          <span className="text-[11px] font-black text-slate-200 block truncate">
                            {item.label}
                          </span>
                          <span className="text-[9px] font-bold text-amber-400/90 block mb-1">
                            {item.count}
                          </span>
                        </div>

                        <div className="w-14 h-20 sm:w-16 sm:h-24 bg-slate-950 rounded-lg overflow-hidden border border-slate-700 shadow flex items-center justify-center relative my-1">
                          {currentImg ? (
                            <img
                              src={currentImg}
                              alt={item.label}
                              className="w-full h-full object-fill"
                            />
                          ) : (
                            <span className="text-[10px] font-black text-slate-500">Default SVG</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 mt-2 w-full">
                          <button
                            type="button"
                            onClick={() => triggerUpload(item.key)}
                            className="flex-1 py-1 px-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[10px] rounded-lg flex items-center justify-center gap-1 transition active:scale-95 shadow cursor-pointer"
                          >
                            <Upload className="w-3 h-3" />
                            Upload
                          </button>
                          {skins[item.key] && (
                            <button
                              type="button"
                              onClick={() => removeCustomCardSkin(item.key)}
                              className="p-1 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                              title="Ibalik sa default"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB CONTENT 4: All Wild Variant Customizer */}
            {activeColorTab === 'all_wild' && (
              <div>
                <div className="text-[11px] text-slate-300 font-semibold mb-2">
                  Lahat ng Special Action Cards para sa <span className="text-pink-400 font-black">All Wild Edition</span>:
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {[
                    { key: 'card_back_all_wild', label: '🎴 All Wild Card Back', count: 'Likod ng baraha', defaultSrc: '/uno_card_back.png' },
                    { key: 'wild', label: 'Wild Standard', count: '4x sa deck' },
                    { key: 'reverse', label: 'Wild Reverse 🔄', count: '14x sa deck' },
                    { key: 'skip', label: 'Wild Skip ⊘', count: '10x sa deck' },
                    { key: 'skip2', label: 'Wild Skip Two (2x)', count: '6x sa deck' },
                    { key: 'draw2', label: 'Wild Draw 2 (+2)', count: '4x sa deck' },
                    { key: 'wild4', label: 'Wild Draw 4 (+4)', count: '4x sa deck' },
                    { key: 'targeted_draw2', label: 'Targeted Draw 2 🎯', count: '4x sa deck' },
                    { key: 'forced_swap', label: 'Forced Swap 🔀', count: '2x sa deck' },
                  ].map((item) => {
                    const currentImg = skins[item.key] || item.defaultSrc;
                    return (
                      <div
                        key={item.key}
                        className="flex flex-col items-center bg-slate-900 border border-slate-800 rounded-xl p-2 relative group hover:border-pink-400/50 transition justify-between"
                      >
                        <div className="w-full text-center">
                          <span className="text-[10px] font-bold text-slate-200 block truncate">
                            {item.label}
                          </span>
                          <span className="text-[8px] text-pink-400/90 block mb-1">
                            {item.count}
                          </span>
                        </div>

                        <div className="w-12 h-17 sm:w-13 sm:h-19 bg-slate-950 rounded-lg overflow-hidden border border-slate-700 shadow flex items-center justify-center relative my-1">
                          {currentImg ? (
                            <img
                              src={currentImg}
                              alt={item.label}
                              className="w-full h-full object-fill"
                            />
                          ) : (
                            <span className="text-[9px] font-bold text-slate-500">Default SVG</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 mt-1.5 w-full">
                          <button
                            type="button"
                            onClick={() => triggerUpload(item.key)}
                            className="flex-1 py-1 px-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-black text-[9px] rounded-lg flex items-center justify-center gap-0.5 transition active:scale-95 shadow cursor-pointer"
                          >
                            <Upload className="w-2.5 h-2.5" />
                            Upload
                          </button>
                          {skins[item.key] && (
                            <button
                              type="button"
                              onClick={() => removeCustomCardSkin(item.key)}
                              className="p-1 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                              title="Ibalik sa default"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB CONTENT 5: Uno Flip Variant Customizer */}
            {activeColorTab === 'flip' && (
              <div>
                <div className="text-[11px] text-slate-300 font-semibold mb-2">
                  Special Flip Action Cards para sa <span className="text-cyan-400 font-black">Uno Flip Edition</span>:
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  {[
                    { key: 'card_back_flip', label: '🎴 Flip Card Back', count: 'Likod ng baraha', defaultSrc: '/uno_card_back.png' },
                    { key: 'flip', label: 'Flip Card 🌓', count: 'Light/Dark Flip' },
                    { key: 'draw1', label: 'Draw 1 (+1)', count: 'Light Side' },
                    { key: 'draw5', label: 'Draw 5 (+5)', count: 'Dark Side' },
                    { key: 'skip_all', label: 'Skip All ⊘', count: 'Dark Side' },
                    { key: 'wild_draw_color', label: 'Wild Draw Color 🎯', count: 'Dark Side Wild' },
                  ].map((item) => {
                    const currentImg = skins[item.key] || item.defaultSrc;
                    return (
                      <div
                        key={item.key}
                        className="flex flex-col items-center bg-slate-900 border border-slate-800 rounded-xl p-2 relative group hover:border-cyan-400/50 transition justify-between"
                      >
                        <div className="w-full text-center">
                          <span className="text-[10px] font-bold text-slate-200 block truncate">
                            {item.label}
                          </span>
                          <span className="text-[8px] text-cyan-400/90 block mb-1">
                            {item.count}
                          </span>
                        </div>

                        <div className="w-12 h-17 sm:w-13 sm:h-19 bg-slate-950 rounded-lg overflow-hidden border border-slate-700 shadow flex items-center justify-center relative my-1">
                          {currentImg ? (
                            <img
                              src={currentImg}
                              alt={item.label}
                              className="w-full h-full object-fill"
                            />
                          ) : (
                            <span className="text-[9px] font-bold text-slate-500">Default SVG</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 mt-1.5 w-full">
                          <button
                            type="button"
                            onClick={() => triggerUpload(item.key)}
                            className="flex-1 py-1 px-1 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-black text-[9px] rounded-lg flex items-center justify-center gap-0.5 transition active:scale-95 shadow cursor-pointer"
                          >
                            <Upload className="w-2.5 h-2.5" />
                            Upload
                          </button>
                          {skins[item.key] && (
                            <button
                              type="button"
                              onClick={() => removeCustomCardSkin(item.key)}
                              className="p-1 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                              title="Ibalik sa default"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB CONTENT 6: Uno Dare Variant Customizer */}
            {activeColorTab === 'dare' && (
              <div>
                <div className="text-[11px] text-slate-300 font-semibold mb-2">
                  Special Dare Challenge Cards para sa <span className="text-orange-400 font-black">Uno Dare Edition</span>:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto">
                  {[
                    { key: 'card_back_dare', label: '🎴 Dare Card Back', count: 'Likod ng baraha', defaultSrc: '/uno_card_back.png' },
                    { key: 'dare', label: 'Dare Card 🎭', count: 'Color Dare Draw 2' },
                    { key: 'wild_dare', label: 'Wild Dare 🎭', count: 'Universal Wild Dare' },
                  ].map((item) => {
                    const currentImg = skins[item.key] || item.defaultSrc;
                    return (
                      <div
                        key={item.key}
                        className="flex flex-col items-center bg-slate-900 border border-slate-800 rounded-xl p-2.5 relative group hover:border-orange-400/50 transition justify-between"
                      >
                        <div className="w-full text-center">
                          <span className="text-[11px] font-black text-slate-200 block truncate">
                            {item.label}
                          </span>
                          <span className="text-[9px] font-bold text-orange-400/90 block mb-1">
                            {item.count}
                          </span>
                        </div>

                        <div className="w-14 h-20 sm:w-16 sm:h-24 bg-slate-950 rounded-lg overflow-hidden border border-slate-700 shadow flex items-center justify-center relative my-1">
                          {currentImg ? (
                            <img
                              src={currentImg}
                              alt={item.label}
                              className="w-full h-full object-fill"
                            />
                          ) : (
                            <span className="text-[10px] font-black text-slate-500">Default SVG</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 mt-2 w-full">
                          <button
                            type="button"
                            onClick={() => triggerUpload(item.key)}
                            className="flex-1 py-1 px-1.5 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 text-white font-black text-[10px] rounded-lg flex items-center justify-center gap-1 transition active:scale-95 shadow cursor-pointer"
                          >
                            <Upload className="w-3 h-3" />
                            Upload
                          </button>
                          {skins[item.key] && (
                            <button
                              type="button"
                              onClick={() => removeCustomCardSkin(item.key)}
                              className="p-1 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                              title="Ibalik sa default"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            </div>
          )}

          {/* Sound Controls */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-slate-200 flex items-center gap-2">
                {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                Sound Effects
              </span>
              <button
                onClick={handleToggleMute}
                className={`text-xs px-2.5 py-1 rounded-lg font-bold border transition ${
                  isMuted ? 'bg-red-500/20 text-red-300 border-red-500/50' : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                {isMuted ? 'Unmute' : 'Mute'}
              </button>
            </div>

            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                disabled={isMuted}
                onChange={handleVolumeChange}
                className="w-full accent-amber-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />
              <span className="text-xs font-mono text-slate-400 w-8">{isMuted ? '0%' : `${volume}%`}</span>
            </div>

            <button
              onClick={handleTestSound}
              className="mt-2 text-xs text-amber-400 hover:text-amber-300 underline font-semibold"
            >
              Test Sound Effect
            </button>
          </div>

          {/* Reduced Motion */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <div>
              <div className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Eye className="w-4 h-4 text-cyan-400" />
                Reduced Motion
              </div>
              <div className="text-xs text-slate-400">Minimizes animations for sensitivity</div>
            </div>
            <button
              onClick={handleToggleReducedMotion}
              className={`w-12 h-6 rounded-full transition-colors p-1 flex items-center ${
                reducedMotion ? 'bg-amber-500 justify-end' : 'bg-slate-800 justify-start'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-slate-950 shadow"></div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 text-right">
          <button
            onClick={onClose}
            className="py-2.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-md transition cursor-pointer"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};
