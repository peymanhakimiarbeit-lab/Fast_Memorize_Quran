'use client';

/**
 * useReadingStore — Zustand store for the Reading (Lese) mode.
 *
 * Manages the currently loaded Surah, per-word match states, recitation
 * engine lifecycle, and UI preferences (font size, translation language).
 *
 * Requirements: 2.1, 2.3, 2.5, 2.6, 4.3, 4.4
 */

import { create } from 'zustand';
import type { Surah } from '../types/quran';
import type { RecitationState, ReadingWordState, WordMatchEvent } from '../types/recitation';
import { getQuranRepository } from '../repositories/quranRepository';
import { createRecitationEngine } from '../domain/recitationEngine';
import type { RecitationEngine } from '../types/recitation';

// ---------------------------------------------------------------------------
// Default recitation config
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG = {
  confidenceThreshold: 0.5,  // Lowered: Web Speech API often returns 0.0 for Arabic
  diacriticMode: 'moderate' as const,
  silenceTimeoutSeconds: 5,
  maxLatencyMs: 550,
};

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

export interface ReadingStore {
  // ── State ──────────────────────────────────────────────────────────────
  /** The currently loaded Surah, or null if none is loaded */
  currentSurah: Surah | null;
  /**
   * Per-word UI state keyed by QuranWord.id.
   * Stored as a plain Record for Zustand compatibility (no Map).
   */
  wordStates: Record<string, ReadingWordState>;
  /** Current state of the recitation engine */
  recitationState: RecitationState;
  /** Display font size for Arabic text */
  fontSize: 'small' | 'medium' | 'large';
  /** ISO 639-1 language code for the active translation, or null to hide */
  activeTranslationLanguage: string | null;
  /** Verse number currently visible in the viewport */
  currentVisibleVerseNumber: number;
  /** Whether a surah is currently being loaded */
  isLoading: boolean;
  /** Error from the last failed operation, if any */
  error: string | null;

  // ── Actions ────────────────────────────────────────────────────────────
  /** Load a Surah by number and initialize word states */
  loadSurah(surahNumber: number): Promise<void>;
  /** Start recitation for the currently loaded Surah */
  startRecitation(): Promise<void>;
  /** Stop the active recitation */
  stopRecitation(): Promise<void>;
  /** Advance to the next verse and restart recitation */
  nextVerse(): Promise<void>;
  /** Go back to the previous verse */
  prevVerse(): Promise<void>;
  /** Select a specific verse by index (0-based) */
  selectVerse(index: number): Promise<void>;
  /** Index of the currently active verse (0-based) */
  activeVerseIndex: number;
  /** Update the font size preference */
  setFontSize(size: 'small' | 'medium' | 'large'): void;
  /** Set or clear the active translation language */
  setTranslationLanguage(language: string | null): void;
  /** Handle a WordMatchEvent from the RecitationEngine */
  handleWordMatchEvent(event: WordMatchEvent): void;
  /** Update the currently visible verse number (driven by scroll/IntersectionObserver) */
  setCurrentVisibleVerseNumber(verseNumber: number): void;
  /** Mark the last incorrect word as correct (user override) */
  overrideLastIncorrectWord(): void;
  /** Load translations for the current surah in the given language */
  loadTranslations(language: string): Promise<void>;
  /** Cached translations: verseKey → translated text */
  translations: Record<string, string>;
  /** Whether translations are currently loading */
  isLoadingTranslations: boolean;
}

// ---------------------------------------------------------------------------
// Module-level engine instance (singleton per store)
// ---------------------------------------------------------------------------

let _engine: RecitationEngine | null = null;
let _unsubscribeWordMatch: (() => void) | null = null;

function getEngine(): RecitationEngine {
  if (_engine === null) {
    _engine = createRecitationEngine();
  }
  return _engine;
}

async function stopAndCleanEngine(): Promise<void> {
  _unsubscribeWordMatch?.();
  _unsubscribeWordMatch = null;
  if (_engine !== null) {
    try { await _engine.stopRecitation(); } catch { /* ignore */ }
  }
}

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------

export const useReadingStore = create<ReadingStore>()((set, get) => ({
  // ── Initial state ──────────────────────────────────────────────────────
  currentSurah: null,
  wordStates: {},
  recitationState: { kind: 'idle' },
  fontSize: 'medium',
  activeTranslationLanguage: null,
  currentVisibleVerseNumber: 1,
  activeVerseIndex: 0,
  isLoading: false,
  error: null,
  translations: {},
  isLoadingTranslations: false,

  // ── loadSurah ──────────────────────────────────────────────────────────
  async loadSurah(surahNumber: number): Promise<void> {
    set({ isLoading: true, error: null, currentSurah: null, wordStates: {} });

    try {
      const surah = await getQuranRepository().fetchSurah(surahNumber);

      // Build initial word states — one entry per word across all verses
      const wordStates: Record<string, ReadingWordState> = {};
      for (const verse of surah.verses) {
        for (const word of verse.words) {
          wordStates[word.id] = {
            id: word.id,
            word,
            matchResult: undefined,
          };
        }
      }

      set({
        currentSurah: surah,
        wordStates,
        currentVisibleVerseNumber: surah.verses[0]?.verseNumber ?? 1,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Failed to load surah.';

      set({ isLoading: false, error: message });
    }
  },

  // ── startRecitation ────────────────────────────────────────────────────
  async startRecitation(): Promise<void> {
    const { currentSurah, activeVerseIndex } = get();
    if (currentSurah === null) return;

    // Stop any previous recitation cleanly
    await stopAndCleanEngine();

    const currentVerse = currentSurah.verses[activeVerseIndex] ?? currentSurah.verses[0];
    if (!currentVerse) return;

    const engine = getEngine();
    _unsubscribeWordMatch = engine.onWordMatch((event) => {
      get().handleWordMatchEvent(event);
    });

    await engine.startRecitation(currentVerse, DEFAULT_CONFIG);
    set({ recitationState: engine.state });
  },

  // ── nextVerse ──────────────────────────────────────────────────────────
  async nextVerse(): Promise<void> {
    const { currentSurah, activeVerseIndex } = get();
    if (currentSurah === null) return;

    const nextIndex = Math.min(activeVerseIndex + 1, currentSurah.verses.length - 1);
    const nextVerseObj = currentSurah.verses[nextIndex];
    if (!nextVerseObj) return;

    await stopAndCleanEngine();

    set({
      activeVerseIndex: nextIndex,
      currentVisibleVerseNumber: nextVerseObj.verseNumber,
    });

    // Start fresh for new verse
    const engine = getEngine();
    _unsubscribeWordMatch = engine.onWordMatch((event) => {
      get().handleWordMatchEvent(event);
    });
    await engine.startRecitation(nextVerseObj, DEFAULT_CONFIG);
    set({ recitationState: engine.state });
  },

  // ── prevVerse ──────────────────────────────────────────────────────────
  async prevVerse(): Promise<void> {
    const { currentSurah, activeVerseIndex } = get();
    if (currentSurah === null) return;

    const prevIndex = Math.max(activeVerseIndex - 1, 0);
    const prevVerseObj = currentSurah.verses[prevIndex];
    if (!prevVerseObj) return;

    await stopAndCleanEngine();

    set({
      activeVerseIndex: prevIndex,
      currentVisibleVerseNumber: prevVerseObj.verseNumber,
    });

    const engine = getEngine();
    _unsubscribeWordMatch = engine.onWordMatch((event) => {
      get().handleWordMatchEvent(event);
    });
    await engine.startRecitation(prevVerseObj, DEFAULT_CONFIG);
    set({ recitationState: engine.state });
  },

  // ── selectVerse ────────────────────────────────────────────────────────
  async selectVerse(index: number): Promise<void> {
    const { currentSurah, recitationState } = get();
    if (currentSurah === null) return;
    if (index < 0 || index >= currentSurah.verses.length) return;

    const verse = currentSurah.verses[index];
    if (!verse) return;

    // Stop current recitation if running
    if (recitationState.kind === 'recording' || recitationState.kind === 'silenceDetected') {
      await getEngine().stopRecitation();
    }

    set({
      activeVerseIndex: index,
      currentVisibleVerseNumber: verse.verseNumber,
      recitationState: { kind: 'idle' },
    });
  },

  // ── stopRecitation ─────────────────────────────────────────────────────
  async stopRecitation(): Promise<void> {
    await stopAndCleanEngine();
    set({ recitationState: { kind: 'idle' } });
  },

  // ── handleWordMatchEvent ───────────────────────────────────────────────
  handleWordMatchEvent(event: WordMatchEvent): void {
    const wordId = event.word.id;

    set((state) => {
      const existing = state.wordStates[wordId];
      if (existing === undefined) return state;

      return {
        wordStates: {
          ...state.wordStates,
          [wordId]: {
            ...existing,
            matchResult: event.result,
          },
        },
        recitationState: _engine?.state ?? { kind: 'idle' },
      };
    });

    // ── Auto-advance: check if all words in the active verse are correct ──
    const { currentSurah, activeVerseIndex, wordStates } = get();
    if (currentSurah === null) return;

    const activeVerse = currentSurah.verses[activeVerseIndex];
    if (!activeVerse) return;

    const allCorrect = activeVerse.words.every((w) => {
      const ws = wordStates[w.id];
      return ws?.matchResult?.kind === 'correct';
    });

    if (allCorrect && activeVerseIndex < currentSurah.verses.length - 1) {
      // Wait 1 second then auto-advance to next verse
      setTimeout(() => {
        void get().nextVerse();
      }, 1000);
    } else if (allCorrect && activeVerseIndex >= currentSurah.verses.length - 1) {
      // Last verse of the surah — stop recitation, show completion
      void get().stopRecitation();
    }
  },

  // ── setFontSize ────────────────────────────────────────────────────────
  setFontSize(size: 'small' | 'medium' | 'large'): void {
    set({ fontSize: size });
  },

  // ── setTranslationLanguage ─────────────────────────────────────────────
  setTranslationLanguage(language: string | null): void {
    set({ activeTranslationLanguage: language });
  },

  // ── setCurrentVisibleVerseNumber ───────────────────────────────────────
  setCurrentVisibleVerseNumber(verseNumber: number): void {
    set({ currentVisibleVerseNumber: verseNumber });
  },

  // ── overrideLastIncorrectWord ──────────────────────────────────────────
  overrideLastIncorrectWord(): void {
    // Find the most recently marked incorrect word and mark it as correct
    set((state) => {
      const entries = Object.entries(state.wordStates);
      // Find last incorrect word (iterate in reverse)
      for (let i = entries.length - 1; i >= 0; i--) {
        const entry = entries[i];
        if (!entry) continue;
        const [wordId, ws] = entry;
        if (ws.matchResult?.kind === 'incorrect') {
          return {
            wordStates: {
              ...state.wordStates,
              [wordId]: {
                ...ws,
                matchResult: { kind: 'correct' },
              },
            },
          };
        }
      }
      return state;
    });
  },

  // ── loadTranslations ───────────────────────────────────────────────────
  async loadTranslations(language: string): Promise<void> {
    const { currentSurah } = get();
    if (currentSurah === null) return;

    set({ isLoadingTranslations: true, translations: {} });

    try {
      const repo = getQuranRepository();
      const surahNumber = currentSurah.metadata.id;
      const allTranslations = await repo.fetchSurahTranslations(surahNumber, language);
      set({ translations: allTranslations, isLoadingTranslations: false });
    } catch (err) {
      console.error('[loadTranslations] failed:', err);
      set({ isLoadingTranslations: false });
    }
  },
}));
