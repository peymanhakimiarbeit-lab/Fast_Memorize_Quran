/**
 * Word and verse matching logic for Arabic Quran recitation.
 *
 * Strategy: match the WHOLE transcribed sentence against the WHOLE verse,
 * then determine which words were said correctly based on token alignment.
 * This is much more robust than word-by-word matching because:
 * - The Web Speech API returns full sentences, not individual words
 * - Tajweed causes words to blend together
 * - The transcription may differ slightly from the Uthmani script
 */

import type { QuranWord, Verse } from '../types/quran';
import type { MatchResult, RecitationConfig } from '../types/recitation';
import { normalizeArabic, tokenize } from './arabicNormalizer';

// ---------------------------------------------------------------------------
// Single-word match (used for token-by-token comparison)
// ---------------------------------------------------------------------------

export function match(
  transcribed: string,
  expected: QuranWord,
  config: RecitationConfig,
): MatchResult {
  const mode = config.diacriticMode;
  const norm = (s: string) => normalizeArabic(s, mode);

  const t = norm(transcribed);
  const e = norm(expected.textUthmani);

  if (!t || !e) return { kind: 'incorrect', expected: e, got: t };

  // Exact match
  if (t === e) return { kind: 'correct' };

  // Substring match — handles Tajweed liaisons
  if (t.includes(e) || e.includes(t)) return { kind: 'correct' };

  // Prefix match — common when words blend
  if (t.startsWith(e) || e.startsWith(t)) return { kind: 'correct' };

  // Levenshtein distance ≤ 1 — allows one character difference
  if (levenshtein(t, e) <= 1) return { kind: 'correct' };

  return { kind: 'incorrect', expected: e, got: t };
}

export function matchWithConfidence(
  text: string,
  word: QuranWord,
  confidence: number,
  config: RecitationConfig,
): MatchResult {
  // confidence=0 from Web Speech API means "unknown", not "bad" — skip gate
  const effective = confidence === 0 ? 1.0 : confidence;
  if (effective < config.confidenceThreshold) {
    return { kind: 'lowConfidence', threshold: config.confidenceThreshold };
  }
  return match(text, word, config);
}

// ---------------------------------------------------------------------------
// Verse-level matching — the main approach for fluent recitation
// ---------------------------------------------------------------------------

export interface VerseMatchResult {
  /** For each word in the verse: was it matched correctly? */
  wordResults: Array<{ word: QuranWord; result: MatchResult }>;
  /** How many words were matched correctly (0 to verse.words.length) */
  correctCount: number;
  /** Whether the whole verse was recited correctly */
  isComplete: boolean;
}

/**
 * Match a full transcribed sentence against a verse.
 *
 * Algorithm:
 * 1. Normalize both the transcript and all verse words
 * 2. Try to find each verse word in the transcript (in order)
 * 3. Mark found words as correct, missing words as incorrect
 *
 * This handles:
 * - Words said in the right order but with slight pronunciation differences
 * - Tajweed liaisons where words blend together
 * - The transcript containing more or fewer words than the verse
 */
export function matchVerseTranscript(
  transcript: string,
  verse: Verse,
  config: RecitationConfig,
): VerseMatchResult {
  const transcriptTokens = tokenize(transcript);
  const wordResults: Array<{ word: QuranWord; result: MatchResult }> = [];

  let transcriptPos = 0; // current position in transcript tokens

  for (const word of verse.words) {
    const expectedNorm = normalizeArabic(word.textUthmani, 'moderate');
    if (!expectedNorm) {
      wordResults.push({ word, result: { kind: 'correct' } });
      continue;
    }

    // Try to find this word starting from current transcript position
    let found = false;
    const searchLimit = Math.min(transcriptPos + 5, transcriptTokens.length);

    for (let i = transcriptPos; i < searchLimit; i++) {
      const token = transcriptTokens[i];
      if (!token) continue;

      const tokenNorm = normalizeArabic(token, 'moderate');

      // Check if this token matches the expected word
      if (
        tokenNorm === expectedNorm ||
        tokenNorm.includes(expectedNorm) ||
        expectedNorm.includes(tokenNorm) ||
        tokenNorm.startsWith(expectedNorm) ||
        expectedNorm.startsWith(tokenNorm) ||
        levenshtein(tokenNorm, expectedNorm) <= Math.max(1, Math.floor(expectedNorm.length * 0.4))
      ) {
        wordResults.push({ word, result: { kind: 'correct' } });
        transcriptPos = i + 1;
        found = true;
        break;
      }
    }

    if (!found) {
      // Check if the word might be embedded in a longer token (Tajweed liaison)
      let embeddedFound = false;
      for (let i = Math.max(0, transcriptPos - 1); i < Math.min(transcriptPos + 2, transcriptTokens.length); i++) {
        const token = transcriptTokens[i];
        if (!token) continue;
        const tokenNorm = normalizeArabic(token, 'moderate');
        if (tokenNorm.includes(expectedNorm) || expectedNorm.includes(tokenNorm)) {
          wordResults.push({ word, result: { kind: 'correct' } });
          embeddedFound = true;
          break;
        }
      }

      if (!embeddedFound) {
        wordResults.push({
          word,
          result: {
            kind: 'incorrect',
            expected: expectedNorm,
            got: transcriptTokens[transcriptPos] ?? '',
          },
        });
      }
    }
  }

  const correctCount = wordResults.filter((r) => r.result.kind === 'correct').length;
  const isComplete = correctCount === verse.words.length;

  return { wordResults, correctCount, isComplete };
}

// ---------------------------------------------------------------------------
// Levenshtein distance (edit distance)
// ---------------------------------------------------------------------------

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Only compute for short strings to keep it fast
  if (a.length > 20 || b.length > 20) return Math.abs(a.length - b.length);

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0]![j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i]![j] = matrix[i - 1]![j - 1]!;
      } else {
        matrix[i]![j] = Math.min(
          matrix[i - 1]![j - 1]! + 1,
          matrix[i]![j - 1]! + 1,
          matrix[i - 1]![j]! + 1,
        );
      }
    }
  }
  return matrix[b.length]![a.length]!;
}
