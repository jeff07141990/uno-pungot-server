import React, { useState } from 'react';
import { Eye, Users, RefreshCw, Play, Lock, ChevronDown, ChevronUp, Radio } from 'lucide-react';

export interface LiveRoomItem {
  id?: string;
  roomId?: string;
  name?: string;
  roomName?: string;
  playerCount: number;
  maxPlayers: number;
  phase: string;
  hasPassword?: boolean;
  spectatorCount?: number;
}

interface LiveAvailableRoomsProps {
  rooms: LiveRoomItem[];
  isLoading: boolean;
  onRefresh: () => void;
  onJoin: (roomId: string) => void;
  onSpectate: (roomId: string) => void;
}

export const LiveAvailableRooms: React.FC<LiveAvailableRoomsProps> = ({
  rooms,
  isLoading,
  onRefresh,
  onJoin,
  onSpectate,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // If closed: Render a small, transparent running marquee banner at the very top of the screen
  if (!isOpen) {
    const runningText = rooms.length > 0
      ? rooms.map((r) => `🎮 [Room #${r.roomId || r.id} - ${r.roomName || r.name || 'UNO'}: ${r.playerCount}/${r.maxPlayers} players (${r.phase === 'lobby' ? 'Lobby' : 'Laro'})]`).join('   •   ')
      : 'Walang laro ngayon • Mag-create ng bagong kwarto para mapanood sa Live TV!';

    return (
      <div
        onClick={() => {
          setIsOpen(true);
          onRefresh();
        }}
        className="w-full bg-black/40 hover:bg-black/60 backdrop-blur-xs border-b border-white/10 hover:border-amber-400/50 py-1 px-3 cursor-pointer transition-all flex items-center gap-2 overflow-hidden shadow-sm select-none"
        title="I-click para buksan ang Live TV Rooms"
      >
        {/* Left Badge */}
        <div className="flex items-center gap-1.5 shrink-0 z-10 bg-slate-950/60 px-2 py-0.5 rounded-full border border-purple-500/40">
          <div className="relative flex items-center justify-center">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute" />
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          </div>
          <span className="text-[10px] bg-red-600 text-white font-black px-1.5 py-0.2 rounded shadow uppercase tracking-wider">
            TV
          </span>
          <span className="text-[11px] font-black text-amber-300 flex items-center gap-1">
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
            LIVE ROOMS ({rooms.length})
          </span>
        </div>

        {/* Running Marquee Ticker */}
        <div className="flex-1 overflow-hidden relative">
          <div className="animate-marquee text-[11px] font-semibold text-slate-200 hover:text-white transition-colors">
            {runningText}
          </div>
        </div>

        {/* Right Click-to-Open Callout */}
        <span className="shrink-0 text-[10px] font-bold text-amber-300/90 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
          <Eye className="w-3 h-3 text-amber-300" />
          <span>Buksan</span>
        </span>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-slate-950/95 border border-purple-500/50 rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col max-h-[80vh] w-full max-w-md transition-all duration-300">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="relative flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping absolute" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            </div>
            <span className="font-extrabold text-white text-sm sm:text-base tracking-wide flex items-center gap-1.5 drop-shadow">
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              LIVE TV ROOMS
            </span>
            <span className="text-[10px] bg-red-600 text-white font-black px-1.5 py-0.5 rounded shadow-[0_0_8px_rgba(239,68,68,0.8)] uppercase tracking-wider animate-pulse">
              TV
            </span>
            <span className="text-xs bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
              {rooms.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition active:scale-95 disabled:opacity-50 cursor-pointer"
              title="I-refresh ang listahan"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition active:scale-95 cursor-pointer font-bold text-xs px-2.5"
              title="Isara"
            >
              ✕
            </button>
          </div>
        </div>

      {/* Content */}
      <div className="overflow-y-auto mt-2 space-y-2 pr-1 custom-scrollbar flex-1 min-h-[140px]">
          {isLoading && rooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-400 mb-2" />
              Naghahanap ng mga laro...
            </div>
          ) : rooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center text-slate-400 text-xs">
              <span className="text-2xl mb-1">🎮</span>
              <p className="font-semibold text-slate-300">Walang aktibong kwarto ngayon</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Mag-create ng bagong room para maglaro!</p>
            </div>
          ) : (
            rooms.map((room) => {
              const rId = room.roomId || room.id || '';
              const rName = room.roomName || room.name || 'Game Room';
              const isFull = room.playerCount >= room.maxPlayers;
              const isPlaying = room.phase !== 'lobby';

              return (
                <div
                  key={rId}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-500/40 rounded-xl p-2.5 transition flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-white text-xs truncate max-w-[120px] drop-shadow">
                        {rName}
                      </span>
                      {room.hasPassword && <Lock className="w-3 h-3 text-amber-400 shrink-0" />}
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-1 shrink-0">
                      {isPlaying ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          Laro
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Lobby
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Room Info & Stats */}
                  <div className="flex items-center justify-between text-[11px] text-slate-300 pt-0.5">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-blue-400" />
                        {room.playerCount}/{room.maxPlayers}
                      </span>
                      {(room.spectatorCount !== undefined && room.spectatorCount > 0) && (
                        <span className="flex items-center gap-1 text-purple-300">
                          <Eye className="w-3 h-3 text-purple-400" />
                          {room.spectatorCount}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 font-mono">
                        #{rId}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5">
                      {/* Spectate Button */}
                      <button
                        onClick={() => onSpectate(rId)}
                        className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-md shadow-purple-900/30 active:scale-95 transition cursor-pointer"
                        title="View / Manood lamang sa larong ito (Viewing mode)"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>

                      {/* Join as Player if in lobby and not full */}
                      {!isPlaying && !isFull && (
                        <button
                          onClick={() => onJoin(rId)}
                          className="px-2 py-1 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-md shadow-emerald-900/30 active:scale-95 transition cursor-pointer"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          Sali
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
