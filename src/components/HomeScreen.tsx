import React, { useState } from 'react';
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
} from 'lucide-react';
import { ConnectionStatus } from '../services/networkManager';
import { GameVariant } from '../engine/types';
import { PlayWithBotsModal } from './Modals/PlayWithBotsModal';

interface HomeScreenProps {
  playerName: string;
  playerAvatar: string;
  connectionStatus: ConnectionStatus;
  isMuted: boolean;
  onToggleMute: () => void;
  onPlayOnline: () => void;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  onPlayWithBots: (botCount: number, variant: GameVariant) => void;
  onOpenHowToPlay: () => void;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
  onOpenMatchHistory: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  playerName,
  playerAvatar,
  connectionStatus,
  isMuted,
  onToggleMute,
  onPlayOnline,
  onCreateRoom,
  onJoinRoom,
  onPlayWithBots,
  onOpenHowToPlay,
  onOpenSettings,
  onOpenProfile,
  onOpenMatchHistory,
}) => {
  const [isBotModalOpen, setIsBotModalOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));

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

      {/* Top Navbar */}
      <div className="w-full flex items-center justify-between z-30 shrink-0">
        {/* Profile Pill */}
        <button
          onClick={onOpenProfile}
          className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-slate-700/80 hover:border-amber-400/80 transition-all shadow-lg hover:scale-105 active:scale-95 group"
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-base shadow overflow-hidden">
            {playerAvatar && playerAvatar.startsWith('data:image') ? (
              <img src={playerAvatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span>{playerAvatar}</span>
            )}
          </div>
          <div className="text-left">
            <span className="block text-[11px] sm:text-xs font-black text-white group-hover:text-amber-300 transition truncate max-w-[100px] sm:max-w-[120px]">
              {playerName}
            </span>
            <span className="block text-[9px] text-slate-400 font-semibold leading-none">Guest Profile</span>
          </div>
        </button>

        {/* Quick controls with Settings Dropdown */}
        <div className="relative flex items-center gap-1.5 sm:gap-2">
          {/* Settings Menu Button with dropdown toggle */}
          <div className="relative">
            <button
              onClick={() => setSettingsMenuOpen(!settingsMenuOpen)}
              className="p-1.5 sm:p-2 rounded-full bg-slate-900/90 border border-slate-700 text-slate-300 hover:text-white hover:border-cyan-400 transition shadow cursor-pointer flex items-center gap-1"
              title="Menu & Settings"
            >
              <SettingsIcon className="w-4 h-4 text-cyan-400" />
            </button>

            {/* Dropdown Menu incorporating RULES, SETTINGS/CARDS, PROFILE, MATCH HISTORY */}
            {settingsMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl bg-slate-900/98 border border-slate-700/90 shadow-2xl py-1.5 z-50 backdrop-blur-md animate-fadeIn flex flex-col divide-y divide-slate-800">
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
                  <SettingsIcon className="w-4 h-4 text-cyan-400" />
                  <span>Card Skins & Settings</span>
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

          <button
            onClick={onToggleMute}
            className="p-1.5 sm:p-2 rounded-full bg-slate-900/80 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition shadow cursor-pointer"
            title={isMuted ? 'Unmute sound' : 'Mute sound'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 sm:p-2 rounded-full bg-slate-900/80 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition shadow cursor-pointer"
            title="Toggle fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Content: Left side aligned Title and Action Buttons */}
      <div className="my-auto z-10 w-full max-w-[260px] sm:max-w-[280px] flex flex-col items-center sm:items-start self-start sm:ml-4 md:ml-8 gap-1.5 sm:gap-2.5 py-0.5">
        {/* Brand Logo and Title */}
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left shrink-0">
          {/* Animated Brand Uno Cards - Compact and High Contrast */}
          <div className="relative inline-block mb-0.5 sm:mb-1">
            <div className="flex items-center justify-center sm:justify-start -space-x-1 sm:space-x-1">
              {/* U Card (Red) */}
              <div className="w-8 h-12 sm:w-11 sm:h-16 rounded-lg sm:rounded-xl bg-gradient-to-br from-red-500 via-red-600 to-red-700 border-2 sm:border-[2.5px] border-white shadow-xl rotate-[-12deg] hover:rotate-[-6deg] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between p-0.5 sm:p-1 select-none">
                <span className="text-[7px] sm:text-[9px] font-black text-white self-start leading-none">U</span>
                <div className="w-[82%] h-[68%] mx-auto rounded-[50%/35%] bg-white flex items-center justify-center rotate-[-20deg] shadow-inner">
                  <span className="rotate-[20deg] font-black italic text-xs sm:text-base text-red-600 drop-shadow">U</span>
                </div>
                <span className="text-[7px] sm:text-[9px] font-black text-white self-end leading-none rotate-180">U</span>
              </div>

              {/* N Card (Amber / Yellow) */}
              <div className="w-8 h-12 sm:w-11 sm:h-16 rounded-lg sm:rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 border-2 sm:border-[2.5px] border-white shadow-xl rotate-[-4deg] hover:rotate-0 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between p-0.5 sm:p-1 select-none z-10">
                <span className="text-[7px] sm:text-[9px] font-black text-white self-start leading-none">N</span>
                <div className="w-[82%] h-[68%] mx-auto rounded-[50%/35%] bg-white flex items-center justify-center rotate-[-20deg] shadow-inner">
                  <span className="rotate-[20deg] font-black italic text-xs sm:text-base text-amber-500 drop-shadow">N</span>
                </div>
                <span className="text-[7px] sm:text-[9px] font-black text-white self-end leading-none rotate-180">N</span>
              </div>

              {/* O Card (Green) */}
              <div className="w-8 h-12 sm:w-11 sm:h-16 rounded-lg sm:rounded-xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 border-2 sm:border-[2.5px] border-white shadow-xl rotate-[4deg] hover:rotate-0 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between p-0.5 sm:p-1 select-none z-10">
                <span className="text-[7px] sm:text-[9px] font-black text-white self-start leading-none">O</span>
                <div className="w-[82%] h-[68%] mx-auto rounded-[50%/35%] bg-white flex items-center justify-center rotate-[-20deg] shadow-inner">
                  <span className="rotate-[20deg] font-black italic text-xs sm:text-base text-emerald-600 drop-shadow">O</span>
                </div>
                <span className="text-[7px] sm:text-[9px] font-black text-white self-end leading-none rotate-180">O</span>
              </div>

              {/* ! Card (Blue) */}
              <div className="w-8 h-12 sm:w-11 sm:h-16 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 border-2 sm:border-[2.5px] border-white shadow-xl rotate-[12deg] hover:rotate-[6deg] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between p-0.5 sm:p-1 select-none">
                <span className="text-[7px] sm:text-[9px] font-black text-white self-start leading-none">!</span>
                <div className="w-[82%] h-[68%] mx-auto rounded-[50%/35%] bg-white flex items-center justify-center rotate-[-20deg] shadow-inner">
                  <span className="rotate-[20deg] font-black italic text-xs sm:text-base text-blue-600 drop-shadow">!</span>
                </div>
                <span className="text-[7px] sm:text-[9px] font-black text-white self-end leading-none rotate-180">!</span>
              </div>
            </div>
          </div>

          <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] uppercase leading-tight">
            THE PUNGOT EDITION
          </h1>
          <p className="text-[9px] sm:text-xs font-bold text-white uppercase tracking-widest mt-0.5 drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">
            Real-time Multiplayer Card Game
          </p>
        </div>

        {/* Action Menu Buttons: Directly below title on the left side */}
        <div className="space-y-1 w-full shrink-0">
          {/* 1. PLAY ONLINE */}
          <button
            onClick={onPlayOnline}
            className="w-full py-2 sm:py-2.5 px-3.5 sm:px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs sm:text-sm shadow-xl flex items-center justify-between group transition-all duration-200 hover:scale-[1.02] active:scale-95"
          >
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-slate-950/10 flex items-center justify-center">
                <Play className="w-3.5 h-3.5 fill-current" />
              </div>
              <span className="tracking-wide text-left uppercase font-black">PLAY ONLINE</span>
            </div>
            <span className="text-[9px] sm:text-[10px] font-black uppercase px-1.5 py-0.5 rounded-full bg-slate-950/20">Lobbies</span>
          </button>

          {/* 2 & 3. CREATE ROOM & JOIN ROOM */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={onCreateRoom}
              className="py-1.5 sm:py-2 px-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/80 hover:border-amber-400/60 text-white font-bold text-[11px] sm:text-xs shadow flex flex-col items-center justify-center gap-0.5 transition-all hover:scale-[1.02] active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>CREATE ROOM</span>
            </button>

            <button
              onClick={onJoinRoom}
              className="py-1.5 sm:py-2 px-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/80 hover:border-cyan-400/60 text-white font-bold text-[11px] sm:text-xs shadow flex flex-col items-center justify-center gap-0.5 transition-all hover:scale-[1.02] active:scale-95"
            >
              <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
              <span>JOIN ROOM</span>
            </button>
          </div>

          {/* 4. PLAY WITH BOTS */}
          <button
            onClick={() => setIsBotModalOpen(true)}
            className="w-full py-2 sm:py-2.5 px-3.5 sm:px-4 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/80 hover:border-purple-400/60 text-white font-bold text-xs sm:text-sm shadow flex items-center justify-between transition-all duration-200 hover:scale-[1.02] active:scale-95 cursor-pointer"
          >
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <span className="tracking-wide text-left uppercase font-black">PLAY WITH BOTS</span>
            </div>
            <span className="text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Solo
            </span>
          </button>
        </div>
      </div>

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
