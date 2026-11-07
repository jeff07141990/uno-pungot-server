import React, { useState } from 'react';
import { X, LogIn, KeyRound } from 'lucide-react';

interface JoinRoomModalProps {
  isOpen: boolean;
  initialCode?: string;
  onClose: () => void;
  onJoin: (roomCode: string) => void;
}

export const JoinRoomModal: React.FC<JoinRoomModalProps> = ({ isOpen, initialCode = '', onClose, onJoin }) => {
  const [code, setCode] = useState(() => initialCode || localStorage.getItem('uno_recent_room_id') || '');

  React.useEffect(() => {
    if (isOpen) {
      const recent = initialCode || localStorage.getItem('uno_recent_room_id') || '';
      if (recent) setCode(recent.toUpperCase());
    }
  }, [isOpen, initialCode]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (clean.length >= 4) {
      onJoin(clean);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-black text-white tracking-wide">JOIN ROOM</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="py-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5 text-center">
              ENTER 6-CHARACTER ROOM CODE
            </label>
            <input
              type="text"
              autoFocus
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. PUNG77"
              className="w-full text-center tracking-[0.3em] font-mono font-black text-2xl py-3 bg-slate-950 border-2 border-slate-700 rounded-2xl text-amber-400 uppercase focus:outline-none focus:border-amber-400 transition"
            />
            {code && code === localStorage.getItem('uno_recent_room_id')?.toUpperCase() && (
              <span className="text-[10px] text-emerald-400 font-bold block text-center mt-1.5 animate-pulse">
                ⚡ Na-detect ang iyong previous match! I-click ang Join para mag-reconnect agad.
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={code.trim().length < 4}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 transition active:scale-95"
          >
            <LogIn className="w-4 h-4" />
            <span>Join Room</span>
          </button>
        </form>
      </div>
    </div>
  );
};
