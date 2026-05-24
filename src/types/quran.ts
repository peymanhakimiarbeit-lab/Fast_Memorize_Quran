/**
 * Quran data models for the Quran Memorization Web App.
 * These types correspond to the value types in the iOS sister app.
 */

/**
 * Metadata for a single Surah (chapter) of the Quran.
 * Corresponds to SurahMetadata in the iOS app.
 */
export interface SurahMetadata {
  /** Surah number, 1–114 */
  readonly id: number;
  /** Arabic name, e.g. "الفاتحة" */
  readonly nameArabic: string;
  /** Transliterated name, e.g. "Al-Fatihah" */
  readonly nameTransliterated: string;
  /** English translation of the name, e.g. "The Opening" */
  readonly nameTranslation: string;
  /** Total number of verses in this Surah */
  readonly verseCount: number;
  /** Whether the Surah was revealed in Mecca or Medina */
  readonly revelationType: 'meccan' | 'medinan';
}

/**
 * A complete Surah (chapter) with all its verses.
 * Corresponds to Surah in the iOS app.
 */
export interface Surah {
  /** Metadata describing this Surah */
  readonly metadata: SurahMetadata;
  /** Ordered list of verses in this Surah */
  readonly verses: Verse[];
}

/**
 * A single verse (Ayah) within a Surah.
 * Corresponds to Verse in the iOS app.
 */
export interface Verse {
  /** Unique verse identifier in "surah:ayah" format, e.g. "1:1" */
  readonly id: string;
  /** The Surah number this verse belongs to */
  readonly surahNumber: number;
  /** The verse number within the Surah */
  readonly verseNumber: number;
  /** Ordered list of words in this verse */
  readonly words: QuranWord[];
  /** Full verse text in Uthmani script */
  readonly textUthmani: string;
}

/**
 * A single Arabic word within a verse.
 * Corresponds to QuranWord in the iOS app.
 */
export interface QuranWord {
  /** Unique word identifier in "surah:ayah:word" format, e.g. "1:1:1" */
  readonly id: string;
  /** Arabic word text with diacritics (Harakat) in Uthmani script */
  readonly textUthmani: string;
  /** Arabic word text without diacritics */
  readonly textSimple: string;
  /** Zero-based position of the word within the verse */
  readonly position: number;
  /** Timestamp in seconds within the reference audio, if available */
  readonly audioTimestamp?: number;
}

/**
 * A translation of a verse in a specific language.
 * Web-specific type sourced from the Quran.com API.
 */
export interface Translation {
  /** The verse key this translation belongs to, e.g. "1:1" */
  readonly verseId: string;
  /** ISO 639-1 language code, e.g. "de" or "en" */
  readonly language: string;
  /** The translated text of the verse */
  readonly text: string;
}
