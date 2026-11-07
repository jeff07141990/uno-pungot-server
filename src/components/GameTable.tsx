import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  LogOut,
  MessageSquare,
  Smile,
  Volume2,
  VolumeX,
  RotateCw,
  RotateCcw,
  AlertTriangle,
  Flame,
  CheckCircle,
  HelpCircle,
  Settings,
  Mic,
  MicOff,
  ShoppingBag,
  Eye,
} from 'lucide-react';
import {
  Card,
  CardColor,
  ChatMessage,
  PublicGameState,
  PublicPlayer,
  SoundEffectType,
} from '../engine/types';
import { CardView } from './CardView';
import { RealisticDeckShuffle } from './RealisticDeckShuffle';
import { ThickStackedDeck } from './ThickStackedDeck';
import { isCardPlayable } from '../engine/rules';
import { soundManager } from '../audio/soundManager';
import { voiceManager } from '../services/voiceManager';
import { networkManager } from '../services/networkManager';
import { PowerUpDock } from './PowerUpDock';
import { PlayerWallet, PowerUpId, PowerUpItem } from '../engine/types';

interface GameTableProps {
  gameState: PublicGameState;
  yourHand: Card[];
  currentUserId: string;
  isMuted: boolean;
  onToggleMute: () => void;
  onPlayCard: (cardId: string, chosenColor?: CardColor, targetPlayerId?: string) => void;
  onDrawCard: (targetCardIndex?: number) => void;
  onPassTurn: () => void;
  onCallUno: () => void;
  onCatchUno: (targetPlayerId: string) => void;
  onOpenSettings?: () => void;
  onOpenChat: () => void;
  onToggleEmojiBar: () => void;
  onLeaveMatch: () => void;
  onDeclareDeadlock?: () => void;
  unreadChatCount: number;
  wallet?: PlayerWallet | null;
  catalog?: Record<PowerUpId, PowerUpItem> | null;
  onUsePowerUp?: (powerUpId: PowerUpId, targetPlayerId?: string, chosenColor?: CardColor) => void;
  onOpenShop?: () => void;
  isVsIntroActive?: boolean;
  messages?: ChatMessage[];
  onReconnect?: () => void;
}

const UnoCallout: React.FC<{ isSelf?: boolean }> = ({ isSelf = false }) => {
  return (
    <div
      className={`absolute z-50 pointer-events-none animate-unoCallout flex flex-col items-center select-none ${
        isSelf ? '-top-14 left-1/2 -translate-x-1/2' : '-top-14 left-1/2 -translate-x-1/2'
      }`}
    >
      <div className="relative flex flex-col items-center">
        {/* Comic Shout Badge */}
        <div className="px-3 sm:px-3.5 py-1 bg-gradient-to-r from-red-600 via-amber-500 to-yellow-400 text-slate-950 font-black text-xs sm:text-sm rounded-2xl shadow-[0_0_25px_rgba(239,68,68,0.95)] border-2 border-white flex items-center gap-1 uppercase tracking-wider whitespace-nowrap">
          <span className="text-sm">🔥</span>
          <span className="font-black drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">UNO!</span>
          <span className="text-sm">💥</span>
        </div>
        {/* Tail */}
        <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-amber-500 drop-shadow-sm -mt-0.5"></div>
      </div>
    </div>
  );
};

/** Renders an emoji string OR a base64 profile photo depending on the avatar value (Square rounded style) */
const AvatarDisplay: React.FC<{ avatar: string; className?: string }> = ({ avatar, className = '' }) => {
  if (avatar && avatar.startsWith('data:image')) {
    return (
      <img
        src={avatar}
        alt="avatar"
        className={`w-full h-full object-cover select-none pointer-events-none ${className}`}
      />
    );
  }
  return <span>{avatar}</span>;
};

/** Semi-transparent chat bubble with pop-out animation anchored above avatar */
const AvatarChatBubble: React.FC<{ text: string; isSelf?: boolean }> = ({ text, isSelf = false }) => {
  return (
    <div
      className={`absolute z-50 pointer-events-none select-none animate-avatarChatPop flex flex-col items-center ${
        isSelf ? '-top-11 left-1/2 -translate-x-1/2' : '-top-10 left-1/2 -translate-x-1/2'
      }`}
      style={{ willChange: 'transform, opacity' }}
    >
      <div className="relative flex flex-col items-center max-w-[140px] sm:max-w-[170px]">
        {/* Semi-transparent message bubble */}
        <div className="px-2.5 py-1 bg-slate-950/80 backdrop-blur-md text-amber-200 border border-amber-400/80 rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.6)] text-[11px] sm:text-xs font-bold leading-tight break-words text-center tracking-wide">
          {text}
        </div>
        {/* Speech tail pointing down */}
        <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-amber-400/80 drop-shadow-sm -mt-[1px]"></div>
      </div>
    </div>
  );
};

/** Real flaming video turn timer ring from public/turn timer ring/ */
/** Real flaming video turn timer ring from public/turn timer ring/ with black background removed via Canvas chroma key */
const AvatarTurnTimerRing: React.FC<{ progressFraction: number; totalDuration?: number }> = ({
  progressFraction,
  totalDuration = 30,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Pick the matching video file: 15s, 30s, or 60s
  const videoSrc = useMemo(() => {
    if (totalDuration <= 15) return '/turn timer ring/15 seconds.mp4';
    if (totalDuration >= 60) return '/turn timer ring/60 seconds.mp4';
    return '/turn timer ring/30 seconds.mp4';
  }, [totalDuration]);

  // Keep video playback smoothly synchronized with actual game time
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const nominalDuration = totalDuration || 30;
    const targetTime = Math.max(0, Math.min(nominalDuration, (1 - progressFraction) * nominalDuration));

    if (Math.abs(video.currentTime - targetTime) > 0.4) {
      video.currentTime = targetTime;
    }

    if (video.paused && progressFraction > 0.01) {
      video.play().catch(() => {});
    }
  }, [progressFraction, totalDuration]);

  // Continuously remove black background pixel-by-pixel onto canvas
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let isSubscribed = true;

    const render = () => {
      if (!isSubscribed) return;

      if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        // The new video is a square 1:1 format with a crisp outer square frame
        // crop to the outer perimeter of the square ring
        const vw = video.videoWidth;
        const vh = video.videoHeight;

        // The ring starts near 8% margin and extends to 92%
        const cropX = vw * 0.08;
        const cropY = vh * 0.08;
        const cropW = vw * 0.84;
        const cropH = vh * 0.84;

        if (canvas.width !== 300 || canvas.height !== 300) {
          canvas.width = 300;
          canvas.height = 300;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);

        try {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;
          const len = data.length;

          // Pure black background extraction
          for (let i = 0; i < len; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const maxVal = Math.max(r, g, b);
            if (maxVal < 25) {
              data[i + 3] = 0; // completely transparent background
            } else if (maxVal < 55) {
              data[i + 3] = Math.round(((maxVal - 25) / 30) * data[i + 3]);
            }
          }
          ctx.putImageData(imgData, 0, 0);
        } catch {
          // Fallback if cross-origin or canvas read error
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      isSubscribed = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [videoSrc]);

  return (
    <div className="absolute inset-0 pointer-events-none z-30 select-none overflow-hidden rounded-xl flex items-center justify-center">
      {/* Hidden source video */}
      <video
        ref={videoRef}
        src={videoSrc}
        muted
        playsInline
        autoPlay
        loop={false}
        className="hidden"
      />
      {/* Canvas rendering new turn timer ring fitted exactly on avatar square */}
      <canvas
        ref={canvasRef}
        className="w-full h-full object-fill pointer-events-none"
        style={{
          filter: 'drop-shadow(0 0 6px rgba(250, 204, 21, 0.95)) contrast(1.15) brightness(1.1)',
        }}
      />
    </div>
  );
};

export const GameTable: React.FC<GameTableProps> = ({
  gameState,
  yourHand,
  currentUserId,
  isMuted,
  onToggleMute,
  onPlayCard,
  onDrawCard,
  onPassTurn,
  onCallUno,
  onCatchUno,
  onOpenSettings,
  onOpenChat,
  onToggleEmojiBar,
  onLeaveMatch,
  onDeclareDeadlock,
  unreadChatCount,
  wallet,
  catalog,
  onUsePowerUp,
  onOpenShop,
  isVsIntroActive = false,
  messages = [],
  onReconnect,
}) => {
  const isSpectator = !gameState.players.some((p) => p.id === currentUserId);
  // Active chat bubbles anchored directly over each player's avatar (4 seconds duration)
  const [activeAvatarBubbles, setActiveAvatarBubbles] = useState<Map<string, { id: string; text: string }>>(new Map());
  const lastProcessedChatIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!messages || messages.length === 0) return;
    const latest = messages[messages.length - 1];
    if (latest && latest.id !== lastProcessedChatIdRef.current) {
      lastProcessedChatIdRef.current = latest.id;
      // Match senderId or fallback to senderName matching player
      const senderKey = latest.senderId || latest.senderName;
      setActiveAvatarBubbles((prev) => {
        const next = new Map(prev);
        next.set(senderKey, { id: latest.id, text: latest.text });
        return next;
      });

      const timer = setTimeout(() => {
        setActiveAvatarBubbles((prev) => {
          const current = prev.get(senderKey);
          if (current?.id === latest.id) {
            const next = new Map(prev);
            next.delete(senderKey);
            return next;
          }
          return prev;
        });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [messages]);

  const [selectedWildCard, setSelectedWildCard] = useState<Card | null>(null);
  const [selectedSevenCard, setSelectedSevenCard] = useState<Card | null>(null);
  const [selectedTargetCard, setSelectedTargetCard] = useState<Card | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [showTopBarMenu, setShowTopBarMenu] = useState(false);

  // Active UNO shout callouts over avatars
  const [activeUnoShouts, setActiveUnoShouts] = useState<{ id: string; playerId: string }[]>([]);
  // Tracking player ID being hit with penalty hammer for visual feedback
  const [smackingPlayerId, setSmackingPlayerId] = useState<string | null>(null);

  // Open Mic Voice Chat State
  const [isVoiceMuted, setIsVoiceMuted] = useState<boolean>(() => voiceManager.getIsMuted());
  const [isVoiceConnected, setIsVoiceConnected] = useState<boolean>(() => voiceManager.getIsInitialized());
  const [speakingPlayerIds, setSpeakingPlayerIds] = useState<Set<string>>(new Set());

  // Initialize Voice Chat in Room
  useEffect(() => {
    const isOnlineRoom = gameState.roomId && gameState.roomId !== 'bots';
    if (isOnlineRoom) {
      voiceManager.init(gameState.roomId, currentUserId);
    }

    const unsubscribe = voiceManager.subscribe((speaking, muted, connected) => {
      setSpeakingPlayerIds(speaking);
      setIsVoiceMuted(muted);
      setIsVoiceConnected(connected);
    });

    return () => {
      unsubscribe();
    };
  }, [gameState.roomId, currentUserId]);

  // Sync human players for WebRTC mesh connections
  useEffect(() => {
    const isOnlineRoom = gameState.roomId && gameState.roomId !== 'bots';
    if (isOnlineRoom && isVoiceConnected) {
      const humanPlayerIds = gameState.players
        .filter((p) => !p.isBot)
        .map((p) => p.id);
      voiceManager.syncPlayers(humanPlayerIds);
    }
  }, [gameState.players, gameState.roomId, isVoiceConnected]);

  const handleToggleMic = async () => {
    if (!isVoiceConnected) {
      const success = await voiceManager.init(gameState.roomId, currentUserId);
      if (success) {
        voiceManager.setMuted(false);
      }
    } else {
      voiceManager.toggleMute();
    }
  };

  // Power card announcement banner state (visual effects only, no voice)
  const [powerAnnouncement, setPowerAnnouncement] = useState<{
    id: string;
    playerName: string;
    title: string;
    subtitle: string;
    icon: string;
    bgColor: string;
  } | null>(null);

  const triggerPowerAnnouncement = (card: Card, playerName: string) => {
    let title = '';
    let subtitle = '';
    let icon = '⚡';
    let bgColor = 'from-amber-600 via-yellow-500 to-amber-700';

    switch (card.type) {
      case 'skip':
        title = '⚡ SKIP!';
        subtitle = `${playerName} skipped the next player!`;
        icon = '⊘';
        bgColor = 'from-red-600 via-rose-500 to-red-800';
        break;
      case 'reverse':
        title = '🔄 REVERSE!';
        subtitle = `${playerName} reversed turn direction!`;
        icon = '🔄';
        bgColor = 'from-blue-600 via-cyan-500 to-indigo-800';
        break;
      case 'draw2':
        title = '💥 +2 DRAW TWO!';
        subtitle = `${playerName} forced +2 penalty cards!`;
        icon = '💥';
        bgColor = 'from-orange-600 via-amber-500 to-red-700';
        break;
      case 'wild4':
        title = '🌈 +4 WILD DRAW FOUR!';
        subtitle = `${playerName} unleashed +4 cards!`;
        icon = '🌈';
        bgColor = 'from-purple-600 via-pink-600 to-amber-500';
        break;
      case 'wild':
        title = '🎨 WILD CARD!';
        subtitle = `${playerName} changed the color!`;
        icon = '🎨';
        bgColor = 'from-emerald-600 via-teal-500 to-indigo-700';
        break;
      case 'flip':
        title = '🌙 FLIP!';
        subtitle = `${playerName} flipped the entire deck!`;
        icon = '🌙';
        bgColor = 'from-fuchsia-600 via-purple-600 to-violet-900';
        break;
      case 'draw1':
        title = '⚡ +1 DRAW ONE!';
        subtitle = `${playerName} forced +1 card!`;
        icon = '⚡';
        bgColor = 'from-amber-500 via-yellow-400 to-orange-600';
        break;
      case 'draw5':
        title = '💣 +5 MEGA DRAW FIVE!';
        subtitle = `${playerName} dropped Draw 5!`;
        icon = '💣';
        bgColor = 'from-rose-700 via-red-600 to-purple-900';
        break;
      case 'skip_all':
        title = '🛑 SKIP ALL!';
        subtitle = `${playerName} skipped everyone & plays again!`;
        icon = '🛑';
        bgColor = 'from-red-700 via-orange-600 to-rose-900';
        break;
      case 'wild_draw_color':
        title = '🎯 WILD DRAW COLOR!';
        subtitle = `${playerName} forced drawing until match!`;
        icon = '🎯';
        bgColor = 'from-teal-600 via-emerald-500 to-cyan-800';
        break;
      case 'skip2':
        title = '⏩ SKIP TWO!';
        subtitle = `${playerName} skipped 2 players!`;
        icon = '⏩';
        bgColor = 'from-purple-600 via-pink-600 to-indigo-800';
        break;
      case 'targeted_draw2':
        title = '🎯 TARGETED +2!';
        subtitle = `${playerName} targeted a player for +2!`;
        icon = '🎯';
        bgColor = 'from-amber-600 via-red-500 to-rose-800';
        break;
      case 'forced_swap':
      case 'power_swap':
        title = '🔀 FORCED SWAP!';
        subtitle = `${playerName} swapped cards with opponent!`;
        icon = '🔀';
        bgColor = 'from-cyan-600 via-blue-600 to-indigo-900';
        break;
      case 'dare':
      case 'wild_dare':
        title = '🎭 UNO DARE!';
        subtitle = `${playerName} issued a Dare Challenge!`;
        icon = '🎭';
        bgColor = 'from-purple-600 via-indigo-600 to-slate-900';
        break;
      case 'number':
        if (houseRules.sevenZero && card.value === 7) {
          title = '🔀 SEVEN RULE (SWAP)!';
          subtitle = `${playerName} swapped entire hand!`;
          icon = '🔀';
          bgColor = 'from-cyan-600 via-blue-600 to-indigo-900';
          break;
        }
        return;
      default:
        return;
    }

    const annId = `power_${Date.now()}`;
    setPowerAnnouncement({
      id: annId,
      playerName,
      title,
      subtitle,
      icon,
      bgColor,
    });

    // Play corresponding power card sound effect
    switch (card.type) {
      case 'skip':
      case 'skip_all':
        soundManager.play('power_skip');
        break;
      case 'skip2':
        soundManager.play('power_skip2');
        break;
      case 'reverse':
        soundManager.play('power_reverse');
        break;
      case 'targeted_draw2':
        soundManager.play('power_targeted_draw2');
        break;
      case 'draw2':
        if (gameState.pendingDrawPenalty > 0) {
          const p = gameState.pendingDrawPenalty;
          if (p === 6) soundManager.play('power_draw6');
          else if (p === 8) soundManager.play('power_draw8');
          else if (p === 10) soundManager.play('power_draw10');
          else if (p === 12) soundManager.play('power_draw12');
          else if (p === 14) soundManager.play('power_draw14');
          else if (p === 16) soundManager.play('power_draw16');
          else if (p === 18) soundManager.play('power_draw18');
          else if (p === 20) soundManager.play('power_draw20');
          else if (p === 22) soundManager.play('power_draw22');
          else if (p >= 24) soundManager.play('power_draw24');
          else if (p === 4) soundManager.play('power_wild4');
          else soundManager.play('power_draw2');
        } else {
          soundManager.play('power_draw2');
        }
        break;
      case 'wild4':
        // Shout Draw 4 (or stacked draw count) first! The chosen color will be shouted right after with delay so they never overlap.
        if (gameState.pendingDrawPenalty > 0) {
          const p = gameState.pendingDrawPenalty;
          if (p === 6) soundManager.play('power_draw6');
          else if (p === 8) soundManager.play('power_draw8');
          else if (p === 10) soundManager.play('power_draw10');
          else if (p === 12) soundManager.play('power_draw12');
          else if (p === 14) soundManager.play('power_draw14');
          else if (p === 16) soundManager.play('power_draw16');
          else if (p === 18) soundManager.play('power_draw18');
          else if (p === 20) soundManager.play('power_draw20');
          else if (p === 22) soundManager.play('power_draw22');
          else if (p >= 24) soundManager.play('power_draw24');
          else soundManager.play('power_wild4');
        } else {
          soundManager.play('power_wild4');
        }
        break;
      case 'draw5':
      case 'wild_draw_color':
        soundManager.play('power_wild4');
        break;
      case 'wild':
        if (gameState.variant === 'all_wild') {
          soundManager.play('power_general');
        } else {
          // Play wild color sound effect first, then chosen color follows smoothly
          soundManager.play('power_wild');
        }
        break;
      case 'flip':
        soundManager.play('power_flip');
        break;
      case 'forced_swap':
      case 'power_swap':
        soundManager.play('power_swap');
        break;
      case 'number':
        if (houseRules.sevenZero && card.value === 7) {
          soundManager.play('power_swap');
        }
        break;
      default:
        soundManager.play('power_general');
        break;
    }

    setTimeout(() => {
      setPowerAnnouncement((prev) => (prev?.id === annId ? null : prev));
    }, 2200);
  };

  const handleHitHammer = (targetPlayerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setSmackingPlayerId(targetPlayerId);
    soundManager.play('uno_penalty');
    onCatchUno(targetPlayerId);
    setTimeout(() => {
      setSmackingPlayerId(null);
    }, 600);
  };

  const triggerUnoCallout = (playerId: string) => {
    const shoutId = `${playerId}_${Date.now()}`;
    setActiveUnoShouts((prev) => [
      ...prev.filter((s) => s.playerId !== playerId),
      { id: shoutId, playerId },
    ]);

    setTimeout(() => {
      setActiveUnoShouts((prev) => prev.filter((s) => s.id !== shoutId));
    }, 2600);
  };

  // Start of match deck shuffle, hands dealing simulation & deal animation
  const [startIntroPhase, setStartIntroPhase] = useState<'idle' | 'shuffling' | 'moving_to_side' | 'dealing_hands' | 'dealing' | 'done'>('idle');
  const [dealtCount, setDealtCount] = useState<number>(0);
  const sideDrawSlotRef = useRef<HTMLDivElement | null>(null);
  const centerArenaRef = useRef<HTMLDivElement | null>(null);
  const [dockDelta, setDockDelta] = useState<{ x: number; y: number }>({ x: -180, y: -110 });

  const calculateDockDelta = () => {
    if (sideDrawSlotRef.current && centerArenaRef.current) {
      const sideRect = sideDrawSlotRef.current.getBoundingClientRect();
      const centerRect = centerArenaRef.current.getBoundingClientRect();
      const dx = sideRect.left - centerRect.left;
      const dy = sideRect.top - centerRect.top;
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        setDockDelta({ x: dx, y: dy });
      }
    }
  };

  // Card fly to table animation state & refs
  const discardPileRef = useRef<HTMLDivElement | null>(null);
  const [isDiscardLanding, setIsDiscardLanding] = useState(false);
  const [flyingCard, setFlyingCard] = useState<{
    card: Card;
    startX: number;
    startY: number;
    deltaX: number;
    deltaY: number;
    rotation: number;
    active: boolean;
  } | null>(null);

  // Flying card from hand to table (card play)
  const recentlyPlayedCardsRef = useRef<Set<string>>(new Set());
  const prevDiscardIdRef = useRef<string | null>(gameState.topDiscard?.id || null);
  const prevTurnPlayerIdRef = useRef<string | null>(
    gameState.players[gameState.activePlayerIndex]?.id || null
  );

  // Flying cards from Draw Deck to players (card draw)
  interface FlyingDrawCard {
    id: string;
    startX: number;
    startY: number;
    deltaX: number;
    deltaY: number;
    rotation: number;
    targetScale: number;
    active: boolean;
    arrived: boolean;
  }
  const [flyingDrawCards, setFlyingDrawCards] = useState<FlyingDrawCard[]>([]);
  const recentLocalDrawTimeRef = useRef<number>(0);
  const prevCardCountsRef = useRef<Map<string, number>>(new Map());

  const triggerDrawCardSlide = (
    targetPlayerId: string,
    delayMs: number = 0,
    sourcePlayerId?: string,
    sourceCardIndex?: number
  ) => {
    setTimeout(() => {
      soundManager.play('card_draw');

      const cardW = 64;
      const cardH = 96;

      let startX = window.innerWidth * 0.22;
      let startY = window.innerHeight * 0.28;

      if (sourcePlayerId) {
        // Specific card chosen from opponent, or general opponent avatar box
        const specificCardEl =
          typeof sourceCardIndex === 'number'
            ? document.getElementById(`opp-card-${sourcePlayerId}-${sourceCardIndex}`)
            : null;
        const sourceEl = specificCardEl || document.getElementById(`opponent-${sourcePlayerId}`);
        if (sourceEl) {
          const sRect = sourceEl.getBoundingClientRect();
          startX = sRect.left + (sRect.width - cardW) / 2;
          startY = sRect.top + (sRect.height - cardH) / 2;
        }
      } else {
        const deckEl = sideDrawSlotRef.current;
        if (deckEl) {
          const dRect = deckEl.getBoundingClientRect();
          startX = dRect.left + (dRect.width - cardW) / 2;
          startY = dRect.top + (dRect.height - cardH) / 2;
        }
      }

      let targetX = window.innerWidth / 2 - cardW / 2;
      let targetY = window.innerHeight - 130;

      const targetEl =
        targetPlayerId === currentUserId
          ? document.getElementById('player-hand-container')
          : document.getElementById(`opponent-${targetPlayerId}`);

      if (targetEl) {
        const tRect = targetEl.getBoundingClientRect();
        targetX = tRect.left + (tRect.width - cardW) / 2;
        targetY = tRect.top + (tRect.height - cardH) / 2;
      }

      const deltaX = targetX - startX;
      const deltaY = targetY - startY;

      // Realistic travel angle towards player + slight random wobble
      const travelAngle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
      const rotation = travelAngle * 0.35 + (Math.random() - 0.5) * 12;

      const cardAnimId = `draw_${Date.now()}_${Math.random()}`;

      setFlyingDrawCards((prev) => [
        ...prev,
        {
          id: cardAnimId,
          startX,
          startY,
          deltaX,
          deltaY,
          rotation,
          targetScale: targetPlayerId === currentUserId ? 1.05 : 0.72,
          active: false,
          arrived: false,
        },
      ]);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setFlyingDrawCards((prev) =>
            prev.map((c) => (c.id === cardAnimId ? { ...c, active: true } : c))
          );
        });
      });

      setTimeout(() => {
        setFlyingDrawCards((prev) =>
          prev.map((c) => (c.id === cardAnimId ? { ...c, arrived: true } : c))
        );
        setTimeout(() => {
          setFlyingDrawCards((prev) => prev.filter((c) => c.id !== cardAnimId));
        }, 200);
      }, 420);
    }, delayMs);
  };

  const {
    players,
    activePlayerIndex,
    direction,
    topDiscard,
    currentColor,
    drawPileCount,
    pendingDrawPenalty,
    unoCallWindow,
    turnDeadline,
    houseRules,
    lastActionText,
  } = gameState;

  const isDarkSide = gameState.variant === 'flip' && gameState.activeFlipSide === 'dark';
  const activePlayer = players[activePlayerIndex];
  const isYourTurn = activePlayer?.id === currentUserId;

  // Detect whenever any player (human, bot, or remote) shouts UNO
  const prevCalledUnoMapRef = useRef<Map<string, boolean>>(new Map());
  useEffect(() => {
    players.forEach((p) => {
      const wasCalled = prevCalledUnoMapRef.current.get(p.id) || false;
      if (p.calledUno && !wasCalled) {
        triggerUnoCallout(p.id);
        soundManager.play('uno_call');
      }
      prevCalledUnoMapRef.current.set(p.id, p.calledUno);
    });
  }, [players]);

  // Real-time network sync for UNO shouts from any player across devices
  useEffect(() => {
    networkManager.setCallbacks({
      onUnoShout: (shoutingPlayerId) => {
        triggerUnoCallout(shoutingPlayerId);
        soundManager.play('uno_call');
      },
    });
  }, []);

  // Turn timer countdown, progress fraction (for circular border animation), and audio tick
  const [turnProgressFraction, setTurnProgressFraction] = useState<number>(1);
  useEffect(() => {
    if (!turnDeadline) {
      setSecondsRemaining(null);
      setTurnProgressFraction(1);
      return;
    }

    const totalDurationMs = (houseRules.turnTimer || 30) * 1000;

    const interval = setInterval(() => {
      const msRemaining = Math.max(0, turnDeadline - Date.now());
      const remainingSec = Math.max(0, Math.ceil(msRemaining / 1000));
      setSecondsRemaining(remainingSec);

      const fraction = totalDurationMs > 0 ? Math.max(0, Math.min(1, msRemaining / totalDurationMs)) : 0;
      setTurnProgressFraction(fraction);

      if (remainingSec <= 5 && remainingSec > 0 && isYourTurn && msRemaining % 1000 < 200) {
        soundManager.play('timer_tick');
      }
    }, 200);

    return () => clearInterval(interval);
  }, [turnDeadline, houseRules.turnTimer, isYourTurn]);

  // Recalculate docking offsets on resize
  useEffect(() => {
    window.addEventListener('resize', calculateDockDelta);
    return () => window.removeEventListener('resize', calculateDockDelta);
  }, []);

  // Persistent refs for intro timeouts and match tracking
  const introTimersRef = useRef<NodeJS.Timeout[]>([]);
  const hasAnimatedMatchRef = useRef<string | null>(null);

  // Choreographed match start:
  // 1. Shuffling in the center
  // 2. Deck physically slides to the side draw pile position
  // 3. System deals the first card from side deck into the center
  // 4. Center remains exclusively for played/discard cards
  useEffect(() => {
    // If not actively playing, cancel any pending timers and reset
    if (gameState.phase !== 'playing') {
      introTimersRef.current.forEach(clearTimeout);
      introTimersRef.current = [];
      hasAnimatedMatchRef.current = null;
      setStartIntroPhase('idle');
      return;
    }

    // Wait for VS Intro Screen animation to finish first!
    if (isVsIntroActive) {
      return;
    }

    // Safety check: If user is a spectator OR match is already beyond turn 1 (or joined in progress),
    // ensure table is immediately set to 'done' so spectator instantly sees the live ongoing match like live TV!
    if (isSpectator || gameState.turnCount > 1) {
      if (startIntroPhase !== 'done') {
        introTimersRef.current.forEach(clearTimeout);
        introTimersRef.current = [];
        setStartIntroPhase('done');
      }
      return;
    }

    // Match start trigger (turnCount === 1)
    const matchId = `${gameState.startedAt || 'match'}_${gameState.phase}`;
    if (hasAnimatedMatchRef.current === matchId) {
      return; // Already started sequence for this match
    }
    hasAnimatedMatchRef.current = matchId;

    // Clear any previous pending timers before scheduling
    introTimersRef.current.forEach(clearTimeout);
    introTimersRef.current = [];

    // Phase 1: Shuffling in the center
    setStartIntroPhase('shuffling');
    setDealtCount(0);
    soundManager.play('shuffle');

    setTimeout(() => {
      calculateDockDelta();
    }, 60);

    // Phase 2: Deck physically glides from center to side Draw Pile position
    const moveTimer = setTimeout(() => {
      calculateDockDelta();
      setStartIntroPhase('moving_to_side');
      soundManager.play('card_deal');
    }, 1550);

    // Phase 3: Dealing hands to all players (Round-robin card dealing simulation from deck)
    const dealingHandsTimer = setTimeout(() => {
      setStartIntroPhase('dealing_hands');

      const allPlayers = gameState.players;
      const initialCardsCount = gameState.houseRules.startingHandSize || 7;
      let currentDealStep = 0;
      const totalDeals = initialCardsCount * allPlayers.length;

      // Stagger dealing cards one by one to each player
      const dealInterval = setInterval(() => {
        if (currentDealStep >= totalDeals) {
          clearInterval(dealInterval);
          return;
        }

        const round = Math.floor(currentDealStep / allPlayers.length) + 1;
        const targetPlayer = allPlayers[currentDealStep % allPlayers.length];

        triggerDrawCardSlide(targetPlayer.id, 0);
        soundManager.play('card_deal', currentDealStep);
        setDealtCount(round);

        currentDealStep++;
      }, 120);

      introTimersRef.current.push(dealInterval as unknown as NodeJS.Timeout);
    }, 2250);

    // Initial total dealing animation duration based on card count & players
    const dealTotalDurationMs = (gameState.players.length * (gameState.houseRules.startingHandSize || 7) * 120) + 700;

    // Phase 4: Deck is at Draw Pile; deals first card into center discard pile
    const dealFirstCardTimer = setTimeout(() => {
      setStartIntroPhase('dealing');
      soundManager.play('card_deal');
    }, 2250 + dealTotalDurationMs);

    // Phase 5: First card lands in center; live gameplay starts!
    const doneTimer = setTimeout(() => {
      setStartIntroPhase('done');
      setIsDiscardLanding(true);
      setTimeout(() => setIsDiscardLanding(false), 450);
    }, 2250 + dealTotalDurationMs + 700);

    introTimersRef.current = [moveTimer, dealingHandsTimer, dealFirstCardTimer, doneTimer];
  }, [gameState.phase, gameState.turnCount, gameState.startedAt, isVsIntroActive]);

  // Find index of current user in players list
  const myIndex = players.findIndex((p) => p.id === currentUserId);
  const effectiveMyIndex = myIndex >= 0 ? myIndex : 0;
  const selfPlayer = players[effectiveMyIndex] || {
    id: currentUserId,
    name: 'You',
    avatar: '🤖',
    cardCount: yourHand.length,
    calledUno: false,
    score: 0,
  };

  // Map opponents into relative positions:
  // If spectator, show ALL players in the game seated around the poker table!
  const otherPlayers: PublicPlayer[] = isSpectator
    ? [...players]
    : [];
  if (!isSpectator) {
    for (let i = 1; i < players.length; i++) {
      const idx = (effectiveMyIndex + i) % players.length;
      otherPlayers.push(players[idx]);
    }
  }

  // Active opponents who have not finished yet
  const activeOpponents = otherPlayers.filter((p) => !p.isFinished && p.cardCount > 0);

  // Distribute opponents evenly around the 3 sides of the poker table:
  // - Left side (1 or 2 players vertically)
  // - Top edge (1 to 5 players spaced out)
  // - Right side (1 or 2 players vertically)
  interface PositionedOpponent {
    player: PublicPlayer;
    position: 'left' | 'top' | 'right';
  }

  const positionedOpponents: PositionedOpponent[] = [];

  if (otherPlayers.length === 1) {
    positionedOpponents.push({ player: otherPlayers[0], position: 'top' });
  } else if (otherPlayers.length === 2) {
    positionedOpponents.push({ player: otherPlayers[0], position: 'left' });
    positionedOpponents.push({ player: otherPlayers[1], position: 'right' });
  } else if (otherPlayers.length === 3) {
    positionedOpponents.push({ player: otherPlayers[0], position: 'left' });
    positionedOpponents.push({ player: otherPlayers[1], position: 'top' });
    positionedOpponents.push({ player: otherPlayers[2], position: 'right' });
  } else {
    // 4+ opponents: distribute into left, top, and right sections
    // Left: 1 or 2 players
    // Right: 1 or 2 players
    // Top: remaining (max 3-5 players)
    const numLeft = otherPlayers.length >= 6 ? 2 : 1;
    const numRight = otherPlayers.length >= 7 ? 2 : 1;
    const numTop = otherPlayers.length - numLeft - numRight;

    let pIdx = 0;
    for (let i = 0; i < numLeft; i++) {
      positionedOpponents.push({ player: otherPlayers[pIdx++], position: 'left' });
    }
    for (let i = 0; i < numTop; i++) {
      positionedOpponents.push({ player: otherPlayers[pIdx++], position: 'top' });
    }
    for (let i = 0; i < numRight; i++) {
      positionedOpponents.push({ player: otherPlayers[pIdx++], position: 'right' });
    }
  }

  const leftOpponentsList = positionedOpponents.filter((p) => p.position === 'left').map((p) => p.player);
  const topOpponentsList = positionedOpponents.filter((p) => p.position === 'top').map((p) => p.player);
  const rightOpponentsList = positionedOpponents.filter((p) => p.position === 'right').map((p) => p.player);

  // Opponents who hold exactly 1 card and have NOT shouted UNO yet (vulnerable to penalty!)
  const uncaughtOpponents = activeOpponents.filter(
    (p) => !p.isFinished && p.cardCount === 1 && !p.calledUno
  );

  // Next active player in turn order relative to current user (for drawing when deck is 0)
  const getNextActiveOpponent = (): PublicPlayer | null => {
    if (players.length <= 1) return null;
    let idx = (effectiveMyIndex + (gameState.direction || 1) + players.length) % players.length;
    let loops = 0;
    while (loops < players.length) {
      const candidate = players[idx];
      if (candidate && candidate.id !== currentUserId && !candidate.isFinished && candidate.cardCount > 0) {
        return candidate;
      }
      idx = (idx + (gameState.direction || 1) + players.length) % players.length;
      loops++;
    }
    return null;
  };

  const nextActiveOpponent = getNextActiveOpponent();
  const canStealFromNext = isYourTurn && drawPileCount === 0 && !gameState.pendingKeepOrPlay && startIntroPhase === 'done';

  // Animation trigger: flies card from startRect to center discard pile
  const triggerFlyToTable = (
    card: Card,
    startRect?: DOMRect | { left: number; top: number; width: number; height: number }
  ) => {
    const discardEl = discardPileRef.current;
    const targetRect = discardEl
      ? discardEl.getBoundingClientRect()
      : { left: window.innerWidth / 2 - 40, top: window.innerHeight / 2 - 50 };

    const startX = startRect ? startRect.left : window.innerWidth / 2 - 40;
    const startY = startRect ? startRect.top : window.innerHeight - 150;

    const deltaX = targetRect.left - startX;
    const deltaY = targetRect.top - startY;
    const rotation = (Math.random() - 0.5) * 22;

    setFlyingCard({
      card,
      startX,
      startY,
      deltaX,
      deltaY,
      rotation,
      active: false,
    });

    // Animate transition on next tick
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setFlyingCard((prev) => (prev ? { ...prev, active: true } : null));
      });
    });

    // When card lands on the table
    setTimeout(() => {
      setIsDiscardLanding(true);
      // Play crisp landing sound for card placement; power announcements handle special audio once
      soundManager.play('card_play');
      setTimeout(() => setIsDiscardLanding(false), 300);
      setFlyingCard(null);
    }, 360);
  };

  // Track previous color to trigger color voice ONLY in Classic variant when a color is chosen
  const prevColorRef = useRef<CardColor>(currentColor);
  useEffect(() => {
    if (prevColorRef.current !== currentColor) {
      const isClassic = !gameState.variant || gameState.variant === 'classic';
      if (
        isClassic &&
        (currentColor === 'red' || currentColor === 'blue' || currentColor === 'yellow' || currentColor === 'green')
      ) {
        // If a draw card (wild4, draw2) or wild card is played, wait 900ms so the initial shout finishes first before color voice
        const isDrawOrWild = topDiscard?.type === 'wild4' || topDiscard?.type === 'draw2' || topDiscard?.type === 'wild_draw_color' || topDiscard?.type === 'wild';
        const delay = isDrawOrWild ? 900 : 350;
        const colorToPlay = currentColor;
        const timer = setTimeout(() => {
          soundManager.playColorVoice(colorToPlay);
        }, delay);
        prevColorRef.current = currentColor;
        return () => clearTimeout(timer);
      }
      prevColorRef.current = currentColor;
    }
  }, [currentColor, gameState.variant, topDiscard?.type]);

  // Animate opponent card plays to table and trigger power card pop-up (keyed strictly on new discard card ID)
  useEffect(() => {
    if (topDiscard && topDiscard.id !== prevDiscardIdRef.current) {
      const lastPlayerId = prevTurnPlayerIdRef.current;
      const lastPlayer = lastPlayerId ? players.find((p) => p.id === lastPlayerId) : null;
      const actorName = lastPlayer ? (lastPlayer.id === currentUserId ? 'You' : lastPlayer.name) : 'Player';

      prevDiscardIdRef.current = topDiscard.id;

      // Visual Pop-up announcement banner with glowing effects
      triggerPowerAnnouncement(topDiscard, actorName);

      const isLocalPlay = recentlyPlayedCardsRef.current.has(topDiscard.id);
      if (!isLocalPlay) {
        const opponentEl = lastPlayerId ? document.getElementById(`opponent-${lastPlayerId}`) : null;
        const startRect = opponentEl?.getBoundingClientRect();
        triggerFlyToTable(topDiscard, startRect);
      } else {
        recentlyPlayedCardsRef.current.delete(topDiscard.id);
      }
    }
    prevTurnPlayerIdRef.current = activePlayer?.id || null;
  }, [topDiscard]);

  // Watch for Catch UNO announcements to display penalty hammer on the penalized player
  const prevLastActionRef = useRef<string | null>(null);
  useEffect(() => {
    if (gameState.lastActionText && gameState.lastActionText !== prevLastActionRef.current) {
      prevLastActionRef.current = gameState.lastActionText;
      if (gameState.lastActionText.includes('NAHULI') || gameState.lastActionText.includes('HULI')) {
        // Find which player's name is mentioned after NAHULI/HULI
        const target = players.find(p => gameState.lastActionText?.includes(p.name));
        if (target) {
          setSmackingPlayerId(target.id);
          soundManager.play('uno_penalty');
          setTimeout(() => setSmackingPlayerId(null), 800);
        }
      }
    }
  }, [gameState.lastActionText, players]);

  // Animate card slide when any player draws (opponents, bots, or penalties)
  useEffect(() => {
    if (startIntroPhase !== 'done') {
      // Keep tracking in sync during match start so initial dealt hands don't fly
      players.forEach((p) => {
        prevCardCountsRef.current.set(p.id, p.cardCount);
      });
      return;
    }

    players.forEach((p) => {
      const prevCount = prevCardCountsRef.current.get(p.id);
      if (prevCount !== undefined && p.cardCount > prevCount) {
        const diff = p.cardCount - prevCount;
        // If the local player just drew manually, don't trigger a duplicate animation
        const isRecentLocalManualDraw =
          p.id === currentUserId && Date.now() - recentLocalDrawTimeRef.current < 1500;

        if (!isRecentLocalManualDraw) {
          // If draw deck is empty, find which player lost cards to slide from them
          let sourceOppId: string | undefined = undefined;
          if (drawPileCount === 0) {
            const victim = players.find((other) => {
              const oldC = prevCardCountsRef.current.get(other.id);
              return oldC !== undefined && other.cardCount < oldC;
            });
            if (victim) sourceOppId = victim.id;
          }

          const cardsToAnimate = Math.min(diff, 4);
          for (let i = 0; i < cardsToAnimate; i++) {
            triggerDrawCardSlide(p.id, i * 150, sourceOppId);
          }
        }
      }
      prevCardCountsRef.current.set(p.id, p.cardCount);
    });
  }, [players, startIntroPhase, currentUserId]);

  const handleCardClick = (card: Card) => {
    if (isVsIntroActive || startIntroPhase !== 'done') return;
    if (!isYourTurn) {
      soundManager.play('error');
      return;
    }

    const playable = isCardPlayable(
      card,
      topDiscard,
      currentColor,
      pendingDrawPenalty,
      houseRules.stacking,
      gameState.variant
    );

    if (!playable) {
      soundManager.play('error');
      return;
    }

    // In Uno All Wild or Power-Ups: targeted_draw2, forced_swap, power_swap, power_peek require picking an opponent
    if (
      card.type === 'targeted_draw2' ||
      card.type === 'forced_swap' ||
      card.type === 'power_swap' ||
      card.type === 'power_peek'
    ) {
      if (activeOpponents.length === 1) {
        recentlyPlayedCardsRef.current.add(card.id);
        const cardEl = document.getElementById(`player-card-${card.id}`);
        triggerFlyToTable(card, cardEl?.getBoundingClientRect());
        onPlayCard(card.id, undefined, activeOpponents[0].id);
      } else {
        setSelectedTargetCard(card);
      }
      return;
    }

    // If Wild, Wild Draw 4, Wild Draw Color, Wild Dare, or Power Color, trigger color choice
    if (
      card.type === 'power_color' ||
      (gameState.variant !== 'all_wild' &&
        (card.color === 'wild' ||
          card.type === 'wild' ||
          card.type === 'wild4' ||
          card.type === 'wild_draw_color' ||
          card.type === 'wild_dare'))
    ) {
      setSelectedWildCard(card);
      return;
    }

    // If Seven and Seven-Zero rule enabled
    if (houseRules.sevenZero && card.type === 'number' && card.value === 7) {
      if (activeOpponents.length === 1) {
        recentlyPlayedCardsRef.current.add(card.id);
        const cardEl = document.getElementById(`player-card-${card.id}`);
        triggerFlyToTable(card, cardEl?.getBoundingClientRect());
        onPlayCard(card.id, undefined, activeOpponents[0].id);
      } else {
        setSelectedSevenCard(card);
      }
      return;
    }

    // Normal play
    recentlyPlayedCardsRef.current.add(card.id);
    const cardEl = document.getElementById(`player-card-${card.id}`);
    triggerFlyToTable(card, cardEl?.getBoundingClientRect());
    onPlayCard(card.id);
  };

  const handleSelectColor = (color: CardColor) => {
    if (selectedWildCard) {
      recentlyPlayedCardsRef.current.add(selectedWildCard.id);
      const cardEl = document.getElementById(`player-card-${selectedWildCard.id}`);
      triggerFlyToTable(selectedWildCard, cardEl?.getBoundingClientRect());
      onPlayCard(selectedWildCard.id, color);
      setSelectedWildCard(null);
    }
  };

  const handleSelectSevenTarget = (targetId: string) => {
    if (selectedSevenCard) {
      recentlyPlayedCardsRef.current.add(selectedSevenCard.id);
      const cardEl = document.getElementById(`player-card-${selectedSevenCard.id}`);
      triggerFlyToTable(selectedSevenCard, cardEl?.getBoundingClientRect());
      onPlayCard(selectedSevenCard.id, undefined, targetId);
      setSelectedSevenCard(null);
    }
  };

  const handleSelectActionTarget = (targetId: string) => {
    if (selectedTargetCard) {
      recentlyPlayedCardsRef.current.add(selectedTargetCard.id);
      const cardEl = document.getElementById(`player-card-${selectedTargetCard.id}`);
      triggerFlyToTable(selectedTargetCard, cardEl?.getBoundingClientRect());
      onPlayCard(selectedTargetCard.id, undefined, targetId);
      setSelectedTargetCard(null);
    }
  };

  const handleDraw = (target?: number | React.MouseEvent | unknown) => {
    const targetCardIndex = typeof target === 'number' ? target : undefined;
    if (isVsIntroActive || startIntroPhase !== 'done') return;
    if (!isYourTurn) {
      soundManager.play('error');
      return;
    }
    recentLocalDrawTimeRef.current = Date.now();
    const sourcePlayerId =
      drawPileCount === 0 && nextActiveOpponent ? nextActiveOpponent.id : undefined;
    triggerDrawCardSlide(currentUserId, 0, sourcePlayerId, targetCardIndex);
    onDrawCard(targetCardIndex);
  };

  // Dedicated Shout UNO handler for buzzer press
  const handleCallUnoClick = () => {
    // NOTE: Do NOT play uno_call here — the useEffect watching calledUno state fires
    // immediately after onCallUno() updates the game state, which already plays the sound.
    // Playing it here too caused the double-shout bug.
    triggerUnoCallout(currentUserId);
    onCallUno();
  };

  const variantBadgeMap: Record<string, { label: string; icon: string; style: string }> = {
    classic: { label: 'Classic', icon: '🎴', style: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    all_wild: { label: 'All Wild', icon: '🌈', style: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
    flip: {
      label: gameState.activeFlipSide === 'dark' ? 'Dark Side' : 'Light Side',
      icon: gameState.activeFlipSide === 'dark' ? '🌙' : '☀️',
      style: gameState.activeFlipSide === 'dark'
        ? 'bg-purple-600/30 text-purple-200 border-purple-400/50 shadow-[0_0_12px_rgba(168,85,247,0.4)] animate-pulse'
        : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    },
    dare: { label: 'Uno Dare', icon: '⚡', style: 'bg-red-500/20 text-red-300 border-red-500/30' },
  };
  const activeVariant = variantBadgeMap[gameState.variant || 'classic'];

  // Calculate pointer arrow angle towards active player
  let activePointerRotation = 180; // default points to bottom (you)
  if (topOpponentsList.some((p) => p.id === activePlayer?.id)) {
    activePointerRotation = 0; // points up
  } else if (leftOpponentsList.some((p) => p.id === activePlayer?.id)) {
    activePointerRotation = 270; // points left
  } else if (rightOpponentsList.some((p) => p.id === activePlayer?.id)) {
    activePointerRotation = 90; // points right
  }

  return (
    <div
      className={`relative h-[100dvh] max-h-[100dvh] w-full text-white flex flex-col justify-between overflow-hidden select-none transition-colors duration-700 ${
        isDarkSide
          ? 'bg-gradient-to-b from-[#120824] via-[#0c0418] to-[#180a30]'
          : 'bg-[#080b12]'
      }`}
    >
      {/* FULL SCREEN PHOTO-REALISTIC UNO GAME TABLE BACKDROP (Host selected) */}
      <div className="absolute inset-0 pointer-events-none select-none z-0 overflow-hidden">
        <img
          src={
            gameState.houseRules?.gameTable
              ? `/game table/${gameState.houseRules.gameTable}`
              : '/game table/game table 1.jpg'
          }
          alt="Full Screen UNO Game Table"
          className={`w-full h-full object-cover select-none transition-all duration-700 ${
            isDarkSide ? 'filter hue-rotate-[110deg] brightness-75 contrast-125' : ''
          }`}
        />
        {/* Ambient Vignette & Contrast Overlay */}
        <div className="absolute inset-0 bg-radial-vignette opacity-25" />
        {isDarkSide && (
          <div className="absolute inset-0 bg-purple-950/35 mix-blend-color" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/60" />
      </div>
      {/* Top HUD Bar - Auto-hidden stats & controls, only EXIT button is always visible */}
      <div className="w-full max-w-6xl mx-auto px-2 sm:px-4 pt-1 sm:pt-1.5 flex items-center justify-between z-30 shrink-0 pointer-events-none">
        {/* Left Side: Auto-hidden Timer & Variant Info, with quick toggle button */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {showTopBarMenu ? (
            <div className="flex items-center gap-1.5 animate-fadeIn">
              {/* Golden Stopwatch Timer */}
              <div className="bg-slate-950/85 border border-amber-400/80 text-amber-300 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xl font-mono font-bold text-[11px] sm:text-xs">
                <span className="text-amber-400">⏱️</span>
                <span>
                  {secondsRemaining !== null
                    ? `00:${secondsRemaining < 10 ? `0${secondsRemaining}` : secondsRemaining}`
                    : '02:13'}
                </span>
              </div>

              {/* Variant Badge & Room ID */}
              <div className="hidden sm:flex items-center gap-1.5 bg-slate-950/85 px-2 py-0.5 rounded-full border border-slate-800 shadow-lg text-[10px]">
                <span className="font-mono font-black text-amber-400">#{gameState.roomId}</span>
                <span className="text-slate-600">|</span>
                <span className={`font-bold px-1.5 py-0.2 rounded-full border flex items-center gap-0.5 ${activeVariant.style}`}>
                  <span>{activeVariant.icon}</span>
                  <span>{activeVariant.label}</span>
                </span>
              </div>

              <button
                onClick={() => setShowTopBarMenu(false)}
                className="px-2 py-0.5 rounded-full bg-slate-900/90 hover:bg-slate-800 text-[10px] text-slate-300 border border-slate-700 cursor-pointer shadow"
                title="Itago ang Menu (Hide Menu)"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowTopBarMenu(true)}
              className="px-2 py-0.5 rounded-full bg-slate-950/60 hover:bg-slate-900/90 text-[10px] text-amber-300/80 hover:text-amber-300 border border-slate-800/80 cursor-pointer shadow-sm transition flex items-center gap-1 backdrop-blur-xs"
              title="Ipakita ang Timer & Room Info"
            >
              <span>⏱️</span>
              <span className="font-mono text-[9px] font-bold">Info</span>
            </button>
          )}
        </div>

        {/* Center top: empty space so view is ultra clean */}
        <div className="flex-1" />

        {/* Top-Right: Action buttons (Chat, Mic, Shop, Sound, Settings, PowerUps, Exit) */}
        <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
          {/* Circular Yellow Chat Button */}
          <button
            onClick={onOpenChat}
            className="relative w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 aspect-square flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-transform p-0 shrink-0"
            title="Room Chat"
          >
            <img
              src="/home screen in game icons/chats.png"
              alt="Chat"
              className="w-full h-full object-contain aspect-square select-none pointer-events-none drop-shadow"
            />
            {unreadChatCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-600 text-[8px] font-black text-white flex items-center justify-center shadow">
                {unreadChatCount}
              </span>
            )}
          </button>

          {/* Circular Open Mic Button */}
          <button
            onClick={handleToggleMic}
            className="relative w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 aspect-square flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-transform p-0 shrink-0"
            title={
              !isVoiceConnected
                ? 'Buksan ang Mikropono (Enable Mic)'
                : isVoiceMuted
                ? 'Naka-Mute ang Mic (Pindutin para magsalita)'
                : 'Bukas ang Mic (Nagsasalita / Live)'
            }
          >
            <img
              src={isVoiceMuted || !isVoiceConnected ? "/home screen in game icons/mic off.png" : "/home screen in game icons/mic on.png"}
              alt="Mic"
              className="w-full h-full object-contain aspect-square select-none pointer-events-none drop-shadow"
            />
            {speakingPlayerIds.has(currentUserId) && !isVoiceMuted && (
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white animate-ping" />
            )}
          </button>

          {/* Circular Yellow Tindahan / Power-Up Shop Button */}
          {onOpenShop && (
            <button
              onClick={onOpenShop}
              className="relative w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 aspect-square flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-transform p-0 shrink-0"
              title="Buksan ang Tindahan (Power-Up Shop)"
            >
              <img
                src="/home screen in game icons/shop.png"
                alt="Shop"
                className="w-full h-full object-contain aspect-square select-none pointer-events-none drop-shadow"
              />
            </button>
          )}

          {/* Always Visible Volume On/Off Button */}
          <button
            onClick={onToggleMute}
            className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 aspect-square flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer p-0 shrink-0"
            title={isMuted ? 'I-on ang Tunog (Unmute Sound)' : 'I-off ang Tunog (Mute Sound)'}
          >
            <img
              src={isMuted ? "/home screen in game icons/sound off.png" : "/home screen in game icons/sound on.png"}
              alt={isMuted ? "Sound Off" : "Sound On"}
              className="w-full h-full object-contain aspect-square select-none pointer-events-none drop-shadow"
            />
          </button>

          {/* In-Game Refresh & Reconnect Button */}
          {onReconnect && (
            <button
              onClick={() => {
                soundManager.play('turn_alert');
                onReconnect();
              }}
              className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 aspect-square flex items-center justify-center hover:scale-110 active:scale-95 transition-transform cursor-pointer p-0 shrink-0"
              title="I-refresh at I-reconnect ang Game (Sync Room State)"
            >
              <img
                src="/home screen in game icons/refresh.png"
                alt="Refresh"
                className="w-full h-full object-contain aspect-square select-none pointer-events-none drop-shadow"
              />
            </button>
          )}

          {showTopBarMenu && (
            <div className="flex items-center gap-1.5 sm:gap-2 animate-fadeIn">
              <button
                onClick={() => onOpenSettings?.()}
                className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 aspect-square flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer p-0 shrink-0"
                title="Settings at Palitan ang Larawan ng Baraha"
              >
                <img
                  src="/home screen in game icons/setting.png"
                  alt="Settings"
                  className="w-full h-full object-contain aspect-square select-none pointer-events-none drop-shadow"
                />
              </button>
            </div>
          )}

          {/* Power-Up Dock Button */}
          {onUsePowerUp && onOpenShop && (
            <PowerUpDock
              gameState={gameState}
              currentUserId={currentUserId}
              wallet={wallet || null}
              catalog={catalog || null}
              onUsePowerUp={onUsePowerUp}
              onOpenShop={onOpenShop}
            />
          )}

          {/* Home / Exit Match Button */}
          <button
            onClick={() => setShowLeaveConfirm(true)}
            className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 aspect-square flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer p-0 shrink-0"
            title="Bumalik sa Home (Home Button)"
          >
            <img
              src="/home screen in game icons/home.png"
              alt="Home"
              className="w-full h-full object-contain aspect-square select-none pointer-events-none drop-shadow"
            />
          </button>
        </div>
      </div>


      {/* FULL SCREEN POKER TABLE STAGE - Auto-fits within available vertical space */}
      <div className="relative w-full flex-1 min-h-0 flex items-center justify-center my-0.5 px-2 sm:px-4 z-10 overflow-visible">
        {/* CENTER ARENA: Discard Pile, Turn Arrows & Draw Pile directly on felt (Lowered into table center) */}
        <div className="relative flex items-center justify-center z-10 scale-[0.78] sm:scale-90 md:scale-100 translate-y-4 sm:translate-y-5 md:translate-y-6">
          {/* 3D DRAW PILE (Positioned on the green felt, shifted to the left side and lowered comfortably) */}
          <div
            ref={sideDrawSlotRef}
            className="absolute top-4 sm:top-0 md:-top-2 -left-18 sm:-left-32 md:-left-52 z-20"
          >
            {startIntroPhase === 'shuffling' || startIntroPhase === 'moving_to_side' ? (
              // Designated slot outline while deck is in center or moving
              <div className="w-10 aspect-[2/3] sm:w-13 md:w-16 rounded-lg sm:rounded-xl md:rounded-2xl border-2 border-dashed border-amber-400/40 bg-black/30 backdrop-blur-xs flex flex-col items-center justify-center pointer-events-none shadow-inner">
                <span className="text-[7px] sm:text-[9px] font-black text-amber-300/60 uppercase tracking-widest text-center px-1">
                  Draw Deck
                </span>
              </div>
            ) : (
              // Docked 3D Thick Stacked Draw Pile
              <ThickStackedDeck
                count={drawPileCount}
                variant={gameState.variant}
                isInteractive={startIntroPhase === 'done' && isYourTurn && !gameState.pendingKeepOrPlay}
                onClick={handleDraw}
                showTapPrompt={startIntroPhase === 'done' && isYourTurn && !gameState.pendingKeepOrPlay}
              />
            )}
          </div>
                {/* Circular Turn Direction Arrows SVG (Compacted & subtle) */}
                <div className="absolute pointer-events-none select-none flex items-center justify-center">
                  <svg
                    className={`w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 ${
                      direction === 1 ? 'animate-spin-slow' : 'animate-spin-slow-reverse'
                    }`}
                    viewBox="0 0 200 200"
                  >
                    <circle
                      cx="100"
                      cy="100"
                      r="80"
                      fill="none"
                      stroke="rgba(250, 204, 21, 0.12)"
                      strokeWidth="6"
                    />
                    {/* Glowing Arrow 1 */}
                    <path
                      d="M 100 20 A 80 80 0 0 1 180 100"
                      fill="none"
                      stroke="#facc15"
                      strokeWidth="6"
                      strokeLinecap="round"
                      filter="drop-shadow(0 0 4px rgba(250, 204, 21, 0.5))"
                    />
                    <polygon points="180,100 172,88 188,90" fill="#facc15" />

                    {/* Glowing Arrow 2 */}
                    <path
                      d="M 100 180 A 80 80 0 0 1 20 100"
                      fill="none"
                      stroke="#facc15"
                      strokeWidth="6"
                      strokeLinecap="round"
                      filter="drop-shadow(0 0 4px rgba(250, 204, 21, 0.5))"
                    />
                    <polygon points="20,100 28,112 12,110" fill="#facc15" />
                  </svg>

                  {/* Active Player Pointer Triangle */}
                  <div
                    className="absolute pointer-events-none transition-transform duration-500 flex items-center justify-center"
                    style={{ transform: `rotate(${activePointerRotation}deg)` }}
                  >
                    <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[14px] border-b-yellow-300 drop-shadow-[0_0_6px_rgba(253,224,71,0.9)] -translate-y-20 sm:-translate-y-24"></div>
                  </div>
                </div>

                {/* MESSY / 3D DISCARD PILE OR SHUFFLE / DEAL ANIMATION */}
                <div
                  ref={(el) => {
                    discardPileRef.current = el;
                    centerArenaRef.current = el;
                  }}
                  className="relative flex items-center justify-center min-w-[76px] min-h-[105px]"
                  style={
                    {
                      '--dock-x': `${dockDelta.x}px`,
                      '--dock-y': `${dockDelta.y}px`,
                    } as React.CSSProperties
                  }
                >
                  {/* Shockwave ripple when card lands */}
                  {isDiscardLanding && (
                    <div className="absolute -inset-6 rounded-full bg-amber-400/30 border-2 border-amber-300 animate-tableRipple pointer-events-none z-30" />
                  )}

                  {/* 1. SHUFFLING DECK ANIMATION PHASE (Deck is in the CENTER) */}
                  {startIntroPhase === 'shuffling' && (
                    <RealisticDeckShuffle />
                  )}

                  {/* 2. MOVING DECK TO SIDE PHASE (Deck physically glides from CENTER to SIDE) */}
                  {startIntroPhase === 'moving_to_side' && (
                    <div className="relative flex flex-col items-center justify-center z-30 pointer-events-none">
                      <div
                        className="animate-move-deck-to-side flex items-center justify-center"
                        style={
                          {
                            '--dock-x': `${dockDelta.x}px`,
                            '--dock-y': `${dockDelta.y}px`,
                          } as React.CSSProperties
                        }
                      >
                        <ThickStackedDeck count={drawPileCount} variant={gameState.variant} isInteractive={false} />
                      </div>

                      <div className="absolute -bottom-8 whitespace-nowrap px-3.5 py-1 rounded-full bg-slate-950/95 border border-amber-400/80 shadow-2xl flex items-center gap-1.5 animate-bounce">
                        <span className="text-xs">📦</span>
                        <span className="text-[10px] sm:text-xs font-black text-amber-300 tracking-wider uppercase">
                          Moving Deck to Draw Pile...
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 3. DEALING CARDS TO PLAYERS PHASE (Cards deal round-robin from side deck to players) */}
                  {startIntroPhase === 'dealing_hands' && (
                    <div className="relative flex flex-col items-center justify-center z-30 pointer-events-none">
                      <div className="px-4 py-1.5 rounded-full bg-slate-950/95 border-2 border-amber-400 shadow-[0_0_25px_rgba(250,204,21,0.8)] flex items-center gap-2 animate-bounce">
                        <span className="text-base animate-spin">🎴</span>
                        <div className="flex flex-col text-left">
                          <span className="text-[11px] sm:text-xs font-black text-amber-300 tracking-wider uppercase">
                            Namimigay ng mga Baraha sa Lahat...
                          </span>
                          <span className="text-[9px] text-slate-300 font-semibold">
                            Card #{dealtCount} of {gameState.houseRules.startingHandSize || 7} bawat manlalaro
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 4. DEALING FIRST CARD ANIMATION PHASE (Card departs from side deck and lands in CENTER) */}
                  {startIntroPhase === 'dealing' && (
                    <div className="relative flex flex-col items-center justify-center z-30 pointer-events-none">
                      <div
                        className="animate-deal-first-card"
                        style={
                          {
                            '--dock-x': `${dockDelta.x}px`,
                            '--dock-y': `${dockDelta.y}px`,
                          } as React.CSSProperties
                        }
                      >
                        <CardView card={topDiscard} size="md" className="shadow-2xl" />
                      </div>

                      <div className="absolute -bottom-8 whitespace-nowrap px-3 py-1 rounded-full bg-slate-950/95 border border-amber-400/80 shadow-2xl flex items-center gap-1.5 animate-bounce">
                        <span className="text-xs">🃏</span>
                        <span className="text-[10px] sm:text-xs font-black text-amber-300 tracking-wider uppercase">
                          Dealing First Card...
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 4. NORMAL DISCARD PILE (Intro completed - ONLY the played/discard cards are in center) */}
                  {startIntroPhase === 'done' && (
                    <>
                      {/* Stacked previous cards underneath at realistic random angles (exact 2:3 aspect ratio) */}
                      <div className="absolute w-12 aspect-[2/3] sm:w-15 md:w-18 rounded-lg sm:rounded-xl md:rounded-2xl bg-amber-500/80 border border-white/80 shadow-md transform rotate-[-18deg] translate-x-1 -translate-y-1"></div>
                      <div className="absolute w-12 aspect-[2/3] sm:w-15 md:w-18 rounded-lg sm:rounded-xl md:rounded-2xl bg-red-600/80 border border-white/80 shadow-md transform rotate-[14deg] -translate-x-1 translate-y-1"></div>
                      <div className="absolute w-12 aspect-[2/3] sm:w-15 md:w-18 rounded-lg sm:rounded-xl md:rounded-2xl bg-blue-600/80 border border-white/80 shadow-md transform rotate-[-8deg] translate-x-2"></div>
                      <div className="absolute w-12 aspect-[2/3] sm:w-15 md:w-18 rounded-lg sm:rounded-xl md:rounded-2xl bg-emerald-600/90 border border-white/80 shadow-md transform rotate-[6deg] -translate-y-1"></div>

                      {/* Top active discard with slam animation on landing (compacted to size md on mobile, lg on larger screens) */}
                      <div className={`relative z-10 ${isDiscardLanding ? 'animate-cardSlam' : ''}`}>
                        <CardView card={topDiscard} size="md" className="rotate-[-2deg] transition-all shadow-xl sm:scale-110 md:scale-125" />
                      </div>

                      {/* Pending Penalty Badge (Stacking) */}
                      {pendingDrawPenalty > 0 && (
                        <div className="absolute -top-4 -right-4 bg-red-600 text-white font-black text-xs sm:text-sm px-2.5 py-1 rounded-full border-2 border-yellow-300 shadow-2xl animate-bounce z-20">
                          +{pendingDrawPenalty}!
                        </div>
                      )}

                      {/* Active Color Indicator Tag (Hidden in All Wild variant since colors are not needed) */}
                      {gameState.variant !== 'all_wild' && (
                        <div className="absolute -bottom-5 flex items-center gap-1.5 bg-slate-950/90 px-3 py-0.5 rounded-full border border-slate-700 shadow z-20">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              currentColor === 'red'
                                ? 'bg-red-500'
                                : currentColor === 'blue'
                                ? 'bg-blue-500'
                                : currentColor === 'green'
                                ? 'bg-emerald-500'
                                : currentColor === 'yellow'
                                ? 'bg-amber-400'
                                : currentColor === 'teal'
                                ? 'bg-teal-400'
                                : currentColor === 'orange'
                                ? 'bg-orange-500'
                                : currentColor === 'purple'
                                ? 'bg-purple-500'
                                : currentColor === 'pink'
                                ? 'bg-pink-500'
                                : 'bg-slate-400'
                            }`}
                          ></span>
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-200">
                            {currentColor}
                          </span>
                        </div>
                      )}

                      {/* Live Action Ticker directly below the played/discard card */}
                      <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap z-20 pointer-events-none flex flex-col items-center">
                        {lastActionText ? (
                          <div className="text-[9px] sm:text-[10px] font-bold text-amber-300 bg-slate-950/90 px-3 py-0.5 rounded-full border border-amber-400/50 shadow-lg truncate max-w-[200px] sm:max-w-xs animate-fadeIn">
                            {lastActionText}
                          </div>
                        ) : (
                          <div
                            className={`text-[9px] sm:text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                              isYourTurn
                                ? 'bg-amber-400 text-slate-950 shadow-[0_0_12px_rgba(251,191,36,0.6)] animate-pulse'
                                : 'bg-slate-950/80 text-slate-300 border border-slate-800'
                            }`}
                          >
                            {isYourTurn ? 'YOUR TURN!' : `${activePlayer?.name || 'Player'}'s Turn`}
                          </div>
                        )}

                        {/* AUTOMATIC DEADLOCK BUTTON: Appears when 2 players remain and neither can play or draw */}
                        {gameState.isDeadlockAvailable && (
                          <button
                            type="button"
                            onClick={() => {
                              soundManager.play('uno_call');
                              onDeclareDeadlock?.();
                            }}
                            className="pointer-events-auto mt-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-red-600 via-amber-500 to-red-600 hover:from-red-500 hover:to-amber-400 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(239,68,68,0.95)] border-2 border-yellow-300 animate-bounce active:scale-95 transition cursor-pointer flex items-center gap-1.5"
                            title="Ideklarang DEADLOCK (Bilangan ng natitirang baraha)"
                          >
                            <span>⚠️</span>
                            <span>IDEKLARANG DEADLOCK</span>
                            <span>⚖️</span>
                          </button>
                        )}
                      </div>
                    </>
                  )}

                  {/* 5. POWER CARD POP-UP ANNOUNCEMENT BANNER (Vibrant visual effects only, no voice) */}
                  {powerAnnouncement && (
                    <div className="absolute top-1/2 left-1/2 z-50 pointer-events-none animate-powerCardAnnounce whitespace-nowrap">
                      <div className={`relative flex items-center gap-2.5 px-4 sm:px-6 py-2 sm:py-2.5 rounded-3xl bg-gradient-to-r ${powerAnnouncement.bgColor} text-white border-2 border-white shadow-[0_0_35px_rgba(250,204,21,0.95)] ring-4 ring-amber-400/50 backdrop-blur-md`}>
                        <div className="relative">
                          <span className="text-2xl sm:text-3xl filter drop-shadow block animate-bounce">{powerAnnouncement.icon}</span>
                          <span className="absolute -inset-1 rounded-full bg-white/20 animate-ping pointer-events-none" />
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="font-black italic text-sm sm:text-lg tracking-wider uppercase text-yellow-200 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] leading-none">
                            {powerAnnouncement.title}
                          </span>
                          <span className="text-[10px] sm:text-xs font-bold text-white/95 drop-shadow leading-tight mt-0.5">
                            {powerAnnouncement.subtitle}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

        {/* ======================================================== */}
        {/* PLAYERS & CARDS POSITIONED OVER THE YACHT SCENE SIDES */}
        {/* ======================================================== */}

        {/* TOP OPPONENTS ROW (Cleanly positioned higher up along the top dealer arch) */}
        {topOpponentsList.length > 0 && (
          <div className="absolute top-0.5 sm:top-1 left-1/2 -translate-x-1/2 w-[94%] max-w-5xl flex items-start justify-center gap-1.5 sm:gap-4 md:gap-8 z-30 pointer-events-none">
            {topOpponentsList.map((opp) => {
              const isTurn = activePlayer?.id === opp.id;
              const effectiveCardCount =
                startIntroPhase === 'done' || startIntroPhase === 'dealing'
                  ? opp.cardCount
                  : startIntroPhase === 'dealing_hands'
                  ? Math.min(dealtCount, opp.cardCount)
                  : 0;
              return (
                <div
                  key={opp.id}
                  id={`opponent-${opp.id}`}
                  className="pointer-events-auto flex flex-col items-center relative transition-all"
                >
                  {activeUnoShouts.some((s) => s.playerId === opp.id) && <UnoCallout />}
                  {(activeAvatarBubbles.get(opp.id) || activeAvatarBubbles.get(opp.name)) && (
                    <AvatarChatBubble text={(activeAvatarBubbles.get(opp.id) || activeAvatarBubbles.get(opp.name))!.text} />
                  )}
                  <div className="flex items-center gap-1 sm:gap-2">
                    {/* Avatar Box with Dynamic Expansion & Turn Lightup Halo */}
                    <div className="relative">
                      {isTurn && secondsRemaining !== null && (
                        <AvatarTurnTimerRing
                          progressFraction={turnProgressFraction}
                          totalDuration={houseRules.turnTimer || 30}
                        />
                      )}
                      <div
                        className={`rounded-xl flex items-center justify-center shadow-xl transition-all duration-300 overflow-hidden relative ${
                          isTurn
                            ? 'w-10 h-10 sm:w-14 sm:h-14 z-20 bg-gradient-to-tr from-amber-400/20 via-yellow-300/20 to-amber-200/20 border-2 sm:border-3 border-yellow-300 ring-2 ring-yellow-400/80 shadow-[0_0_20px_rgba(250,204,21,0.95)]'
                            : activeUnoShouts.some((s) => s.playerId === opp.id)
                            ? 'w-8 h-8 sm:w-11 sm:h-11 border-2 animate-unoAvatar ring-2 sm:ring-4 ring-red-500 border-yellow-300'
                            : speakingPlayerIds.has(opp.id)
                            ? 'w-8 h-8 sm:w-11 sm:h-11 ring-4 ring-emerald-400 border-2 border-emerald-300 shadow-[0_0_14px_rgba(52,211,153,0.9)] animate-pulse'
                            : !opp.isFinished && opp.cardCount === 1 && !opp.calledUno
                            ? 'w-8 h-8 sm:w-11 sm:h-11 border-2 border-red-500 ring-2 ring-red-500 animate-pulse bg-red-950/80 shadow-[0_0_12px_rgba(239,68,68,0.9)]'
                            : 'w-8 h-8 sm:w-11 sm:h-11 border border-slate-700 bg-slate-900/90'
                        }`}
                      >
                        <div className="w-full h-full overflow-hidden flex items-center justify-center text-base sm:text-xl md:text-2xl">
                          <AvatarDisplay avatar={opp.avatar} />
                        </div>

                        {/* Speaking Mic Badge */}
                        {speakingPlayerIds.has(opp.id) && (
                          <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border border-white flex items-center justify-center text-[7px] shadow z-50 animate-bounce">
                            🎙️
                          </div>
                        )}
                      </div>

                      {/* Catch UNO Hammer Overlay directly on Avatar */}
                      {!opp.isFinished && opp.cardCount === 1 && !opp.calledUno && (
                        <button
                          type="button"
                          onClick={(e) => handleHitHammer(opp.id, e)}
                          className={`pointer-events-auto absolute -top-4 -right-4 z-50 p-1.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 rounded-full shadow-[0_0_18px_rgba(250,204,21,1)] border-2 border-slate-950 cursor-pointer transition-transform ${
                            smackingPlayerId === opp.id
                              ? 'scale-125 rotate-45 bg-red-500'
                              : 'animate-hammerSmash hover:scale-110 active:scale-90'
                          }`}
                          title={`Pukpukin si ${opp.name} ng martilyo! (+1 Penalty Card)`}
                        >
                          <span className="text-xl sm:text-2xl leading-none select-none block">🔨</span>
                        </button>
                      )}
                    </div>

                    {/* Compact Fan Style Cards for Top Opponents */}
                    {opp.isFinished ? (
                      <span className="text-[9px] sm:text-[10px] font-black text-amber-300 bg-slate-900/95 px-2 py-0.5 rounded-lg border border-amber-400/70 shadow mt-0.5">
                        🏆 DONE
                      </span>
                    ) : effectiveCardCount === 0 ? null : (
                      <div className="relative flex items-center justify-center overflow-visible py-0.5 h-8 sm:h-10 max-w-[55px] sm:max-w-[75px]">
                        {canStealFromNext && nextActiveOpponent?.id === opp.id && (
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-black text-[8px] sm:text-[9px] px-1.5 py-0.2 rounded-full border border-yellow-100 shadow-[0_0_8px_rgba(250,204,21,0.9)] animate-bounce z-40">
                            👉 Bunot dito!
                          </div>
                        )}
                        {Array.from({ length: effectiveCardCount }).map((_, i, arr) => {
                          const mid = (arr.length - 1) / 2;
                          const rel = i - mid;
                          const rot = arr.length > 1 ? rel * Math.min(2.5, 14 / arr.length) : 0;
                          const yArch = Math.pow(Math.abs(rel), 1.2) * 0.3;
                          const cardW = 28; // w-7
                          const maxFanW = 46;
                          const neededOverlap = arr.length > 1 ? -Math.min(cardW * 0.9, (arr.length * cardW - maxFanW) / (arr.length - 1)) : 0;
                          const overlap = arr.length > 1 ? Math.min(-16, neededOverlap) : 0;
                          const isTargetable = canStealFromNext && nextActiveOpponent?.id === opp.id;

                          return (
                            <div
                              key={i}
                              id={`opp-card-${opp.id}-${i}`}
                              onClick={isTargetable ? () => handleDraw(i) : undefined}
                              className={`transform transition-all origin-top shrink-0 ${
                                isTargetable
                                  ? 'cursor-pointer hover:-translate-y-2 hover:scale-110 active:scale-95 ring-2 ring-amber-400/80 rounded shadow-[0_0_8px_rgba(250,204,21,0.8)]'
                                  : 'hover:-translate-y-1'
                              }`}
                              style={{
                                zIndex: i,
                                marginLeft: i === 0 ? 0 : `${Math.round(overlap)}px`,
                                transform: `rotate(${rot}deg) translateY(${yArch}px)`,
                              }}
                              title={isTargetable ? `Piliin ang baraha #${i + 1} ni ${opp.name}` : undefined}
                            >
                              <CardView
                                isBack={true}
                                variant={gameState.variant}
                                size="xs"
                                backCountBadge={i === arr.length - 1 ? effectiveCardCount : undefined}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Player Name Badge */}
                  <span
                    className={`text-[10px] sm:text-xs font-black mt-1 px-2.5 py-0.5 rounded-full border shadow max-w-[100px] sm:max-w-[120px] truncate text-center leading-none transition-all ${
                      isTurn
                        ? 'bg-amber-400 text-slate-950 border-yellow-200 shadow-[0_0_12px_rgba(250,204,21,0.8)]'
                        : 'bg-slate-950/90 text-slate-200 border-slate-800'
                    }`}
                  >
                    {opp.name}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* WEST (LEFT) SEATS (1 or 2 players vertically on left armchair) */}
        {leftOpponentsList.length > 0 && (
          <div className="absolute left-1 sm:left-3 md:left-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 sm:gap-4 z-30">
            {leftOpponentsList.map((opp) => {
              const isTurn = activePlayer?.id === opp.id;
              const effectiveCardCount =
                startIntroPhase === 'done' || startIntroPhase === 'dealing'
                  ? opp.cardCount
                  : startIntroPhase === 'dealing_hands'
                  ? Math.min(dealtCount, opp.cardCount)
                  : 0;
              return (
                <div
                  key={opp.id}
                  id={`opponent-${opp.id}`}
                  className="flex flex-col items-center"
                >
                  {/* Avatar Box with Turn Glow & UNO Callout */}
                  <div className="relative">
                    {activeUnoShouts.some((s) => s.playerId === opp.id) && <UnoCallout />}
                    {(activeAvatarBubbles.get(opp.id) || activeAvatarBubbles.get(opp.name)) && (
                      <AvatarChatBubble text={(activeAvatarBubbles.get(opp.id) || activeAvatarBubbles.get(opp.name))!.text} />
                    )}
                    {isTurn && secondsRemaining !== null && (
                      <AvatarTurnTimerRing
                        progressFraction={turnProgressFraction}
                        totalDuration={houseRules.turnTimer || 30}
                      />
                    )}
                    <div
                      className={`rounded-xl flex items-center justify-center text-lg sm:text-2xl shadow-xl border-2 transition-all duration-300 relative overflow-hidden ${
                        isTurn
                          ? 'w-10 h-10 sm:w-14 sm:h-14 z-20 bg-gradient-to-tr from-amber-400/20 via-yellow-300/20 to-amber-200/20 border-2 sm:border-3 border-yellow-300 ring-2 ring-yellow-400/80 shadow-[0_0_20px_rgba(250,204,21,0.95)]'
                          : activeUnoShouts.some((s) => s.playerId === opp.id)
                          ? 'w-8 h-8 sm:w-11 sm:h-11 animate-unoAvatar ring-2 sm:ring-4 ring-red-500 border-yellow-300'
                          : !opp.isFinished && opp.cardCount === 1 && !opp.calledUno
                          ? 'w-8 h-8 sm:w-11 sm:h-11 border-red-500 ring-2 sm:ring-4 ring-red-500/90 animate-pulse bg-red-950/80 shadow-[0_0_12px_rgba(239,68,68,0.8)]'
                          : 'w-8 h-8 sm:w-11 sm:h-11 border-slate-700 bg-slate-900/95'
                      }`}
                    >
                      <div className="w-full h-full overflow-hidden flex items-center justify-center text-base sm:text-xl md:text-2xl">
                        <AvatarDisplay avatar={opp.avatar} />
                      </div>
                    </div>
                    {/* Catch UNO Hammer Overlay directly on Avatar */}
                    {!opp.isFinished && opp.cardCount === 1 && !opp.calledUno && (
                      <button
                        type="button"
                        onClick={(e) => handleHitHammer(opp.id, e)}
                        className={`pointer-events-auto absolute -top-4 -right-4 z-50 p-1.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 rounded-full shadow-[0_0_18px_rgba(250,204,21,1)] border-2 border-slate-950 cursor-pointer transition-transform ${
                          smackingPlayerId === opp.id
                            ? 'scale-125 rotate-45 bg-red-500'
                            : 'animate-hammerSmash hover:scale-110 active:scale-90'
                        }`}
                        title={`Pukpukin si ${opp.name} ng martilyo! (+1 Penalty Card)`}
                      >
                        <span className="text-xl sm:text-2xl leading-none select-none block">🔨</span>
                      </button>
                    )}
                  </div>

                  {/* Name Badge */}
                  <span
                    className={`text-[10px] sm:text-xs font-bold mt-1 px-2 py-0.5 rounded-full border shadow max-w-[85px] truncate text-center transition-all ${
                      isTurn
                        ? 'bg-amber-400 text-slate-950 border-yellow-200 shadow-[0_0_12px_rgba(250,204,21,0.8)] font-black'
                        : 'bg-slate-950/90 text-white border-slate-800'
                    }`}
                  >
                    {opp.name}
                  </span>

                    {/* Compact 3D Diagonal Fan Style Cards for Left Opponents */}
                    {opp.isFinished ? (
                      <div className="mt-1 flex flex-col items-center justify-center p-1 bg-slate-900/90 border border-amber-400/70 rounded-lg shadow text-center">
                        <span className="text-[9px] font-black text-amber-300">🏆 DONE</span>
                      </div>
                    ) : effectiveCardCount === 0 ? null : (
                      <div
                        className="relative mt-1 flex items-center justify-center overflow-visible py-0.5 h-8 max-w-[50px] sm:max-w-[70px]"
                        style={{ perspective: '400px' }}
                      >
                        {canStealFromNext && nextActiveOpponent?.id === opp.id && (
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-black text-[8px] sm:text-[9px] px-1.5 py-0.2 rounded-full border border-yellow-100 shadow-[0_0_8px_rgba(250,204,21,0.9)] animate-bounce z-40">
                            👉 Bunot dito!
                          </div>
                        )}
                        <div
                          className="flex items-center justify-center"
                          style={{
                            transform: 'rotateY(26deg) rotateX(14deg) rotate(-8deg)',
                            transformStyle: 'preserve-3d',
                          }}
                        >
                          {Array.from({ length: effectiveCardCount }).map((_, i, arr) => {
                            const mid = (arr.length - 1) / 2;
                            const rel = i - mid;
                            const rot = arr.length > 1 ? rel * Math.min(2.5, 12 / arr.length) : 0;
                            const yArch = Math.pow(Math.abs(rel), 1.2) * 0.3;
                            const cardW = 28;
                            const maxFanW = 46;
                            const neededOverlap = arr.length > 1 ? -Math.min(cardW * 0.88, (arr.length * cardW - maxFanW) / (arr.length - 1)) : 0;
                            const overlap = arr.length > 1 ? Math.min(-16, neededOverlap) : 0;
                            const isTargetable = canStealFromNext && nextActiveOpponent?.id === opp.id;

                            return (
                              <div
                                key={i}
                                id={`opp-card-${opp.id}-${i}`}
                                onClick={isTargetable ? () => handleDraw(i) : undefined}
                                className={`transform transition-all origin-bottom shrink-0 drop-shadow-[2px_4px_6px_rgba(0,0,0,0.6)] ${
                                  isTargetable
                                    ? 'cursor-pointer hover:-translate-y-2 hover:scale-110 active:scale-95 ring-2 ring-amber-400/80 rounded shadow-[0_0_8px_rgba(250,204,21,0.8)]'
                                    : 'hover:-translate-y-1'
                                }`}
                                style={{
                                  zIndex: i,
                                  marginLeft: i === 0 ? 0 : `${Math.round(overlap)}px`,
                                  transform: `rotate(${rot}deg) translateY(${yArch}px) translateZ(${i * 2}px)`,
                                }}
                                title={isTargetable ? `Piliin ang baraha #${i + 1} ni ${opp.name}` : undefined}
                              >
                                <CardView
                                  isBack={true}
                                  variant={gameState.variant}
                                  size="xs"
                                  backCountBadge={i === arr.length - 1 ? effectiveCardCount : undefined}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}

        {/* EAST (RIGHT) SEATS (1 or 2 players vertically on right armchair) */}
        {rightOpponentsList.length > 0 && (
          <div className="absolute right-1 sm:right-3 md:right-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 sm:gap-4 z-30">
            {rightOpponentsList.map((opp) => {
              const isTurn = activePlayer?.id === opp.id;
              const effectiveCardCount =
                startIntroPhase === 'done' || startIntroPhase === 'dealing'
                  ? opp.cardCount
                  : startIntroPhase === 'dealing_hands'
                  ? Math.min(dealtCount, opp.cardCount)
                  : 0;
              return (
                <div
                  key={opp.id}
                  id={`opponent-${opp.id}`}
                  className="flex flex-col items-center"
                >
                  {/* Avatar Box with Turn Glow & UNO Callout */}
                  <div className="relative">
                    {activeUnoShouts.some((s) => s.playerId === opp.id) && <UnoCallout />}
                    {(activeAvatarBubbles.get(opp.id) || activeAvatarBubbles.get(opp.name)) && (
                      <AvatarChatBubble text={(activeAvatarBubbles.get(opp.id) || activeAvatarBubbles.get(opp.name))!.text} />
                    )}
                    {isTurn && secondsRemaining !== null && (
                      <AvatarTurnTimerRing
                        progressFraction={turnProgressFraction}
                        totalDuration={houseRules.turnTimer || 30}
                      />
                    )}
                    <div
                      className={`rounded-xl flex items-center justify-center text-lg sm:text-2xl shadow-xl border-2 transition-all duration-300 relative overflow-hidden ${
                        isTurn
                          ? 'w-10 h-10 sm:w-14 sm:h-14 z-20 bg-gradient-to-tr from-amber-400/20 via-yellow-300/20 to-amber-200/20 border-2 sm:border-3 border-yellow-300 ring-2 ring-yellow-400/80 shadow-[0_0_20px_rgba(250,204,21,0.95)]'
                          : activeUnoShouts.some((s) => s.playerId === opp.id)
                          ? 'w-8 h-8 sm:w-11 sm:h-11 animate-unoAvatar ring-2 sm:ring-4 ring-red-500 border-yellow-300'
                          : !opp.isFinished && opp.cardCount === 1 && !opp.calledUno
                          ? 'w-8 h-8 sm:w-11 sm:h-11 border-red-500 ring-2 sm:ring-4 ring-red-500/90 animate-pulse bg-red-950/80 shadow-[0_0_12px_rgba(239,68,68,0.8)]'
                          : 'w-8 h-8 sm:w-11 sm:h-11 border-slate-700 bg-slate-900/95'
                      }`}
                    >
                      <div className="w-full h-full overflow-hidden flex items-center justify-center text-base sm:text-xl md:text-2xl">
                        <AvatarDisplay avatar={opp.avatar} />
                      </div>
                    </div>
                    {/* Catch UNO Hammer Overlay directly on Avatar */}
                    {!opp.isFinished && opp.cardCount === 1 && !opp.calledUno && (
                      <button
                        type="button"
                        onClick={(e) => handleHitHammer(opp.id, e)}
                        className={`pointer-events-auto absolute -top-4 -right-4 z-50 p-1.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 rounded-full shadow-[0_0_18px_rgba(250,204,21,1)] border-2 border-slate-950 cursor-pointer transition-transform ${
                          smackingPlayerId === opp.id
                            ? 'scale-125 rotate-45 bg-red-500'
                            : 'animate-hammerSmash hover:scale-110 active:scale-90'
                        }`}
                        title={`Pukpukin si ${opp.name} ng martilyo! (+1 Penalty Card)`}
                      >
                        <span className="text-xl sm:text-2xl leading-none select-none block">🔨</span>
                      </button>
                    )}
                  </div>

                  {/* Name Badge */}
                  <span
                    className={`text-[10px] sm:text-xs font-bold mt-1 px-2 py-0.5 rounded-full border shadow max-w-[85px] truncate text-center transition-all ${
                      isTurn
                        ? 'bg-amber-400 text-slate-950 border-yellow-200 shadow-[0_0_12px_rgba(250,204,21,0.8)] font-black'
                        : 'bg-slate-950/90 text-white border-slate-800'
                    }`}
                  >
                    {opp.name}
                  </span>

                    {/* Compact 3D Diagonal Fan Style Cards for Right Opponents */}
                    {opp.isFinished ? (
                      <div className="mt-1 flex flex-col items-center justify-center p-1 bg-slate-900/90 border border-amber-400/70 rounded-lg shadow text-center">
                        <span className="text-[9px] font-black text-amber-300">🏆 DONE</span>
                      </div>
                    ) : effectiveCardCount === 0 ? null : (
                      <div
                        className="relative mt-1 flex items-center justify-center overflow-visible py-0.5 h-8 max-w-[50px] sm:max-w-[70px]"
                        style={{ perspective: '400px' }}
                      >
                        {canStealFromNext && nextActiveOpponent?.id === opp.id && (
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-black text-[8px] sm:text-[9px] px-1.5 py-0.2 rounded-full border border-yellow-100 shadow-[0_0_8px_rgba(250,204,21,0.9)] animate-bounce z-40">
                            👉 Bunot dito!
                          </div>
                        )}
                        <div
                          className="flex items-center justify-center"
                          style={{
                            transform: 'rotateY(-26deg) rotateX(14deg) rotate(8deg)',
                            transformStyle: 'preserve-3d',
                          }}
                        >
                          {Array.from({ length: effectiveCardCount }).map((_, i, arr) => {
                            const mid = (arr.length - 1) / 2;
                            const rel = i - mid;
                            const rot = arr.length > 1 ? rel * Math.min(2.5, 12 / arr.length) : 0;
                            const yArch = Math.pow(Math.abs(rel), 1.2) * 0.3;
                            const cardW = 28;
                            const maxFanW = 46;
                            const neededOverlap = arr.length > 1 ? -Math.min(cardW * 0.88, (arr.length * cardW - maxFanW) / (arr.length - 1)) : 0;
                            const overlap = arr.length > 1 ? Math.min(-16, neededOverlap) : 0;
                            const isTargetable = canStealFromNext && nextActiveOpponent?.id === opp.id;

                            return (
                              <div
                                key={i}
                                id={`opp-card-${opp.id}-${i}`}
                                onClick={isTargetable ? () => handleDraw(i) : undefined}
                                className={`transform transition-all origin-bottom shrink-0 drop-shadow-[2px_4px_6px_rgba(0,0,0,0.6)] ${
                                  isTargetable
                                    ? 'cursor-pointer hover:-translate-y-2 hover:scale-110 active:scale-95 ring-2 ring-amber-400/80 rounded shadow-[0_0_8px_rgba(250,204,21,0.8)]'
                                    : 'hover:-translate-y-1'
                                }`}
                                style={{
                                  zIndex: i,
                                  marginLeft: i === 0 ? 0 : `${Math.round(overlap)}px`,
                                  transform: `rotate(${rot}deg) translateY(${yArch}px) translateZ(${i * 2}px)`,
                                }}
                                title={isTargetable ? `Piliin ang baraha #${i + 1} ni ${opp.name}` : undefined}
                              >
                                <CardView
                                  isBack={true}
                                  variant={gameState.variant}
                                  size="xs"
                                  backCountBadge={i === arr.length - 1 ? effectiveCardCount : undefined}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* SOUTH (BOTTOM) AREA: Local Player HUD (or Spectator Controls) & 3D CALL UNO Buzzer */}
      <div className="w-full max-w-6xl mx-auto px-2 sm:px-4 pb-1 sm:pb-3 z-40 shrink-0">
        {isSpectator ? (
          /* LIVE TV BROADCAST SPECTATOR HUD */
          <div className="bg-slate-950/80 backdrop-blur-md border border-purple-500/50 rounded-2xl p-2.5 sm:p-3 flex items-center justify-between shadow-2xl animate-fadeIn">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-600 flex items-center justify-center text-lg sm:text-xl shadow-lg border border-purple-300">
                📺
              </div>
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1.5">
                  <span className="flex items-center gap-1 bg-red-600 text-white font-black text-[10px] px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    LIVE TV
                  </span>
                  <span className="text-xs sm:text-sm font-black text-white uppercase tracking-wider flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-purple-400" />
                    SPECTATING GAME
                  </span>
                </div>
                <span className="text-[10px] text-slate-300 mt-0.5">
                  Live in-progress game viewing. Makipag-chat at mag-react habang nanonood!
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Room Chat Button */}
              <button
                onClick={onOpenChat}
                className="relative px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition"
              >
                <MessageSquare className="w-4 h-4 fill-current" />
                <span>Chat</span>
                {unreadChatCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-red-600 text-[9px] font-black text-white flex items-center justify-center">
                    {unreadChatCount}
                  </span>
                )}
              </button>

              {/* Exit Room Button */}
              <button
                onClick={() => setShowLeaveConfirm(true)}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white font-bold text-xs flex items-center gap-1.5 border border-white/20 active:scale-95 transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Umalis</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-end justify-between gap-1 sm:gap-4">
            {/* Bottom-Left: Avatar Box & Yellow Chat Button */}
            <div className="flex items-center gap-1.5 sm:gap-3">
              <div className="flex flex-col items-center">
                {activeUnoShouts.some((s) => s.playerId === selfPlayer.id) && <UnoCallout isSelf={true} />}
                {(activeAvatarBubbles.get(selfPlayer.id) || activeAvatarBubbles.get(selfPlayer.name) || (currentUserId && activeAvatarBubbles.get(currentUserId))) && (
                  <AvatarChatBubble
                    text={(activeAvatarBubbles.get(selfPlayer.id) || activeAvatarBubbles.get(selfPlayer.name) || activeAvatarBubbles.get(currentUserId))!.text}
                    isSelf={true}
                  />
                )}
                {/* Avatar Box with Turn Ring strictly wrapped to its dimensions */}
                <div className="relative">
                  {isYourTurn && secondsRemaining !== null && (
                    <AvatarTurnTimerRing
                      progressFraction={turnProgressFraction}
                      totalDuration={houseRules.turnTimer || 30}
                    />
                  )}
                  <div
                    className={`rounded-xl flex items-center justify-center text-xl sm:text-2xl shadow-xl transition-all duration-300 relative overflow-hidden ${
                      isYourTurn
                        ? 'w-11 h-11 sm:w-16 sm:h-16 z-20 bg-gradient-to-tr from-amber-400/20 via-yellow-300/20 to-amber-200/20 border-2 sm:border-3 border-yellow-300 ring-2 ring-yellow-400/80 shadow-[0_0_20px_rgba(250,204,21,0.95)]'
                        : activeUnoShouts.some((s) => s.playerId === selfPlayer.id)
                        ? 'w-9 h-9 sm:w-12 sm:h-12 animate-unoAvatar ring-2 sm:ring-4 ring-red-500 border-2 border-yellow-300'
                        : speakingPlayerIds.has(selfPlayer.id)
                        ? 'w-9 h-9 sm:w-12 sm:h-12 ring-4 ring-emerald-400 border-2 border-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.9)] animate-pulse'
                        : 'w-9 h-9 sm:w-12 sm:h-12 bg-gradient-to-tr from-amber-400/30 to-yellow-300/30 border border-amber-300'
                    }`}
                  >
                    <div className="w-full h-full overflow-hidden flex items-center justify-center text-lg sm:text-2xl">
                      <AvatarDisplay avatar={selfPlayer.avatar || '🤖'} />
                    </div>

                    {/* Speaking Mic Badge */}
                    {speakingPlayerIds.has(selfPlayer.id) && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border border-white flex items-center justify-center text-[8px] shadow z-50 animate-bounce">
                        🎙️
                      </div>
                    )}

                    {/* Penalty Hammer Animation when caught or smacked */}
                    {smackingPlayerId === selfPlayer.id && (
                      <div className="absolute -top-4 -right-4 z-50 p-1 bg-red-600 text-white rounded-full shadow-[0_0_20px_rgba(239,68,68,1)] border-2 border-yellow-300 animate-hammerSmash scale-125">
                        <span className="text-xl sm:text-2xl leading-none select-none block">🔨</span>
                      </div>
                    )}

                    {/* Warning banner when vulnerable on 1 card */}
                    {yourHand.length === 1 && !selfPlayer.calledUno && (
                      <div className="absolute -top-3 -left-3 z-50 p-1 bg-red-600 text-yellow-300 rounded-full border border-yellow-300 shadow animate-pulse">
                        <span className="text-xs leading-none select-none block">⚠️</span>
                      </div>
                    )}
                  </div>
                </div>
                <span
                  className={`text-[9px] sm:text-xs font-bold mt-1 px-2.5 py-0.5 rounded-full border shadow max-w-[80px] sm:max-w-[120px] truncate text-center transition-all ${
                    isYourTurn
                      ? 'bg-amber-400 text-slate-950 border-yellow-200 shadow-[0_0_10px_rgba(250,204,21,0.8)] font-black'
                      : 'bg-slate-950/90 text-white border-slate-800'
                  }`}
                >
                  {selfPlayer.name}
                </span>
              </div>
            </div>

            {/* Bottom-Center: Interactive Player Hand or Finished Banner */}
            <div className="flex-1 min-w-0 max-w-4xl flex flex-col items-center justify-center">
              {selfPlayer.isFinished ? (
                <div className="py-3 px-6 bg-gradient-to-r from-amber-500/25 via-emerald-500/25 to-amber-500/25 border-2 border-amber-400/80 rounded-2xl shadow-2xl flex flex-col items-center text-center animate-bounce">
                  <span className="text-2xl">
                    {selfPlayer.finishRank === 1 ? '🥇🏆' : '🥈🎉'}
                  </span>
                  <span className="text-sm font-black text-yellow-300 uppercase tracking-wide">
                    {selfPlayer.finishRank === 1
                      ? '🏆 1ST PLACE — IKAW ANG PANALO!'
                      : `🎉 LIGTAS KA! RANK ${selfPlayer.finishRank || 2}`}
                  </span>
                  <span className="text-[10px] text-slate-300 font-semibold mt-0.5">
                    Tapos ka na! Panoorin ang laban kung sino ang magiging Pungot! 🍿
                  </span>
                </div>
              ) : (
                /* Player's Card Fan - Auto-squeezing radial arch with NO scrollbars and NO box clipping */
                <div
                  id="player-hand-container"
                  className="w-full overflow-visible py-2 flex items-center justify-center select-none no-scrollbar min-h-[96px] sm:min-h-[120px]"
                >
                  {/* Empty Hand Placeholder while dealing cards */}
                  {(startIntroPhase === 'shuffling' || startIntroPhase === 'moving_to_side' || (startIntroPhase === 'dealing_hands' && dealtCount === 0)) && (
                    <div className="py-2 px-5 rounded-2xl border border-dashed border-amber-400/40 bg-slate-950/60 text-slate-400 text-xs font-bold animate-pulse flex items-center gap-2">
                      <span className="text-base">🎴</span>
                      <span>Naghahanda... Ipapamahagi ang mga baraha</span>
                    </div>
                  )}

                  {(() => {
                    const visibleHand =
                      startIntroPhase === 'done' || startIntroPhase === 'dealing'
                        ? yourHand
                        : startIntroPhase === 'dealing_hands'
                        ? yourHand.slice(0, dealtCount)
                        : [];

                    return visibleHand.map((card, idx) => {
                      const playable =
                        startIntroPhase === 'done' &&
                        isYourTurn &&
                        isCardPlayable(
                          card,
                          topDiscard,
                          currentColor,
                          pendingDrawPenalty,
                          houseRules.stacking,
                          gameState.variant
                        );

                      const total = visibleHand.length;
                      const mid = (total - 1) / 2;
                      const rel = idx - mid;

                      // Keep consistent card sizing and natural card fan arrangement
                      // so the layout stays identical even when hand count decreases
                      const isSmallScreen = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
                      const cardSize: 'xs' | 'sm' | 'md' = isSmallScreen 
                        ? (total > 15 ? 'xs' : 'sm')
                        : (total > 16 ? 'sm' : 'md');

                      // Stable gentle step angle and arch curve
                      const stepAngle = total > 14 ? 1.5 : total > 8 ? 2.0 : 2.5;
                      const rot = rel * stepAngle;
                      const archY = Math.pow(Math.abs(rel), 1.25) * 1.1;

                      // Stable overlap spacing that doesn't collapse or wildly shift when card count decreases
                      const baseWidth = cardSize === 'xs' ? 36 : cardSize === 'sm' ? 56 : 76;
                      const maxContainerWidth = typeof window !== 'undefined' ? Math.max(window.innerWidth - 160, 260) : 500;
                      const requiredWidth = total * baseWidth;
                      let overlapMargin = 0;
                      if (idx > 0 && requiredWidth > maxContainerWidth) {
                        const excess = requiredWidth - maxContainerWidth;
                        const neededNegativePerCard = excess / (total - 1);
                        overlapMargin = -Math.min(neededNegativePerCard, baseWidth * 0.75);
                      } else if (idx > 0) {
                        overlapMargin = -26; // Consistent natural poker fan overlap
                      }

                      return (
                        <div
                          key={card.id}
                          id={`player-card-${card.id}`}
                          className="transition-all duration-200 origin-bottom hover:!rotate-0 hover:!-translate-y-10 hover:scale-125 hover:z-50 cursor-pointer shrink-0"
                          style={{
                            zIndex: idx,
                            marginLeft: `${Math.round(overlapMargin)}px`,
                            transform: `rotate(${rot}deg) translateY(${archY}px)`,
                          }}
                        >
                          <CardView
                            card={card}
                            isPlayable={playable}
                            size={cardSize}
                            onClick={() => handleCardClick(card)}
                          />
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>

            {/* Bottom-Right: 3D Red "CALL UNO" Buzzer Button - ONLY appears when player has exactly 1 card! */}
            {yourHand.length === 1 && (
              <div className="flex flex-col items-center relative animate-fadeIn">
                {/* Warning indicator if player has 1 card and has not called UNO */}
                {!selfPlayer.calledUno && (
                  <div className="absolute -top-14 right-0 whitespace-nowrap bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-yellow-200 text-[10px] sm:text-xs font-black px-3 py-1.5 rounded-full border-2 border-yellow-300 shadow-[0_0_25px_rgba(239,68,68,0.95)] animate-bounce flex items-center gap-1.5 z-40">
                    <span className="animate-ping">⚠️</span>
                    <span>PINDUTIN ANG UNO! Baka ka maunahan (+1 Penalty Card)!</span>
                  </div>
                )}
                {/* Success indicator when already called UNO */}
                {selfPlayer.calledUno && (
                  <div className="absolute -top-8 right-0 whitespace-nowrap bg-emerald-600/95 text-yellow-200 text-[9px] sm:text-[10px] font-black px-2.5 py-0.5 rounded-full border border-emerald-400 shadow z-40 flex items-center gap-1">
                    <span>✅</span>
                    <span>LIGTAS! Naka-UNO ka na!</span>
                  </div>
                )}

                <div
                  onClick={handleCallUnoClick}
                  className={`w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-white shadow-buzzer-base p-1 sm:p-1.5 flex items-center justify-center cursor-pointer select-none transition-transform active:scale-95 ${
                    !selfPlayer.calledUno
                      ? 'animate-bounce ring-4 ring-red-500 shadow-[0_0_25px_rgba(239,68,68,0.95)]'
                      : 'ring-2 ring-emerald-400 opacity-80'
                  }`}
                  title="Shout UNO!"
                >
                  <div className="w-full h-full rounded-full bg-gradient-to-b from-red-500 via-red-600 to-red-800 shadow-buzzer active:translate-y-1 active:shadow-none flex flex-col items-center justify-center border-2 border-red-400/80 transition-all">
                    <span className="text-white font-black text-[7px] sm:text-[9px] tracking-tight uppercase leading-none opacity-90 drop-shadow">
                      CALL
                    </span>
                    <span className="text-yellow-300 font-black italic text-xs sm:text-sm md:text-base tracking-wider drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                      UNO
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Leave Match Confirmation Modal */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl">
            <h3 className="text-lg font-black text-white mb-2">Leave Match?</h3>
            <p className="text-xs text-slate-400 mb-6">
              Are you sure you want to exit? Your seat will remain open for reconnection.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
              >
                Stay & Play
              </button>
              <button
                onClick={() => {
                  setShowLeaveConfirm(false);
                  onLeaveMatch();
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs shadow transition"
              >
                Leave Match
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Color Picker for Wild Cards - High z-index (z-[70]) so nothing can cover or overlap it */}
      {selectedWildCard && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn pointer-events-auto">
          <div className="relative bg-slate-900 border-2 border-amber-400/80 rounded-2xl p-6 max-w-sm w-full text-center shadow-[0_0_50px_rgba(0,0,0,0.9)]">
            {/* Top-right X button */}
            <button
              onClick={() => setSelectedWildCard(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-black text-sm cursor-pointer border border-slate-700 transition"
              title="Isara (Cancel)"
            >
              ✕
            </button>

            <h3 className="text-xl font-black text-amber-300 mb-1 tracking-wide">PUMILI NG KULAY</h3>
            <p className="text-xs text-slate-300 mb-5 font-semibold">
              {isDarkSide ? 'Piliin ang Dark Side kulay' : 'Piliin ang magiging kulay ng Wild card'}
            </p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {(isDarkSide
                ? (['teal', 'orange', 'purple', 'pink'] as CardColor[])
                : (['red', 'blue', 'yellow', 'green'] as CardColor[])
              ).map((col) => (
                <button
                  key={col}
                  onClick={() => handleSelectColor(col)}
                  className={`py-4 rounded-xl text-white font-black text-base uppercase shadow-lg border-2 transition hover:scale-105 active:scale-95 cursor-pointer ${
                    col === 'red'
                      ? 'bg-red-600 border-red-300 ring-2 ring-red-500/50'
                      : col === 'blue'
                      ? 'bg-blue-600 border-blue-300 ring-2 ring-blue-500/50'
                      : col === 'yellow'
                      ? 'bg-amber-400 border-amber-200 text-slate-950 font-black ring-2 ring-yellow-400/50'
                      : col === 'green'
                      ? 'bg-emerald-600 border-emerald-300 ring-2 ring-emerald-500/50'
                      : col === 'teal'
                      ? 'bg-teal-600 border-teal-300 ring-2 ring-teal-500/50'
                      : col === 'orange'
                      ? 'bg-orange-600 border-orange-300 ring-2 ring-orange-500/50'
                      : col === 'purple'
                      ? 'bg-purple-600 border-purple-300 ring-2 ring-purple-500/50'
                      : 'bg-pink-600 border-pink-300 ring-2 ring-pink-500/50'
                  }`}
                >
                  {col}
                </button>
              ))}
            </div>

            {/* Cancel Button if player wants to change their mind */}
            <button
              onClick={() => setSelectedWildCard(null)}
              className="text-xs text-slate-400 hover:text-white px-4 py-1.5 rounded-full hover:bg-slate-800 transition cursor-pointer font-bold border border-slate-700"
            >
              ✕ Huwag Muna (Cancel)
            </button>
          </div>
        </div>
      )}

      {/* Seven Hand Swap Target Selection */}
      {selectedSevenCard && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn pointer-events-auto">
          <div className="relative bg-slate-900 border-2 border-amber-500 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
            {/* Top-right X button */}
            <button
              onClick={() => setSelectedSevenCard(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-black text-sm cursor-pointer border border-slate-700 transition"
              title="Isara (Cancel)"
            >
              ✕
            </button>

            <h3 className="text-lg font-black text-white mb-1">SEVEN RULE (SWAP)</h3>
            <p className="text-xs text-slate-400 mb-4">Pumili ng kalaro na ipagpapalit ang baraha</p>
            <div className="space-y-2 mb-4">
              {activeOpponents.map((opp) => (
                <button
                  key={opp.id}
                  onClick={() => handleSelectSevenTarget(opp.id)}
                  className="w-full p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-between text-xs font-bold border border-slate-700 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center shrink-0">
                      <AvatarDisplay avatar={opp.avatar} />
                    </div>
                    <span className="text-white">{opp.name}</span>
                  </div>
                  <span className="text-amber-400">{opp.cardCount} cards</span>
                </button>
              ))}
            </div>

            {/* Cancel Button */}
            <button
              onClick={() => setSelectedSevenCard(null)}
              className="text-xs text-slate-400 hover:text-white px-4 py-1.5 rounded-full hover:bg-slate-800 transition cursor-pointer font-bold border border-slate-700"
            >
              ✕ Huwag Muna (Cancel)
            </button>
          </div>
        </div>
      )}

      {/* Targeted Action Modal (Targeted Draw 2 & Forced Swap for Uno All Wild) */}
      {selectedTargetCard && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn pointer-events-auto">
          <div className="relative bg-slate-900 border-2 border-purple-500 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
            {/* Top-right X button */}
            <button
              onClick={() => setSelectedTargetCard(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-black text-sm cursor-pointer border border-slate-700 transition"
              title="Isara (Cancel)"
            >
              ✕
            </button>

            <h3 className="text-lg font-black text-white mb-1">
              {selectedTargetCard.type === 'forced_swap' ? 'FORCED HAND SWAP' : 'TARGETED DRAW 2'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              {selectedTargetCard.type === 'forced_swap'
                ? 'Pumili ng kalaro na ipagpapalit ang iyong baraha'
                : 'Pumili ng kalaro na papabunutin ng 2 baraha'}
            </p>
            <div className="space-y-2 mb-4">
              {activeOpponents.map((opp) => (
                <button
                  key={opp.id}
                  onClick={() => handleSelectActionTarget(opp.id)}
                  className="w-full p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-between text-xs font-bold border border-slate-700 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center shrink-0">
                      <AvatarDisplay avatar={opp.avatar} />
                    </div>
                    <span className="text-white">{opp.name}</span>
                  </div>
                  <span className="text-purple-400 font-bold">{opp.cardCount} cards</span>
                </button>
              ))}
            </div>

            {/* Cancel Button */}
            <button
              onClick={() => setSelectedTargetCard(null)}
              className="text-xs text-slate-400 hover:text-white px-4 py-1.5 rounded-full hover:bg-slate-800 transition cursor-pointer font-bold border border-slate-700"
            >
              ✕ Huwag Muna (Cancel)
            </button>
          </div>
        </div>
      )}

      {/* KEEP OR PLAY PROMPT: Borderless floating PNG card + action buttons.
          Hidden whenever color selection or target selection is in progress to avoid any overlapping! */}
      {gameState.pendingKeepOrPlay &&
        gameState.pendingKeepOrPlay.playerId === currentUserId &&
        !selectedWildCard &&
        !selectedSevenCard &&
        !selectedTargetCard && (
        <div className="fixed bottom-28 sm:bottom-36 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-fadeIn flex flex-col items-center">
          <div className="pointer-events-auto flex flex-col items-center gap-2">
            {/* Raw PNG Drawn Card with 3D Pop and Soft Glow */}
            <div className="relative transform hover:scale-110 active:scale-95 transition-transform duration-200 cursor-pointer drop-shadow-[0_12px_24px_rgba(0,0,0,0.85)] filter hover:drop-shadow-[0_0_20px_rgba(250,204,21,0.9)] animate-bounce-slow">
              <CardView card={gameState.pendingKeepOrPlay.drawnCard} size="lg" />
            </div>

            {/* Floating Action Buttons: Itabi o Ilapag */}
            <div className="flex items-center gap-3">
              {/* KEEP BUTTON */}
              <button
                type="button"
                onClick={() => {
                  soundManager.play('card_deal');
                  onPassTurn();
                }}
                className="py-1.5 px-3.5 rounded-full bg-slate-900/90 hover:bg-slate-800 active:scale-90 border border-slate-600 text-slate-200 font-black text-xs uppercase transition shadow-[0_4px_12px_rgba(0,0,0,0.6)] cursor-pointer flex items-center gap-1.5 backdrop-blur-sm"
              >
                <span>📥</span>
                <span>ITABI</span>
              </button>

              {/* PLAY BUTTON */}
              <button
                type="button"
                onClick={() => {
                  const cardToPlay = gameState.pendingKeepOrPlay!.drawnCard;
                  handleCardClick(cardToPlay);
                }}
                className="py-1.5 px-4 rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 active:scale-90 text-slate-950 font-black text-xs uppercase transition shadow-[0_0_18px_rgba(250,204,21,0.8)] cursor-pointer flex items-center gap-1.5 border border-yellow-200"
              >
                <span>🔥</span>
                <span>ILAPAG</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Flying Card Animation Overlay onto Table */}
      {flyingCard && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          <div
            className="absolute"
            style={{
              left: flyingCard.startX,
              top: flyingCard.startY,
              transform: flyingCard.active
                ? `translate(${flyingCard.deltaX}px, ${flyingCard.deltaY}px) rotate(${flyingCard.rotation}deg) scale(1)`
                : `translate(0px, 0px) rotate(0deg) scale(1.12)`,
              transition: 'transform 360ms cubic-bezier(0.2, 0.85, 0.25, 1)',
              filter: flyingCard.active
                ? 'drop-shadow(0 6px 12px rgba(0,0,0,0.5))'
                : 'drop-shadow(0 20px 25px rgba(0,0,0,0.7))',
            }}
          >
            <CardView card={flyingCard.card} size="md" />
          </div>
        </div>
      )}

      {/* Sliding Draw Card Animation Overlay (From Draw Deck to Any Player) */}
      {flyingDrawCards.map((card) => (
        <div
          key={card.id}
          className="fixed pointer-events-none z-50 select-none overflow-visible"
          style={{
            left: card.startX,
            top: card.startY,
            transform: card.active
              ? `translate(${card.deltaX}px, ${card.deltaY}px) rotate(${card.rotation}deg) scale(${card.targetScale})`
              : `translate(0px, 0px) rotate(0deg) scale(1)`,
            transition: 'transform 420ms cubic-bezier(0.16, 1, 0.3, 1), opacity 200ms ease-out',
            opacity: card.arrived ? 0 : 1,
            filter: card.active
              ? 'drop-shadow(0 18px 24px rgba(0,0,0,0.75))'
              : 'drop-shadow(0 4px 6px rgba(0,0,0,0.4))',
          }}
        >
          <CardView isBack={true} size="md" className="shadow-2xl" />
        </div>
      ))}

    </div>
  );
};
