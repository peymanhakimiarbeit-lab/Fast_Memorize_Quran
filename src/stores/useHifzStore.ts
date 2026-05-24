'use client';

/**
 * useHifzStore — Zustand store for the Hifz (memorization) mode.
 *
 * Manages the active session state, per-word visibility/match states,
 * recitation engine lifecycle, verse timeout logic, and session completion.
 *
 * Verse timeout: 10 seconds of silence → reveal the verse for 2 seconds → advance.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 5.1, 5.2, 5.3
 */

import { create } from 'zustand';
import type { Verse } from '../types/quran';
import type {
  RecitationState,
  HifzWordState,
  WordMatchEvent,
} from '../types/recitation';
import type { SessionRecord, SessionState, VerseAttemptRecord } from '../types/progress';
import { getQuranRepository } from '../repositories/quranRepository';
import { createRecitationEngine } from '../domain/recitationEngine';
import type { RecitationEngine } from '../types/recitation';
import { useProgressStore } from './useProgressStore';

// ---------------------------------------------------------------------------
// Default recitation config
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG = {
  confidenceThreshold: 0.5,  // Lowered: Web Speech API often returns 0.0 for Arabic
  diacriticMode: 'moderate' as const,
  silenceTimeoutSeconds: 10, // Hifz mode uses 10-second silence timeout
  maxLatencyMs: 550,
};

/** How long (ms) to show the revealed verse before auto-advancing */
const VERSE_REVEAL_DURATION_MS = 2_000;

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

export interface HifzStore {
  // ── State ──────────────────────────────────────────────────────────────
  /** Active session metadata, or null if no session is running */
  session: SessionState | null;
  /** The verse currently being recited */
  currentVerse: Verse | null;
  /**
   * Per-word UI state keyed by QuranWord.id.
   * Stored as a plain Record for Zustand compatibility (no Map).
   */
  wordStates: Record<string, HifzWordState>;
  /** Current state of the recitation engine */
  recitationState: RecitationState;
  /** Number of recitation attempts for the current verse */
  attemptCount: number;
  /** Whether all verses in the session have been completed */
  isSessionComplete: boolean;
  /** All verses in the session range (loaded once during initSession) */
  sessionVerses: Verse[];
  /** Whether the session is currently being initialized */
  isLoading: boolean;
  /** Error from the last failed operation, if any */
  error: string | null;
  /** Per-verse attempt records accumulated during the session */
  verseAttempts: VerseAttemptRecord[];

  // ── Actions ────────────────────────────────────────────────────────────
  /** Initialize a new Hifz session for the given surah and verse range */
  initSession(surahNumber: number, verseRange: [number, number]): Promise<void>;
  /** Start recitation for the current verse */
  startRecitation(): Promise<void>;
  /** Stop the active recitation */
  stopRecitation(): Promise<void>;
  /** Reset the current verse: hide all words, clear match results, increment attemptCount */
  resetVerse(): void;
  /** Advance to the next verse, or mark the session complete if on the last verse */
  advanceToNextVerse(): void;
  /** Handle a WordMatchEvent from the RecitationEngine */
  handleWordMatchEvent(event: WordMatchEvent): void;
  /**
   * Complete the session: build a SessionRecord and persist it via useProgressStore.
   * Returns the created SessionRecord.
   */
  completeSession(): Promise<SessionRecord>;
}

// ---------------------------------------------------------------------------
// Module-level engine instance (singleton per store)
// ---------------------------------------------------------------------------

let _engine: RecitationEngine | null = null;
let _unsubscribeWordMatch: (() => void) | null = null;
let _silenceRevealTimer: ReturnType<typeof setTimeout> | null = null;
let _advanceTimer: ReturnType<typeof setTimeout> | null = null;

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

function clearTimers(): void {
  if (_silenceRevealTimer !== null) {
    clearTimeout(_silenceRevealTimer);
    _silenceRevealTimer = null;
  }
  if (_advanceTimer !== null) {
    clearTimeout(_advanceTimer);
    _advanceTimer = null;
  }
}

// ---------------------------------------------------------------------------
// Helper: build hidden word states for a verse
// ---------------------------------------------------------------------------

function buildHiddenWordStates(verse: Verse): Record<string, HifzWordState> {
  const states: Record<string, HifzWordState> = {};
  for (const word of verse.words) {
    states[word.id] = {
      id: word.id,
      word,
      visibility: { kind: 'hidden' },
      matchResult: undefined,
    };
  }
  return states;
}

// ---------------------------------------------------------------------------
// Helper: build revealed word states for a verse (used during timeout reveal)
// ---------------------------------------------------------------------------

function buildRevealedWordStates(
  verse: Verse,
  color: 'correct' | 'incorrect' = 'correct',
): Record<string, HifzWordState> {
  const states: Record<string, HifzWordState> = {};
  for (const word of verse.words) {
    states[word.id] = {
      id: word.id,
      word,
      visibility: { kind: 'revealed', color },
      matchResult: undefined,
    };
  }
  return states;
}

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------

export const useHifzStore = create<HifzStore>()((set, get) => ({
  // ── Initial state ──────────────────────────────────────────────────────
  session: null,
  currentVerse: null,
  wordStates: {},
  recitationState: { kind: 'idle' },
  attemptCount: 0,
  isSessionComplete: false,
  sessionVerses: [],
  isLoading: false,
  error: null,
  verseAttempts: [],

  // ── initSession ────────────────────────────────────────────────────────
  async initSession(surahNumber: number, verseRange: [number, number]): Promise<void> {
    clearTimers();
    _unsubscribeWordMatch?.();
    _unsubscribeWordMatch = null;

    set({
      isLoading: true,
      error: null,
      session: null,
      currentVerse: null,
      wordStates: {},
      isSessionComplete: false,
      sessionVerses: [],
      verseAttempts: [],
      attemptCount: 0,
    });

    try {
      const verses = await getQuranRepository().fetchVerses(surahNumber, verseRange);

      if (verses.length === 0) {
        set({ isLoading: false, error: 'No verses found for the given range.' });
        return;
      }

      const firstVerse = verses[0]!;

      const sessionState: SessionState = {
        surahNumber,
        verseRange,
        currentVerseIndex: 0,
        revealedWordIds: [],
        attemptCount: 0,
        sessionStartDate: new Date().toISOString(),
      };

      set({
        session: sessionState,
        sessionVerses: verses,
        currentVerse: firstVerse,
        wordStates: buildHiddenWordStates(firstVerse),
        attemptCount: 0,
        isSessionComplete: false,
        isLoading: false,
        error: null,
        verseAttempts: [],
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Failed to initialize session.';

      set({ isLoading: false, error: message });
    }
  },

  // ── startRecitation ────────────────────────────────────────────────────
  async startRecitation(): Promise<void> {
    const { currentVerse } = get();
    if (currentVerse === null) return;

    // Stop any previous recitation cleanly
    await stopAndCleanEngine();

    // Get or create engine
    const engine = getEngine();

    // Subscribe to word match events
    _unsubscribeWordMatch = engine.onWordMatch((event) => {
      get().handleWordMatchEvent(event);
    });

    // Start recitation for the current verse
    await engine.startRecitation(currentVerse, DEFAULT_CONFIG);
    set({ recitationState: engine.state });
    _startSilenceMonitor(get, set);
  },

  // ── stopRecitation ─────────────────────────────────────────────────────
  async stopRecitation(): Promise<void> {
    clearTimers();
    const engine = getEngine();
    await engine.stopRecitation();

    _unsubscribeWordMatch?.();
    _unsubscribeWordMatch = null;

    set({ recitationState: { kind: 'idle' } });
  },

  // ── handleWordMatchEvent ───────────────────────────────────────────────
  handleWordMatchEvent(event: WordMatchEvent): void {
    const { currentVerse, wordStates, session } = get();
    if (currentVerse === null || session === null) return;

    const wordId = event.word.id;
    const existing = wordStates[wordId];
    if (existing === undefined) return;

    // Only update if the word belongs to the current verse
    const isCurrentVerseWord = currentVerse.words.some((w) => w.id === wordId);
    if (!isCurrentVerseWord) return;

    console.log(`[Hifz] Word "${event.word.textUthmani}" → ${event.result.kind}`, event.transcribedText);

    if (event.result.kind === 'correct') {
      // Reveal the word in green — it stays visible
      const updatedWordStates = {
        ...get().wordStates, // re-read to get latest
        [wordId]: {
          ...existing,
          visibility: { kind: 'revealed' as const, color: 'correct' as const },
          matchResult: event.result,
        },
      };

      const updatedSession: SessionState = {
        ...get().session!,
        revealedWordIds: [...get().session!.revealedWordIds, wordId],
      };

      set({
        wordStates: updatedWordStates,
        session: updatedSession,
        recitationState: getEngine().state,
      });

      // Check if ALL words in the current verse are now correct
      const allRevealed = currentVerse.words.every((w) => {
        const ws = updatedWordStates[w.id];
        return (
          ws !== undefined &&
          ws.visibility.kind === 'revealed' &&
          ws.visibility.color === 'correct'
        );
      });

      if (allRevealed) {
        _recordVerseAttempt(get, set, true);
        // Small delay so user sees the complete green verse before advancing
        setTimeout(() => {
          get().advanceToNextVerse();
        }, 800);
      }
    } else if (event.result.kind === 'incorrect') {
      // Show the incorrect word in red briefly
      const updatedWordStates = {
        ...get().wordStates,
        [wordId]: {
          ...existing,
          visibility: { kind: 'revealed' as const, color: 'incorrect' as const },
          matchResult: event.result,
        },
      };

      set({
        wordStates: updatedWordStates,
        recitationState: getEngine().state,
      });

      // Don't reset immediately — let the verse-level matching finish
      // Only reset if this is the LAST event in the batch (checked via timeout)
    }
    // lowConfidence: ignore
  },

  // ── resetVerse ─────────────────────────────────────────────────────────
  resetVerse(): void {
    const { currentVerse, session, attemptCount } = get();
    if (currentVerse === null || session === null) return;

    const updatedSession: SessionState = {
      ...session,
      revealedWordIds: [],
    };

    set({
      wordStates: buildHiddenWordStates(currentVerse),
      session: updatedSession,
      attemptCount: attemptCount + 1,
    });
  },

  // ── advanceToNextVerse ─────────────────────────────────────────────────
  advanceToNextVerse(): void {
    const { session, sessionVerses, wordStates } = get();
    if (session === null) return;

    const nextIndex = session.currentVerseIndex + 1;

    if (nextIndex >= sessionVerses.length) {
      // Last verse completed — session is done
      set({ isSessionComplete: true });
      return;
    }

    const nextVerse = sessionVerses[nextIndex];
    if (nextVerse === undefined) {
      set({ isSessionComplete: true });
      return;
    }

    const updatedSession: SessionState = {
      ...session,
      currentVerseIndex: nextIndex,
      revealedWordIds: [],
      attemptCount: 0,
    };

    // KEEP old word states (completed verses) and ADD new hidden words
    const newWordStates = { ...wordStates, ...buildHiddenWordStates(nextVerse) };

    set({
      session: updatedSession,
      currentVerse: nextVerse,
      wordStates: newWordStates,
      attemptCount: 0,
    });

    // Restart recitation for the new verse
    void get().startRecitation();
  },

  // ── completeSession ────────────────────────────────────────────────────
  async completeSession(): Promise<SessionRecord> {
    const { session, sessionVerses, verseAttempts } = get();

    if (session === null) {
      throw new Error('No active session to complete.');
    }

    const now = new Date().toISOString();
    const startDate = new Date(session.sessionStartDate);
    const endDate = new Date();
    const totalDurationSeconds = Math.round(
      (endDate.getTime() - startDate.getTime()) / 1000,
    );

    const lastVerse = sessionVerses[session.currentVerseIndex];

    const record: SessionRecord = {
      id: crypto.randomUUID(),
      surahNumber: session.surahNumber,
      startVerseNumber: session.verseRange[0],
      endVerseNumber: session.verseRange[1],
      startDate: session.sessionStartDate,
      endDate: now,
      totalDurationSeconds,
      verseAttempts,
      isCompleted: true,
      lastCompletedVerseNumber: lastVerse?.verseNumber,
    };

    // Persist via progress store
    useProgressStore.getState().saveSession(record);

    // Stop recitation if still running
    await get().stopRecitation();

    return record;
  },
}));

// ---------------------------------------------------------------------------
// Private helpers (module-level, not part of the store interface)
// ---------------------------------------------------------------------------

/**
 * Record a verse attempt result into the store's verseAttempts array.
 */
function _recordVerseAttempt(
  get: () => HifzStore,
  set: (partial: Partial<HifzStore> | ((state: HifzStore) => Partial<HifzStore>)) => void,
  wasSuccessful: boolean,
): void {
  const { currentVerse, attemptCount, verseAttempts } = get();
  if (currentVerse === null) return;

  const record: VerseAttemptRecord = {
    verseKey: currentVerse.id,
    attemptCount: attemptCount + 1,
    wasSuccessful,
  };

  set({ verseAttempts: [...verseAttempts, record] });
}

/**
 * Start monitoring the recitation engine state for silence.
 * When silence is detected for 10 seconds (handled by the engine itself via
 * silenceTimeoutSeconds: 10), we reveal the verse for 2 seconds then advance.
 *
 * The engine transitions to `silenceDetected` after the configured timeout.
 * We poll the engine state to detect this transition.
 */
function _startSilenceMonitor(
  get: () => HifzStore,
  set: (partial: Partial<HifzStore> | ((state: HifzStore) => Partial<HifzStore>)) => void,
): void {
  clearTimers();

  // Poll the engine state every 500 ms to detect silenceDetected
  const pollInterval = setInterval(() => {
    const engine = getEngine();
    const { isSessionComplete, currentVerse } = get();

    if (isSessionComplete || currentVerse === null) {
      clearInterval(pollInterval);
      return;
    }

    if (engine.state.kind === 'silenceDetected') {
      clearInterval(pollInterval);

      // Reveal the verse for 2 seconds
      set({
        wordStates: buildRevealedWordStates(currentVerse, 'correct'),
        recitationState: engine.state,
      });

      _advanceTimer = setTimeout(() => {
        _advanceTimer = null;
        get().advanceToNextVerse();
      }, VERSE_REVEAL_DURATION_MS);
    }
  }, 500);

  // Store the interval ID so we can clear it on stopRecitation / resetVerse
  // We repurpose _silenceRevealTimer to hold the interval reference
  _silenceRevealTimer = pollInterval as unknown as ReturnType<typeof setTimeout>;
}
