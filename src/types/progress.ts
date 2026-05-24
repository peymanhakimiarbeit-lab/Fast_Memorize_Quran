/**
 * Progress and session data models for the Quran Memorization Web App.
 * All types are localStorage-serializable (no Set, Map — only plain objects/arrays).
 * Corresponds to the @Model types in the iOS sister app.
 */

/**
 * Tracks learning progress for a single verse.
 * Corresponds to VerseProgress (@Model) in the iOS app.
 */
export interface VerseProgress {
  /** Verse key in "surah:ayah" format, e.g. "1:1" */
  verseKey: string;
  /** Whether the verse has been marked as fully learned */
  isLearned: boolean;
  /** ISO 8601 date string when the verse was marked as learned, if applicable */
  learnedDate?: string;
  /** Total number of recitation attempts for this verse */
  totalAttempts: number;
  /** ISO 8601 date string of the most recent practice session, if applicable */
  lastPracticed?: string;
}

/**
 * A record of a single Hifz practice session.
 * Corresponds to SessionRecord (@Model) in the iOS app.
 */
export interface SessionRecord {
  /** Unique session identifier (UUID) */
  id: string;
  /** The Surah number practiced in this session */
  surahNumber: number;
  /** The first verse number in the practiced range */
  startVerseNumber: number;
  /** The last verse number in the practiced range */
  endVerseNumber: number;
  /** ISO 8601 date string when the session started */
  startDate: string;
  /** ISO 8601 date string when the session ended, if completed */
  endDate?: string;
  /** Total duration of the session in seconds */
  totalDurationSeconds: number;
  /** Per-verse attempt records for this session */
  verseAttempts: VerseAttemptRecord[];
  /** Whether the session was completed (all verses recited) */
  isCompleted: boolean;
  /** The verse number of the last successfully completed verse, if any */
  lastCompletedVerseNumber?: number;
}

/**
 * A record of recitation attempts for a single verse within a session.
 */
export interface VerseAttemptRecord {
  /** Verse key in "surah:ayah" format */
  verseKey: string;
  /** Number of attempts made for this verse in the session */
  attemptCount: number;
  /** Whether the verse was ultimately recited successfully */
  wasSuccessful: boolean;
}

/**
 * Aggregated statistics for a single calendar day.
 * Corresponds to DailyStats (@Model) in the iOS app.
 */
export interface DailyStats {
  /** ISO 8601 date string, normalized to midnight (start of day) */
  date: string;
  /** Number of distinct verses practiced on this day */
  versesPracticed: number;
  /** Total recitation time in seconds on this day */
  totalDurationSeconds: number;
  /** Number of sessions completed on this day */
  sessionsCount: number;
}

/**
 * Non-persistent state for an active Hifz session.
 * Note: revealedWordIds is stored as a plain string array for localStorage compatibility.
 */
export interface SessionState {
  /** The Surah number for this session */
  surahNumber: number;
  /** Inclusive verse range [startVerse, endVerse] */
  verseRange: [number, number];
  /** Zero-based index of the current verse within the session range */
  currentVerseIndex: number;
  /** Array of word IDs that have been revealed in the current verse attempt */
  revealedWordIds: string[];
  /** Number of recitation attempts for the current verse */
  attemptCount: number;
  /** ISO 8601 date string when the session started */
  sessionStartDate: string;
}

/**
 * Progress summary for a single Surah.
 */
export interface SurahProgress {
  /** The Surah number */
  surahNumber: number;
  /** Total number of verses in the Surah */
  totalVerses: number;
  /** Number of verses marked as learned */
  learnedVerses: number;
  /** Percentage of verses learned: Math.round((learnedVerses / totalVerses) * 100) */
  percentComplete: number;
}

/**
 * Overall progress across the entire Quran.
 */
export interface OverallProgress {
  /** Total verses in the Quran (6236) */
  totalVerses: number;
  /** Total number of verses marked as learned */
  learnedVerses: number;
  /** Overall percentage learned: Math.round((learnedVerses / totalVerses) * 100) */
  percentComplete: number;
  /** Per-Surah progress breakdown */
  surahProgress: SurahProgress[];
}
