'use client';

/**
 * useProgressStore — Zustand store for Quran memorization progress.
 *
 * Persists all progress data to localStorage via the `persist` middleware.
 * Also delegates to ProgressRepository for any side-effects (e.g. updating
 * daily stats, active-session tracking).
 *
 * Requirements: 5.5, 6.1, 6.2, 6.3, 6.4
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { VerseProgress, SessionRecord, SurahProgress } from '../types/progress';
import { getProgressRepository } from '../repositories/progressRepository';

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

export interface ProgressStore {
  // ── State ──────────────────────────────────────────────────────────────
  /** Map of verseKey → VerseProgress for all verses ever practiced */
  verseProgress: Record<string, VerseProgress>;
  /** Ordered list of completed session records */
  sessionHistory: SessionRecord[];
  /** Map of ISO-date-string → DailyStats */
  dailyStats: Record<string, { date: string; versesPracticed: number; totalDurationSeconds: number; sessionsCount: number }>;

  // ── Actions ────────────────────────────────────────────────────────────
  /**
   * Mark a verse as learned.
   * Updates in-store VerseProgress and calls ProgressRepository.markVerseAsLearned().
   */
  markVerseAsLearned(verseKey: string): void;

  /**
   * Append a completed SessionRecord to the history.
   * Also calls ProgressRepository.saveSessionResult() for daily-stats bookkeeping.
   */
  saveSession(record: SessionRecord): void;

  /**
   * Calculate and return SurahProgress for the given surah number.
   * Reads from the in-store verseProgress map.
   */
  getProgressForSurah(surahNumber: number): SurahProgress;
}

// ---------------------------------------------------------------------------
// Verse counts per surah (needed to compute SurahProgress.totalVerses)
// ---------------------------------------------------------------------------

const VERSE_COUNTS: Record<number, number> = {
  1: 7, 2: 286, 3: 200, 4: 176, 5: 120, 6: 165, 7: 206, 8: 75, 9: 129,
  10: 109, 11: 123, 12: 111, 13: 43, 14: 52, 15: 99, 16: 128, 17: 111,
  18: 110, 19: 98, 20: 135, 21: 112, 22: 78, 23: 118, 24: 64, 25: 77,
  26: 227, 27: 93, 28: 88, 29: 69, 30: 60, 31: 34, 32: 30, 33: 73,
  34: 54, 35: 45, 36: 83, 37: 182, 38: 88, 39: 75, 40: 85, 41: 54,
  42: 53, 43: 89, 44: 59, 45: 37, 46: 35, 47: 38, 48: 29, 49: 18,
  50: 45, 51: 60, 52: 49, 53: 62, 54: 55, 55: 78, 56: 96, 57: 29,
  58: 22, 59: 24, 60: 13, 61: 14, 62: 11, 63: 11, 64: 18, 65: 12,
  66: 12, 67: 30, 68: 52, 69: 52, 70: 44, 71: 28, 72: 28, 73: 20,
  74: 56, 75: 40, 76: 31, 77: 50, 78: 40, 79: 46, 80: 42, 81: 29,
  82: 19, 83: 36, 84: 25, 85: 22, 86: 17, 87: 19, 88: 26, 89: 30,
  90: 20, 91: 15, 92: 21, 93: 11, 94: 8, 95: 8, 96: 19, 97: 5,
  98: 8, 99: 8, 100: 11, 101: 11, 102: 8, 103: 3, 104: 9, 105: 5,
  106: 4, 107: 7, 108: 3, 109: 6, 110: 3, 111: 5, 112: 4, 113: 5,
  114: 6,
};

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set, get) => ({
      // ── Initial state ────────────────────────────────────────────────
      verseProgress: {},
      sessionHistory: [],
      dailyStats: {},

      // ── markVerseAsLearned ───────────────────────────────────────────
      markVerseAsLearned(verseKey: string): void {
        const now = new Date().toISOString();
        const existing = get().verseProgress[verseKey];

        const updated: VerseProgress = {
          verseKey,
          isLearned: true,
          learnedDate: existing?.learnedDate ?? now,
          totalAttempts: existing?.totalAttempts ?? 0,
          lastPracticed: now,
        };

        set((state) => ({
          verseProgress: {
            ...state.verseProgress,
            [verseKey]: updated,
          },
        }));

        // Side-effect: persist via repository (fire-and-forget)
        void getProgressRepository().markVerseAsLearned(verseKey);
      },

      // ── saveSession ──────────────────────────────────────────────────
      saveSession(record: SessionRecord): void {
        set((state) => ({
          sessionHistory: [...state.sessionHistory, record],
        }));

        // Side-effect: update daily stats via repository (fire-and-forget)
        void getProgressRepository().saveSessionResult(record);
      },

      // ── getProgressForSurah ──────────────────────────────────────────
      getProgressForSurah(surahNumber: number): SurahProgress {
        const { verseProgress } = get();
        const totalVerses = VERSE_COUNTS[surahNumber] ?? 0;
        const prefix = `${surahNumber}:`;

        let learnedVerses = 0;
        for (const [key, progress] of Object.entries(verseProgress)) {
          if (key.startsWith(prefix) && progress.isLearned) {
            learnedVerses++;
          }
        }

        const percentComplete =
          totalVerses > 0
            ? Math.round((learnedVerses / totalVerses) * 100)
            : 0;

        return {
          surahNumber,
          totalVerses,
          learnedVerses,
          percentComplete,
        };
      },
    }),
    {
      name: 'quran-progress',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
