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
import { EntryFeeAmount, GameVariant, HouseRules, PlayerWallet, PublicGameState, PublicPlayer } from '../engine/types';
import { soundManager } from '../audio/soundManager';

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
  onUpdateRules?: (rules: Partial<HouseRules>, variant?: GameVariant) => void;
  onRefresh?: () => void;
}

const LOBBY_VARIANTS: { id: GameVariant | 'no_mercy' | 'dos'; name: string; image: string; comingSoon?: boolean }[] = [
  { id: 'classic', name: 'Classic', image: '/uno cards buttons/classic.png' },
  { id: 'all_wild', name: 'All Wild', image: '/uno cards buttons/all wild.png' },
  { id: 'flip', name: 'Flip!', image: '/uno cards buttons/FLIP.png' },
  { id: 'dare', name: 'Dare', image: '/uno cards buttons/DARE.png' },
  { id: 'no_mercy', name: 'No Mercy', image: '/uno cards buttons/NO MERCY.png', comingSoon: true },
  { id: 'dos', name: 'DOS', image: '/uno cards buttons/DOS.png', comingSoon: true },
];

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
  onUpdateRules,
  onRefresh,
}) => {
  const [copied, setCopied] = useState(false);
  const [showPrizeModal, setShowPrizeModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showMatchSettingsModal, setShowMatchSettingsModal] = useState(false);
  const [showHouseRules, setShowHouseRules] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  const isHost = gameState.hostId === currentUserId;
  const currentPlayer = gameState.players.find((p) => p.id === currentUserId);
  const isReady = currentPlayer?.isReady ?? false;
  const isFeeRoom = (gameState.entryFee ?? 0) > 0;
  const maxPlayersAllowed = 10;
  const minPlayersRequired = 2;

  // Validation for starting game
  const hasMinPlayers = gameState.players.length >= minPlayersRequired;
  const allPaid = !isFeeRoom || gameState.players.every((p) => p.hasPaidEntry);
  const canStart = hasMinPlayers && allPaid;

  const totalSlots = gameState.players.length <= 4 
    ? 4 
    : gameState.players.length <= 6 
    ? 6 
    : gameState.players.length <= 8 
    ? 8 
    : 10;

  const currentPaid = currentPlayer?.hasPaidEntry ?? false;
  const userBalance = wallet?.balance ?? 0;
  const feeAmount = gameState.entryFee ?? 0;
  const poolAmount = gameState.prizePool ?? (feeAmount * gameState.players.length);

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
    <div className="min-h-screen max-h-screen overflow-y-auto custom-scrollbar bg-gradient-to-b from-[#0B1120] via-[#0F172A] to-[#0B1120] text-white p-2.5 sm:p-4 flex flex-col justify-between">
      {/* Top Banner: Room Info & Invite Code (Compact & Sleek) */}
      <div className="w-full max-w-5xl mx-auto flex items-center justify-between gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 sm:px-4 sm:py-2 rounded-2xl border border-slate-800 shadow-md shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg overflow-hidden flex items-center justify-center shadow shrink-0">
            <img
              src="/shop icon/Shop Logo.png"
              alt="Lobby Logo"
              className="w-full h-full object-contain select-none pointer-events-none drop-shadow"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs sm:text-sm font-black text-white truncate max-w-[130px] sm:max-w-[200px]">{gameState.roomName}</span>
              <span className={`text-[8.5px] sm:text-[9.5px] font-bold px-1.5 py-0.2 rounded-full border flex items-center gap-0.5 ${activeVariantInfo.style}`}>
                <span>{activeVariantInfo.icon}</span>
                <span>{activeVariantInfo.label}</span>
              </span>
              {gameState.isPrivate && (
                <span className="text-[8.5px] sm:text-[9.5px] font-bold px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Private
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <span>Code:</span>
              <button
                onClick={copyRoomCode}
                className="font-mono font-black text-amber-400 hover:underline flex items-center gap-0.5"
                title="Click to copy code"
              >
                <span>{gameState.roomId}</span>
                <Copy className="w-2.5 h-2.5 text-slate-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Action Controls & Invite Link */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            onClick={copyInviteLink}
            className="py-1 px-2 sm:px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[10px] sm:text-xs border border-slate-700 shadow flex items-center gap-1 transition active:scale-95"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-amber-400" />}
            <span className="hidden sm:inline">{copied ? 'Copied!' : 'Invite Link'}</span>
          </button>

          {/* Settings & Card Customizer Button */}
          <button
            onClick={onOpenSettings}
            className="w-7 h-7 sm:w-8 sm:h-8 aspect-square flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer p-0 shrink-0"
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
              className="w-7 h-7 sm:w-8 sm:h-8 aspect-square flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer p-0 shrink-0"
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
            className="relative w-7 h-7 sm:w-8 sm:h-8 aspect-square flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer p-0 shrink-0"
            title="Room Chat"
          >
            <img
              src="/home screen in game icons/chats.png"
              alt="Chat"
              className="w-full h-full object-contain aspect-square select-none pointer-events-none drop-shadow"
            />
            {unreadChatCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center">
                {unreadChatCount}
              </span>
            )}
          </button>

          {/* Refresh / Sync Lobby Button */}
          {onRefresh && (
            <button
              onClick={() => {
                soundManager.play('turn_alert');
                onRefresh();
                onToast('Nire-refresh ang Lobby state...');
              }}
              className="w-7 h-7 sm:w-8 sm:h-8 aspect-square flex items-center justify-center hover:scale-110 active:scale-95 transition-transform cursor-pointer p-0 shrink-0"
              title="I-refresh ang Lobby (Sync State)"
            >
              <img
                src="/home screen in game icons/refresh.png"
                alt="Refresh Lobby"
                className="w-full h-full object-contain aspect-square select-none pointer-events-none drop-shadow"
              />
            </button>
          )}

          {/* Leave / Back Button */}
          <button
            onClick={onLeaveRoom}
            className="w-7 h-7 sm:w-8 sm:h-8 aspect-square flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer p-0 shrink-0"
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

      {/* Prize Pool & Entry Fee Interactive Banner + Start/Ready Actions */}
      {isFeeRoom ? (
        <div className="w-full max-w-5xl mx-auto mt-2 sm:mt-3 bg-gradient-to-r from-amber-950/70 via-slate-900/90 to-amber-950/70 backdrop-blur-md p-2.5 sm:p-3 rounded-2xl border-2 border-amber-500/50 shadow-xl flex flex-col md:flex-row items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 flex items-center justify-center text-xl shadow-md shrink-0">
              🪙
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-300">
                  5-Place Prize Pool
                </span>
                <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                  <Unlock className="w-2 h-2 text-emerald-400" />
                  Host Adjustable
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-lg sm:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-400">
                  ₱{poolAmount.toLocaleString()} Pool
                </span>
                <span className="text-[11px] text-slate-400 font-semibold">
                  (₱{feeAmount} Fee)
                </span>
                <span className="text-[11px] text-amber-300 font-bold ml-1 hidden sm:inline">
                  • Bayad: {gameState.players.filter((p) => p.hasPaidEntry).length}/{gameState.players.length}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons: 4 Magkakatabing Buttons na Pare-pareho ang Style */}
          <div className="flex items-center gap-1.5 sm:gap-2 w-full md:w-auto justify-end flex-wrap sm:flex-nowrap">
            {/* 1. Breakdown Button */}
            <button
              type="button"
              onClick={() => setShowPrizeModal(true)}
              className="py-2 px-3 sm:px-3.5 rounded-xl bg-gradient-to-b from-[#FFF275] via-[#FFC000] to-[#E68A00] hover:from-[#FFF59D] hover:to-[#FFA000] text-slate-950 font-black text-xs shadow-[0_3px_10px_rgba(245,158,11,0.5),inset_0_1px_2px_rgba(255,255,255,0.8)] border border-white/80 flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer shrink-0"
              title="View Prize Breakdown"
            >
              <HelpCircle className="w-3.5 h-3.5 text-slate-950" />
              <span>Breakdown</span>
            </button>

            {/* 2. Match Settings Button */}
            <button
              type="button"
              onClick={() => setShowMatchSettingsModal(true)}
              className="py-2 px-3 sm:px-3.5 rounded-xl bg-gradient-to-b from-[#FFF275] via-[#FFC000] to-[#E68A00] hover:from-[#FFF59D] hover:to-[#FFA000] text-slate-950 font-black text-xs shadow-[0_3px_10px_rgba(245,158,11,0.5),inset_0_1px_2px_rgba(255,255,255,0.8)] border border-white/80 flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer shrink-0"
              title="Tingnan o Baguhin ang Match Settings"
            >
              <Shield className="w-3.5 h-3.5 text-slate-950" />
              <span>Match Settings</span>
              {isHost && (
                <span className="text-[8.5px] bg-slate-950 text-amber-300 font-black px-1 rounded">
                  Edit
                </span>
              )}
            </button>

            {/* 3. Pay Entry Fee Button / Paid Indicator */}
            {currentPaid ? (
              <div className="py-2 px-3 sm:px-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-black text-xs flex items-center gap-1 shadow shrink-0">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Bayad na</span>
              </div>
            ) : (
              <button
                onClick={() => setShowPaymentModal(true)}
                className="py-2 px-3 sm:px-3.5 rounded-xl bg-gradient-to-b from-[#FFF275] via-[#FFC000] to-[#E68A00] hover:from-[#FFF59D] hover:to-[#FFA000] text-slate-950 font-black text-xs shadow-[0_3px_10px_rgba(245,158,11,0.5),inset_0_1px_2px_rgba(255,255,255,0.8)] border border-white/80 flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer animate-pulse shrink-0"
              >
                <Coins className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
                <span>Pay Entry (₱{feeAmount})</span>
              </button>
            )}

            {/* Non-host Ready Toggle */}
            {!isHost && (
              <button
                onClick={() => onSetReady(!isReady)}
                className={`py-2 px-3 sm:px-3.5 rounded-xl font-black text-xs shadow active:scale-95 transition-all shrink-0 ${
                  isReady
                    ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                    : 'bg-gradient-to-b from-emerald-400 to-emerald-600 text-slate-950 border border-white/80'
                }`}
              >
                {isReady ? 'Cancel Ready' : 'READY'}
              </button>
            )}

            {/* 4. Start Game Button (Host Only: laging nakikita katabi ng mga buttons, disabled kapag may unpaid/not ready, mae-enable kapag complete na) */}
            {isHost && (
              <button
                disabled={!canStart}
                onClick={onStartGame}
                className={`py-2 px-3.5 sm:px-4 rounded-xl font-black text-xs border flex items-center justify-center gap-1.5 transition-all shrink-0 ${
                  canStart
                    ? 'bg-gradient-to-b from-[#FFF275] via-[#FFC000] to-[#E68A00] hover:from-[#FFF59D] hover:to-[#FFA000] text-slate-950 shadow-[0_3px_10px_rgba(245,158,11,0.6),inset_0_1px_2px_rgba(255,255,255,0.8)] border-white/80 active:scale-95 cursor-pointer animate-pulse'
                    : 'bg-gradient-to-b from-slate-700/60 to-slate-800/80 text-slate-400 border-slate-700/60 opacity-60 cursor-not-allowed shadow-none'
                }`}
                title={canStart ? 'Simulan ang laro' : 'Hindi pa pwedeng pindutin hangga\'t hindi pa bayad at ready ang lahat'}
              >
                <Play className={`w-3.5 h-3.5 ${canStart ? 'fill-slate-950 text-slate-950' : 'fill-slate-400 text-slate-400'}`} />
                <span>START GAME</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Non-fee Room Banner / Start Action */
        <div className="w-full max-w-5xl mx-auto mt-2 sm:mt-3 bg-slate-900/90 backdrop-blur-md p-2.5 sm:p-3 rounded-2xl border border-slate-800 shadow-xl flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-amber-300">🎮 Casual Friendly Match (Walang Entry Fee)</span>
          </div>
          <div className="flex items-center gap-2">
            {!isHost ? (
              <button
                onClick={() => onSetReady(!isReady)}
                className={`py-2 px-4 rounded-xl font-black text-xs shadow transition-all active:scale-95 ${
                  isReady ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-emerald-500 text-slate-950'
                }`}
              >
                {isReady ? 'Cancel Ready' : 'READY TO PLAY'}
              </button>
            ) : isHost && (
              <button
                disabled={!canStart}
                onClick={onStartGame}
                className={`py-2 px-4 sm:px-5 rounded-xl font-black text-xs sm:text-sm shadow-lg flex items-center justify-center gap-1.5 transition-all ${
                  canStart
                    ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 active:scale-95 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 opacity-60 cursor-not-allowed'
                }`}
              >
                <Play className="w-4 h-4 fill-current" />
                <span>START GAME</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Center Area: Players in Lobby (Full Width Balanced Grid) */}
      <div className="w-full max-w-5xl mx-auto my-3 sm:my-4 flex-1 flex flex-col">
        <div className="flex-1 flex flex-col space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2 shrink-0">
            <div className="flex items-center gap-3">
              <h3 className="text-xs sm:text-sm font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <span>Players in Lobby</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-800 text-amber-400 border border-slate-700">
                  {gameState.players.length}/{maxPlayersAllowed}
                </span>
              </h3>
            </div>

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

          {/* Auto-adjusting balanced grid */}
          <div className="w-full pb-2">
            <div
              className={`grid gap-2 sm:gap-2.5 transition-all ${
                totalSlots <= 2
                  ? 'grid-cols-2 max-w-md mx-auto'
                  : totalSlots <= 3
                  ? 'grid-cols-3 max-w-xl mx-auto'
                  : totalSlots <= 4
                  ? 'grid-cols-2 sm:grid-cols-4 max-w-3xl mx-auto'
                  : totalSlots <= 6
                  ? 'grid-cols-3 max-w-4xl mx-auto'
                  : totalSlots <= 8
                  ? 'grid-cols-4 max-w-5xl mx-auto'
                  : 'grid-cols-5'
              }`}
            >
              {gameState.players.map((player) => {
                const isSelf = player.id === currentUserId;
                const isPaid = !isFeeRoom || player.hasPaidEntry;
                const isReadyStatus = player.isHost || player.isReady;
                const isFullyReadyAndPaid = isReadyStatus && isPaid;

                return (
                  <div
                    key={player.id}
                    className={`relative p-2 rounded-2xl border flex flex-col items-center justify-between text-center transition-all min-h-[115px] sm:min-h-[125px] ${
                      isSelf
                        ? 'bg-amber-500/15 border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                        : 'bg-slate-900/85 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Top-Right: X mark to remove/kick if Host and not host self */}
                    {isHost && !player.isHost && (
                      <button
                        onClick={() => onRemovePlayer(player.id)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center text-[10px] font-black shadow-md border border-white/80 transition active:scale-90 cursor-pointer z-20"
                        title={`Alisin si ${player.name} sa lobby`}
                        aria-label="Remove player"
                      >
                        ✕
                      </button>
                    )}

                    {/* Top-Left: Host Crown or Bot Badge */}
                    <div className="absolute -top-1.5 -left-1.5 z-10 flex items-center gap-0.5">
                      {player.isHost && (
                        <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[10px] shadow border border-white font-black" title="Host">
                          👑
                        </span>
                      )}
                      {player.isBot && !player.isHost && (
                        <span className="text-[8px] font-black px-1.5 py-0.2 rounded-full bg-purple-600 text-white border border-purple-400 shadow">
                          BOT
                        </span>
                      )}
                    </div>

                    {/* Avatar with Status Border & Check Mark */}
                    <div className="relative my-0.5 sm:my-1">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl overflow-hidden bg-gradient-to-tr from-slate-800 to-slate-700 flex items-center justify-center text-xl sm:text-2xl shadow border-2 transition-all ${
                        isFullyReadyAndPaid
                          ? 'border-emerald-400 ring-2 ring-emerald-400/30'
                          : isPaid
                          ? 'border-cyan-400/70'
                          : 'border-slate-700'
                      }`}>
                        {player.avatar && player.avatar.startsWith('data:image') ? (
                          <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
                        ) : (
                          <span>{player.avatar}</span>
                        )}
                      </div>

                      {/* Status Badge: Check if ready and bayad na */}
                      {isFullyReadyAndPaid ? (
                        <span
                          className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-[10px] sm:text-xs font-black shadow border border-white"
                          title="Ready at Bayad na!"
                        >
                          ✓
                        </span>
                      ) : (
                        <span
                          className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[9px] sm:text-[10px] font-black shadow border border-white animate-pulse"
                          title={!isPaid ? 'Di pa bayad' : 'Waiting'}
                        >
                          ⏳
                        </span>
                      )}
                    </div>

                    {/* Player Name */}
                    <div className="w-full min-w-0 mt-0.5">
                      <div className="font-bold text-[10px] sm:text-xs text-white truncate max-w-full">
                        {player.name}
                      </div>
                      {isSelf && (
                        <div className="text-[8.5px] text-amber-300 font-extrabold -mt-0.5">
                          (Ikaw)
                        </div>
                      )}
                    </div>

                    {/* Status Pill below name: Check if ready and bayad */}
                    <div className="mt-1">
                      {isFullyReadyAndPaid ? (
                        <span className="text-[8.5px] sm:text-[9.5px] font-black text-emerald-400 bg-emerald-500/20 px-1.5 py-0.2 rounded border border-emerald-500/40 inline-flex items-center gap-0.5">
                          <span>✓</span>
                          <span>{isFeeRoom ? 'Bayad' : 'Ready'}</span>
                        </span>
                      ) : !isPaid ? (
                        <span className="text-[8.5px] sm:text-[9.5px] font-black text-rose-300 bg-rose-500/20 px-1.5 py-0.2 rounded border border-rose-500/40 inline-flex items-center gap-0.5 animate-pulse">
                          <span>⏳</span>
                          <span>Di Bayad</span>
                        </span>
                      ) : (
                        <span className="text-[8.5px] sm:text-[9.5px] font-bold text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded border border-slate-700">
                          Waiting
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Empty slots up to 10 if fewer players */}
              {Array.from({ length: Math.max(0, totalSlots - gameState.players.length) }).map((_, idx) => {
                const slotNum = gameState.players.length + idx + 1;
                return (
                  <div
                    key={`empty-slot-${idx}`}
                    className="p-2 rounded-2xl border border-dashed border-slate-800/80 bg-slate-950/30 flex flex-col items-center justify-center text-center text-slate-600 min-h-[115px] sm:min-h-[125px]"
                  >
                    <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl border border-dashed border-slate-800 flex items-center justify-center text-slate-700 font-mono text-xs">
                      #{slotNum}
                    </div>
                    <span className="text-[9px] text-slate-600 mt-1 font-semibold">Bakante</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Compact Bottom Footer: Room Status and Quick Actions */}
      <div className="w-full max-w-5xl mx-auto flex items-center justify-between gap-3 pt-2 pb-1 border-t border-slate-800/80 shrink-0 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-slate-400">
            Players: <strong className="text-white">{gameState.players.length}/{maxPlayersAllowed}</strong>
          </span>
          {isFeeRoom && (
            <span className="text-[11px] text-amber-300 font-semibold">
              • Bayad: {gameState.players.filter((p) => p.hasPaidEntry).length}/{gameState.players.length}
            </span>
          )}
        </div>

        <div className="text-right">
          {!isHost && (
            <span className="text-[11px] font-semibold text-amber-300 animate-pulse">
              {canStart ? 'Handa na ang lahat! Sisimulan na ng Host...' : 'Naghihintay ng mga manlalaro...'}
            </span>
          )}
          {isHost && !canStart && (
            <span className="text-[11px] text-amber-400 font-medium">
              {gameState.players.length < 2
                ? 'Kailangan ng kahit 2 manlalaro bago magsimula'
                : gameState.players.some((p) => !p.hasPaidEntry)
                ? 'Hintayin makapagbayad ang lahat ng manlalaro'
                : 'Naghihintay maging ready ang iba'}
            </span>
          )}
        </div>
      </div>

      {/* Prize Breakdown Modal - Full Screen 2-column layout (Left and Right) */}
      {showPrizeModal && (
        <div
          onClick={() => setShowPrizeModal(false)}
          className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full h-full sm:h-auto sm:max-h-[92vh] max-w-4xl bg-slate-900 border-2 border-amber-500/50 rounded-2xl sm:rounded-3xl p-3 sm:p-6 shadow-2xl flex flex-col justify-between overflow-hidden"
          >
            {/* Top Bar with Title, Total Pool, and prominent X button */}
            <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-2xl sm:text-3xl">🏆</span>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-amber-300 tracking-wide">
                    5-Place Prize Pool Distribution
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-400">
                    Total Pool: <span className="text-amber-400 font-bold font-mono">₱{poolAmount.toLocaleString()}</span> (₱{feeAmount} × 5)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPrizeModal(false)}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center border border-slate-700 cursor-pointer active:scale-95 transition shadow"
                title="Isara (Close)"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Main Content: Split into 2 sides (Left & Right) */}
            <div className="grid grid-cols-2 gap-2 sm:gap-4 my-2 sm:my-3 flex-1 overflow-y-auto pr-1">
              {/* Left Side: 1st, 2nd, 3rd Place (Podium) */}
              <div className="flex flex-col gap-1.5 sm:gap-2">
                <div className="text-[10px] sm:text-xs font-black text-amber-400/90 uppercase tracking-wider px-1">
                  🥇 Podium Winners (1st - 3rd)
                </div>
                {prizeBreakdown.slice(0, 3).map((tier) => (
                  <div
                    key={tier.place}
                    className="flex items-center justify-between p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-amber-500/40 transition shadow-sm"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <span className="text-lg sm:text-2xl shrink-0">{tier.medal}</span>
                      <div className="min-w-0">
                        <div className="font-bold text-xs sm:text-sm text-white truncate">{tier.place}</div>
                        <div className="text-[10px] sm:text-xs text-slate-400">{tier.percent} of Total Pool</div>
                      </div>
                    </div>
                    <span className="font-black text-amber-300 text-xs sm:text-base font-mono shrink-0 pl-1">
                      +₱{tier.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              {/* Right Side: 4th, 5th Place + Info Box */}
              <div className="flex flex-col gap-1.5 sm:gap-2">
                <div className="text-[10px] sm:text-xs font-black text-purple-400/90 uppercase tracking-wider px-1">
                  🎖️ Consolation Rewards (4th - 5th)
                </div>
                {prizeBreakdown.slice(3).map((tier) => (
                  <div
                    key={tier.place}
                    className="flex items-center justify-between p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-purple-500/40 transition shadow-sm"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <span className="text-lg sm:text-2xl shrink-0">{tier.medal}</span>
                      <div className="min-w-0">
                        <div className="font-bold text-xs sm:text-sm text-white truncate">{tier.place}</div>
                        <div className="text-[10px] sm:text-xs text-slate-400">{tier.percent} of Total Pool</div>
                      </div>
                    </div>
                    <span className="font-black text-amber-300 text-xs sm:text-base font-mono shrink-0 pl-1">
                      +₱{tier.amount.toLocaleString()}
                    </span>
                  </div>
                ))}

                {/* Pool Distribution Guarantee Card */}
                <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-500/10 via-purple-500/10 to-slate-950 border border-amber-500/30 flex items-center gap-2 mt-auto">
                  <span className="text-base sm:text-lg shrink-0">✨</span>
                  <p className="text-[10px] sm:text-xs text-slate-300 leading-tight">
                    100% ng pool ay ipapamahagi sa 5 finishers ayon sa kanilang pagkakasunod-sunod. Walang maiiwan.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Entry Payment Confirmation Modal */}
      {showPaymentModal && (
        <div
          onClick={() => setShowPaymentModal(false)}
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm max-h-[92vh] flex flex-col bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-5 sm:p-6 shadow-2xl animate-scaleIn my-auto"
          >
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

      {/* SEPARATE MATCH SETTINGS MODAL - Identical to Create Room Setup Screen */}
      {showMatchSettingsModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center select-none overflow-hidden p-1 sm:p-3 bg-slate-950 text-white animate-fadeIn"
          style={{ willChange: 'opacity, transform' }}
        >
          {/* Background Image: modal background.jpg */}
          <img
            src="/play online modal and buttons/modal background.jpg"
            alt="Background"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none"
            draggable={false}
          />
          {/* Subtle overlay */}
          <div className="absolute inset-0 bg-[#06041c]/40 pointer-events-none" />

          {/* Main Container - 100% fits on screen */}
          <div className="relative z-10 w-full max-w-5xl h-full max-h-[98vh] flex flex-col justify-between overflow-hidden py-1 px-1 sm:px-2">
            
            {/* Top Header Controls: Title, House Rules, Public/Private, Close Button */}
            <div className="flex items-center justify-between shrink-0 px-1 py-0.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-amber-300/90 drop-shadow">
                  UNO ONLINE LOBBY
                </span>
                {isHost ? (
                  <span className="text-[9px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/40">
                    Host Controls
                  </span>
                ) : (
                  <span className="text-[9px] font-bold bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">
                    View Only
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* House Rules Button */}
                <button
                  type="button"
                  onClick={() => setShowHouseRules(true)}
                  className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl bg-purple-900/60 hover:bg-purple-800/80 border border-purple-400/50 text-[9px] sm:text-xs font-black text-purple-200 transition active:scale-95 cursor-pointer shadow flex items-center gap-1"
                >
                  <span>⚙️</span>
                  <span>House Rules</span>
                </button>
                <div
                  className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl border text-[9px] sm:text-xs font-black shadow ${
                    gameState.isPrivate
                      ? 'bg-purple-600/60 text-purple-200 border-purple-400'
                      : 'bg-emerald-600/60 text-emerald-200 border-emerald-400'
                  }`}
                >
                  {gameState.isPrivate ? '🔒 Private' : '🌐 Public'}
                </div>
                <button
                  onClick={() => setShowMatchSettingsModal(false)}
                  className="p-1 sm:p-1.5 rounded-full bg-slate-900/80 hover:bg-red-600 text-white border border-slate-700 hover:border-red-500 transition cursor-pointer shadow-lg"
                  title="Close"
                >
                  <X className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>

            {/* Center Content: Two Columns separated by Gold Divider */}
            <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-1 md:gap-3 items-center px-1 sm:px-3 overflow-hidden pb-1">
              {/* ================= LEFT SIDE: GAME SELECT (3x2 Grid) ================= */}
              <div className="md:col-span-5 flex flex-col justify-center items-center md:items-start h-full">
                <h2 className="text-[10px] sm:text-xs md:text-sm font-black uppercase tracking-wider text-white mb-0.5 sm:mb-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] flex items-center gap-1">
                  <span>GAME SELECT</span>
                </h2>

                {/* 3x2 Grid of Uno Cards */}
                <div className="grid grid-cols-3 gap-1 sm:gap-1.5 w-full max-w-[210px] sm:max-w-[260px] md:max-w-[290px]">
                  {LOBBY_VARIANTS.map((v) => {
                    const isSelected = (gameState.variant || 'classic') === v.id;
                    const isComingSoon = v.comingSoon;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        disabled={isComingSoon || !isHost}
                        onClick={() => {
                          if (!isComingSoon && isHost && onUpdateRules) {
                            onUpdateRules({}, v.id as GameVariant);
                            onToast(`Game variant pinalitan sa ${v.name}`);
                          }
                        }}
                        className={`relative rounded-lg transition-all duration-200 focus:outline-none flex flex-col items-center ${
                          isComingSoon || !isHost
                            ? 'opacity-40 cursor-not-allowed'
                            : 'cursor-pointer hover:scale-105 active:scale-95'
                        } ${
                          isSelected && !isComingSoon
                            ? 'scale-105 z-20'
                            : 'hover:brightness-110 z-10'
                        }`}
                      >
                        {/* Rotating light beam wrapper for selected card */}
                        {isSelected && !isComingSoon && (
                          <div className="absolute -inset-[2px] rounded-lg overflow-hidden pointer-events-none z-0">
                            <div
                              className="w-[200%] h-[200%] -top-1/2 -left-1/2 absolute anim-rotating-light"
                              style={{
                                background:
                                  'conic-gradient(from 0deg, transparent 0deg, #facc15 60deg, #ffffff 120deg, #38bdf8 180deg, transparent 240deg, #facc15 360deg)',
                              }}
                            />
                          </div>
                        )}

                        {/* Card container with white border */}
                        <div
                          className={`relative w-full aspect-[2/3] max-h-[72px] sm:max-h-[96px] md:max-h-[115px] rounded-lg overflow-hidden transition-all duration-200 z-10 ${
                            isSelected && !isComingSoon
                              ? 'shadow-[0_0_16px_rgba(250,204,21,0.95)] border-2 border-white'
                              : 'shadow-md border border-white/80 hover:border-amber-300'
                          }`}
                        >
                          <img
                            src={v.image}
                            alt={v.name}
                            className="w-full h-full object-contain select-none pointer-events-none"
                            draggable={false}
                          />
                          {isComingSoon && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[1px]">
                              <img
                                src="/uno cards buttons/COMING SOON.png"
                                alt="Coming Soon"
                                className="w-[85%] h-auto drop-shadow-lg"
                                draggable={false}
                              />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ================= VERTICAL GOLD DIVIDER ================= */}
              <div className="hidden md:flex md:col-span-1 justify-center h-full items-center">
                <div className="w-[2px] h-[75%] bg-gradient-to-b from-amber-400/20 via-amber-400 to-amber-400/20 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
              </div>

              {/* ================= RIGHT SIDE: ENTRY FEE, TIMER, CARDS, TABLE ================= */}
              <div className="md:col-span-6 flex flex-col justify-center gap-1 sm:gap-2">
                
                {/* 1. ENTRY FEE SECTION */}
                <div className="flex flex-col gap-0.5 sm:gap-1">
                  <div className="flex items-center gap-1.5">
                    <img
                      src="/play online modal and buttons/icon_coins.png"
                      alt="Entry Fee"
                      className="w-5 h-5 sm:w-7 sm:h-7 object-contain drop-shadow"
                    />
                    <span className="text-xs sm:text-sm font-black uppercase text-white tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                      ENTRY FEE
                    </span>
                    {(gameState.entryFee ?? 0) === 0 && (
                      <span className="ml-auto text-[9px] font-black px-1.5 py-0.2 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-400/50">
                        Free Match
                      </span>
                    )}
                  </div>

                  {/* 3D Glossy Gold Buttons for Entry Fee: 0, 100, 200, 300, 400, 500 */}
                  <div className="grid grid-cols-6 gap-1 sm:gap-1.5">
                    {([0, 100, 200, 300, 400, 500] as EntryFeeAmount[]).map((fee) => {
                      const isSelected = (gameState.entryFee ?? 0) === fee;
                      return (
                        <button
                          key={fee}
                          type="button"
                          disabled={!isHost}
                          onClick={() => {
                            if (isHost && onUpdateEntryFee) {
                              onUpdateEntryFee(fee);
                              onToast(`Entry fee pinalitan sa ${fee === 0 ? 'Free' : `₱${fee}`}`);
                            }
                          }}
                          className={`relative py-1 sm:py-1.5 px-0.5 rounded-lg font-black text-[10px] sm:text-xs tracking-wide transition-all duration-150 text-center select-none ${
                            !isHost ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                          } ${
                            isSelected
                              ? 'bg-gradient-to-b from-[#FFF275] via-[#FFC000] to-[#E68A00] text-slate-950 shadow-[0_3px_10px_rgba(245,158,11,0.8),inset_0_1.5px_2px_rgba(255,255,255,0.9)] border border-white scale-105 z-10'
                              : 'bg-gradient-to-b from-[#D49300] via-[#A86F00] to-[#784E00] text-amber-100/90 shadow-[0_1.5px_4px_rgba(0,0,0,0.5),inset_0_1px_1.5px_rgba(255,255,255,0.3)] border border-amber-600/70 hover:brightness-125'
                          }`}
                        >
                          <span className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]">
                            {fee === 0 ? 'Free' : fee}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. TIMER SECTION */}
                <div className="flex flex-col gap-0.5 sm:gap-1">
                  <div className="flex items-center gap-1.5">
                    <img
                      src="/play online modal and buttons/icon_timer.png"
                      alt="Timer"
                      className="w-5 h-5 sm:w-7 sm:h-7 object-contain drop-shadow"
                    />
                    <span className="text-xs sm:text-sm font-black uppercase text-white tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                      TIMER
                    </span>
                  </div>

                  {/* 3D Glossy Gold Buttons for Timer: OFF, 15s, 30s, 60s */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {([0, 15, 30, 60] as const).map((t) => {
                      const isSelected = (gameState.houseRules?.turnTimer ?? 0) === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          disabled={!isHost}
                          onClick={() => {
                            if (isHost && onUpdateRules) {
                              onUpdateRules({ turnTimer: t });
                              onToast(`Turn timer: ${t === 0 ? 'Off' : `${t}s`}`);
                            }
                          }}
                          className={`relative py-1 sm:py-1.5 px-1.5 rounded-lg font-black text-[10px] sm:text-xs tracking-wide transition-all duration-150 text-center select-none ${
                            !isHost ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                          } ${
                            isSelected
                              ? 'bg-gradient-to-b from-[#FFF275] via-[#FFC000] to-[#E68A00] text-slate-950 shadow-[0_3px_10px_rgba(245,158,11,0.8),inset_0_1.5px_2px_rgba(255,255,255,0.9)] border border-white scale-105 z-10'
                              : 'bg-gradient-to-b from-[#D49300] via-[#A86F00] to-[#784E00] text-amber-100/90 shadow-[0_1.5px_4px_rgba(0,0,0,0.5),inset_0_1px_1.5px_rgba(255,255,255,0.3)] border border-amber-600/70 hover:brightness-125'
                          }`}
                        >
                          <span className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]">
                            {t === 0 ? 'OFF' : `${t}s`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. CARDS SECTION */}
                <div className="flex flex-col gap-0.5 sm:gap-1">
                  <div className="flex items-center gap-1.5">
                    <img
                      src="/play online modal and buttons/icon_cards.png"
                      alt="Cards"
                      className="w-5 h-5 sm:w-7 sm:h-7 object-contain drop-shadow"
                    />
                    <span className="text-xs sm:text-sm font-black uppercase text-white tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                      CARDS
                    </span>
                  </div>

                  {/* Gold Progress/Slider Track */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 h-4 sm:h-5 bg-slate-950/80 rounded-full p-0.5 border border-amber-400/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] flex items-center">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.8)] transition-all duration-150"
                        style={{ width: `${(((gameState.houseRules?.startingHandSize ?? 7) - 3) / 7) * 100}%` }}
                      />
                      <input
                        type="range"
                        min="3"
                        max="10"
                        disabled={!isHost}
                        value={gameState.houseRules?.startingHandSize ?? 7}
                        onChange={(e) => {
                          if (isHost && onUpdateRules) {
                            const val = parseInt(e.target.value, 10);
                            onUpdateRules({ startingHandSize: val });
                          }
                        }}
                        className={`absolute inset-0 w-full opacity-0 z-10 ${isHost ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                      />
                    </div>

                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-b from-[#1b1040] to-[#0d0728] border border-amber-400 flex items-center justify-center font-black text-xs sm:text-sm text-white shadow-[0_0_8px_rgba(251,191,36,0.6)] shrink-0">
                      {gameState.houseRules?.startingHandSize ?? 7}
                    </div>
                  </div>
                </div>

                {/* 4. GAME TABLE SECTION */}
                <div className="flex flex-col gap-0.5 sm:gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-black uppercase text-white tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] flex items-center gap-1">
                      <span>🎲</span> GAME TABLE
                    </span>
                    <span className="text-[10px] sm:text-xs font-black text-amber-300 capitalize">
                      {(gameState.houseRules?.gameTable || 'game table 1.jpg').replace('.jpg', '')}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin">
                    {Array.from({ length: 13 }, (_, i) => `game table ${i + 1}.jpg`).map((tableFile, idx) => {
                      const isSelected = (gameState.houseRules?.gameTable || 'game table 1.jpg') === tableFile;
                      return (
                        <button
                          key={tableFile}
                          type="button"
                          disabled={!isHost}
                          onClick={() => {
                            if (isHost && onUpdateRules) {
                              onUpdateRules({ gameTable: tableFile });
                              onToast(`Table theme pinalitan sa Table #${idx + 1}`);
                            }
                          }}
                          className={`relative group shrink-0 w-11 sm:w-14 aspect-[16/10] rounded-md overflow-hidden border transition-all select-none ${
                            !isHost ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                          } ${
                            isSelected
                              ? 'border-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.9)] scale-105 z-10 ring-1 ring-white'
                              : 'border-slate-700/80 hover:border-slate-400 opacity-70 hover:opacity-100'
                          }`}
                          title={`Table ${idx + 1}`}
                        >
                          <img
                            src={`/game table/${tableFile}`}
                            alt={`Table ${idx + 1}`}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover select-none pointer-events-none"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-center pb-0.5">
                            <span className={`text-[7px] font-black ${isSelected ? 'text-amber-300' : 'text-slate-300'}`}>
                              #{idx + 1}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>

            {/* House Rules Sub-modal */}
            {showHouseRules && (
              <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fadeIn p-3">
                <div className="w-full max-w-sm bg-gradient-to-b from-[#1a0f44] to-[#0c0529] rounded-3xl border-2 border-amber-400/60 shadow-[0_0_30px_rgba(0,0,0,0.9)] overflow-hidden">
                  <div className="flex items-center justify-between p-3.5 border-b border-purple-500/30">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">House Rules</h3>
                    <button
                      onClick={() => setShowHouseRules(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-3.5 space-y-2">
                    <button
                      type="button"
                      disabled={!isHost}
                      onClick={() => {
                        if (isHost && onUpdateRules) {
                          onUpdateRules({ stacking: !gameState.houseRules.stacking });
                          onToast(`Stacking ${!gameState.houseRules.stacking ? 'Enabled' : 'Disabled'}`);
                        }
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition cursor-pointer ${
                        gameState.houseRules.stacking ? 'bg-amber-500/20 border-amber-400/80 text-white' : 'bg-slate-950/60 border-slate-800 text-slate-400'
                      }`}
                    >
                      <span className="text-xs font-black">Stacking (+2/+4)</span>
                      {gameState.houseRules.stacking && <Check className="w-4 h-4 text-amber-400" />}
                    </button>

                    <button
                      type="button"
                      disabled={!isHost}
                      onClick={() => {
                        if (isHost && onUpdateRules) {
                          onUpdateRules({ sevenZero: !gameState.houseRules.sevenZero });
                          onToast(`7-0 rule ${!gameState.houseRules.sevenZero ? 'Enabled' : 'Disabled'}`);
                        }
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition cursor-pointer ${
                        gameState.houseRules.sevenZero ? 'bg-amber-500/20 border-amber-400/80 text-white' : 'bg-slate-950/60 border-slate-800 text-slate-400'
                      }`}
                    >
                      <span className="text-xs font-black">7-0 Swap Hands</span>
                      {gameState.houseRules.sevenZero && <Check className="w-4 h-4 text-amber-400" />}
                    </button>

                    <button
                      type="button"
                      disabled={!isHost}
                      onClick={() => {
                        if (isHost && onUpdateRules) {
                          onUpdateRules({ wildDraw4Challenge: !gameState.houseRules.wildDraw4Challenge });
                          onToast(`WD4 challenge ${!gameState.houseRules.wildDraw4Challenge ? 'Enabled' : 'Disabled'}`);
                        }
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition cursor-pointer ${
                        gameState.houseRules.wildDraw4Challenge ? 'bg-amber-500/20 border-amber-400/80 text-white' : 'bg-slate-950/60 border-slate-800 text-slate-400'
                      }`}
                    >
                      <span className="text-xs font-black">WD4 Challenge</span>
                      {gameState.houseRules.wildDraw4Challenge && <Check className="w-4 h-4 text-amber-400" />}
                    </button>
                  </div>

                  <div className="p-3 border-t border-purple-500/30 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowHouseRules(false)}
                      className="px-5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-black text-xs shadow hover:scale-105 active:scale-95 transition cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

