/**
 * Arabic text normalization utilities for Quran word matching.
 * Pure functions with no side effects.
 */

import type { DiacriticMode } from '../types/recitation';

const HARAKAT_REGEX = /[\u064B-\u065F\u0670]/g;
const ALEF_VARIANTS_REGEX = /[\u0622\u0623\u0625]/g;
const ALEF = '\u0627';
const TA_MARBUTA = '\u0629';
const HA = '\u0647';
const HAMZA_WAW_WITH_HAMZA = '\u0624';
const WAW = '\u0648';
const YEH_WITH_HAMZA = '\u0626';
const YEH = '\u064A';
const STANDALONE_HAMZA = '\u0621';

// Also normalize Waw Hamza above (ؤ) and special Alef forms
const ALEF_WASLA = '\u0671'; // ٱ — used in Uthmani script

export function normalizeArabic(text: string, mode: DiacriticMode): string {
  let result = text.replace(/\s+/g, ' ').trim();

  // Always strip Arabic-Indic digits (٠١٢٣٤٥٦٧٨٩) and Eastern Arabic digits
  // These appear when the user says the verse number or when ASR picks up end markers
  result = result.replace(/[\u0660-\u0669\u06F0-\u06F9]/g, '').trim();

  if (mode === 'strict') {
    return result;
  }

  // Remove all Harakat
  result = result.replace(HARAKAT_REGEX, '');

  // Normalize Alef Wasla (ٱ → ا) — very common in Uthmani script
  result = result.split(ALEF_WASLA).join(ALEF);

  // Normalize Alef variants
  result = result.replace(ALEF_VARIANTS_REGEX, ALEF);

  // Ta Marbuta → Ha
  result = result.split(TA_MARBUTA).join(HA);

  // Hamza variants
  result = result.split(HAMZA_WAW_WITH_HAMZA).join(WAW);
  result = result.split(YEH_WITH_HAMZA).join(YEH);
  result = result.split(STANDALONE_HAMZA).join('');

  return result;
}

/**
 * Normalize a full verse text for comparison.
 * Removes all diacritics and normalizes all Arabic letter variants.
 */
export function normalizeVerseForComparison(text: string): string {
  return normalizeArabic(text, 'moderate');
}

/**
 * Split normalized Arabic text into word tokens.
 */
export function tokenize(text: string): string[] {
  return normalizeArabic(text, 'moderate')
    .split(/\s+/)
    .filter((t) => t.length > 0);
}
