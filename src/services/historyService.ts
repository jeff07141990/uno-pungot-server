import { firebaseState } from '../firebase/config';
import { collection, addDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

export interface MatchRecord {
  id: string;
  roomId: string;
  roomName: string;
  winnerId: string;
  winnerName: string;
  winnerAvatar: string;
  playersCount: number;
  playerNames: string[];
  cardsPlayed: number;
  durationSeconds: number;
  endedAt: number;
  userWon: boolean;
  userScore: number;
}

export interface PlayerStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  winPercentage: number;
  totalCardsPlayed: number;
  recentMatches: MatchRecord[];
}

const LOCAL_STORAGE_KEY = 'uno_match_history';

export const historyService = {
  getStoredMatches(): MatchRecord[] {
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async recordMatch(record: Omit<MatchRecord, 'id'>, currentUserId: string): Promise<void> {
    const newRecord: MatchRecord = {
      ...record,
      id: `match_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    };

    // Store in localStorage
    const matches = this.getStoredMatches();
    matches.unshift(newRecord);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(matches.slice(0, 50)));

    // Store in Firestore if configured
    if (firebaseState.isConfigured && firebaseState.db) {
      try {
        await addDoc(collection(firebaseState.db, 'matches'), {
          ...newRecord,
          recordedBy: currentUserId,
          createdAt: new Date(),
        });
      } catch (e) {
        console.warn('Failed to save match record to Firestore:', e);
      }
    }
  },

  async getPlayerStats(userId: string): Promise<PlayerStats> {
    const localMatches = this.getStoredMatches();
    const gamesPlayed = localMatches.length;
    const wins = localMatches.filter((m) => m.userWon).length;
    const losses = gamesPlayed - wins;
    const winPercentage = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;
    const totalCardsPlayed = localMatches.reduce((acc, m) => acc + (m.cardsPlayed || 0), 0);

    return {
      gamesPlayed,
      wins,
      losses,
      winPercentage,
      totalCardsPlayed,
      recentMatches: localMatches.slice(0, 10),
    };
  },

  clearHistory(): void {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  },
};
