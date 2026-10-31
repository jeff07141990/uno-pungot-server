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
import { getOrCreateGuestSession } from './firebase/config';
import { historyService, PlayerStats } from './services/historyService';

import { HomeScreen } from './components/HomeScreen';
import { LobbyView } from './components/LobbyView';
import { GameTable } from './components/GameTable';
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
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);

  // Audio & Toast
  const [isMuted, setIsMuted] = useState(() => soundManager.getMuted());
  const [toastText, setToastText] = useState<string | null>(null);
  const hasRecordedCurrentGameRef = useRef<boolean>(false);

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

  // 1. Initialize user identity and check URL invite params
  useEffect(() => {
    getOrCreateGuestSession().then(({ uid }) => {
      setUserId(uid);
      userIdRef.current = uid;

      // Check if URL contains ?join=ROOM_CODE
      const urlParams = new URLSearchParams(window.location.search);
      const joinCode = urlParams.get('join');
      if (joinCode) {
        handleJoinRoom(joinCode, uid);
      }
    });

    historyService.getPlayerStats(userId).then(setPlayerStats);
  }, []);

  // 2. Setup network callbacks
  useEffect(() => {
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

        if (state.phase === 'lobby') {
          setView('lobby');
          hasRecordedCurrentGameRef.current = false;
        } else if (state.phase === 'playing') {
          setView('game');
        } else if (state.phase === 'ended') {
          setView('game'); // Remain on game table with GameOverModal overlay

          // Record match to history once
          if (!hasRecordedCurrentGameRef.current && state.winnerId) {
            hasRecordedCurrentGameRef.current = true;
            const winner = state.players.find((p) => p.id === state.winnerId);
            const userWon = state.winnerId === userId;
            const userScore = state.players.find((p) => p.id === userId)?.score || 0;

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
              userId
            ).then(() => {
              historyService.getPlayerStats(userId).then(setPlayerStats);
            });
          }
        }
      },
      onToast: (text, sound) => {
        showToast(text, sound);
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

  // Room actions
  const handleCreateRoom = async (config: {
    roomName: string;
    isPrivate: boolean;
    variant: GameVariant;
    houseRules: HouseRules;
  }) => {
    setIsCreateOpen(false);
    try {
      const activeUid = userId || localStorage.getItem('uno_guest_uid') || 'guest_' + Date.now();
      setUserId(activeUid);
      userIdRef.current = activeUid;
      const res = await fetch(`${networkManager.getHttpApiUrl()}/api/rooms`, {
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
    const activeUid = explicitUid || userId || localStorage.getItem('uno_guest_uid') || 'guest_' + Date.now();
    setUserId(activeUid);
    userIdRef.current = activeUid;
    networkManager.connect(roomId, {
      id: activeUid,
      name: userName,
      avatar: userAvatar,
    });
  };

  const handlePlayWithBots = async (botCount: number, variant: GameVariant = 'classic') => {
    try {
      const activeUid = userId || localStorage.getItem('uno_guest_uid') || 'guest_' + Date.now();
      setUserId(activeUid);
      userIdRef.current = activeUid;
      const res = await fetch(`${networkManager.getHttpApiUrl()}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostId: activeUid,
          hostName: userName,
          hostAvatar: userAvatar,
          options: {
            roomName: 'Solo Bot Challenge',
            isPrivate: true,
            variant,
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
      const data = await res.json();
      if (data.roomId) {
        // Connect to the room
        networkManager.connect(data.roomId, {
          id: activeUid,
          name: userName,
          avatar: userAvatar,
        });

        // Add requested number of bots and auto-start after slight pause
        setTimeout(() => {
          for (let i = 0; i < botCount; i++) {
            networkManager.addBot(data.roomId, activeUid);
          }
          setTimeout(() => {
            networkManager.startGame(data.roomId, activeUid);
          }, 300);
        }, 500);
      } else {
        showToast('Server returned an error creating room.', 'error');
      }
    } catch (err) {
      console.error('Error starting bot game:', err);
      showToast('Could not connect to bot server. Please check connection.', 'error');
    }
  };

  const handleFetchPublicRooms = async () => {
    setIsLoadingRooms(true);
    try {
      const res = await fetch(`${networkManager.getHttpApiUrl()}/api/rooms`);
      const data = await res.json();
      setPublicRooms(data.rooms || []);
    } catch {
      setPublicRooms([]);
    } finally {
      setIsLoadingRooms(false);
    }
  };

  const handleLeaveRoom = () => {
    networkManager.disconnect();
    setPublicState(null);
    setYourHand([]);
    setMessages([]);
    setView('home');
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
          onPlayOnline={() => {
            setIsPublicRoomsOpen(true);
            handleFetchPublicRooms();
          }}
          onCreateRoom={() => setIsCreateOpen(true)}
          onJoinRoom={() => setIsJoinOpen(true)}
          onPlayWithBots={handlePlayWithBots}
          onOpenHowToPlay={() => setIsHowToPlayOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenProfile={() => setIsProfileOpen(true)}
          onOpenMatchHistory={() => {
            historyService.getPlayerStats(userId).then(setPlayerStats);
            setIsHistoryOpen(true);
          }}
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
          onOpenChat={() => {
            setIsChatOpen(true);
            setUnreadChatCount(0);
          }}
          unreadChatCount={unreadChatCount}
          onToast={showToast}
        />
      ) : (
        <>
          <GameTable
            gameState={publicState}
            yourHand={yourHand}
            currentUserId={userId}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            onPlayCard={(cardId, chosenColor, targetId) =>
              networkManager.playCard(publicState.roomId, userIdRef.current || userId, cardId, chosenColor, targetId)
            }
            onDrawCard={(targetCardIndex) => networkManager.drawCard(publicState.roomId, userIdRef.current || userId, targetCardIndex)}
            onPassTurn={() => networkManager.passTurn(publicState.roomId, userIdRef.current || userId)}
            onCallUno={() => networkManager.callUno(publicState.roomId, userIdRef.current || userId)}
            onCatchUno={(targetId) => networkManager.catchUno(publicState.roomId, userIdRef.current || userId, targetId)}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenChat={() => {
              setIsChatOpen(true);
              setUnreadChatCount(0);
            }}
            onToggleEmojiBar={() => setShowEmojiBar(!showEmojiBar)}
            onLeaveMatch={handleLeaveRoom}
            unreadChatCount={unreadChatCount}
          />

          {/* Quick Floating Emoji Bar when toggled */}
          {showEmojiBar && (
            <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 animate-fadeIn">
              <EmojiReactions
                activeReactions={activeReactions}
                onSendReaction={(emoji) => {
                  networkManager.sendReaction(publicState.roomId, userId, emoji);
                  setShowEmojiBar(false);
                }}
              />
            </div>
          )}

          {/* Floating Reaction animations */}
          <EmojiReactions
            activeReactions={activeReactions}
            onSendReaction={() => {}}
          />

          {/* Game Over Modal */}
          <GameOverModal
            isOpen={publicState.phase === 'ended'}
            gameState={publicState}
            currentUserId={userId}
            onPlayAgain={() => networkManager.restartGame(publicState.roomId, userId)}
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
        onClose={() => setIsSettingsOpen(false)}
      />

      <ProfileModal
        isOpen={isProfileOpen}
        currentName={userName}
        currentAvatar={userAvatar}
        stats={playerStats}
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
    </div>
  );
};
