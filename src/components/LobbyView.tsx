import React from 'react';
import {
  Copy,
  Check,
  Play,
  Bot,
  UserX,
  LogOut,
  Shield,
  Crown,
  Timer,
  Layers,
  Flame,
  MessageSquare,
  Sparkles,
  Settings,
} from 'lucide-react';
import { GameVariant, PublicGameState, PublicPlayer } from '../engine/types';

interface LobbyViewProps {
  gameState: PublicGameState;
  currentUserId: string;
  onStartGame: () => void;
  onSetReady: (isReady: boolean) => void;
  onAddBot: () => void;
  onRemovePlayer: (targetId: string) => void;
  onLeaveRoom: () => void;
  onOpenSettings?: () => void;
  onOpenChat: () => void;
  unreadChatCount: number;
  onToast: (msg: string) => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  gameState,
  currentUserId,
  onStartGame,
  onSetReady,
  onAddBot,
  onRemovePlayer,
  onLeaveRoom,
  onOpenSettings,
  onOpenChat,
  unreadChatCount,
  onToast,
}) => {
  const [copied, setCopied] = React.useState(false);

  const isHost = gameState.hostId === currentUserId;
  const currentPlayer = gameState.players.find((p) => p.id === currentUserId);
  const isReady = currentPlayer?.isReady ?? false;
  const canStart = gameState.players.length >= 2;

  const variantBadgeMap: Record<GameVariant, { label: string; icon: string; style: string }> = {
    classic: { label: 'Classic UNO', icon: '🎴', style: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
    all_wild: { label: 'Uno All Wild', icon: '🌈', style: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
    flip: { label: 'Uno Flip!', icon: '🔄', style: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' },
    dare: { label: 'Uno Dare!', icon: '⚡', style: 'bg-red-500/20 text-red-300 border-red-500/40' },
  };
  const activeVariantInfo = variantBadgeMap[gameState.variant || 'classic'];

  const copyInviteLink = async () => {
    const inviteUrl = `${window.location.origin}${window.location.pathname}?join=${gameState.roomId}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      onToast('Invite link copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      onToast(`Share code: ${gameState.roomId}`);
    }
  };

  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(gameState.roomId);
      onToast(`Room Code ${gameState.roomId} copied!`);
    } catch {
      onToast(`Code: ${gameState.roomId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0B1120] via-[#0F172A] to-[#0B1120] text-white p-4 sm:p-6 flex flex-col justify-between">
      {/* Top Banner: Room Info & Invite Code */}
      <div className="w-full max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/90 backdrop-blur-md p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 flex items-center justify-center font-black text-xl shadow-lg">
            UNO
          </div>
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2 flex-wrap">
              <span>{gameState.roomName}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${activeVariantInfo.style}`}>
                <span>{activeVariantInfo.icon}</span>
                <span>{activeVariantInfo.label}</span>
              </span>
              {gameState.isPrivate && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Private
                </span>
              )}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-slate-400">Room Code:</span>
              <button
                onClick={copyRoomCode}
                className="font-mono font-black text-amber-400 text-sm hover:underline flex items-center gap-1"
                title="Click to copy code"
              >
                <span>{gameState.roomId}</span>
                <Copy className="w-3 h-3 text-slate-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Action Controls & Invite Link */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={copyInviteLink}
            className="flex-1 sm:flex-none py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 shadow flex items-center justify-center gap-1.5 transition active:scale-95"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-amber-400" />}
            <span>{copied ? 'Copied Link!' : 'Copy Invite Link'}</span>
          </button>

          {/* Settings & Card Customizer Button */}
          <button
            onClick={onOpenSettings}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow transition active:scale-95 cursor-pointer"
            title="Settings & Card Customizer"
          >
            <Settings className="w-4 h-4 text-amber-400" />
          </button>

          <button
            onClick={onOpenChat}
            className="relative p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow transition active:scale-95 cursor-pointer"
            title="Room Chat"
          >
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            {unreadChatCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
                {unreadChatCount}
              </span>
            )}
          </button>

          <button
            onClick={onLeaveRoom}
            className="p-2.5 rounded-xl bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/50 shadow transition active:scale-95 cursor-pointer"
            title="Leave Room"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Center Area: Players Grid & Rules Card */}
      <div className="w-full max-w-4xl mx-auto my-6 grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">
        {/* Players List (2 columns on wide screen) */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <span>Players in Lobby</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 text-xs font-mono">
                {gameState.players.length}/10
              </span>
            </h3>

            {isHost && gameState.players.length < 10 && (
              <button
                onClick={onAddBot}
                className="py-1.5 px-3 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 font-bold text-xs border border-purple-500/50 flex items-center gap-1.5 transition active:scale-95 shadow"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>+ Add Bot</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {gameState.players.map((player) => {
              const isSelf = player.id === currentUserId;
              return (
                <div
                  key={player.id}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                    isSelf
                      ? 'bg-amber-500/10 border-amber-500/40 shadow-md'
                      : 'bg-slate-900/80 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-700 flex items-center justify-center text-2xl shadow shrink-0 border border-slate-700 overflow-hidden">
                      {player.avatar && player.avatar.startsWith('data:image') ? (
                        <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
                      ) : (
                        <span>{player.avatar}</span>
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-white truncate max-w-[120px]">
                          {player.name}
                        </span>
                        {player.isHost && (
                          <span title="Host"><Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" /></span>
                        )}
                        {player.isBot && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/30 text-purple-300 font-bold">
                            BOT
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {isSelf ? '(You)' : player.isDisconnected ? 'Disconnected' : 'Online'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {player.isHost ? (
                      <span className="text-[11px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/30">
                        Host
                      </span>
                    ) : player.isReady ? (
                      <span className="text-[11px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-md border border-emerald-400/30">
                        Ready
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                        Waiting
                      </span>
                    )}

                    {/* Host kick controls */}
                    {isHost && !player.isHost && (
                      <button
                        onClick={() => onRemovePlayer(player.id)}
                        className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition"
                        title="Remove player"
                      >
                        <UserX className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected House Rules Card */}
        <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl p-5 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-amber-400" />
              <span>Match Settings</span>
            </h4>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Game Variant
                </span>
                <span className="font-bold text-amber-300 flex items-center gap-1">
                  <span>{activeVariantInfo.icon}</span>
                  <span>{activeVariantInfo.label}</span>
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-red-950/40 border border-red-500/30">
                <span className="text-red-300 flex items-center gap-1.5 font-semibold">
                  <span>💀</span>
                  Defeat Condition
                </span>
                <span className="font-bold text-red-400 text-[11px]">
                  Last with Cards Loses (Pungot)
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Timer className="w-3.5 h-3.5 text-cyan-400" />
                  Turn Timer
                </span>
                <span className="font-bold text-white">
                  {gameState.houseRules.turnTimer > 0 ? `${gameState.houseRules.turnTimer}s` : 'Off'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-400" />
                  Starting Hand
                </span>
                <span className="font-bold text-white">
                  {gameState.houseRules.startingHandSize} Cards
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-red-400" />
                  Stacking Rules
                </span>
                <span className={gameState.houseRules.stacking ? 'text-emerald-400 font-bold' : 'text-slate-500 font-bold'}>
                  {gameState.houseRules.stacking ? 'Enabled' : 'Disabled'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400">7-0 Swap Rule</span>
                <span className={gameState.houseRules.sevenZero ? 'text-emerald-400 font-bold' : 'text-slate-500 font-bold'}>
                  {gameState.houseRules.sevenZero ? 'Enabled' : 'Disabled'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400">WD4 Challenge</span>
                <span className={gameState.houseRules.wildDraw4Challenge ? 'text-emerald-400 font-bold' : 'text-slate-500 font-bold'}>
                  {gameState.houseRules.wildDraw4Challenge ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 text-[11px] text-slate-500 text-center">
            {isHost ? 'You are the host. You control when the match begins.' : 'Waiting for host to launch the game...'}
          </div>
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="w-full max-w-4xl mx-auto flex items-center justify-between gap-4 pt-3 border-t border-slate-800">
        {!isHost && (
          <button
            onClick={() => onSetReady(!isReady)}
            className={`py-3.5 px-6 rounded-2xl font-black text-sm shadow-lg transition-all active:scale-95 ${
              isReady
                ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
            }`}
          >
            {isReady ? 'Cancel Ready' : 'READY TO PLAY'}
          </button>
        )}

        <div className="flex-1"></div>

        {isHost ? (
          <button
            disabled={!canStart}
            onClick={onStartGame}
            className="py-4 px-8 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 disabled:opacity-40 text-slate-950 font-black text-base shadow-xl flex items-center gap-2 active:scale-95 transition-all"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>START GAME</span>
          </button>
        ) : (
          <div className="text-xs text-amber-400 font-semibold animate-pulse">
            {canStart ? 'All players assembled! Host will start soon...' : 'Waiting for more players to join...'}
          </div>
        )}
      </div>
    </div>
  );
};
