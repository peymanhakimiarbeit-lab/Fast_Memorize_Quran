/**
 * ProgressRepository implementation using localStorage.
 *
 * All progress data is stored as JSON in localStorage under well-known keys.
 * When localStorage quota is exceeded, the oldest session records are deleted
 * (FIFO) to make room for new data.
 *
 * Requirements: 5.5, 6.3, 6.4, 6.5
 */

import type {
  VerseProgress,
  SessionRecord,
  SessionState,
  DailyStats,
  SurahProgress,
} from '../types/progress';

// ---------------------------------------------------------------------------
// Repository interface
// ---------------------------------------------------------------------------

export interface ProgressRepository {
  markVerseAsLearned(verseKey: string): Promise<void>;
  getProgress(surahNumber: number): Promise<SurahProgress>;
  saveSessionResult(result: SessionRecord): Promise<void>;
  resumeSession(surahNumber: number): Promise<SessionState | null>;
  getDailyStats(date: Date): Promise<DailyStats>;
}

// ---------------------------------------------------------------------------
// localStorage key constants
// ---------------------------------------------------------------------------

const KEYS = {
  /** Record<verseKey, VerseProgress> */
  VERSE_PROGRESS: 'quran-verse-progress',
  /** SessionRecord[] */
  SESSION_HISTORY: 'quran-session-history',
  /** Record<dateString, DailyStats> */
  DAILY_STATS: 'quran-daily-stats',
  /** Record<surahNumber, SessionState> — active/incomplete sessions */
  ACTIVE_SESSIONS: 'quran-active-sessions',
} as const;

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
// localStorage helpers
// ---------------------------------------------------------------------------

function safeGetItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Attempt to write a value to localStorage.
 * On QuotaExceededError, delete the oldest session records (FIFO) and retry.
 * Throws if storage is still full after cleanup.
 */
function safeSetItem(key: string, value: unknown): void {
  const serialized = JSON.stringify(value);

  try {
    localStorage.setItem(key, serialized);
  } catch (err) {
    if (isQuotaExceeded(err)) {
      // FIFO: remove oldest session records to free space
      pruneOldestSessions();

      // Retry once after pruning
      try {
        localStorage.setItem(key, serialized);
      } catch (retryErr) {
        if (isQuotaExceeded(retryErr)) {
          // Still full — surface a typed error
          throw {
            kind: 'localStorageQuotaExceeded',
            message:
              'localStorage is full even after pruning old sessions. ' +
              'Please clear browser storage manually.',
          };
        }
        throw retryErr;
      }
    } else {
      throw err;
    }
  }
}

function isQuotaExceeded(err: unknown): boolean {
  if (!(err instanceof DOMException)) return false;
  return (
    err.name === 'QuotaExceededError' ||
    err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    err.code === 22 ||
    err.code === 1014
  );
}

/**
 * Delete the oldest 20 % of session records (FIFO) to free localStorage space.
 */
function pruneOldestSessions(): void {
  const sessions = safeGetItem<SessionRecord[]>(KEYS.SESSION_HISTORY, []);
  if (sessions.length === 0) return;

  // Sort by startDate ascending (oldest first)
  const sorted = [...sessions].sort((a, b) =>
    a.startDate.localeCompare(b.startDate),
  );

  // Remove the oldest 20 % (at least 1)
  const removeCount = Math.max(1, Math.floor(sorted.length * 0.2));
  const pruned = sorted.slice(removeCount);

  try {
    localStorage.setItem(KEYS.SESSION_HISTORY, JSON.stringify(pruned));
  } catch {
    // If even this fails, clear the entire session history
    localStorage.removeItem(KEYS.SESSION_HISTORY);
  }
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

/**
 * Normalize a Date to midnight (start of day) in ISO 8601 format.
 * e.g. "2024-03-15T00:00:00.000Z"
 */
function normalizeDateToMidnight(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// LocalStorageProgressRepository implementation
// ---------------------------------------------------------------------------

export class LocalStorageProgressRepository implements ProgressRepository {
  // -------------------------------------------------------------------------
  // markVerseAsLearned
  // -------------------------------------------------------------------------

  async markVerseAsLearned(verseKey: string): Promise<void> {
    const allProgress = safeGetItem<Record<string, VerseProgress>>(
      KEYS.VERSE_PROGRESS,
      {},
    );

    const existing = allProgress[verseKey];
    const now = new Date().toISOString();

    const updated: VerseProgress = {
      verseKey,
      isLearned: true,
      learnedDate: existing?.learnedDate ?? now,
      totalAttempts: existing?.totalAttempts ?? 0,
      lastPracticed: now,
    };

    allProgress[verseKey] = updated;
    safeSetItem(KEYS.VERSE_PROGRESS, allProgress);
  }

  // -------------------------------------------------------------------------
  // getProgress
  // -------------------------------------------------------------------------

  async getProgress(surahNumber: number): Promise<SurahProgress> {
    const allProgress = safeGetItem<Record<string, VerseProgress>>(
      KEYS.VERSE_PROGRESS,
      {},
    );

    const totalVerses = VERSE_COUNTS[surahNumber] ?? 0;

    // Count verses for this surah that are marked as learned
    const prefix = `${surahNumber}:`;
    let learnedVerses = 0;

    for (const [key, progress] of Object.entries(allProgress)) {
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
  }

  // -------------------------------------------------------------------------
  // saveSessionResult
  // -------------------------------------------------------------------------

  async saveSessionResult(result: SessionRecord): Promise<void> {
    const sessions = safeGetItem<SessionRecord[]>(KEYS.SESSION_HISTORY, []);
    sessions.push(result);
    safeSetItem(KEYS.SESSION_HISTORY, sessions);

    // Update daily stats
    await this.updateDailyStats(result);

    // Remove from active sessions if it was tracked there
    const activeSessions = safeGetItem<Record<string, SessionState>>(
      KEYS.ACTIVE_SESSIONS,
      {},
    );
    const surahKey = String(result.surahNumber);
    if (surahKey in activeSessions) {
      delete activeSessions[surahKey];
      safeSetItem(KEYS.ACTIVE_SESSIONS, activeSessions);
    }
  }

  // -------------------------------------------------------------------------
  // resumeSession
  // -------------------------------------------------------------------------

  async resumeSession(surahNumber: number): Promise<SessionState | null> {
    const activeSessions = safeGetItem<Record<string, SessionState>>(
      KEYS.ACTIVE_SESSIONS,
      {},
    );

    const session = activeSessions[String(surahNumber)];
    return session ?? null;
  }

  // -------------------------------------------------------------------------
  // getDailyStats
  // -------------------------------------------------------------------------

  async getDailyStats(date: Date): Promise<DailyStats> {
    const allStats = safeGetItem<Record<string, DailyStats>>(
      KEYS.DAILY_STATS,
      {},
    );

    const dateKey = normalizeDateToMidnight(date);
    const existing = allStats[dateKey];

    if (existing !== undefined) {
      return existing;
    }

    // Return empty stats for the requested date
    return {
      date: dateKey,
      versesPracticed: 0,
      totalDurationSeconds: 0,
      sessionsCount: 0,
    };
  }

  // -------------------------------------------------------------------------
  // saveActiveSession (not in interface but useful for stores)
  // -------------------------------------------------------------------------

  saveActiveSession(surahNumber: number, state: SessionState): void {
    const activeSessions = safeGetItem<Record<string, SessionState>>(
      KEYS.ACTIVE_SESSIONS,
      {},
    );
    activeSessions[String(surahNumber)] = state;
    safeSetItem(KEYS.ACTIVE_SESSIONS, activeSessions);
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private async updateDailyStats(result: SessionRecord): Promise<void> {
    const allStats = safeGetItem<Record<string, DailyStats>>(
      KEYS.DAILY_STATS,
      {},
    );

    const dateKey = normalizeDateToMidnight(new Date(result.startDate));
    const existing = allStats[dateKey] ?? {
      date: dateKey,
      versesPracticed: 0,
      totalDurationSeconds: 0,
      sessionsCount: 0,
    };

    // Count distinct verses practiced in this session
    const distinctVerses = new Set(
      result.verseAttempts.map((a) => a.verseKey),
    ).size;

    const updated: DailyStats = {
      date: dateKey,
      versesPracticed: existing.versesPracticed + distinctVerses,
      totalDurationSeconds:
        existing.totalDurationSeconds + result.totalDurationSeconds,
      sessionsCount: existing.sessionsCount + 1,
    };

    allStats[dateKey] = updated;
    safeSetItem(KEYS.DAILY_STATS, allStats);
  }
}

// ---------------------------------------------------------------------------
// Singleton factory
// ---------------------------------------------------------------------------

let _instance: LocalStorageProgressRepository | null = null;

/**
 * Returns the shared LocalStorageProgressRepository instance.
 * Creates it on first call (lazy singleton).
 */
export function getProgressRepository(): LocalStorageProgressRepository {
  if (_instance === null) {
    _instance = new LocalStorageProgressRepository();
  }
  return _instance;
}
