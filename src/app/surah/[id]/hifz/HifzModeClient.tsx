'use client';

/**
 * HifzModeClient — Client Component entry point for the Hifz mode page.
 *
 * Responsibilities:
 * - Initialize the Hifz session on mount via useHifzStore.initSession()
 * - Monitor isSessionComplete and navigate to the session summary
 * - Handle session persistence on beforeunload (Req. 5.5, 9.4)
 * - Render HifzModeView for the active session
 * - Render SessionSummary when the session is complete
 *
 * Requirements: 3.8, 5.5, 9.4
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useHifzStore } from '@/stores/useHifzStore';
import { useProgressStore } from '@/stores/useProgressStore';
import HifzModeView from '@/components/hifz/HifzModeView';
import SessionSummary from '@/components/hifz/SessionSummary';
import type { SessionRecord } from '@/types/progress';

// ---------------------------------------------------------------------------
// Verse counts per surah (needed to pass totalVerses to HifzModeView)
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
// Props
// ---------------------------------------------------------------------------

interface HifzModeClientProps {
  surahNumber: number;
}

// ---------------------------------------------------------------------------
// HifzModeClient
// ---------------------------------------------------------------------------

/**
 * HifzModeClient — orchestrates the Hifz mode lifecycle.
 *
 * State machine:
 * - 'setup':    No session active; HifzModeView shows the range selection form
 * - 'active':   Session running; HifzModeView shows the current verse
 * - 'complete': Session done; SessionSummary is shown
 *
 * Requirements: 3.8, 5.5, 9.4
 */
export default function HifzModeClient({ surahNumber }: HifzModeClientProps) {
  const router = useRouter();

  // ── Store ────────────────────────────────────────────────────────────────
  const session = useHifzStore((s) => s.session);
  const isSessionComplete = useHifzStore((s) => s.isSessionComplete);
  const completeSession = useHifzStore((s) => s.completeSession);
  const stopRecitation = useHifzStore((s) => s.stopRecitation);
  const saveSession = useProgressStore((s) => s.saveSession);

  // ── Local state ──────────────────────────────────────────────────────────
  const [completedRecord, setCompletedRecord] = useState<SessionRecord | null>(null);
  const [phase, setPhase] = useState<'setup' | 'active' | 'complete'>('setup');

  // Ref to track whether we've already handled session completion
  const completionHandledRef = useRef(false);

  // ── RESET on mount or surah change — clear old session state ─────────────
  useEffect(() => {
    // If the store has a completed session or a session for a different surah, reset
    const storeState = useHifzStore.getState();
    if (
      storeState.isSessionComplete ||
      (storeState.session !== null && storeState.session.surahNumber !== surahNumber)
    ) {
      // Reset the store to initial state
      useHifzStore.setState({
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
      });
    }
    // Reset local state
    setPhase('setup');
    setCompletedRecord(null);
    completionHandledRef.current = false;
  }, [surahNumber]);

  // ── Handle session completion (Req. 3.8) ─────────────────────────────────
  useEffect(() => {
    if (isSessionComplete && !completionHandledRef.current) {
      completionHandledRef.current = true;

      void (async () => {
        try {
          const record = await completeSession();
          setCompletedRecord(record);
          setPhase('complete');
        } catch {
          // If completeSession fails, still navigate to summary with a minimal record
          setPhase('complete');
        }
      })();
    }
  }, [isSessionComplete, completeSession]);

  // ── Track when session becomes active ────────────────────────────────────
  useEffect(() => {
    if (session !== null && phase === 'setup') {
      setPhase('active');
      completionHandledRef.current = false;
    }
  }, [session, phase]);

  // ── beforeunload: save session progress (Req. 5.5, 9.4) ─────────────────
  useEffect(() => {
    const handleBeforeUnload = () => {
      const currentSession = useHifzStore.getState().session;
      if (currentSession === null) return;

      // Stop recitation (fire-and-forget — we're unloading)
      void stopRecitation();

      // Build a partial session record and persist it
      const now = new Date().toISOString();
      const startDate = new Date(currentSession.sessionStartDate);
      const totalDurationSeconds = Math.round(
        (Date.now() - startDate.getTime()) / 1000,
      );

      const partialRecord: SessionRecord = {
        id: crypto.randomUUID(),
        surahNumber: currentSession.surahNumber,
        startVerseNumber: currentSession.verseRange[0],
        endVerseNumber: currentSession.verseRange[1],
        startDate: currentSession.sessionStartDate,
        endDate: now,
        totalDurationSeconds,
        verseAttempts: useHifzStore.getState().verseAttempts,
        isCompleted: false,
        lastCompletedVerseNumber:
          currentSession.currentVerseIndex > 0
            ? currentSession.verseRange[0] + currentSession.currentVerseIndex - 1
            : undefined,
      };

      // useProgressStore.getState() is synchronous — safe in beforeunload
      saveSession(partialRecord);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [stopRecitation, saveSession]);

  // ── visibilitychange: pause recitation on tab switch (Req. 9.4) ──────────
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        const state = useHifzStore.getState().recitationState;
        if (state.kind === 'recording') {
          void stopRecitation();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [stopRecitation]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  /** Called by HifzModeView when isSessionComplete becomes true */
  const handleSessionComplete = useCallback(() => {
    // The useEffect above handles the actual completion logic
    // This callback is just a signal from the child component
  }, []);

  /** "Practice again" — reset and go back to setup */
  const handlePracticeAgain = useCallback(() => {
    completionHandledRef.current = false;
    setCompletedRecord(null);
    setPhase('setup');
    // Reset the store completely so a fresh session can start
    useHifzStore.setState({
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
    });
  }, []);

  /** "Back to surah list" — navigate to home */
  const handleBackToSurahList = useCallback(() => {
    router.push('/');
  }, [router]);

  // ── Total verses for this surah ───────────────────────────────────────────
  const totalVerses = VERSE_COUNTS[surahNumber] ?? 286;

  // ── Render: session summary (Req. 3.8, 5.4) ──────────────────────────────
  if (phase === 'complete' && completedRecord !== null) {
    return (
      <SessionSummary
        sessionRecord={completedRecord}
        onPracticeAgain={handlePracticeAgain}
        onBackToSurahList={handleBackToSurahList}
      />
    );
  }

  // ── Render: loading summary (completing session) ──────────────────────────
  if (phase === 'complete' && completedRecord === null) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4 animate-pulse">
        <div className="text-4xl" aria-hidden="true">⏳</div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Session wird gespeichert…
        </p>
      </div>
    );
  }

  // ── Render: setup / active session ───────────────────────────────────────
  return (
    <HifzModeView
      surahNumber={surahNumber}
      totalVerses={totalVerses}
      onSessionComplete={handleSessionComplete}
    />
  );
}
