import React, { useState, useRef, useEffect } from 'react';
import { X, Send, MessageSquare, VolumeX } from 'lucide-react';
import { ChatMessage } from '../engine/types';

interface ChatBoxProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  currentUserId: string;
  onSendMessage: (text: string) => void;
  mutedPlayerIds: Set<string>;
  onToggleMutePlayer: (playerId: string) => void;
}

export const ChatBox: React.FC<ChatBoxProps> = ({
  isOpen,
  onClose,
  messages,
  currentUserId,
  onSendMessage,
  mutedPlayerIds,
  onToggleMutePlayer,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputText.trim();
    if (clean) {
      onSendMessage(clean);
      setInputText('');
    }
  };

  const filteredMessages = messages.filter((m) => !mutedPlayerIds.has(m.senderId));

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-80 bg-slate-900/95 backdrop-blur-md border-l border-slate-800 shadow-2xl flex flex-col animate-slideLeft">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-amber-400" />
          <h3 className="font-black text-white text-base">ROOM CHAT</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
        {filteredMessages.length === 0 ? (
          <div className="text-center text-slate-500 py-10">No messages yet. Say hello! 👋</div>
        ) : (
          filteredMessages.map((msg) => {
            const isSelf = msg.senderId === currentUserId;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-[11px] text-slate-400">
                  <span>{msg.senderAvatar}</span>
                  <span className="font-bold text-slate-300">{msg.senderName}</span>
                  {!isSelf && (
                    <button
                      onClick={() => onToggleMutePlayer(msg.senderId)}
                      title="Mute this player's messages"
                      className="text-slate-500 hover:text-red-400 ml-1"
                    >
                      <VolumeX className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div
                  className={`px-3 py-2 rounded-2xl max-w-[85%] text-left break-words ${
                    isSelf
                      ? 'bg-amber-500 text-slate-950 font-semibold rounded-tr-none'
                      : 'bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-3 border-t border-slate-800 flex gap-2">
        <input
          type="text"
          maxLength={200}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-400"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 transition active:scale-95"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
