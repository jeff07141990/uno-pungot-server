import React from 'react';
import { ReactionEvent } from '../engine/types';

interface EmojiReactionsProps {
  onSendReaction: (emoji: string) => void;
  activeReactions: ReactionEvent[];
}

const EMOJIS = ['🔥', '😂', '😱', '🎉', '🤡', '💀', '👀', '👍'];

export const EmojiReactions: React.FC<EmojiReactionsProps> = ({
  onSendReaction,
  activeReactions,
}) => {
  return (
    <>
      {/* Floating active reaction bubbles */}
      <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
        {activeReactions.map((r) => (
          <div
            key={`${r.senderId}-${r.timestamp}`}
            className="absolute left-1/2 bottom-36 -translate-x-1/2 flex flex-col items-center animate-floatAndFade"
          >
            <div className="bg-slate-900/90 border border-amber-400/50 px-3 py-1.5 rounded-full shadow-2xl flex items-center gap-1.5 text-2xl">
              <span>{r.emoji}</span>
              <span className="text-xs font-bold text-amber-300">{r.senderName}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Emoji Bar */}
      <div className="flex items-center gap-1 sm:gap-2 bg-slate-950/80 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-slate-800 shadow-xl">
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onSendReaction(emoji)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-lg hover:bg-slate-800 hover:scale-125 active:scale-95 transition"
            title={`Send ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </>
  );
};
