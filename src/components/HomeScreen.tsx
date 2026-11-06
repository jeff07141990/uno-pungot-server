import React, { useState, useEffect } from 'react';
import { getXPProgress } from '../utils/levelUtils';
import {
  Play,
  Plus,
  KeyRound,
  Bot,
  BookOpen,
  Settings as SettingsIcon,
  User,
  History,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Wifi,
  Sparkles,
  Mic,
  MicOff,
  LogOut,
  Radio,
  ShoppingBag,
  Gift,
  Trophy,
  ShieldAlert,
} from 'lucide-react';
import { ConnectionStatus } from '../services/networkManager';
import { GameVariant, PlayerWallet } from '../engine/types';
import { PlayWithBotsModal } from './Modals/PlayWithBotsModal';
import { LiveAvailableRooms } from './LiveAvailableRooms';

interface HomeScreenProps {
  playerName: string;
  playerAvatar: string;
  connectionStatus: ConnectionStatus;
  isMuted: boolean;
  onToggleMute: () => void;
  // Open Mic props
  isVoiceMuted: boolean;
  isVoiceConnected: boolean;
  isSpeaking: boolean;
  onToggleVoiceMic: () => void;
  // Virtual Coin & Power-Up Economy props
  wallet: PlayerWallet | null;
  onOpenShop: () => void;
  onOpenMissions: () => void;
  onOpenLeaderboard: () => void;
  onOpenAdmin: () => void;
  // Exit game
  onExitGame: () => void;
  onPlayOnline: () => void;
  onCreateRoom: () => void;
  onJoinRoom: (roomId?: string) => void;
  onPlayWithBots: (botCount: number, variant: GameVariant) => void;
  onOpenHowToPlay: () => void;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
  onOpenMatchHistory: () => void;
  // Available live public rooms
  publicRooms?: any[];
  isLoadingRooms?: boolean;
  onRefreshRooms?: () => void;
  onSpectateRoom?: (roomId: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  playerName,
  playerAvatar,
  connectionStatus,
  isMuted,
  onToggleMute,
  isVoiceMuted,
  isVoiceConnected,
  isSpeaking,
  onToggleVoiceMic,
  wallet,
  onOpenShop,
  onOpenMissions,
  onOpenLeaderboard,
  onOpenAdmin,
  onExitGame,
  onPlayOnline,
  onCreateRoom,
  onJoinRoom,
  onPlayWithBots,
  onOpenHowToPlay,
  onOpenSettings,
  onOpenProfile,
  onOpenMatchHistory,
  publicRooms = [],
  isLoadingRooms = false,
  onRefreshRooms,
  onSpectateRoom,
}) => {
  const [isBotModalOpen, setIsBotModalOpen] = useState(false);
  const [isLiveTvOpen, setIsLiveTvOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Auto-refresh public rooms every 5 seconds while on HomeScreen
  useEffect(() => {
    if (onRefreshRooms) {
      onRefreshRooms();
      const interval = setInterval(() => {
        onRefreshRooms();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [onRefreshRooms]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [isAdminAuthed, setIsAdminAuthed] = useState(() => {
    try {
      return sessionStorage.getItem('uno_admin_authed') === 'true';
    } catch {
      return false;
    }
  });
  const [secretTapCount, setSecretTapCount] = useState(0);

  // Keep isAdminAuthed in sync with storage updates
  useEffect(() => {
    const checkAdmin = () => {
      try {
        setIsAdminAuthed(sessionStorage.getItem('uno_admin_authed') === 'true');
      } catch {}
    };
    window.addEventListener('storage', checkAdmin);
    return () => window.removeEventListener('storage', checkAdmin);
  }, []);

  const handleSecretAdminTrigger = () => {
    const nextCount = secretTapCount + 1;
    if (nextCount >= 5) {
      setSecretTapCount(0);
      onOpenAdmin();
    } else {
      setSecretTapCount(nextCount);
      // Auto reset after 3 seconds
      setTimeout(() => setSecretTapCount(0), 3000);
    }
  };

  return (
    <div className="relative min-h-[100dvh] max-h-[100dvh] h-[100dvh] flex flex-col justify-between p-2 sm:p-4 bg-slate-950 overflow-hidden select-none">
      {/* Background Beach Artwork - Clear and Undimmed */}
      <div className="absolute inset-0 pointer-events-none select-none z-0 overflow-hidden">
        <img
          src="/home-bg.jpg"
          alt="Home Background"
          className="w-full h-full object-cover select-none pointer-events-none"
        />
      </div>

      {/* Very Top Running Transparent Live TV Ticker Bar */}
      {onSpectateRoom && (
        <div className="fixed top-0 left-0 right-0 z-40 pointer-events-auto">
          <LiveAvailableRooms
            rooms={publicRooms}
            isLoading={isLoadingRooms}
            onRefresh={onRefreshRooms || (() => {})}
            onJoin={(roomId) => onJoinRoom(roomId)}
            onSpectate={(roomId) => onSpectateRoom(roomId)}
            onOpenChange={setIsLiveTvOpen}
          />
        </div>
      )}

      {/* Top Navbar */}
      <div className="w-full flex items-center justify-between z-30 shrink-0 gap-2 mt-7 sm:mt-8">
        {/* Left Side: Profile Pill & Virtual Coin Wallet Pill */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-hidden">
          {/* Profile Pill */}
          <button
            onClick={onOpenProfile}
            className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-slate-700/80 hover:border-amber-400/80 transition-all shadow-lg hover:scale-105 active:scale-95 group shrink-0"
          >
            <div
              onClick={(e) => {
                e.stopPropagation();
                handleSecretAdminTrigger();
              }}
              className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-base shadow overflow-hidden cursor-pointer active:scale-90 select-none"
              title="Profile"
            >
              {playerAvatar && playerAvatar.startsWith('data:image') ? (
                <img src={playerAvatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span>{playerAvatar}</span>
              )}
            </div>
            <div className="text-left">
              <span className="block text-[11px] sm:text-xs font-black text-white group-hover:text-amber-300 transition truncate max-w-[80px] sm:max-w-[120px]">
                {playerName}
              </span>
              {(() => {
                const xpInfo = getXPProgress(wallet?.experience || 0);
                return (
                  <div className="flex flex-col gap-0.5 mt-0.5" title={`${xpInfo.currentLevelXP} / ${xpInfo.neededXPForNext} XP (${xpInfo.percent}%)`}>
                    <div className="flex items-center gap-1 leading-none">
                      <span className="text-[9px] text-cyan-400 font-black">
                        Lvl {xpInfo.level}
                      </span>
                      <span className="text-[8px] font-mono text-slate-400 font-bold">
                        {xpInfo.percent}%
                      </span>
                    </div>
                    <div className="w-14 sm:w-16 h-1 rounded-full bg-slate-800 overflow-hidden border border-slate-700/60 shadow-inner">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-300"
                        style={{ width: `${xpInfo.percent}%` }}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
          </button>

          {/* Virtual Peso Coin Wallet Pill */}
          <button
            onClick={onOpenShop}
            className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 via-yellow-500/25 to-amber-500/20 hover:from-amber-500/30 hover:to-yellow-500/35 border-2 border-amber-400/80 px-2.5 py-1 rounded-full shadow-lg transition-all active:scale-95 group cursor-pointer shrink-0"
            title="I-click para buksan ang Power-Up Shop"
          >
            <span className="text-sm sm:text-base animate-pulse">💰</span>
            <span className="font-black text-amber-300 text-xs sm:text-sm tracking-wide">
              ₱{(wallet?.balance ?? 1000).toLocaleString()}
            </span>
          </button>
        </div>
      </div>

      {/* Main Content: Compact and responsive width & yellow theme */}
      <div className="my-auto z-10 w-full max-w-[210px] sm:max-w-[250px] md:max-w-[290px] flex flex-col items-center sm:items-start self-center sm:self-start sm:ml-4 md:ml-8 gap-1.5 py-1">
        {/* Brand Logo and Title */}
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left shrink-0">
          {/* Animated Brand Uno Cards - Compact and High Contrast */}
          <div className="relative inline-block mb-0.5">
            <div className="flex items-center justify-center sm:justify-start -space-x-1 sm:space-x-1">
              {/* U Card (Red) */}
              <div className="w-7 h-10 sm:w-9 sm:h-12 rounded-lg bg-gradient-to-br from-red-500 via-red-600 to-red-700 border-2 border-white shadow-xl rotate-[-12deg] hover:rotate-[-6deg] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between p-0.5 select-none">
                <span className="text-[6px] sm:text-[7px] font-black text-white self-start leading-none">U</span>
                <div className="w-[82%] h-[68%] mx-auto rounded-[50%/35%] bg-white flex items-center justify-center rotate-[-20deg] shadow-inner">
                  <span className="rotate-[20deg] font-black italic text-[10px] sm:text-xs text-red-600 drop-shadow">U</span>
                </div>
                <span className="text-[6px] sm:text-[7px] font-black text-white self-end leading-none rotate-180">U</span>
              </div>

              {/* N Card (Amber / Yellow) */}
              <div className="w-7 h-10 sm:w-9 sm:h-12 rounded-lg bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 border-2 border-white shadow-xl rotate-[-4deg] hover:rotate-0 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between p-0.5 select-none z-10">
                <span className="text-[6px] sm:text-[7px] font-black text-white self-start leading-none">N</span>
                <div className="w-[82%] h-[68%] mx-auto rounded-[50%/35%] bg-white flex items-center justify-center rotate-[-20deg] shadow-inner">
                  <span className="rotate-[20deg] font-black italic text-[10px] sm:text-xs text-amber-500 drop-shadow">N</span>
                </div>
                <span className="text-[6px] sm:text-[7px] font-black text-white self-end leading-none rotate-180">N</span>
              </div>

              {/* O Card (Green) */}
              <div className="w-7 h-10 sm:w-9 sm:h-12 rounded-lg bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 border-2 border-white shadow-xl rotate-[4deg] hover:rotate-0 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between p-0.5 select-none z-10">
                <span className="text-[6px] sm:text-[7px] font-black text-white self-start leading-none">O</span>
                <div className="w-[82%] h-[68%] mx-auto rounded-[50%/35%] bg-white flex items-center justify-center rotate-[-20deg] shadow-inner">
                  <span className="rotate-[20deg] font-black italic text-[10px] sm:text-xs text-emerald-600 drop-shadow">O</span>
                </div>
                <span className="text-[6px] sm:text-[7px] font-black text-white self-end leading-none rotate-180">O</span>
              </div>

              {/* ! Card (Blue) */}
              <div className="w-7 h-10 sm:w-9 sm:h-12 rounded-lg bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 border-2 border-white shadow-xl rotate-[12deg] hover:rotate-[6deg] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between p-0.5 select-none">
                <span className="text-[6px] sm:text-[7px] font-black text-white self-start leading-none">!</span>
                <div className="w-[82%] h-[68%] mx-auto rounded-[50%/35%] bg-white flex items-center justify-center rotate-[-20deg] shadow-inner">
                  <span className="rotate-[20deg] font-black italic text-[10px] sm:text-xs text-blue-600 drop-shadow">!</span>
                </div>
                <span className="text-[6px] sm:text-[7px] font-black text-white self-end leading-none rotate-180">!</span>
              </div>
            </div>
          </div>

          <h1 className="text-base sm:text-lg font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] uppercase leading-tight">
            THE PUNGOT EDITION
          </h1>
          <p className="text-[8px] sm:text-[9px] font-black text-amber-200 uppercase tracking-widest mt-0.5 drop-shadow-[0_2px_4px_rgba(0,0,0,1)] flex items-center gap-1">
            <Radio className="w-2 h-2 text-emerald-400 animate-pulse" />
            <span>Voice & Multiplayer Ready</span>
          </p>
        </div>

        {/* Action Menu Buttons: 2x2 Grid Layout (Compact & Mobile-friendly) */}
        <div className="grid grid-cols-2 gap-x-0.5 gap-y-1 w-full shrink-0">
          {/* Top-Left: PLAY ONLINE */}
          <button
            onClick={onPlayOnline}
            className="w-full transition-all duration-150 hover:scale-[1.03] active:scale-95 focus:outline-none cursor-pointer drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]"
          >
            <img
              src="/home screen in game icons/btn_play_online.png"
              alt="Play Online"
              className="w-full h-auto max-h-[52px] sm:max-h-[64px] object-contain select-none pointer-events-none"
              draggable={false}
            />
          </button>

          {/* Top-Right: CREATE ROOM */}
          <button
            onClick={onCreateRoom}
            className="w-full transition-all duration-150 hover:scale-[1.03] active:scale-95 focus:outline-none cursor-pointer drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]"
          >
            <img
              src="/home screen in game icons/btn_create.png"
              alt="Create Room"
              className="w-full h-auto max-h-[52px] sm:max-h-[64px] object-contain select-none pointer-events-none"
              draggable={false}
            />
          </button>

          {/* Bottom-Left: JOIN ROOM */}
          <button
            onClick={() => onJoinRoom()}
            className="w-full transition-all duration-150 hover:scale-[1.03] active:scale-95 focus:outline-none cursor-pointer drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]"
          >
            <img
              src="/home screen in game icons/btn_join.png"
              alt="Join Room"
              className="w-full h-auto max-h-[52px] sm:max-h-[64px] object-contain select-none pointer-events-none"
              draggable={false}
            />
          </button>

          {/* Bottom-Right: PLAY WITH BOT */}
          <button
            onClick={() => setIsBotModalOpen(true)}
            className="w-full transition-all duration-150 hover:scale-[1.03] active:scale-95 focus:outline-none cursor-pointer drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]"
          >
            <img
              src="/home screen in game icons/btn_play_bot.png"
              alt="Play With Bot"
              className="w-full h-auto max-h-[52px] sm:max-h-[64px] object-contain select-none pointer-events-none"
              draggable={false}
            />
          </button>
        </div>
      </div>

      {/* Floating Bottom-Right Quick Action Icons (Shop, Missions, Leaderboards, Fullscreen, Exit) - No box, clean floating icons */}
      <div className={`fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-40 flex items-center gap-2.5 sm:gap-3 transition-opacity duration-200 ${isLiveTvOpen ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}>
        {/* Power-Up Shop Icon */}
        <button
          onClick={onOpenShop}
          className="w-10 h-10 sm:w-12 sm:h-12 aspect-square flex items-center justify-center hover:scale-110 active:scale-95 transition-transform cursor-pointer p-0 shrink-0 drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
          title="Power-Up Shop (Tindahan)"
        >
          <img
            src="/home screen in game icons/shop.png"
            alt="Shop"
            className="w-full h-full object-contain aspect-square select-none pointer-events-none"
          />
        </button>

        {/* Daily Missions Icon */}
        <button
          onClick={onOpenMissions}
          className="w-10 h-10 sm:w-12 sm:h-12 aspect-square flex items-center justify-center hover:scale-110 active:scale-95 transition-transform cursor-pointer p-0 shrink-0 drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
          title="Daily Missions (Arawang Misyon)"
        >
          <img
            src="/home screen in game icons/missions.png"
            alt="Missions"
            className="w-full h-full object-contain aspect-square select-none pointer-events-none"
          />
        </button>

        {/* Leaderboards Icon */}
        <button
          onClick={onOpenLeaderboard}
          className="w-10 h-10 sm:w-12 sm:h-12 aspect-square flex items-center justify-center hover:scale-110 active:scale-95 transition-transform cursor-pointer p-0 shrink-0 drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
          title="Leaderboards (Talaan ng Pinakamagagaling)"
        >
          <img
            src="/home screen in game icons/leaderboards.png"
            alt="Leaderboards"
            className="w-full h-full object-contain aspect-square select-none pointer-events-none"
          />
        </button>

        {/* Voice Mic Toggle Icon */}
        <button
          onClick={onToggleVoiceMic}
          className="w-10 h-10 sm:w-12 sm:h-12 aspect-square flex items-center justify-center hover:scale-110 active:scale-95 transition-transform cursor-pointer p-0 shrink-0 drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
          title={
            !isVoiceConnected
              ? 'Buksan ang Mikropono (Enable Mic to chat)'
              : isVoiceMuted
              ? 'Naka-Mute ang Mic (Pindutin para magsalita)'
              : 'Bukas ang Mic (Live voice active)'
          }
        >
          <img
            src={isVoiceMuted || !isVoiceConnected ? "/home screen in game icons/mic off.png" : "/home screen in game icons/mic on.png"}
            alt="Mic"
            className="w-full h-full object-contain aspect-square select-none pointer-events-none"
          />
        </button>

        {/* Settings Menu Button with upward dropdown toggle */}
        <div className="relative">
          <button
            onClick={() => setSettingsMenuOpen(!settingsMenuOpen)}
            className="w-10 h-10 sm:w-12 sm:h-12 aspect-square flex items-center justify-center hover:scale-110 active:scale-95 transition-transform cursor-pointer p-0 shrink-0 drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
            title="Menu & Settings"
          >
            <img
              src="/home screen in game icons/setting.png"
              alt="Settings"
              className="w-full h-full object-contain aspect-square select-none pointer-events-none"
            />
          </button>

          {/* Upward Dropdown Menu */}
          {settingsMenuOpen && (
            <div className="absolute right-0 bottom-full mb-2 w-52 rounded-2xl bg-slate-900/98 border border-slate-700/90 shadow-2xl py-1.5 z-50 backdrop-blur-md animate-fadeIn flex flex-col divide-y divide-slate-800">
              <button
                onClick={() => {
                  setSettingsMenuOpen(false);
                  onOpenShop();
                }}
                className="px-3.5 py-2 flex items-center gap-2.5 text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-amber-300 transition text-left cursor-pointer"
              >
                <img src="/home screen in game icons/shop.png" alt="Shop" className="w-4 h-4 object-contain aspect-square" />
                <span>Power-Up Shop (Tindahan)</span>
              </button>

              <button
                onClick={() => {
                  setSettingsMenuOpen(false);
                  onOpenMissions();
                }}
                className="px-3.5 py-2 flex items-center gap-2.5 text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-emerald-300 transition text-left cursor-pointer"
              >
                <img src="/home screen in game icons/missions.png" alt="Missions" className="w-4 h-4 object-contain aspect-square" />
                <span>Daily Rewards & Missions</span>
              </button>

              <button
                onClick={() => {
                  setSettingsMenuOpen(false);
                  onOpenLeaderboard();
                }}
                className="px-3.5 py-2 flex items-center gap-2.5 text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-yellow-300 transition text-left cursor-pointer"
              >
                <img src="/home screen in game icons/leaderboards.png" alt="Leaderboards" className="w-4 h-4 object-contain aspect-square" />
                <span>Leaderboards (Talaan)</span>
              </button>

              {/* Admin button shown only if authenticated as Admin */}
              {isAdminAuthed && (
                <button
                  onClick={() => {
                    setSettingsMenuOpen(false);
                    onOpenAdmin();
                  }}
                  className="px-3.5 py-2 flex items-center gap-2.5 text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-rose-400 transition text-left cursor-pointer"
                >
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span>Admin Controls & Audit</span>
                </button>
              )}

              <button
                onClick={() => {
                  setSettingsMenuOpen(false);
                  onOpenHowToPlay();
                }}
                className="px-3.5 py-2 flex items-center gap-2.5 text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-amber-300 transition text-left cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span>Game Rules (Paano Laruin)</span>
              </button>

              <button
                onClick={() => {
                  setSettingsMenuOpen(false);
                  onOpenSettings();
                }}
                className="px-3.5 py-2 flex items-center gap-2.5 text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-cyan-300 transition text-left cursor-pointer"
              >
                <img src="/home screen in game icons/setting.png" alt="Settings" className="w-4 h-4 object-contain aspect-square" />
                <span>Game Settings</span>
              </button>

              <button
                onClick={() => {
                  setSettingsMenuOpen(false);
                  onOpenProfile();
                }}
                className="px-3.5 py-2 flex items-center gap-2.5 text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-emerald-300 transition text-left cursor-pointer"
              >
                <User className="w-4 h-4 text-emerald-400" />
                <span>Profile & Avatar</span>
              </button>

              <button
                onClick={() => {
                  setSettingsMenuOpen(false);
                  onOpenMatchHistory();
                }}
                className="px-3.5 py-2 flex items-center gap-2.5 text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-purple-300 transition text-left cursor-pointer"
              >
                <History className="w-4 h-4 text-purple-400" />
                <span>Match History</span>
              </button>
            </div>
          )}
        </div>

        {/* Sound On / Off Toggle Icon */}
        <button
          onClick={onToggleMute}
          className="w-10 h-10 sm:w-12 sm:h-12 aspect-square flex items-center justify-center hover:scale-110 active:scale-95 transition-transform cursor-pointer p-0 shrink-0 drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
          title={isMuted ? 'Unmute sound' : 'Mute sound'}
        >
          <img
            src={isMuted ? "/home screen in game icons/sound off.png" : "/home screen in game icons/sound on.png"}
            alt="Sound"
            className="w-full h-full object-contain aspect-square select-none pointer-events-none"
          />
        </button>

        {/* Fullscreen Toggle Icon */}
        <button
          onClick={toggleFullscreen}
          className="w-10 h-10 sm:w-12 sm:h-12 aspect-square flex items-center justify-center hover:scale-110 active:scale-95 transition-transform cursor-pointer p-0 shrink-0 drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
          title="Toggle Fullscreen"
        >
          <img
            src="/home screen in game icons/fullscreen.png"
            alt="Fullscreen"
            className="w-full h-full object-contain aspect-square select-none pointer-events-none"
          />
        </button>

        {/* Exit Game Icon */}
        <button
          onClick={() => setShowExitConfirm(true)}
          className="w-10 h-10 sm:w-12 sm:h-12 aspect-square flex items-center justify-center hover:scale-110 active:scale-95 transition-transform cursor-pointer p-0 shrink-0 drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
          title="Lumabas sa Game (Exit Game)"
        >
          <img
            src="/home screen in game icons/exit game.png"
            alt="Exit"
            className="w-full h-full object-contain aspect-square select-none pointer-events-none"
          />
        </button>
      </div>

      {/* Exit Game Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border-2 border-rose-500/80 rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-inner">
              <LogOut className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-lg font-black text-white">Gusto mo bang lumabas sa laro?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Mag-eexit ang application o isasara ang browser window.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs active:scale-95 transition"
              >
                Huwag (Bumalik)
              </button>
              <button
                onClick={() => {
                  setShowExitConfirm(false);
                  onExitGame();
                }}
                className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs shadow-lg active:scale-95 transition"
              >
                Oo, Lumabas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Play With Bots Modal */}
      <PlayWithBotsModal
        isOpen={isBotModalOpen}
        onClose={() => setIsBotModalOpen(false)}
        onStart={(count, variant) => {
          onPlayWithBots(count, variant);
        }}
      />

      {/* Footer */}
      <div className="w-full max-w-4xl text-center z-10 text-[11px] text-slate-500 pt-2 flex flex-col sm:flex-row items-center justify-between gap-1 border-t border-slate-800/40">
        <span>UNO: The Pungot Edition • v1.0.0</span>
        <span>Original artwork & real-time multiplayer engine</span>
      </div>
    </div>
  );
};

