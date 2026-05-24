'use client';

/**
 * SessionSummary — displays the results of a completed Hifz session.
 *
 * Shows:
 * - Number of verses practiced
 * - Average attempts per verse
 * - Total session duration (formatted as mm:ss or hh:mm:ss)
 *
 * Actions:
 * - "Nochmal üben" (Practice again) — restarts the session with the same range
 * - "Zurück zur Surenliste" (Back to surah list) — navigates to the home page
 *
 * Requirements: 5.4
 */

import type { SessionRecord } from '@/types/progress';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface SessionSummaryProps {
  /** The completed session record */
  sessionRecord: SessionRecord;
  /** Called when the user wants to practice the same range again */
  onPracticeAgain: () => void;
  /** Called when the user wants to go back to the surah list */
  onBackToSurahList: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Format a duration in seconds as a human-readable string.
 * - < 60 s:   "42 Sek."
 * - < 3600 s: "3:42"
 * - ≥ 3600 s: "1:03:42"
 */
function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 60) {
    return `${totalSeconds} Sek.`;
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${mm}:${ss}`;
  }
  return `${minutes}:${ss}`;
}

/**
 * Calculate the average number of attempts per verse.
 * Returns a string formatted to one decimal place.
 */
function calcAverageAttempts(record: SessionRecord): string {
  const { verseAttempts } = record;
  if (verseAttempts.length === 0) return '—';

  const total = verseAttempts.reduce((sum, va) => sum + va.attemptCount, 0);
  const avg = total / verseAttempts.length;
  return avg % 1 === 0 ? String(avg) : avg.toFixed(1);
}

/**
 * Count the number of distinct verses practiced in the session.
 */
function countVerses(record: SessionRecord): number {
  return record.endVerseNumber - record.startVerseNumber + 1;
}

// ---------------------------------------------------------------------------
// Stat card sub-component
// ---------------------------------------------------------------------------

interface StatCardProps {
  icon: string;
  label: string;
  value: string;
  ariaLabel: string;
}

function StatCard({ icon, label, value, ariaLabel }: StatCardProps) {
  return (
    <div
      className="flex flex-col items-center gap-1 p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
      aria-label={ariaLabel}
    >
      <span className="text-2xl" aria-hidden="true">{icon}</span>
      <span className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">
        {value}
      </span>
      <span className="text-xs text-gray-500 dark:text-gray-400 text-center">
        {label}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SessionSummary component
// ---------------------------------------------------------------------------

/**
 * SessionSummary — post-session results screen.
 *
 * Displays key metrics from the completed session and provides navigation
 * options to practice again or return to the surah list.
 *
 * Requirements: 5.4
 */
export default function SessionSummary({
  sessionRecord,
  onPracticeAgain,
  onBackToSurahList,
}: SessionSummaryProps) {
  const verseCount = countVerses(sessionRecord);
  const avgAttempts = calcAverageAttempts(sessionRecord);
  const duration = formatDuration(sessionRecord.totalDurationSeconds);

  return (
    <div
      className="max-w-md mx-auto px-4 py-8 space-y-8"
      role="main"
      aria-label="Session-Zusammenfassung"
    >
      {/* ── Header ── */}
      <div className="text-center space-y-2">
        <div className="text-5xl" aria-hidden="true">🎉</div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Session abgeschlossen!
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Sure {sessionRecord.surahNumber} · Verse {sessionRecord.startVerseNumber}–{sessionRecord.endVerseNumber}
        </p>
      </div>

      {/* ── Stats grid ── */}
      <div
        className="grid grid-cols-3 gap-3"
        role="region"
        aria-label="Session-Statistiken"
      >
        <StatCard
          icon="📖"
          label="Verse"
          value={String(verseCount)}
          ariaLabel={`${verseCount} Verse geübt`}
        />
        <StatCard
          icon="🔄"
          label="Ø Versuche"
          value={avgAttempts}
          ariaLabel={`Durchschnittlich ${avgAttempts} Versuche pro Vers`}
        />
        <StatCard
          icon="⏱"
          label="Dauer"
          value={duration}
          ariaLabel={`Gesamtdauer: ${duration}`}
        />
      </div>

      {/* ── Motivational message ── */}
      <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-center">
        <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
          {verseCount === 1
            ? 'Du hast 1 Vers geübt. Weiter so!'
            : `Du hast ${verseCount} Verse geübt. Ausgezeichnet!`}
        </p>
      </div>

      {/* ── Action buttons ── */}
      <div className="space-y-3" role="group" aria-label="Aktionen">
        {/* Practice again */}
        <button
          type="button"
          onClick={onPracticeAgain}
          className={[
            'w-full py-3 rounded-xl font-semibold text-white transition-colors',
            'bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2',
          ].join(' ')}
          aria-label="Dieselben Verse nochmal üben"
        >
          🔁 Nochmal üben
        </button>

        {/* Back to surah list */}
        <button
          type="button"
          onClick={onBackToSurahList}
          className={[
            'w-full py-3 rounded-xl font-semibold transition-colors',
            'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700',
            'text-gray-700 dark:text-gray-300',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2',
          ].join(' ')}
          aria-label="Zurück zur Surenliste"
        >
          ← Zurück zur Surenliste
        </button>
      </div>
    </div>
  );
}
