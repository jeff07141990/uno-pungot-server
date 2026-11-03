import React, { useState } from 'react';
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
  ShoppingBag,
  Coins,
  Lock,
  Unlock,
  AlertCircle,
  HelpCircle,
  X,
} from 'lucide-react';
import { EntryFeeAmount, GameVariant, PlayerWallet, PublicGameState, PublicPlayer } from '../engine/types';

interface LobbyViewProps {
  gameState: PublicGameState;
  currentUserId: string;
  onStartGame: () => void;
  onSetReady: (isReady: boolean) => void;
  onAddBot: () => void;
  onRemovePlayer: (targetId: string) => void;
  onLeaveRoom: () => void;
  onOpenSettings?: () => void;
  onOpenShop?: () => void;
  onOpenChat: () => void;
  unreadChatCount: number;
  onToast: (msg: string) => void;
  wallet?: PlayerWallet | null;
  onConfirmPayment?: () => void;
  onUpdateEntryFee?: (fee: EntryFeeAmount) => void;
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
  onOpenShop,
  onOpenChat,
  unreadChatCount,
  onToast,
  wallet,
  onConfirmPayment,
  onUpdateEntryFee,
}) => {
  const [copied, setCopied] = useState(false);
  const [showPrizeModal, setShowPrizeModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  const isHost = gameState.hostId === currentUserId;
  const currentPlayer = gameState.players.find((p) => p.id === currentUserId);
  const isReady = currentPlayer?.isReady ?? false;
  const isFeeRoom = (gameState.entryFee ?? 0) > 0;
  const maxPlayersAllowed = isFeeRoom ? 5 : 10;
  const minPlayersRequired = isFeeRoom ? 5 : 2;

  // Validation for starting game
  const hasMinPlayers = gameState.players.length >= minPlayersRequired;
  const hasExactPlayers = !isFeeRoom || gameState.players.length === 5;
  const allPaid = !isFeeRoom || gameState.players.every((p) => p.hasPaidEntry);
  const canStart = hasMinPlayers && hasExactPlayers && allPaid;

  const currentPaid = currentPlayer?.hasPaidEntry ?? false;
  const userBalance = wallet?.balance ?? 0;
  const feeAmount = gameState.entryFee ?? 0;
  const poolAmount = gameState.prizePool ?? feeAmount * (isFeeRoom ? 5 : gameState.players.length);

  // Prize calculation breakdown for 5 places
  const prizeBreakdown = [
    { place: '1st Place', percent: '50%', amount: Math.floor(poolAmount * 0.5), medal: '🥇' },
    { place: '2nd Place', percent: '25%', amount: Math.floor(poolAmount * 0.25), medal: '🥈' },
    { place: '3rd Place', percent: '15%', amount: Math.floor(poolAmount * 0.15), medal: '🥉' },
    { place: '4th Place', percent: '7%', amount: Math.floor(poolAmount * 0.07), medal: '🎖️' },
    {
      place: '5th Place',
      percent: '3%',
      amount:
        poolAmount -
        (Math.floor(poolAmount * 0.5) +
          Math.floor(poolAmount * 0.25) +
          Math.floor(poolAmount * 0.15) +
          Math.floor(poolAmount * 0.07)),
      medal: '💀',
    },
  ];

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

  const handlePayEntry = async () => {
    if (!onConfirmPayment) return;
    if (userBalance < feeAmount) {
      onToast(`Kulang ang Coins! Mayroon ka lamang ₱${userBalance.toLocaleString()}, kailangan ng ₱${feeAmount}.`);
      return;
    }
    setIsPaying(true);
    try {
      onConfirmPayment();
      setShowPaymentModal(false);
      onToast(`Matagumpay na nagbayad ng ₱${feeAmount} Entry Fee!`);
    } catch {
      onToast('May problema sa pagbabayad ng entry fee.');
    } finally {
      setIsPaying(false);
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
            className="w-10 h-10 sm:w-11 sm:h-11 aspect-square flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer p-0 shrink-0"
            title="Settings & Card Customizer"
          >
            <img
              src="/home screen in game icons/setting.png"
              alt="Settings"
              className="w-full h-full object-contain aspect-square select-none pointer-events-none drop-shadow"
            />
          </button>

          {/* Tindahan / Power-Up Shop Button */}
          {onOpenShop && (
            <button
              onClick={onOpenShop}
              className="w-10 h-10 sm:w-11 sm:h-11 aspect-square flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer p-0 shrink-0"
              title="Buksan ang Tindahan ng Power-Ups"
            >
              <img
                src="/home screen in game icons/shop.png"
                alt="Shop"
                className="w-full h-full object-contain aspect-square select-none pointer-events-none drop-shadow"
              />
            </button>
          )}

          <button
            onClick={onOpenChat}
            className="relative w-10 h-10 sm:w-11 sm:h-11 aspect-square flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer p-0 shrink-0"
            title="Room Chat"
          >
            <img
              src="/home screen in game icons/chats.png"
              alt="Chat"
              className="w-full h-full object-contain aspect-square select-none pointer-events-none drop-shadow"
            />
            {unreadChatCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
                {unreadChatCount}
              </span>
            )}
          </button>

          {/* Leave / Back Button */}
          <button
            onClick={onLeaveRoom}
            className="w-10 h-10 sm:w-11 sm:h-11 aspect-square flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer p-0 shrink-0"
            title="Leave Room"
          >
            <img
              src="/home screen in game icons/back button.png"
              alt="Leave Room"
              className="w-full h-full object-contain aspect-square select-none pointer-events-none drop-shadow"
            />
          </button>
        </div>
      </div>

      {/* Prize Pool & Entry Fee Interactive Banner */}
      {isFeeRoom && (
        <div className="w-full max-w-4xl mx-auto mt-4 bg-gradient-to-r from-amber-950/70 via-slate-900/90 to-amber-950/70 backdrop-blur-md p-4 rounded-3xl border-2 border-amber-500/50 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 w-full md:w-auto">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 flex items-center justify-center text-2xl shadow-lg shrink-0">
              🪙
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                  5-Place Prize Pool Match
                </span>
                <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                  {gameState.isEntryFeeLocked ? <Lock className="w-2.5 h-2.5 text-amber-400" /> : <Unlock className="w-2.5 h-2.5 text-emerald-400" />}
                  {gameState.isEntryFeeLocked ? 'Fee Locked' : 'Unlocked'}
                </span>
              </div>
              <div className="flex items-baseline gap-3 mt-0.5">
                <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-400">
                  ₱{poolAmount.toLocaleString()} Prize Pool
                </span>
                <span className="text-xs text-slate-400 font-semibold">
                  (₱{feeAmount} Entry Fee)
                </span>
              </div>
            </div>
          </div>

          {/* User Payment Action / Status */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <button
              onClick={() => setShowPrizeModal(true)}
              className="py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs border border-amber-500/40 flex items-center gap-1.5 transition active:scale-95"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Prize Breakdown</span>
            </button>

            {currentPaid ? (
              <div className="py-2 px-4 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-black text-xs flex items-center gap-1.5 shadow">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Entry Fee Paid (₱{feeAmount})</span>
              </div>
            ) : (
              <button
                onClick={() => setShowPaymentModal(true)}
                className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(250,204,21,0.5)] active:scale-95 transition animate-pulse"
              >
                <Coins className="w-4 h-4 fill-slate-950" />
                <span>Pay Entry Fee (₱{feeAmount})</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Center Area: Players Grid & Rules Card */}
      <div className="w-full max-w-4xl mx-auto my-6 grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">
        {/* Players List (2 columns on wide screen) */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <span>Players in Lobby</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                isFeeRoom && gameState.players.length === 5
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-800 text-amber-400'
              }`}>
                {gameState.players.length}/{maxPlayersAllowed} {isFeeRoom ? '(Fixed 5)' : ''}
              </span>
            </h3>

            {isHost && gameState.players.length < maxPlayersAllowed && (
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
                        <span className="font-bold text-sm text-white truncate max-w-[110px]">
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
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                        <span>{isSelf ? '(You)' : player.isDisconnected ? 'Disconnected' : 'Online'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <div className="flex items-center gap-1.5">
                      {isFeeRoom && (
                        player.hasPaidEntry ? (
                          <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/40 flex items-center gap-1">
                            <span>✓</span> Bayad
                          </span>
                        ) : (
                          <span className="text-[10px] font-black text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded-md border border-rose-500/40 flex items-center gap-1 animate-pulse">
                            <span>⏳</span> Di pa Bayad
                          </span>
                        )
                      )}

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
                </div>
              );
            })}

            {/* Empty slots for 5-player fee match */}
            {isFeeRoom && gameState.players.length < 5 && (
              Array.from({ length: 5 - gameState.players.length }).map((_, idx) => (
                <div
                  key={`empty-${idx}`}
                  className="p-3.5 rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 flex items-center justify-center text-slate-500 text-xs font-semibold gap-2"
                >
                  <span className="w-2 h-2 rounded-full bg-slate-700 animate-ping" />
                  <span>Waiting for Player #{gameState.players.length + idx + 1}...</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Selected House Rules & Match Settings Card */}
        <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl p-5 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-amber-400" />
              <span>Match Settings</span>
            </h4>

            <div className="space-y-3 text-xs">
              {/* Entry Fee Row */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <span className="text-amber-200 flex items-center gap-1.5 font-bold">
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  Entry Fee
                </span>
                <span className="font-black text-amber-300">
                  {isFeeRoom ? `₱${feeAmount} per player` : 'Free / Casual'}
                </span>
              </div>

              {/* Prize Pool Row */}
              {isFeeRoom && (
                <div className="flex items-center justify-between p-2 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <span className="text-amber-200 flex items-center gap-1.5 font-bold">
                    <span>🏆</span>
                    Total Prize Pool
                  </span>
                  <span className="font-black text-amber-300">
                    ₱{poolAmount.toLocaleString()} (5 Places)
                  </span>
                </div>
              )}

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
            {isHost
              ? isFeeRoom
                ? '5 players & all paid required to start match.'
                : 'You are the host. You control when the match begins.'
              : 'Waiting for host to launch the game...'}
          </div>
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="w-full max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-slate-800">
        <div className="flex items-center gap-3 w-full sm:w-auto">
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

          {isFeeRoom && !currentPaid && (
            <button
              onClick={() => setShowPaymentModal(true)}
              className="py-3 px-5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-[0_0_15px_rgba(250,204,21,0.5)] active:scale-95 transition flex items-center gap-2"
            >
              <Coins className="w-4 h-4 fill-slate-950" />
              <span>Magbayad ng ₱{feeAmount}</span>
            </button>
          )}
        </div>

        <div className="flex-1 text-center sm:text-right">
          {isFeeRoom && (
            <div className="text-xs text-amber-300 font-bold">
              Bayad: {gameState.players.filter((p) => p.hasPaidEntry).length}/5 Manlalaro
              {gameState.players.length < 5 && (
                <span className="text-slate-400 ml-2">({5 - gameState.players.length} kulang pa)</span>
              )}
            </div>
          )}
        </div>

        {isHost ? (
          <div className="flex flex-col items-end gap-1 w-full sm:w-auto">
            <button
              disabled={!canStart}
              onClick={onStartGame}
              className="w-full sm:w-auto py-4 px-8 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black text-base shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>START GAME</span>
            </button>
            {!canStart && (
              <span className="text-[11px] text-amber-400/90 font-medium">
                {isFeeRoom
                  ? gameState.players.length !== 5
                    ? 'Eksaktong 5 players ang kailangan'
                    : 'Kailangang magbayad ang lahat ng 5 manlalaro'
                  : 'Kailangan ng kahit 2 manlalaro'}
              </span>
            )}
          </div>
        ) : (
          <div className="text-xs text-amber-400 font-semibold animate-pulse">
            {canStart ? 'All players assembled & paid! Host will start soon...' : 'Waiting for requirements to be met...'}
          </div>
        )}
      </div>

      {/* Prize Breakdown Modal */}
      {showPrizeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border-2 border-amber-500/40 rounded-3xl p-6 shadow-2xl animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏆</span>
                <div>
                  <h3 className="text-base font-black text-amber-300">5-Place Prize Pool Distribution</h3>
                  <p className="text-xs text-slate-400">Total Pool: ₱{poolAmount.toLocaleString()} (₱{feeAmount} × 5)</p>
                </div>
              </div>
              <button
                onClick={() => setShowPrizeModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 my-5">
              {prizeBreakdown.map((tier) => (
                <div
                  key={tier.place}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 border border-slate-800"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{tier.medal}</span>
                    <div>
                      <div className="font-bold text-sm text-white">{tier.place}</div>
                      <div className="text-[11px] text-slate-400">{tier.percent} of Total Pool</div>
                    </div>
                  </div>
                  <span className="font-black text-amber-300 text-base font-mono">
                    +₱{tier.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-slate-400 text-center mb-4">
              ✨ 100% ng pool ay ipapamahagi sa 5 finishers ayon sa kanilang pagkakasunod-sunod. Walang maiiwan.
            </p>

            <button
              onClick={() => setShowPrizeModal(false)}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm active:scale-95 transition"
            >
              Naiintindihan Ko (Close)
            </button>
          </div>
        </div>
      )}

      {/* Entry Payment Confirmation Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 shadow-2xl animate-scaleIn">
            <div className="text-center mb-4">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border-2 border-amber-500/50 text-3xl flex items-center justify-center mx-auto mb-3 shadow-[0_0_20px_rgba(250,204,21,0.3)]">
                🪙
              </div>
              <h3 className="text-lg font-black text-white">Kumpirmahin ang Entry Fee</h3>
              <p className="text-xs text-slate-400 mt-1">
                Kailangan mong magbayad ng entry fee upang makasali sa 5-place prize pool match.
              </p>
            </div>

            <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 space-y-2.5 mb-5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Halaga ng Entry:</span>
                <span className="font-black text-amber-300 text-sm">₱{feeAmount.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Iyong Kasalukuyang Balance:</span>
                <span className="font-mono font-bold text-white">₱{userBalance.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <span className="text-slate-400">Matitirang Balance:</span>
                <span className={`font-mono font-bold ${userBalance >= feeAmount ? 'text-emerald-400' : 'text-rose-400'}`}>
                  ₱{(userBalance - feeAmount).toLocaleString()}
                </span>
              </div>
            </div>

            {userBalance < feeAmount && (
              <div className="mb-4 p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>Kulang ang iyong Virtual Coins upang sumali sa labang ito!</span>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs active:scale-95 transition"
              >
                Kanselahin
              </button>
              <button
                disabled={userBalance < feeAmount || isPaying}
                onClick={handlePayEntry}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black text-xs active:scale-95 transition shadow-lg"
              >
                {isPaying ? 'Nagbabayad...' : `Magbayad (₱${feeAmount})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

