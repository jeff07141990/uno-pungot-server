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
  const [botCount, setBotCount] = useState<number>(3);
  const [botVariant, setBotVariant] = useState<GameVariant>('classic');
  const [showBotSelector, setShowBotSelector] = useState(false);
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

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-between p-4 sm:p-6 bg-gradient-to-b from-[#0B1120] via-[#0F172A] to-[#0B1120] overflow-hidden">
      {/* Decorative ambient background cards */}
      <div className="absolute top-12 -left-12 w-48 h-72 rounded-3xl bg-red-600/10 border border-red-500/20 rotate-[-25deg] blur-sm pointer-events-none"></div>
      <div className="absolute bottom-12 -right-12 w-52 h-80 rounded-3xl bg-blue-600/10 border border-blue-500/20 rotate-[20deg] blur-sm pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Navbar */}
      <div className="w-full max-w-4xl flex items-center justify-between z-10">
        {/* Profile Pill */}
        <button
          onClick={onOpenProfile}
          className="flex items-center gap-2.5 bg-slate-900/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-700/80 hover:border-amber-400/80 transition-all shadow-lg hover:scale-105 active:scale-95 group"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-lg shadow overflow-hidden">
            {playerAvatar && playerAvatar.startsWith('data:image') ? (
              <img src={playerAvatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span>{playerAvatar}</span>
            )}
          </div>
          <div className="text-left">
            <span className="block text-xs font-black text-white group-hover:text-amber-300 transition truncate max-w-[120px]">
              {playerName}
            </span>
            <span className="block text-[10px] text-slate-400 font-semibold leading-none">Guest Profile</span>
          </div>
        </button>

        {/* Quick controls */}
        <div className="flex items-center gap-2">
          {/* Connection status indicator */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border backdrop-blur-md ${
              connectionStatus === 'connected'
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400'
                : connectionStatus === 'reconnecting'
                ? 'bg-amber-950/60 border-amber-500/40 text-amber-400 animate-pulse'
                : 'bg-slate-900/60 border-slate-700 text-slate-400'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                connectionStatus === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            ></span>
            <span className="capitalize">{connectionStatus}</span>
          </div>

          <button
            onClick={onOpenSettings}
            className="p-2 rounded-full bg-slate-900/80 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition shadow cursor-pointer"
            title="Settings at Card Customizer"
          >
            <SettingsIcon className="w-4 h-4 text-cyan-400" />
          </button>

          <button
            onClick={onToggleMute}
            className="p-2 rounded-full bg-slate-900/80 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition shadow cursor-pointer"
            title={isMuted ? 'Unmute sound' : 'Mute sound'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-full bg-slate-900/80 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition shadow cursor-pointer"
            title="Toggle fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Hero Branding Section */}
      <div className="my-auto text-center z-10 max-w-lg w-full py-4">
        {/* Big Animated Brand Uno Cards */}
        <div className="relative inline-block mb-3 sm:mb-5">
          <div className="flex items-center justify-center -space-x-1 sm:space-x-1.5">
            {/* U Card (Red) */}
            <div className="w-14 h-20 sm:w-20 sm:h-28 md:w-24 md:h-32 rounded-xl sm:rounded-2xl bg-gradient-to-br from-red-500 via-red-600 to-red-700 border-2 sm:border-[3px] border-white shadow-2xl rotate-[-12deg] hover:rotate-[-6deg] hover:-translate-y-2 transition-all duration-300 flex flex-col justify-between p-1 sm:p-2 select-none">
              <span className="text-[10px] sm:text-xs font-black text-white self-start leading-none">U</span>
              <div className="w-[82%] h-[68%] mx-auto rounded-[50%/35%] bg-white flex items-center justify-center rotate-[-20deg] shadow-inner">
                <span className="rotate-[20deg] font-black italic text-xl sm:text-3xl md:text-4xl text-red-600 drop-shadow">U</span>
              </div>
              <span className="text-[10px] sm:text-xs font-black text-white self-end leading-none rotate-180">U</span>
            </div>

            {/* N Card (Amber / Yellow) */}
            <div className="w-14 h-20 sm:w-20 sm:h-28 md:w-24 md:h-32 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 border-2 sm:border-[3px] border-white shadow-2xl rotate-[-4deg] hover:rotate-0 hover:-translate-y-2 transition-all duration-300 flex flex-col justify-between p-1 sm:p-2 select-none z-10">
              <span className="text-[10px] sm:text-xs font-black text-white self-start leading-none">N</span>
              <div className="w-[82%] h-[68%] mx-auto rounded-[50%/35%] bg-white flex items-center justify-center rotate-[-20deg] shadow-inner">
                <span className="rotate-[20deg] font-black italic text-xl sm:text-3xl md:text-4xl text-amber-500 drop-shadow">N</span>
              </div>
              <span className="text-[10px] sm:text-xs font-black text-white self-end leading-none rotate-180">N</span>
            </div>

            {/* O Card (Green) */}
            <div className="w-14 h-20 sm:w-20 sm:h-28 md:w-24 md:h-32 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 border-2 sm:border-[3px] border-white shadow-2xl rotate-[4deg] hover:rotate-0 hover:-translate-y-2 transition-all duration-300 flex flex-col justify-between p-1 sm:p-2 select-none z-10">
              <span className="text-[10px] sm:text-xs font-black text-white self-start leading-none">O</span>
              <div className="w-[82%] h-[68%] mx-auto rounded-[50%/35%] bg-white flex items-center justify-center rotate-[-20deg] shadow-inner">
                <span className="rotate-[20deg] font-black italic text-xl sm:text-3xl md:text-4xl text-emerald-600 drop-shadow">O</span>
              </div>
              <span className="text-[10px] sm:text-xs font-black text-white self-end leading-none rotate-180">O</span>
            </div>

            {/* ! Card (Blue) */}
            <div className="w-14 h-20 sm:w-20 sm:h-28 md:w-24 md:h-32 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 border-2 sm:border-[3px] border-white shadow-2xl rotate-[12deg] hover:rotate-[6deg] hover:-translate-y-2 transition-all duration-300 flex flex-col justify-between p-1 sm:p-2 select-none">
              <span className="text-[10px] sm:text-xs font-black text-white self-start leading-none">!</span>
              <div className="w-[82%] h-[68%] mx-auto rounded-[50%/35%] bg-white flex items-center justify-center rotate-[-20deg] shadow-inner">
                <span className="rotate-[20deg] font-black italic text-xl sm:text-3xl md:text-4xl text-blue-600 drop-shadow">!</span>
              </div>
              <span className="text-[10px] sm:text-xs font-black text-white self-end leading-none rotate-180">!</span>
            </div>
          </div>
        </div>

        <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 drop-shadow-[0_4px_12px_rgba(245,158,11,0.3)] uppercase">
          THE PUNGOT EDITION
        </h1>
        <p className="text-xs sm:text-sm font-semibold text-slate-400 mt-1 uppercase tracking-widest">
          Real-time Online Multiplayer Card Game
        </p>

        {/* Action Menu Buttons (8 Specified Buttons) */}
        <div className="mt-8 space-y-3 w-full max-w-sm mx-auto">
          {/* 1. PLAY ONLINE */}
          <button
            onClick={onPlayOnline}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-base shadow-xl flex items-center justify-between group transition-all duration-200 hover:scale-[1.02] active:scale-95"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-950/10 flex items-center justify-center">
                <Play className="w-5 h-5 fill-current" />
              </div>
              <span className="tracking-wide text-left">PLAY ONLINE</span>
            </div>
            <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-full bg-slate-950/20">Lobbies</span>
          </button>

          {/* 2 & 3. CREATE ROOM & JOIN ROOM */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onCreateRoom}
              className="py-3 px-4 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 hover:border-amber-400/60 text-white font-bold text-sm shadow flex flex-col items-center justify-center gap-1.5 transition-all hover:scale-[1.02] active:scale-95"
            >
              <Plus className="w-5 h-5 text-amber-400" />
              <span>CREATE ROOM</span>
            </button>

            <button
              onClick={onJoinRoom}
              className="py-3 px-4 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 hover:border-cyan-400/60 text-white font-bold text-sm shadow flex flex-col items-center justify-center gap-1.5 transition-all hover:scale-[1.02] active:scale-95"
            >
              <KeyRound className="w-5 h-5 text-cyan-400" />
              <span>JOIN ROOM</span>
            </button>
          </div>

          {/* 4. PLAY WITH BOTS */}
          <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-2 transition-all">
            <button
              onClick={() => {
                if (!showBotSelector) {
                  setShowBotSelector(true);
                } else {
                  onPlayWithBots(botCount, botVariant);
                }
              }}
              className="w-full py-2 px-3 rounded-lg flex items-center justify-between text-white font-bold text-sm hover:text-amber-400 transition"
            >
              <div className="flex items-center gap-2.5">
                <Bot className="w-5 h-5 text-purple-400" />
                <span>PLAY WITH BOTS</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-purple-300 font-bold bg-purple-500/20 px-2 py-0.5 rounded-full border border-purple-500/30 uppercase">
                  {botVariant.replace('_', ' ')}
                </span>
                <span className="text-xs text-amber-400 font-mono font-bold bg-slate-900 px-2 py-0.5 rounded-full border border-slate-700">
                  {botCount} Bots
                </span>
              </div>
            </button>

            {showBotSelector && (
              <div className="pt-2 mt-2 border-t border-slate-700/80 space-y-2 px-1 animate-fadeIn">
                {/* Variant Selector */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">Mode:</span>
                  <div className="grid grid-cols-4 gap-1">
                    {(['classic', 'all_wild', 'flip', 'dare'] as GameVariant[]).map((v) => (
                      <button
                        key={v}
                        onClick={() => setBotVariant(v)}
                        className={`px-2 py-1 rounded-md text-[10px] font-bold transition ${
                          botVariant === v
                            ? 'bg-amber-500 text-slate-950 font-black shadow'
                            : 'bg-slate-900 text-slate-400 hover:text-white'
                        }`}
                      >
                        {v === 'all_wild' ? 'All Wild' : v === 'flip' ? 'Flip!' : v === 'dare' ? 'Dare' : 'Classic'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Opponents & Start */}
                <div className="flex flex-col gap-2 pt-1 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">Opponents: <span className="text-amber-400 font-black">{botCount}</span></span>
                    <span className="text-[10px] text-slate-500">(Max 9)</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                      <button
                        key={num}
                        onClick={() => setBotCount(num)}
                        className={`w-8 h-8 rounded-md text-xs font-bold transition ${
                          botCount === num
                            ? 'bg-purple-600 text-white shadow ring-2 ring-purple-400'
                            : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => onPlayWithBots(botCount, botVariant)}
                    className="w-full px-3 py-2 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shadow"
                  >
                    🎮 Start with {botCount} Bot{botCount > 1 ? 's' : ''}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Secondary Buttons: HOW TO PLAY, SETTINGS, PROFILE, MATCH HISTORY */}
          <div className="grid grid-cols-4 gap-2 pt-1">
            <button
              onClick={onOpenHowToPlay}
              className="py-2.5 px-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-xs flex flex-col items-center justify-center gap-1 transition active:scale-95"
              title="How to play"
            >
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span className="text-[10px] tracking-tight truncate">RULES</span>
            </button>

            <button
              onClick={onOpenSettings}
              className="py-2.5 px-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-xs flex flex-col items-center justify-center gap-1 transition active:scale-95"
              title="Settings"
            >
              <SettingsIcon className="w-4 h-4 text-cyan-400" />
              <span className="text-[10px] tracking-tight truncate">SETTINGS</span>
            </button>

            <button
              onClick={onOpenProfile}
              className="py-2.5 px-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-xs flex flex-col items-center justify-center gap-1 transition active:scale-95"
              title="Profile"
            >
              <User className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] tracking-tight truncate">PROFILE</span>
            </button>

            <button
              onClick={onOpenMatchHistory}
              className="py-2.5 px-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-xs flex flex-col items-center justify-center gap-1 transition active:scale-95"
              title="Match History"
            >
              <History className="w-4 h-4 text-purple-400" />
              <span className="text-[10px] tracking-tight truncate">HISTORY</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="w-full max-w-4xl text-center z-10 text-[11px] text-slate-500 pt-2 flex flex-col sm:flex-row items-center justify-between gap-1 border-t border-slate-800/40">
        <span>UNO: The Pungot Edition • v1.0.0</span>
        <span>Original artwork & real-time multiplayer engine</span>
      </div>
    </div>
  );
};
