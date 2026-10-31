import React from 'react';
import { X, History, Trash2, Award, Calendar } from 'lucide-react';
import { MatchRecord } from '../../services/historyService';

interface MatchHistoryModalProps {
  isOpen: boolean;
  matches: MatchRecord[];
  onClear: () => void;
  onClose: () => void;
}

export const MatchHistoryModal: React.FC<MatchHistoryModalProps> = ({
  isOpen,
  matches,
  onClear,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-black text-white tracking-wide">MATCH HISTORY</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Matches List */}
        <div className="flex-1 overflow-y-auto py-4 space-y-2 pr-1">
          {matches.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              No matches recorded yet. Jump into an online match or play with bots!
            </div>
          ) : (
            matches.map((match) => (
              <div
                key={match.id}
                className={`p-3 rounded-2xl border flex items-center justify-between ${
                  match.userWon
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-slate-950/70 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-xl shrink-0">
                    {match.winnerAvatar}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{match.winnerName}</span>
                      {match.userWon ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-500 text-slate-950 uppercase">
                          Victory
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 uppercase">
                          Defeat
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>Room {match.roomId}</span>
                      <span>•</span>
                      <span>{match.playersCount} Players</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(match.endedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-bold">
                    {match.userWon ? (
                      <span className="text-amber-400">🏆 1st Place (Panalo)</span>
                    ) : (
                      <span className="text-slate-400">Tapos na Laban</span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {match.cardsPlayed} cards played
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          {matches.length > 0 ? (
            <button
              onClick={onClear}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 font-semibold transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          ) : <div></div>}
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
