/**
 * QuranRepository implementation using the Quran.com API v4.
 *
 * All data is fetched client-side (Static Export / GitHub Pages).
 * Uses native fetch() with cache headers for SWR-like behavior
 * (revalidate: 86400 = 24 hours for immutable Quran data).
 *
 * Requirements: 1.1, 1.5, 1.6, 2.7, 2.8, 10.2, 10.3
 */

import type { SurahMetadata, Surah, Verse, QuranWord } from '../types/quran';
import type { QuranWebError } from '../types/recitation';
import { searchSurahs as searchSurahsLocal } from '../domain/progressCalculator';

// ---------------------------------------------------------------------------
// API base URL
// ---------------------------------------------------------------------------

const API_BASE = 'https://api.qurancdn.com/api/qdc';
const API_V4 = 'https://api.quran.com/api/v4';

// Cache duration: 24 hours (Quran data is immutable)
const CACHE_REVALIDATE = 86400;

// ---------------------------------------------------------------------------
// Repository interface
// ---------------------------------------------------------------------------

export interface QuranRepository {
  fetchAllSurahs(): Promise<SurahMetadata[]>;
  fetchSurah(number: number): Promise<Surah>;
  fetchVerses(surahNumber: number, range?: [number, number]): Promise<Verse[]>;
  fetchTranslation(verseKey: string, language: string): Promise<string | null>;
  /** Fetch ALL translations for a surah at once — returns verseKey→text map */
  fetchSurahTranslations(surahNumber: number, language: string): Promise<Record<string, string>>;
  searchSurahs(query: string): Promise<SurahMetadata[]>;
}

// ---------------------------------------------------------------------------
// API response shapes (Quran.com API v4)
// ---------------------------------------------------------------------------

interface ApiChapter {
  id: number;
  name_arabic: string;
  name_simple: string;
  translated_name: { name: string; language_name: string };
  verses_count: number;
  revelation_place: string;
}

interface ApiChaptersResponse {
  chapters: ApiChapter[];
}

interface ApiChapterResponse {
  chapter: ApiChapter;
}

interface ApiWord {
  id: number;
  position: number;
  text_uthmani: string;
  text: string;
  char_type_name?: string; // 'word' | 'end' | 'pause' — 'end' = verse number marker
  audio?: { url: string; duration: number; segments: number[][] };
}

interface ApiVerse {
  id: number;
  verse_number: number;
  verse_key: string;
  text_uthmani: string;
  words: ApiWord[];
}

interface ApiVersesResponse {
  verses: ApiVerse[];
  pagination?: {
    per_page: number;
    current_page: number;
    next_page: number | null;
    total_pages: number;
    total_records: number;
  };
}

interface ApiTranslation {
  verse_key: string;
  text: string;
}

interface ApiTranslationsResponse {
  translations: ApiTranslation[];
}

// ---------------------------------------------------------------------------
// Helper: map translation language to Quran.com translation ID
// ---------------------------------------------------------------------------

const TRANSLATION_IDS: Record<string, number> = {
  en: 131,  // Saheeh International
  de: 27,   // Bubenheim & Elyas
  fr: 136,  // Muhammad Hamidullah
  tr: 77,   // Diyanet İşleri
  ur: 97,   // Mufti Taqi Usmani
  id: 33,   // Indonesian Ministry of Religious Affairs
  ru: 45,   // Elmir Kuliev
  fa: 135,  // Dari/Persian — Ansarian
  ar: 16,   // Arabic Tafsir (Jalalayn)
};

function getTranslationId(language: string): number {
  return TRANSLATION_IDS[language] ?? TRANSLATION_IDS['en'] ?? 131;
}

// ---------------------------------------------------------------------------
// Helper: fetch with SWR-like cache headers
// ---------------------------------------------------------------------------

async function fetchWithCache<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
    // Next.js fetch cache: revalidate every 24 hours
    // In a plain browser context this falls back to standard HTTP caching
    next: { revalidate: CACHE_REVALIDATE },
  } as RequestInit & { next?: { revalidate: number } });

  if (!response.ok) {
    throw response;
  }

  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Helper: map API chapter to SurahMetadata
// ---------------------------------------------------------------------------

function mapChapterToMetadata(chapter: ApiChapter): SurahMetadata {
  return {
    id: chapter.id,
    nameArabic: chapter.name_arabic,
    nameTransliterated: chapter.name_simple,
    nameTranslation: chapter.translated_name.name,
    verseCount: chapter.verses_count,
    revelationType:
      chapter.revelation_place === 'makkah' ? 'meccan' : 'medinan',
  };
}

// ---------------------------------------------------------------------------
// Helper: map API verse to domain Verse
// ---------------------------------------------------------------------------

function mapApiVerse(apiVerse: ApiVerse): Verse {
  // Filter out non-word tokens:
  // - char_type_name === 'end'   → verse number marker (١, ٢, ...)
  // - char_type_name === 'pause' → pause sign (ۛ, ۜ, ...)
  // - text_uthmani contains only Arabic-Indic digits (٠١٢٣٤٥٦٧٨٩) or end markers
  const ARABIC_DIGITS_ONLY = /^[\u0660-\u0669\u06F0-\u06F9\s۞۩]+$/;

  const words: QuranWord[] = apiVerse.words
    .filter((w) => {
      // Skip if explicitly marked as end/pause
      if (w.char_type_name === 'end' || w.char_type_name === 'pause') return false;
      // Skip if the text is only Arabic-Indic digits (verse number)
      if (ARABIC_DIGITS_ONLY.test(w.text_uthmani.trim())) return false;
      // Skip empty words
      if (!w.text_uthmani.trim()) return false;
      return true;
    })
    .map((w) => {
      let audioTimestamp: number | undefined;
      if (w.audio?.segments && w.audio.segments.length > 0) {
        const firstSegment = w.audio.segments[0];
        if (firstSegment && firstSegment[0] !== undefined) {
          audioTimestamp = firstSegment[0] / 1000;
        }
      }

      return {
        id: `${apiVerse.verse_key}:${w.position}`,
        textUthmani: w.text_uthmani,
        textSimple: w.text,
        position: w.position - 1,
        audioTimestamp,
      };
    });

  return {
    id: apiVerse.verse_key,
    surahNumber: parseInt(apiVerse.verse_key.split(':')[0] ?? '0', 10),
    verseNumber: apiVerse.verse_number,
    words,
    textUthmani: apiVerse.text_uthmani,
  };
}

// ---------------------------------------------------------------------------
// Helper: build a QuranWebError from a fetch failure
// ---------------------------------------------------------------------------

function buildError(err: unknown): QuranWebError {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { kind: 'networkOffline', message: 'No network connection.' };
  }

  if (err instanceof Response) {
    if (err.status === 404) {
      return { kind: 'surahNotFound', surahNumber: 0 };
    }
    return {
      kind: 'apiUnavailable',
      message: `Quran API returned HTTP ${err.status}.`,
    };
  }

  if (err instanceof TypeError) {
    // fetch() throws TypeError for network errors
    return { kind: 'networkOffline', message: err.message };
  }

  return {
    kind: 'apiUnavailable',
    message: err instanceof Error ? err.message : 'Unknown API error.',
  };
}

// ---------------------------------------------------------------------------
// Translation cache: surahNumber:language → Record<verseKey, text>
// ---------------------------------------------------------------------------
const _translationCache: Map<string, Record<string, string>> = new Map();

// ---------------------------------------------------------------------------
// LocalStorageQuranRepository implementation
// ---------------------------------------------------------------------------

/**
 * Concrete implementation of QuranRepository backed by the Quran.com API v4.
 *
 * Caches all-surahs list in memory for the lifetime of the instance so that
 * `searchSurahs()` can filter client-side without additional network requests.
 */
export class QuranApiRepository implements QuranRepository {
  private cachedSurahs: SurahMetadata[] | null = null;

  // -------------------------------------------------------------------------
  // fetchAllSurahs
  // -------------------------------------------------------------------------

  async fetchAllSurahs(): Promise<SurahMetadata[]> {
    if (this.cachedSurahs !== null) {
      return this.cachedSurahs;
    }

    try {
      const data = await fetchWithCache<ApiChaptersResponse>(
        `${API_V4}/chapters?language=en`,
      );
      const surahs = data.chapters.map(mapChapterToMetadata);
      this.cachedSurahs = surahs;
      return surahs;
    } catch (err) {
      throw buildError(err);
    }
  }

  // -------------------------------------------------------------------------
  // fetchSurah
  // -------------------------------------------------------------------------

  async fetchSurah(number: number): Promise<Surah> {
    if (number < 1 || number > 114) {
      const error: QuranWebError = { kind: 'surahNotFound', surahNumber: number };
      throw error;
    }

    try {
      // Fetch chapter metadata and all verses in parallel
      const [chapterData, verses] = await Promise.all([
        fetchWithCache<ApiChapterResponse>(`${API_V4}/chapters/${number}`),
        this.fetchVerses(number),
      ]);

      const metadata = mapChapterToMetadata(chapterData.chapter);

      return { metadata, verses };
    } catch (err) {
      // Re-throw QuranWebError as-is
      if (
        typeof err === 'object' &&
        err !== null &&
        'kind' in err
      ) {
        throw err;
      }
      throw buildError(err);
    }
  }

  // -------------------------------------------------------------------------
  // fetchVerses
  // -------------------------------------------------------------------------

  async fetchVerses(
    surahNumber: number,
    range?: [number, number],
  ): Promise<Verse[]> {
    if (surahNumber < 1 || surahNumber > 114) {
      const error: QuranWebError = {
        kind: 'surahNotFound',
        surahNumber,
      };
      throw error;
    }

    try {
      const allVerses = await this.fetchAllVersesForSurah(surahNumber);

      if (range === undefined) {
        return allVerses;
      }

      const [start, end] = range;
      return allVerses.filter(
        (v) => v.verseNumber >= start && v.verseNumber <= end,
      );
    } catch (err) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'kind' in err
      ) {
        throw err;
      }
      throw buildError(err);
    }
  }

  // -------------------------------------------------------------------------
  // fetchSurahTranslations — fetch ALL translations for a surah at once
  // -------------------------------------------------------------------------

  async fetchSurahTranslations(
    surahNumber: number,
    language: string,
  ): Promise<Record<string, string>> {
    const cacheKey = `${surahNumber}:${language}`;
    const cached = _translationCache.get(cacheKey);
    if (cached !== undefined) return cached;

    // Use alquran.cloud API — free, no auth, CORS-enabled
    const editionMap: Record<string, string> = {
      de: 'de.bubenheim',
      en: 'en.sahih',
      fa: 'fa.ansarian',
      ar: 'ar.muyassar', // Arabic tafsir (simplified)
    };
    const edition = editionMap[language] ?? editionMap['en'] ?? 'en.sahih';

    try {
      const response = await fetch(
        `https://api.alquran.cloud/v1/surah/${surahNumber}/${edition}`,
        { headers: { Accept: 'application/json' } },
      );

      if (!response.ok) {
        console.error(`[fetchSurahTranslations] HTTP ${response.status} for ${language}`);
        return {};
      }

      const json = await response.json() as {
        data?: { ayahs?: Array<{ numberInSurah: number; text: string }> };
      };

      const ayahs = json.data?.ayahs ?? [];
      const result: Record<string, string> = {};

      for (const ayah of ayahs) {
        const verseKey = `${surahNumber}:${ayah.numberInSurah}`;
        result[verseKey] = ayah.text.replace(/<[^>]*>/g, '').trim();
      }

      _translationCache.set(cacheKey, result);
      return result;
    } catch (err) {
      console.error('[fetchSurahTranslations] failed:', err);
      return {};
    }
  }

  async fetchTranslation(
    verseKey: string,
    language: string,
  ): Promise<string | null> {
    const surahNumber = parseInt(verseKey.split(':')[0] ?? '0', 10);
    if (surahNumber < 1 || surahNumber > 114) return null;
    const allTranslations = await this.fetchSurahTranslations(surahNumber, language);
    return allTranslations[verseKey] ?? null;
  }

  // -------------------------------------------------------------------------
  // searchSurahs
  // -------------------------------------------------------------------------

  async searchSurahs(query: string): Promise<SurahMetadata[]> {
    const surahs = await this.fetchAllSurahs();
    return searchSurahsLocal(surahs, query);
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * Fetch all verses for a surah, handling pagination automatically.
   * The Quran.com API v4 returns up to 50 verses per page.
   */
  private async fetchAllVersesForSurah(surahNumber: number): Promise<Verse[]> {
    const perPage = 50;
    const firstPageUrl =
      `${API_V4}/verses/by_chapter/${surahNumber}` +
      `?words=true` +
      `&word_fields=text_uthmani,text,char_type_name` +
      `&per_page=${perPage}` +
      `&page=1`;

    const firstPage =
      await fetchWithCache<ApiVersesResponse>(firstPageUrl);

    const allApiVerses: ApiVerse[] = [...firstPage.verses];

    const totalPages = firstPage.pagination?.total_pages ?? 1;

    if (totalPages > 1) {
      const pagePromises: Promise<ApiVersesResponse>[] = [];
      for (let page = 2; page <= totalPages; page++) {
        const url =
          `${API_V4}/verses/by_chapter/${surahNumber}` +
          `?words=true` +
          `&word_fields=text_uthmani,text,char_type_name` +
          `&per_page=${perPage}` +
          `&page=${page}`;
        pagePromises.push(fetchWithCache<ApiVersesResponse>(url));
      }

      const remainingPages = await Promise.all(pagePromises);
      for (const page of remainingPages) {
        allApiVerses.push(...page.verses);
      }
    }

    return allApiVerses.map(mapApiVerse);
  }
}

// ---------------------------------------------------------------------------
// Singleton factory
// ---------------------------------------------------------------------------

let _instance: QuranApiRepository | null = null;

/**
 * Returns the shared QuranApiRepository instance.
 * Creates it on first call (lazy singleton).
 */
export function getQuranRepository(): QuranRepository {
  if (_instance === null) {
    _instance = new QuranApiRepository();
  }
  return _instance;
}
