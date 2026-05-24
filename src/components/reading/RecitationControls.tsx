'use client';

/**
 * RecitationControls — microphone, audio playback, override, and calibration hint.
 *
 * - Microphone button (via MicrophoneButton) to start/stop recitation
 * - Audio playback button to play the reference recitation
 * - Override button: appears only after a word is marked incorrect (Req. 8.3)
 * - Calibration hint banner when shouldShowCalibrationHint === true (Req. 8.4)
 *
 * Requirements: 7.1, 7.2, 8.1, 8.3, 8.4
 */

import MicrophoneButton from '@/components/shared/MicrophoneButton';
import type { RecitationState } from '@/types/recitation';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface RecitationControlsProps {
  /** Current state of the recitation engine */
  recitationState: RecitationState;
  /** Called when the microphone button is toggled */
  onMicToggle: () => void;
  /** Whether audio playback is currently active */
  isPlayingAudio: boolean;
  /** Called when the audio playback button is pressed */
  onAudioToggle: () => void;
  /**
   * Whether the override button should be shown.
   * True only after at least one word has been marked incorrect (Req. 8.3).
   */
  hasIncorrectWord: boolean;
  /** Called when the user presses the override button */
  onOverride: () => void;
  /**
   * Whether to show the calibration hint banner (Req. 8.4).
   * True when > 30 % of words in the last verse had low confidence.
   */
  shouldShowCalibrationHint: boolean;
  /** Called when the user dismisses the calibration hint */
  onDismissCalibrationHint: () => void;
  /** Called when the user presses "Calibrate" in the hint banner */
  onStartCalibration: () => void;
  /** Disable all controls (e.g. while loading) */
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// CalibrationHintBanner
// ---------------------------------------------------------------------------

interface CalibrationHintBannerProps {
  onDismiss: () => void;
  onCalibrate: () => void;
}

/**
 * Banner shown when the ASR confidence is consistently low.
 * Recommends the user to re-run calibration.
 *
 * Requirements: 8.4
 */
function CalibrationHintBanner({
  onDismiss,
  onCalibrate,
}: CalibrationHintBannerProps) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800"
    >
      {/* Icon */}
      <span className="text-xl shrink-0" aria-hidden="true">
        🎙
      </span>

      {/* Text */}
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
          Kalibrierung empfohlen
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-300" dir="ltr">
          More than 30 % of words had low confidence. Recalibrating may improve
          accuracy.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-1 shrink-0">
        <button
          type="button"
          onClick={onCalibrate}
          className="text-xs font-medium px-2 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          aria-label="Kalibrierung starten"
        >
          Kalibrieren
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs text-amber-600 dark:text-amber-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded"
          aria-label="Kalibrierungshinweis schließen"
        >
          Schließen
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AudioPlaybackButton
// ---------------------------------------------------------------------------

interface AudioPlaybackButtonProps {
  isPlaying: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

/**
 * Button to start/stop reference audio playback.
 * Plays the correct recitation of the current verse by a professional reciter.
 *
 * Requirements: 7.1, 7.2
 */
function AudioPlaybackButton({
  isPlaying,
  onToggle,
  disabled = false,
}: AudioPlaybackButtonProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-label={isPlaying ? 'Referenzrezitation stoppen' : 'Referenzrezitation anhören'}
        aria-pressed={isPlaying}
        title={isPlaying ? 'Referenzrezitation stoppen' : 'Korrekte Rezitation anhören (Referenz)'}
        className={[
          'w-12 h-12 rounded-full border-2 flex items-center justify-center text-lg',
          'transition-all duration-200',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500',
          'active:scale-95',
          disabled
            ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400'
            : isPlaying
            ? 'bg-emerald-600 border-emerald-500 text-white shadow-md hover:bg-emerald-700'
            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400',
        ].filter(Boolean).join(' ')}
      >
        <span aria-hidden="true">{isPlaying ? '⏹' : '▶'}</span>
        <span className="sr-only">{isPlaying ? 'Stoppen' : 'Referenz anhören'}</span>
      </button>
      <span className="text-xs text-gray-400 dark:text-gray-500">Referenz</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// OverrideButton
// ---------------------------------------------------------------------------

interface OverrideButtonProps {
  onOverride: () => void;
}

/**
 * Button to manually mark the last incorrect word as correct.
 * Only rendered when `hasIncorrectWord` is true (Req. 8.3).
 *
 * Requirements: 8.3
 */
function OverrideButton({ onOverride }: OverrideButtonProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={onOverride}
        className={[
          'w-12 h-12 rounded-full border-2 flex items-center justify-center text-lg',
          'bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700',
          'text-blue-700 dark:text-blue-300',
          'hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
          'active:scale-95',
        ].join(' ')}
        aria-label="Letztes falsch markiertes Wort als korrekt markieren"
        title="Als korrekt markieren — wenn du das Wort richtig gesagt hast, aber es rot markiert wurde"
      >
        <span aria-hidden="true">✓</span>
      </button>
      <span className="text-xs text-blue-600 dark:text-blue-400">Korrekt</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RecitationControls component
// ---------------------------------------------------------------------------

/**
 * RecitationControls — bottom control bar for the Reading mode.
 *
 * Layout (left to right):
 *   [Audio playback] [Microphone] [Override (conditional)]
 *
 * Calibration hint banner is shown above the controls when needed.
 *
 * Requirements: 7.1, 7.2, 8.1, 8.3, 8.4
 */
export default function RecitationControls({
  recitationState,
  onMicToggle,
  isPlayingAudio,
  onAudioToggle,
  hasIncorrectWord,
  onOverride,
  shouldShowCalibrationHint,
  onDismissCalibrationHint,
  onStartCalibration,
  disabled = false,
}: RecitationControlsProps) {
  return (
    <div className="space-y-3">
      {/* Calibration hint banner — shown when > 30 % low confidence (Req. 8.4) */}
      {shouldShowCalibrationHint && (
        <CalibrationHintBanner
          onDismiss={onDismissCalibrationHint}
          onCalibrate={onStartCalibration}
        />
      )}

      {/* Main controls row */}
      <div
        className="flex items-center justify-center gap-4"
        role="group"
        aria-label="Rezitationssteuerung"
      >
        {/* Audio playback button (Req. 7.1, 7.2) */}
        <AudioPlaybackButton
          isPlaying={isPlayingAudio}
          onToggle={onAudioToggle}
          disabled={disabled}
        />

        {/* Microphone button (Req. 8.1) */}
        <MicrophoneButton
          state={recitationState}
          onToggle={onMicToggle}
          disabled={disabled}
        />

        {/* Override button — only after an incorrect word (Req. 8.3) */}
        {hasIncorrectWord && <OverrideButton onOverride={onOverride} />}
      </div>
    </div>
  );
}
