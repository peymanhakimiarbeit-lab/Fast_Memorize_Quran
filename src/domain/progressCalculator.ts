/**
 * Pure calculation functions for progress tracking, audio highlighting,
 * calibration evaluation, and Surah search.
 *
 * All functions are pure (no side effects, no I/O) and fully testable
 * without a browser environment.
 */

import type { SurahMetadata, QuranWord, Verse } from '../types/quran';
import type { SurahProgress } from '../types/progress';
import type { RecitationConfig } from '../types/recitation';

// ---------------------------------------------------------------------------
// Progress calculation
// ---------------------------------------------------------------------------

/**
 * Calculate the learning progress for a single Surah.
 *
 * @param totalVerses   - Total number of verses in the Surah (must be ≥ 1).
 * @param learnedVerses - Number of verses marked as learned (0 ≤ learnedVerses ≤ totalVerses).
 * @returns A {@link SurahProgress} object with `percentComplete` equal to
 *          `Math.round((learnedVerses / totalVerses) * 100)`.
 *
 * @remarks
 * Validates: Requirements 6.1, 6.2
 *
 * The `surahNumber` field is set to 0 when called without a surah context.
 * Callers that know the surah number should set it on the returned object.
 */
export function calculateProgress(
  totalVerses: number,
  learnedVerses: number,
): SurahProgress {
  const percentComplete = Math.round((learnedVerses / totalVerses) * 100);

  return {
    surahNumber: 0,
    totalVerses,
    learnedVerses,
    percentComplete,
  };
}

// ---------------------------------------------------------------------------
// Calibration evaluation
// ---------------------------------------------------------------------------

/**
 * Determine whether a calibration hint should be shown to the user.
 *
 * A calibration hint is recommended when more than 30 % of the words in a
 * verse have a confidence value below the configured threshold.
 *
 * @param verse       - The verse that was just recited.
 * @param confidences - Array of per-word confidence scores (0.0–1.0).
 *                      Must have the same length as `verse.words`.
 * @param config      - Recitation configuration containing `confidenceThreshold`.
 * @returns `{ shouldShowCalibrationHint: boolean }`
 *
 * @remarks
 * Validates: Requirements 8.4
 *
 * Formula: `lowConfidenceCount > Math.floor(verse.words.length * 0.3)`
 */
export function evaluateCalibrationNeed(
  verse: Verse,
  confidences: number[],
  config: RecitationConfig,
): { shouldShowCalibrationHint: boolean } {
  const wordCount = verse.words.length;
  const lowConfidenceCount = confidences.filter(
    (c) => c < config.confidenceThreshold,
  ).length;
  const threshold = Math.floor(wordCount * 0.3);
  const shouldShowCalibrationHint = lowConfidenceCount > threshold;

  return { shouldShowCalibrationHint };
}

// ---------------------------------------------------------------------------
// Audio word highlighting
// ---------------------------------------------------------------------------

/**
 * Find the index of the word that should be highlighted at a given audio
 * playback timestamp.
 *
 * The highlighted word is the one whose `audioTimestamp` interval contains
 * `timestamp`:
 *   `word[i].audioTimestamp ≤ timestamp < word[i+1].audioTimestamp`
 *
 * @param words     - Ordered array of Quran words for the verse.
 * @param timestamp - Current audio playback position in seconds.
 * @returns The zero-based index of the highlighted word, or `null` if
 *          `timestamp` is outside the verse's audio range or no timestamps
 *          are available.
 *
 * @remarks
 * Validates: Requirements 7.3
 */
export function getHighlightedWordIndex(
  words: QuranWord[],
  timestamp: number,
): number | null {
  if (words.length === 0) {
    return null;
  }

  // Filter to words that have audio timestamps
  const wordsWithTimestamps = words.filter(
    (w) => w.audioTimestamp !== undefined,
  );

  if (wordsWithTimestamps.length === 0) {
    return null;
  }

  // timestamp is before the first word's timestamp
  const firstWord = wordsWithTimestamps[0];
  if (firstWord === undefined || timestamp < (firstWord.audioTimestamp ?? Infinity)) {
    return null;
  }

  // Find the last word whose audioTimestamp is ≤ timestamp
  let highlightedIndex: number | null = null;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (word === undefined || word.audioTimestamp === undefined) {
      continue;
    }
    if (word.audioTimestamp <= timestamp) {
      highlightedIndex = i;
    } else {
      // audioTimestamp > timestamp — we've gone past the current position
      break;
    }
  }

  return highlightedIndex;
}

// ---------------------------------------------------------------------------
// Surah search
// ---------------------------------------------------------------------------

/**
 * Filter a list of Surahs by a search query.
 *
 * Matching is performed against:
 * - Arabic name (`nameArabic`) — exact substring match
 * - Transliterated name (`nameTransliterated`) — case-insensitive substring match
 * - Surah number (`id`) — string prefix/substring match
 *
 * An empty or whitespace-only query returns all Surahs unchanged.
 *
 * @param surahs - The full list of Surah metadata (typically all 114 Surahs).
 * @param query  - The search string entered by the user.
 * @returns A filtered array of {@link SurahMetadata} objects. The original
 *          array is not mutated.
 *
 * @remarks
 * Validates: Requirements 1.3
 */
export function searchSurahs(
  surahs: SurahMetadata[],
  query: string,
): SurahMetadata[] {
  const trimmed = query.trim();

  if (trimmed === '') {
    return surahs;
  }

  const lowerQuery = trimmed.toLowerCase();

  return surahs.filter((surah) => {
    // Match against Arabic name (exact substring, preserving Arabic characters)
    if (surah.nameArabic.includes(trimmed)) {
      return true;
    }

    // Match against transliterated name (case-insensitive)
    if (surah.nameTransliterated.toLowerCase().includes(lowerQuery)) {
      return true;
    }

    // Match against Surah number
    if (String(surah.id).includes(trimmed)) {
      return true;
    }

    return false;
  });
}
