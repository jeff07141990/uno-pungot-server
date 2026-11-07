import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  CardColor,
  ChatMessage,
  GameVariant,
  HouseRules,
  PublicGameState,
  ReactionEvent,
  SoundEffectType,
} from './engine/types';
import { networkManager, ConnectionStatus } from './services/networkManager';
import { soundManager } from './audio/soundManager';
import { voiceManager } from './services/voiceManager';
import { getOrCreateGuestSession } from './firebase/config';
import { historyService, PlayerStats } from './services/historyService';
import { localGameEngine } from './services/localGameEngine';
import { deviceStorage } from './services/deviceStorage';

import { App as CapacitorApp } from '@capacitor/app';
import { HomeScreen } from './components/HomeScreen';
import { LobbyView } from './components/LobbyView';
import { GameTable } from './components/GameTable';
import { VsTransitionScreen } from './components/VsTransitionScreen';
import { ChatBox } from './components/ChatBox';
import { EmojiReactions } from './components/EmojiReactions';

import { CreateRoomModal } from './components/Modals/CreateRoomModal';
import { JoinRoomModal } from './components/Modals/JoinRoomModal';
import { PublicRoomsModal } from './components/Modals/PublicRoomsModal';
import { HowToPlayModal } from './components/Modals/HowToPlayModal';
import { SettingsModal } from './components/Modals/SettingsModal';
import { ProfileModal } from './components/Modals/ProfileModal';
import { MatchHistoryModal } from './components/Modals/MatchHistoryModal';
import { GameOverModal } from './components/Modals/GameOverModal';
import { WD4ChallengeModal } from './components/Modals/WD4ChallengeModal';
import { DareModal } from './components/Modals/DareModal';
import { ShopModal } from './components/Modals/ShopModal';
import { MissionsModal } from './components/Modals/MissionsModal';
import { LeaderboardModal } from './components/Modals/LeaderboardModal';
import { AdminModal } from './components/Modals/AdminModal';
import { GooglePromptModal } from './components/Modals/GooglePromptModal';
import { economyService } from './services/economyService';
import { firebaseState } from './firebase/config';
import { DailyMission, PlayerWallet, PowerUpId, PowerUpItem } from './engine/types';

export const App: React.FC = () => {
  // Player state
  const [userId, setUserId] = useState<string>(() => {
    let uid = localStorage.getItem('uno_guest_uid');
    if (!uid) {
      uid = 'usr_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
      localStorage.setItem('uno_guest_uid', uid);
    }
    return uid;
  });
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem('uno_player_name') || 'Player 1';
  });
  const [userAvatar, setUserAvatar] = useState<string>(() => {
    return localStorage.getItem('uno_player_avatar') || '🦊';
  });

  // Game & Networking state
  const [view, setView] = useState<'home' | 'lobby' | 'game'>('home');
  const viewRef = useRef<'home' | 'lobby' | 'game'>('home');
  viewRef.current = view;
  const [showVsScreen, setShowVsScreen] = useState<boolean>(false);
  const previousPhaseRef = useRef<string>('lobby');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [publicState, setPublicState] = useState<PublicGameState | null>(null);
  const [yourHand, setYourHand] = useState<Card[]>([]);

  // Chat & Reactions
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [showEmojiBar, setShowEmojiBar] = useState<boolean>(false);
  const [activeReactions, setActiveReactions] = useState<ReactionEvent[]>([]);
  const [mutedPlayers, setMutedPlayers] = useState<Set<string>>(new Set());

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isPublicRoomsOpen, setIsPublicRoomsOpen] = useState(false);
  const [publicRooms, setPublicRooms] = useState<any[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'settings' | 'card_studio'>('settings');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);

  // Economy & Power-Up State
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isMissionsOpen, setIsMissionsOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isGooglePromptOpen, setIsGooglePromptOpen] = useState(false);
  const [wallet, setWallet] = useState<PlayerWallet | null>(() => economyService.getCachedWallet());
  const [catalog, setCatalog] = useState<Record<PowerUpId, PowerUpItem> | null>(() => economyService.getCachedCatalog());
  const [missions, setMissions] = useState<DailyMission[]>(() => economyService.getCachedMissions());

  // Audio & Toast & Voice
  const [isMuted, setIsMuted] = useState(() => soundManager.getMuted());
  const [toastText, setToastText] = useState<string | null>(null);
  const hasRecordedCurrentGameRef = useRef<boolean>(false);

  // Global Voice Communication across Home, Lobby, and Table
  const [isVoiceMuted, setIsVoiceMuted] = useState<boolean>(() => voiceManager.getIsMuted());
  const [isVoiceConnected, setIsVoiceConnected] = useState<boolean>(() => voiceManager.getIsInitialized());
  const [speakingPlayerIds, setSpeakingPlayerIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsubscribe = voiceManager.subscribe((speaking, muted, connected) => {
      setSpeakingPlayerIds(speaking);
      setIsVoiceMuted(muted);
      setIsVoiceConnected(connected);
    });
    return () => unsubscribe();
  }, []);

  const handleToggleVoiceMic = async () => {
    const activeRoom = publicState?.roomId || 'global_pungot_lounge';
    const activeUid = userIdRef.current || userId;
    if (!isVoiceConnected) {
      const ok = await voiceManager.init(activeRoom, activeUid);
      if (ok) {
        voiceManager.setMuted(false);
        showToast('Naka-ON na ang mikropono!', 'turn_alert');
      } else {
        showToast('Hindi mabuksan ang mic. I-allow ang microphone permission.', 'error');
      }
    } else {
      const nextMuted = voiceManager.toggleMute();
      showToast(nextMuted ? 'Naka-MUTE na ang mikropono.' : 'Bukas na ang mikropono (Live)!', nextMuted ? undefined : 'turn_alert');
    }
  };

  const handleExitGame = async () => {
    // 1. Try official Capacitor App plugin
    try {
      await CapacitorApp.exitApp();
      return;
    } catch {
      // Fallback
    }

    // 2. Try window.Capacitor legacy bridge
    try {
      const cap = (window as any).Capacitor;
      if (cap?.Plugins?.App?.exitApp) {
        cap.Plugins.App.exitApp();
        return;
      }
    } catch {
      // Ignore
    }

    // 3. Try window.close()
    window.close();

    // 4. Fallback toast
    showToast('Maaari mo nang isara ang tab o app.', 'turn_alert');
  };

  const userIdRef = useRef(userId);
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  const showToast = (text: string, sound?: SoundEffectType) => {
    setToastText(text);
    if (sound) soundManager.play(sound);
    setTimeout(() => {
      setToastText((prev) => (prev === text ? null : prev));
    }, 3200);
  };

  // 1. Initialize user identity, economy wallet, and check URL invite params
  useEffect(() => {
    getOrCreateGuestSession().then(({ uid }) => {
      setUserId(uid);
      userIdRef.current = uid;

      // Check if user is not yet linked to Google.
      // Automatically prompt newly installed & updated users to bind their account!
      const isAlreadyBound = firebaseState.auth?.currentUser && !firebaseState.auth.currentUser.isAnonymous;
      const hasDismissedToday = sessionStorage.getItem('uno_dismissed_google_prompt');
      if (!isAlreadyBound && !hasDismissedToday) {
        // Small delay so game assets load first
        setTimeout(() => {
          setIsGooglePromptOpen(true);
        }, 1200);
      }

      // Fetch or initialize authoritative wallet
      economyService.fetchWallet(uid, userName, userAvatar).then((data) => {
        setWallet(data.wallet);
        setCatalog(data.catalog);
        setMissions(data.missions);
      });

      // Check if URL contains ?join=ROOM_CODE
      const urlParams = new URLSearchParams(window.location.search);
      const joinCode = urlParams.get('join');
      if (joinCode) {
        handleJoinRoom(joinCode, uid);
      }
    });

    historyService.getPlayerStats(userId).then(setPlayerStats);

    const unsubscribeEconomy = economyService.subscribe(() => {
      const activeUid = userIdRef.current || userId;
      setWallet(economyService.getCachedWallet(activeUid));
      setCatalog(economyService.getCachedCatalog());
      setMissions(economyService.getCachedMissions());
    });

    return () => unsubscribeEconomy();
  }, []);

  // 2. Setup network & local offline engine callbacks
  useEffect(() => {
    localGameEngine.setCallbacks({
      onSyncState: (state, hand, yourPlayerId) => {
        if (yourPlayerId) {
          setUserId(yourPlayerId);
          userIdRef.current = yourPlayerId;
        }
        setPublicState(state);
        setYourHand([...hand]);

        if (state.phase === 'playing') {
          hasRecordedCurrentGameRef.current = false;
          if (previousPhaseRef.current !== 'playing') {
            setShowVsScreen(true);
            try {
              soundManager.play('turn_alert');
            } catch (_) {}
          }
          setView('game');
        } else if (state.phase === 'ended') {
          setShowVsScreen(false);
          setView('game');

          if (!hasRecordedCurrentGameRef.current && state.winnerId) {
            hasRecordedCurrentGameRef.current = true;
            const currentUid = userIdRef.current || userId;
            const winner = state.players.find((p) => p.id === state.winnerId);
            const userWon = state.winnerId === currentUid;
            const userScore = state.players.find((p) => p.id === currentUid)?.score || 0;

            historyService.recordMatch(
              {
                roomId: state.roomId,
                roomName: state.roomName,
                winnerId: state.winnerId,
                winnerName: winner?.name || 'Player',
                winnerAvatar: winner?.avatar || '🏆',
                playersCount: state.players.length,
                playerNames: state.players.map((p) => p.name),
                cardsPlayed: state.turnCount,
                durationSeconds: state.startedAt && state.endedAt ? Math.round((state.endedAt - state.startedAt) / 1000) : 60,
                endedAt: state.endedAt || Date.now(),
                userWon,
                userScore,
              },
              currentUid
            ).then(() => {
              historyService.getPlayerStats(currentUid).then(setPlayerStats);
            });
          }
        }
        previousPhaseRef.current = state.phase;
      },
      onToast: (text, sound) => {
        showToast(text, sound);
      },
      onUnoShout: (shoutingPlayerId) => {
        try {
          soundManager.play('uno_call');
        } catch (_) {}
      },
      onWalletUpdate: (updatedWallet) => {
        const currentUid = userIdRef.current || userId;
        setWallet(updatedWallet);
        economyService.saveWalletToStorage(updatedWallet, currentUid);
      },
    });

    networkManager.setCallbacks({
      onStatusChange: (status) => {
        setConnectionStatus(status);
      },
      onSyncState: (state, hand, yourPlayerId) => {
        if (yourPlayerId) {
          setUserId(yourPlayerId);
          userIdRef.current = yourPlayerId;
        }
        setPublicState(state);
        setYourHand([...hand]);
        if (state.roomId) {
          try {
            localStorage.setItem('uno_recent_room_id', state.roomId.toUpperCase());
          } catch {}
        }

        if (state.phase === 'lobby') {
          setView('lobby');
          setShowVsScreen(false);
          hasRecordedCurrentGameRef.current = false;
        } else if (state.phase === 'playing') {
          // If transitioning from lobby or direct home game to playing, show the VS intro animation!
          if (previousPhaseRef.current !== 'playing') {
            setShowVsScreen(true);
            try {
              soundManager.play('turn_alert');
            } catch (_) {}
          }
          setView('game');
        } else if (state.phase === 'ended') {
          setShowVsScreen(false);
          setView('game'); // Remain on game table with GameOverModal overlay

          // Record match to history once
          if (!hasRecordedCurrentGameRef.current && state.winnerId) {
            hasRecordedCurrentGameRef.current = true;
            const currentUid = userIdRef.current || userId;
            const winner = state.players.find((p) => p.id === state.winnerId);
            const userWon = state.winnerId === currentUid;
            const userScore = state.players.find((p) => p.id === currentUid)?.score || 0;

            historyService.recordMatch(
              {
                roomId: state.roomId,
                roomName: state.roomName,
                winnerId: state.winnerId,
                winnerName: winner?.name || 'Player',
                winnerAvatar: winner?.avatar || '🏆',
                playersCount: state.players.length,
                playerNames: state.players.map((p) => p.name),
                cardsPlayed: state.turnCount,
                durationSeconds: state.startedAt && state.endedAt ? Math.round((state.endedAt - state.startedAt) / 1000) : 60,
                endedAt: state.endedAt || Date.now(),
                userWon,
                userScore,
              },
              currentUid
            ).then(() => {
              historyService.getPlayerStats(currentUid).then(setPlayerStats);
            });

            // Refresh authoritative wallet to reflect victory coin rewards & mission progress
            setTimeout(() => {
              economyService.fetchWallet(currentUid, userName, userAvatar).then((data) => {
                setWallet(data.wallet);
                setCatalog(data.catalog);
                setMissions(data.missions);
              });
            }, 600);
          }
        }

        previousPhaseRef.current = state.phase;
      },
      onToast: (text, sound) => {
        // If we are currently in an active game, don't show repetitive turn action toasts
        // since the center table ticker already displays them cleanly.
        if (viewRef.current === 'game') {
          // Play the sound if provided, but don't show redundant popup toast
          if (sound && !isMuted) {
            soundManager.play(sound);
          }
          return;
        }
        showToast(text, sound);
      },
      onPeekResult: (targetPlayerName, card) => {
        showToast(`👁️ PEEK RESULT: ${targetPlayerName} has [${card.color.toUpperCase()} ${card.type.toUpperCase()}]!`, 'power_general');
      },
      onWalletUpdate: (updatedWallet, levelUp, xpGained) => {
        if (updatedWallet) {
          const currentUid = userIdRef.current || userId;
          setWallet(updatedWallet);
          economyService.saveWalletToStorage(updatedWallet, currentUid);
          if (levelUp) {
            showToast(`🎉 LEVEL UP! Umabot ka sa Level ${levelUp.newLevel}! (+₱${levelUp.bonus})`, 'game_win');
          }
        }
      },
      onChat: (msg) => {
        setMessages((prev) => [...prev, msg]);
        if (!isChatOpen) {
          setUnreadChatCount((prev) => prev + 1);
        }
      },
      onReaction: (event) => {
        setActiveReactions((prev) => [...prev, event]);
        setTimeout(() => {
          setActiveReactions((prev) => prev.filter((r) => r.timestamp !== event.timestamp));
        }, 2500);
      },
      onError: (err) => {
        showToast(err, 'error');
      },
    });
  }, [userId, isChatOpen]);

  // Audio mute toggle
  const handleToggleMute = () => {
    const next = soundManager.toggleMute();
    setIsMuted(next);
  };

  // Profile save
  const handleSaveProfile = (name: string, avatar: string) => {
    setUserName(name);
    setUserAvatar(avatar);
    localStorage.setItem('uno_player_name', name);
    localStorage.setItem('uno_player_avatar', avatar);
    showToast('Profile updated!', 'turn_alert');
  };

  const fetchWithFallback = async (path: string, options?: RequestInit): Promise<Response> => {
    const candidates = networkManager.getCandidateHosts();
    let lastError: any = null;

    for (const host of candidates) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        const res = await fetch(`${host}${path}`, {
          ...options,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          networkManager.setWorkingHost(host);
          return res;
        }
      } catch (err) {
        lastError = err;
      }
    }

    // Fallback to relative URL if web browser
    const isCapacitor = typeof window !== 'undefined' && ((window as any).Capacitor !== undefined || !window.location.port);
    if (!isCapacitor) {
      try {
        const res = await fetch(path, options);
        if (res.ok) return res;
      } catch (e) {
        lastError = e;
      }
    }

    throw lastError || new Error('All candidate servers unreachable');
  };

  // Room actions
  const handleCreateRoom = async (config: {
    roomName: string;
    isPrivate: boolean;
    variant: GameVariant;
    houseRules: HouseRules;
    entryFee: any;
  }) => {
    setIsCreateOpen(false);
    try {
      const activeUid = userId || localStorage.getItem('uno_guest_uid') || 'guest_' + Date.now();
      setUserId(activeUid);
      userIdRef.current = activeUid;
      const res = await fetchWithFallback('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostId: activeUid,
          hostName: userName,
          hostAvatar: userAvatar,
          options: {
            roomName: config.roomName,
            isPrivate: config.isPrivate,
            variant: config.variant,
            houseRules: config.houseRules,
            entryFee: config.entryFee || 0,
          },
        }),
      });
      const data = await res.json();
      if (data.roomId) {
        handleJoinRoom(data.roomId, activeUid);
      }
    } catch {
      showToast('Could not reach game server. Check connection.', 'error');
    }
  };

  const handleJoinRoom = (roomId: string, explicitUid?: string) => {
    setIsJoinOpen(false);
    setIsPublicRoomsOpen(false);
    const cleanRoomId = roomId.trim().toUpperCase();
    try {
      localStorage.setItem('uno_recent_room_id', cleanRoomId);
    } catch {}
    const activeUid = explicitUid || userId || localStorage.getItem('uno_guest_uid') || 'guest_' + Date.now();
    setUserId(activeUid);
    userIdRef.current = activeUid;
    networkManager.connect(cleanRoomId, {
      id: activeUid,
      name: userName,
      avatar: userAvatar,
    });
  };

  const handleReconnectRoom = () => {
    const targetRoomId = publicState?.roomId || localStorage.getItem('uno_recent_room_id');
    if (!targetRoomId) {
      showToast('Walang active o recent match na nahanap.', 'error');
      return;
    }
    showToast(`Kinokonekta muli sa Room #${targetRoomId}...`, 'turn_alert');
    const activeUid = userIdRef.current || userId || localStorage.getItem('uno_guest_uid') || 'guest_' + Date.now();
    networkManager.connect(targetRoomId, {
      id: activeUid,
      name: userName,
      avatar: userAvatar,
    });
  };

  const handlePlayWithBots = async (botCount: number, variant: GameVariant = 'classic') => {
    const activeUid = userId || localStorage.getItem('uno_guest_uid') || 'guest_' + Date.now();
    setUserId(activeUid);
    userIdRef.current = activeUid;

    // Helper to launch offline zero-latency bot game immediately
    const startOfflineBotGame = () => {
      showToast('Naglalaro sa Offline Mode (Zero Lag)...');
      localGameEngine.startBotGame(activeUid, userName, userAvatar, botCount, variant);
    };

    // If device is offline, launch directly
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      startOfflineBotGame();
      return;
    }

    try {
      showToast('Naghahanda ng bot match...');

      // 2-second timeout: if internet is slow or server unreachable, fallback to local engine instantly
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetchWithFallback('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          hostId: activeUid,
          hostName: userName,
          hostAvatar: userAvatar,
          options: {
            roomName: 'Solo Bot Challenge',
            isPrivate: true,
            variant,
            initialBots: botCount,
            autoStart: false,
            houseRules: {
              turnTimer: 30,
              stacking: true,
              sevenZero: false,
              wildDraw4Challenge: true,
              startingHandSize: 7,
              allowSpectators: false,
            },
          },
        }),
      });

      clearTimeout(timeoutId);

      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !contentType.includes('application/json')) {
        throw new Error('Server unreachable');
      }

      const data = await res.json();
      if (data.roomId) {
        networkManager.connect(data.roomId, {
          id: activeUid,
          name: userName,
          avatar: userAvatar,
        });

        setTimeout(() => {
          networkManager.startGame(data.roomId, activeUid);
        }, 150);
      } else {
        startOfflineBotGame();
      }
    } catch (err: any) {
      console.warn('Network bot match failed, falling back to local offline game engine:', err);
      startOfflineBotGame();
    }
  };

  const handleSpectateRoom = (roomId: string) => {
    setIsPublicRoomsOpen(false);
    setIsJoinOpen(false);
    const activeUid = userId || localStorage.getItem('uno_guest_uid') || 'guest_' + Date.now();
    setUserId(activeUid);
    userIdRef.current = activeUid;
    networkManager.connect(roomId, {
      id: activeUid,
      name: userName,
      avatar: userAvatar,
    }, true);
  };

  const handleFetchPublicRooms = async (silent: boolean = false) => {
    if (!silent) setIsLoadingRooms(true);
    try {
      const res = await fetchWithFallback('/api/rooms');
      const data = await res.json();
      setPublicRooms(data.rooms || []);
    } catch {
      setPublicRooms([]);
    } finally {
      if (!silent) setIsLoadingRooms(false);
    }
  };

  const handleLeaveRoom = () => {
    if (localGameEngine.isRunning()) {
      localGameEngine.stop();
    }
    networkManager.disconnect();
    setPublicState(null);
    setYourHand([]);
    setMessages([]);
    setView('home');

    // Refresh wallet so Home screen immediately reflects updated coins and level
    const currentUid = userIdRef.current || userId;
    economyService.fetchWallet(currentUid, userName, userAvatar).then((data) => {
      setWallet(data.wallet);
      setCatalog(data.catalog);
      setMissions(data.missions);
    }).catch(() => {});

    // Clear URL join param
    if (window.history.pushState) {
      const newUrl = window.location.origin + window.location.pathname;
      window.history.pushState({ path: newUrl }, '', newUrl);
    }
  };

  const handleToggleMutePlayer = (targetId: string) => {
    setMutedPlayers((prev) => {
      const next = new Set(prev);
      if (next.has(targetId)) {
        next.delete(targetId);
        showToast('Player unmuted.');
      } else {
        next.add(targetId);
        showToast('Player muted.');
      }
      return next;
    });
  };

  // Render view
  return (
    <div className="min-h-screen bg-[#0B1120] text-white">
      {/* Toast Notification Banner */}
      {toastText && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-fadeIn">
          <div className="bg-slate-900/95 border-2 border-amber-400/80 px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-2 text-xs sm:text-sm font-bold text-amber-300 backdrop-blur-md">
            <span>{toastText}</span>
          </div>
        </div>
      )}

      {/* View routing with safe fallbacks */}
      {view === 'home' || !publicState ? (
        <HomeScreen
          playerName={userName}
          playerAvatar={userAvatar}
          connectionStatus={connectionStatus}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          isVoiceMuted={isVoiceMuted}
          isVoiceConnected={isVoiceConnected}
          isSpeaking={speakingPlayerIds.has(userId)}
          onToggleVoiceMic={handleToggleVoiceMic}
          onExitGame={handleExitGame}
          wallet={wallet}
          onOpenShop={() => setIsShopOpen(true)}
          onOpenMissions={() => setIsMissionsOpen(true)}
          onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
          onOpenAdmin={() => setIsAdminOpen(true)}
          onPlayOnline={() => {
            setIsPublicRoomsOpen(true);
            handleFetchPublicRooms();
          }}
          onCreateRoom={() => setIsCreateOpen(true)}
          onJoinRoom={(roomId) => {
            if (roomId) {
              handleJoinRoom(roomId);
            } else {
              setIsJoinOpen(true);
            }
          }}
          onPlayWithBots={handlePlayWithBots}
          onOpenHowToPlay={() => setIsHowToPlayOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenProfile={() => setIsProfileOpen(true)}
          onOpenMatchHistory={() => {
            historyService.getPlayerStats(userId).then(setPlayerStats);
            setIsHistoryOpen(true);
          }}
          publicRooms={publicRooms}
          isLoadingRooms={isLoadingRooms}
          onRefreshRooms={handleFetchPublicRooms}
          onSpectateRoom={handleSpectateRoom}
        />
      ) : view === 'lobby' ? (
        <LobbyView
          gameState={publicState}
          currentUserId={userId}
          onStartGame={() => networkManager.startGame(publicState.roomId, userId)}
          onSetReady={(ready) => networkManager.setReady(publicState.roomId, userId, ready)}
          onAddBot={() => networkManager.addBot(publicState.roomId, userId)}
          onRemovePlayer={(targetId) => networkManager.removePlayer(publicState.roomId, userId, targetId)}
          onLeaveRoom={handleLeaveRoom}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenShop={() => setIsShopOpen(true)}
          onOpenChat={() => {
            setIsChatOpen(true);
            setUnreadChatCount(0);
          }}
          unreadChatCount={unreadChatCount}
          onToast={showToast}
          wallet={wallet}
          onConfirmPayment={() => networkManager.confirmEntryPayment(publicState.roomId, userId)}
          onUpdateEntryFee={(fee) => networkManager.updateEntryFee(publicState.roomId, userId, fee)}
          onUpdateRules={(rules, variant) => networkManager.updateRules(publicState.roomId, userId, rules, variant)}
        />
      ) : (
        <>
          {/* Animated Tournament VS Intro Screen (2-10 Players) */}
          {showVsScreen && publicState && (
            <VsTransitionScreen
              gameState={publicState}
              currentUserId={userId}
              wallet={wallet}
              onFinish={() => setShowVsScreen(false)}
            />
          )}

          <GameTable
            gameState={publicState}
            yourHand={yourHand}
            currentUserId={userId}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            onPlayCard={(cardId, chosenColor, targetId) => {
              if (localGameEngine.isRunning()) {
                localGameEngine.playCard(userIdRef.current || userId, cardId, chosenColor, targetId);
              } else {
                networkManager.playCard(publicState.roomId, userIdRef.current || userId, cardId, chosenColor, targetId);
              }
            }}
            onDrawCard={(targetCardIndex) => {
              if (localGameEngine.isRunning()) {
                localGameEngine.drawCard(userIdRef.current || userId);
              } else {
                networkManager.drawCard(publicState.roomId, userIdRef.current || userId, targetCardIndex);
              }
            }}
            onPassTurn={() => {
              if (localGameEngine.isRunning()) {
                localGameEngine.passTurn(userIdRef.current || userId);
              } else {
                networkManager.passTurn(publicState.roomId, userIdRef.current || userId);
              }
            }}
            onCallUno={() => {
              if (localGameEngine.isRunning()) {
                localGameEngine.callUno(userIdRef.current || userId);
              } else {
                networkManager.callUno(publicState.roomId, userIdRef.current || userId);
              }
            }}
            onCatchUno={(targetId) => {
              if (localGameEngine.isRunning()) {
                localGameEngine.catchUno(userIdRef.current || userId, targetId);
              } else {
                networkManager.catchUno(publicState.roomId, userIdRef.current || userId, targetId);
              }
            }}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenChat={() => {
              setIsChatOpen(true);
              setUnreadChatCount(0);
            }}
            onToggleEmojiBar={() => setShowEmojiBar(!showEmojiBar)}
            onLeaveMatch={handleLeaveRoom}
            onReconnect={handleReconnectRoom}
            onDeclareDeadlock={() => {
              if (!localGameEngine.isRunning()) {
                networkManager.declareDeadlock(publicState.roomId, userIdRef.current || userId);
              }
            }}
            unreadChatCount={unreadChatCount}
            wallet={wallet}
            catalog={catalog}
            onUsePowerUp={(powerUpId, targetPlayerId, chosenColor) => {
              networkManager.usePowerUp(
                publicState.roomId,
                userIdRef.current || userId,
                powerUpId,
                targetPlayerId,
                chosenColor
              );
            }}
            onOpenShop={() => setIsShopOpen(true)}
            isVsIntroActive={showVsScreen}
            messages={messages}
          />

          {/* Quick Floating Emoji Bar when toggled */}
          {showEmojiBar && (
            <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 animate-fadeIn">
              <EmojiReactions
                activeReactions={activeReactions}
                showBar={true}
                onSendReaction={(emoji) => {
                  networkManager.sendReaction(publicState.roomId, userId, emoji);
                  setShowEmojiBar(false);
                }}
              />
            </div>
          )}

          {/* Floating Reaction animations only */}
          <EmojiReactions
            activeReactions={activeReactions}
            showBar={false}
            onSendReaction={() => {}}
          />

          {/* Game Over Modal */}
          <GameOverModal
            isOpen={publicState.phase === 'ended'}
            gameState={publicState}
            currentUserId={userId}
            wallet={wallet}
            onPlayAgain={() => {
              if (localGameEngine.isRunning()) {
                localGameEngine.restartBotGame();
              } else {
                networkManager.restartGame(publicState.roomId, userId);
              }
            }}
            onLeave={handleLeaveRoom}
            onToast={showToast}
          />

          {/* WD4 Challenge Modal for Victim */}
          <WD4ChallengeModal
            isOpen={publicState.pendingChallenge?.challengerId === userId}
            playedByName={
              publicState.players.find((p) => p.id === publicState.pendingChallenge?.playedBy)?.name || 'Player'
            }
            currentColor={publicState.currentColor}
            onRespond={(acceptChallenge) =>
              networkManager.challengeWD4(publicState.roomId, userId, acceptChallenge)
            }
          />

          {/* Dare Modal for Victim (Uno Dare) */}
          <DareModal
            isOpen={publicState.pendingDare?.targetPlayerId === userId}
            dareText={publicState.pendingDare?.dareText || ''}
            penaltyCount={publicState.pendingDare?.penaltyDrawCount || 2}
            playedByName={
              publicState.players.find((p) => p.id === publicState.pendingDare?.playedBy)?.name || 'Player'
            }
            onRespond={(acceptDare) =>
              networkManager.resolveDare(publicState.roomId, userId, acceptDare)
            }
          />
        </>
      )}

      {/* Global In-Game Chat Box */}
      <ChatBox
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        messages={messages}
        currentUserId={userId}
        onSendMessage={(text) => {
          if (publicState) {
            networkManager.sendChat(publicState.roomId, userId, text);
            if (localGameEngine.isRunning()) {
              const selfPlayer = publicState.players.find((p) => p.id === userId);
              const localMsg: ChatMessage = {
                id: `msg_${Date.now()}_${Math.random()}`,
                senderId: userId,
                senderName: selfPlayer?.name || userName || 'You',
                senderAvatar: selfPlayer?.avatar || userAvatar || '😎',
                text,
                timestamp: Date.now(),
              };
              setMessages((prev) => [...prev, localMsg]);
            }
          }
        }}
        mutedPlayerIds={mutedPlayers}
        onToggleMutePlayer={handleToggleMutePlayer}
      />

      {/* Global Modals */}
      <CreateRoomModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={handleCreateRoom}
      />

      <JoinRoomModal
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
        onJoin={handleJoinRoom}
      />

      <PublicRoomsModal
        isOpen={isPublicRoomsOpen}
        rooms={publicRooms}
        isLoading={isLoadingRooms}
        onRefresh={handleFetchPublicRooms}
        onJoinRoom={handleJoinRoom}
        onCreateRoom={() => {
          setIsPublicRoomsOpen(false);
          setIsCreateOpen(true);
        }}
        onClose={() => setIsPublicRoomsOpen(false)}
      />

      <HowToPlayModal
        isOpen={isHowToPlayOpen}
        onClose={() => setIsHowToPlayOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        initialTab={settingsInitialTab}
        onClose={() => {
          setIsSettingsOpen(false);
          setSettingsInitialTab('settings');
        }}
      />

      <ProfileModal
        isOpen={isProfileOpen}
        currentName={userName}
        currentAvatar={userAvatar}
        stats={playerStats}
        wallet={wallet}
        catalog={catalog}
        onSave={handleSaveProfile}
        onClose={() => setIsProfileOpen(false)}
      />

      <MatchHistoryModal
        isOpen={isHistoryOpen}
        matches={playerStats?.recentMatches || []}
        onClear={() => {
          historyService.clearHistory();
          historyService.getPlayerStats(userId).then(setPlayerStats);
        }}
        onClose={() => setIsHistoryOpen(false)}
      />

      {/* Virtual Peso Economy Modals */}
      <ShopModal
        isOpen={isShopOpen}
        wallet={wallet}
        catalog={catalog}
        playerName={userName}
        playerAvatar={userAvatar}
        onBuyItem={async (powerUpId, quantity) => {
          const res = await economyService.buyPowerUp(userId, powerUpId, quantity || 1);
          if (res.success && res.wallet) {
            setWallet(res.wallet);
            showToast(res.message, 'turn_alert');
          } else {
            throw new Error(res.message);
          }
        }}
        onClose={() => setIsShopOpen(false)}
        onOpenMissions={() => {
          setIsShopOpen(false);
          setIsMissionsOpen(true);
        }}
      />

      <MissionsModal
        isOpen={isMissionsOpen}
        wallet={wallet}
        missions={missions}
        onClaimDailyLogin={async () => {
          const res = await economyService.claimDailyReward(userId, userName, userAvatar);
          if (res.success && res.wallet) {
            setWallet(res.wallet);
            showToast(res.message, 'game_win');
          } else {
            showToast(res.message, 'error');
          }
        }}
        onClaimMission={async (missionId) => {
          const res = await economyService.claimMissionReward(userId, missionId);
          if (res.success && res.wallet) {
            setWallet(res.wallet);
            showToast(res.message, 'turn_alert');
          } else {
            showToast(res.message, 'error');
          }
        }}
        onClose={() => setIsMissionsOpen(false)}
        onOpenShop={() => {
          setIsMissionsOpen(false);
          setIsShopOpen(true);
        }}
      />

      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        currentUserId={userId}
        onClose={() => setIsLeaderboardOpen(false)}
      />

      <AdminModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        onOpenCardStudio={() => {
          setSettingsInitialTab('card_studio');
          setIsSettingsOpen(true);
        }}
        onRefreshWallet={() => {
          economyService.fetchWallet(userId, userName, userAvatar).then((data) => {
            setWallet(data.wallet);
            setCatalog(data.catalog);
            setMissions(data.missions);
          });
        }}
      />

      {/* Google Account Onboarding & Update Protection Modal */}
      <GooglePromptModal
        isOpen={isGooglePromptOpen}
        onClose={() => {
          setIsGooglePromptOpen(false);
          sessionStorage.setItem('uno_dismissed_google_prompt', 'true');
        }}
        onSuccess={() => {
          setIsGooglePromptOpen(false);
          showToast('Matagumpay na na-bind ang iyong Google Account!', 'game_win');
          setTimeout(() => {
            window.location.reload();
          }, 600);
        }}
      />
    </div>
  );
};
