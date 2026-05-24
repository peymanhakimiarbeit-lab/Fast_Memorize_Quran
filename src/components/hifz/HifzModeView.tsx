'use client';

/**
 * HifzModeView — main view for the Hifz (memorization) mode.
 *
 * Connects to useHifzStore and renders:
 * - Verse range selection before session start
 * - Current verse with hidden/revealed words (HifzVerseWordRow)
 * - Attempt counter display (Req. 5.3)
 * - Microphone controls (MicrophoneButton)
 * - Automatic verse advance after complete correct recitation (handled by store)
 * - Loading and error states
 *
 * Requirements: 3.1, 3.4, 3.6, 5.2, 5.3
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useHifzStore } from '@/stores/useHifzStore';
import MicrophoneButton from '@/components/shared/MicrophoneButton';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface HifzModeViewProps {
  /** Surah number for this session */
  surahNumber: number;
  /** Total number of verses in the surah (for range selection) */
  totalVerses: number;
  /** Called when the session is complete — parent navigates to summary */
  onSessionComplete: () => void;
}

// ---------------------------------------------------------------------------
// Verse range selection form
// ---------------------------------------------------------------------------

interface VerseRangeFormProps {
  totalVerses: number;
  onStart: (start: number, end: number) => void;
  isLoading: boolean;
}

function VerseRangeForm({ totalVerses, onStart, isLoading }: VerseRangeFormProps) {
  const [startVerse, setStartVerse] = useState(1);
  const [endVerse, setEndVerse] = useState(Math.min(10, totalVerses));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStart(startVerse, endVerse);
  };

  const isValid = startVerse >= 1 && endVerse <= totalVerses && startVerse <= endVerse;

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          Hifz-Session starten
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Wähle den Versbereich für diese Session
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" aria-label="Versbereich auswählen">
        <div className="grid grid-cols-2 gap-4">
          {/* Start verse */}
          <div className="space-y-1">
            <label
              htmlFor="start-verse"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Von Vers
            </label>
            <input
              id="start-verse"
              type="number"
              min={1}
              max={totalVerses}
              value={startVerse}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) {
                  setStartVerse(val);
                  if (val > endVerse) setEndVerse(Math.min(val + 9, totalVerses));
                }
              }}
              className={[
                'w-full px-3 py-2 rounded-xl border text-center text-lg font-bold',
                'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
                startVerse < 1 || startVerse > totalVerses
                  ? 'border-red-400 dark:border-red-600'
                  : 'border-gray-200 dark:border-gray-700',
              ].join(' ')}
              aria-label="Startvers"
              aria-describedby="verse-range-hint"
            />
          </div>

          {/* End verse */}
          <div className="space-y-1">
            <label
              htmlFor="end-verse"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Bis Vers
            </label>
            <input
              id="end-verse"
              type="number"
              min={startVerse}
              max={totalVerses}
              value={endVerse}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) setEndVerse(val);
              }}
              className={[
                'w-full px-3 py-2 rounded-xl border text-center text-lg font-bold',
                'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
                endVerse < startVerse || endVerse > totalVerses
                  ? 'border-red-400 dark:border-red-600'
                  : 'border-gray-200 dark:border-gray-700',
              ].join(' ')}
              aria-label="Endvers"
              aria-describedby="verse-range-hint"
            />
          </div>
        </div>

        <p
          id="verse-range-hint"
          className="text-xs text-gray-400 dark:text-gray-500 text-center"
        >
          Diese Sure hat {totalVerses} Verse (1–{totalVerses})
        </p>

        {!isValid && (
          <p
            role="alert"
            className="text-xs text-red-600 dark:text-red-400 text-center"
          >
            Bitte wähle einen gültigen Versbereich (Start ≤ Ende, beide innerhalb 1–{totalVerses})
          </p>
        )}

        <button
          type="submit"
          disabled={!isValid || isLoading}
          className={[
            'w-full py-3 rounded-xl font-semibold text-white transition-colors',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
            isValid && !isLoading
              ? 'bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500'
              : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed',
          ].join(' ')}
          aria-busy={isLoading}
        >
          {isLoading ? 'Wird geladen…' : 'Session starten'}
        </button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Attempt counter badge
// ---------------------------------------------------------------------------

function AttemptCounter({ count }: { count: number }) {
  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800"
      aria-live="polite"
      aria-label={`Versuche: ${count}`}
      role="status"
    >
      <span className="text-amber-600 dark:text-amber-400 text-xs font-medium" aria-hidden="true">
        🔄
      </span>
      <span className="text-amber-700 dark:text-amber-300 text-xs font-bold tabular-nums">
        {count}
      </span>
      <span className="text-amber-600 dark:text-amber-400 text-xs">
        {count === 1 ? 'Versuch' : 'Versuche'}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Verse progress indicator
// ---------------------------------------------------------------------------

function VerseProgressIndicator({
  currentIndex,
  total,
}: {
  currentIndex: number;
  total: number;
}) {
  const percent = total > 0 ? Math.round(((currentIndex) / total) * 100) : 0;

  return (
    <div className="space-y-1" aria-label={`Vers ${currentIndex + 1} von ${total}`}>
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400" dir="ltr">
        <span>Vers {currentIndex + 1} / {total}</span>
        <span>{percent}%</span>
      </div>
      <div
        className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden"
        role="progressbar"
        aria-valuenow={currentIndex}
        aria-valuemin={0}
        aria-valuemax={total}
      >
        <div
          className="h-full rounded-full bg-emerald-500 dark:bg-emerald-400 transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// HifzModeView
// ---------------------------------------------------------------------------

/**
 * HifzModeView — full Hifz mode UI.
 *
 * Flow:
 * 1. Show verse range selection form (no active session)
 * 2. User submits range → initSession() → loading state
 * 3. Session active: show current verse (all words hidden), mic button, attempt counter
 * 4. User recites → store handles word reveal / reset / advance
 * 5. isSessionComplete → onSessionComplete() callback
 *
 * Requirements: 3.1, 3.4, 3.6, 5.2, 5.3
 */
export default function HifzModeView({
  surahNumber,
  totalVerses,
  onSessionComplete,
}: HifzModeViewProps) {
  // ── Store ────────────────────────────────────────────────────────────────
  const session = useHifzStore((s) => s.session);
  const currentVerse = useHifzStore((s) => s.currentVerse);
  const wordStates = useHifzStore((s) => s.wordStates);
  const recitationState = useHifzStore((s) => s.recitationState);
  const attemptCount = useHifzStore((s) => s.attemptCount);
  const isSessionComplete = useHifzStore((s) => s.isSessionComplete);
  const sessionVerses = useHifzStore((s) => s.sessionVerses);
  const isLoading = useHifzStore((s) => s.isLoading);
  const error = useHifzStore((s) => s.error);

  const initSession = useHifzStore((s) => s.initSession);
  const startRecitation = useHifzStore((s) => s.startRecitation);
  const stopRecitation = useHifzStore((s) => s.stopRecitation);

  // ── Session complete → notify parent ────────────────────────────────────
  useEffect(() => {
    if (isSessionComplete) {
      onSessionComplete();
    }
  }, [isSessionComplete, onSessionComplete]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleStartSession = useCallback(
    (start: number, end: number) => {
      void initSession(surahNumber, [start, end]);
    },
    [surahNumber, initSession],
  );

  const handleMicToggle = useCallback(() => {
    if (recitationState.kind === 'recording' || recitationState.kind === 'silenceDetected') {
      void stopRecitation();
    } else {
      void startRecitation();
    }
  }, [recitationState, startRecitation, stopRecitation]);

  // Auto-scroll to current verse area when verse changes
  const currentVerseRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (currentVerseRef.current && session) {
      currentVerseRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [session?.currentVerseIndex]);

  // ── Determine if we're in verse-reveal mode (all words revealed = timeout/skip) ──
  const isVerseReveal =
    currentVerse !== null &&
    currentVerse.words.length > 0 &&
    currentVerse.words.every((w) => {
      const ws = wordStates[w.id];
      return ws !== undefined && ws.visibility.kind === 'revealed';
    });

  // ── Render: error state ───────────────────────────────────────────────────
  if (error !== null && !isLoading && session === null) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div
          role="alert"
          aria-live="assertive"
          className="p-6 rounded-2xl bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 space-y-4 text-center"
        >
          <p className="text-2xl" aria-hidden="true">⚠️</p>
          <p className="text-sm font-medium text-red-700 dark:text-red-300" dir="ltr">
            {error}
          </p>
          <button
            type="button"
            onClick={() => void initSession(surahNumber, [1, Math.min(10, totalVerses)])}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  // ── Render: no session yet → show range selection ─────────────────────────
  if (session === null) {
    return (
      <VerseRangeForm
        totalVerses={totalVerses}
        onStart={handleStartSession}
        isLoading={isLoading}
      />
    );
  }

  // ── Render: loading ───────────────────────────────────────────────────────
  if (isLoading || currentVerse === null) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mx-auto" />
        <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
        <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-2xl w-3/4 mx-auto" />
      </div>
    );
  }

  // ── Collect word states for current verse ─────────────────────────────────
  const verseWordStates = currentVerse.words.map(
    (w) =>
      wordStates[w.id] ?? {
        id: w.id,
        word: w,
        visibility: { kind: 'hidden' as const },
        matchResult: undefined,
      },
  );

  // ── Render: active session — Lückentext-Ansicht ───────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 pb-48">
      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-20 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800 py-3 space-y-2">
        <VerseProgressIndicator
          currentIndex={session.currentVerseIndex}
          total={sessionVerses.length}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-gray-500 dark:text-gray-400" dir="ltr">
            {currentVerse.id}
          </span>
          <AttemptCounter count={attemptCount} />
        </div>
      </header>

      {/* ── Koran-Seite als Lückentext ── */}
      <main
        className="py-6"
        aria-label="Koran-Seite — Lückentext"
        dir="rtl"
      >
        <div className="p-6 sm:p-8 rounded-2xl bg-amber-50/30 dark:bg-gray-800 border border-amber-200/50 dark:border-gray-700 shadow-inner min-h-[300px]">
          {/* All verses rendered inline — like a real Quran page */}
          <div className="arabic-text arabic-text--lg leading-[3] text-right">
            {sessionVerses.map((verse, verseIdx) => {
              const isCompleted = verseIdx < session.currentVerseIndex;
              const isCurrent = verseIdx === session.currentVerseIndex;
              const isFuture = verseIdx > session.currentVerseIndex;

              return (
                <span key={verse.id} className="inline">
                  {/* Completed verse — show each word individually in green (same layout as current) */}
                  {isCompleted && (
                    <span className="inline">
                      {verse.words.map((word) => (
                        <span key={word.id} className="text-emerald-700 dark:text-emerald-300">
                          {word.textUthmani}{' '}
                        </span>
                      ))}
                    </span>
                  )}

                  {/* Current verse — words appear progressively */}
                  {isCurrent && (
                    <span ref={currentVerseRef} className="inline">
                      {verse.words.map((word) => {
                        const ws = wordStates[word.id];
                        const isRevealed = ws?.visibility.kind === 'revealed';
                        const isCorrect = isRevealed && ws?.visibility.color === 'correct';
                        const isIncorrect = isRevealed && ws?.visibility.color === 'incorrect';

                        if (isCorrect) {
                          return (
                            <span key={word.id} className="text-emerald-600 dark:text-emerald-400 animate-fade-in">
                              {word.textUthmani}{' '}
                            </span>
                          );
                        }
                        if (isIncorrect) {
                          return (
                            <span key={word.id} className="text-red-500 dark:text-red-400 animate-fade-in">
                              {word.textUthmani}{' '}
                            </span>
                          );
                        }
                        // Hidden — show as small underline (Lücke)
                        return (
                          <span
                            key={word.id}
                            className="inline-block border-b-2 border-gray-300 dark:border-gray-500 mx-px align-baseline"
                            style={{ width: `${Math.max(word.textUthmani.length * 0.4, 0.8)}em`, height: '0.3em' }}
                            aria-label="verstecktes Wort"
                          />
                        );
                      })}
                    </span>
                  )}

                  {/* Future verse — small underlines (always visible, slightly faded) */}
                  {isFuture && (
                    <span className="inline opacity-50">
                      {verse.words.map((word) => (
                        <span
                          key={word.id}
                          className="inline-block border-b-2 border-gray-300 dark:border-gray-600 mx-px align-baseline"
                          style={{ width: `${Math.max(word.textUthmani.length * 0.4, 0.8)}em`, height: '0.3em' }}
                          aria-hidden="true"
                        />
                      ))}
                    </span>
                  )}

                  {/* Verse number separator — always visible */}
                  <span className="text-amber-600 dark:text-amber-400 text-sm mx-1 font-normal select-none">
                    ﴿{verse.verseNumber}﴾
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      </main>

      {/* ── Fixed bottom controls ── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-t border-gray-100 dark:border-gray-800 px-4 py-4">
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-3">
          {recitationState.kind === 'idle' && (
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Tippe auf das Mikrofon und rezitiere den Vers aus dem Gedächtnis
            </p>
          )}

          <MicrophoneButton
            state={recitationState}
            onToggle={handleMicToggle}
            disabled={isLoading || isVerseReveal}
          />
        </div>
      </div>
    </div>
  );
}
