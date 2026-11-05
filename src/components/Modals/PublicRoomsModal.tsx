import React from 'react';
import { X, Users, RefreshCw, Plus, Play } from 'lucide-react';

interface PublicRoom {
  roomId: string;
  roomName: string;
  playerCount: number;
  maxPlayers: number;
  phase: string;
}

interface PublicRoomsModalProps {
  isOpen: boolean;
  rooms: PublicRoom[];
  isLoading: boolean;
  onRefresh: () => void;
  onJoinRoom: (roomId: string) => void;
  onCreateRoom: () => void;
  onClose: () => void;
}

export const PublicRoomsModal: React.FC<PublicRoomsModalProps> = ({
  isOpen,
  rooms,
  isLoading,
  onRefresh,
  onJoinRoom,
  onCreateRoom,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-black text-white tracking-wide">ONLINE PUBLIC ROOMS</h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onRefresh}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Refresh rooms"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Room List */}
        <div className="flex-1 overflow-y-auto py-4 space-y-2 pr-1">
          {rooms.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm space-y-3">
              <p>No active public rooms at the moment.</p>
              <button
                onClick={onCreateRoom}
                className="py-2.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs inline-flex items-center gap-1.5 shadow-md transition"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Public Room</span>
              </button>
            </div>
          ) : (
            rooms.map((room) => (
              <div
                key={room.roomId}
                className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 flex items-center justify-between hover:border-slate-700 transition"
              >
                <div>
                  <div className="font-bold text-sm text-white">{room.roomName}</div>
                  <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-amber-400 font-semibold">#{room.roomId}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-slate-500" />
                      {room.playerCount}/{room.maxPlayers} Players
                    </span>
                    <span>•</span>
                    <span className={room.phase === 'lobby' ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                      {room.phase === 'lobby' ? 'Waiting in Lobby' : 'In Progress'}
                    </span>
                  </div>
                </div>

                {room.phase === 'lobby' ? (
                  <button
                    disabled={room.playerCount >= room.maxPlayers}
                    onClick={() => onJoinRoom(room.roomId)}
                    className="py-2 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 disabled:opacity-40 text-slate-950 font-black text-xs shadow flex items-center gap-1 active:scale-95 transition"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Join</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onJoinRoom(room.roomId)}
                    className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-500 hover:from-purple-500 hover:to-indigo-400 text-white font-black text-xs shadow-[0_0_12px_rgba(168,85,247,0.5)] border border-purple-400/60 flex items-center gap-1 active:scale-95 transition cursor-pointer"
                    title="Panoorin ang laban (Spectate Live Match)"
                  >
                    <span>🍿</span>
                    <span>Panoorin</span>
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
          <button
            onClick={onCreateRoom}
            className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Custom Room</span>
          </button>
          <button
            onClick={onClose}
            className="py-2 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
