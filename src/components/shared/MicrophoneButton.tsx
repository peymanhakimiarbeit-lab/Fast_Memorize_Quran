'use client';

import type { RecitationState } from "@/types/recitation";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface MicrophoneButtonProps {
  /** Current state of the recitation engine */
  state: RecitationState;
  /** Called when the button is pressed to start or stop recording */
  onToggle: () => void;
  /** Optional additional CSS classes */
  className?: string;
  /** Disable the button (e.g. while loading) */
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the dynamic aria-label based on the current state */
function getAriaLabel(state: RecitationState): string {
  switch (state.kind) {
    case "idle":
      return "Aufnahme starten";
    case "recording":
      return "Aufnahme stoppen";
    case "paused":
      return "Aufnahme fortsetzen";
    case "silenceDetected":
      return "Stille erkannt — Aufnahme fortsetzen";
    case "error":
      return "Fehler bei der Aufnahme";
    default:
      return "Mikrofon";
  }
}

/** Returns whether the button is in a "pressed" (active recording) state */
function isPressed(state: RecitationState): boolean {
  return state.kind === "recording" || state.kind === "silenceDetected";
}

// ---------------------------------------------------------------------------
// Visual state helpers
// ---------------------------------------------------------------------------

interface VisualConfig {
  /** Outer ring classes (pulsing animation for recording) */
  ringClasses: string;
  /** Button background and border classes */
  buttonClasses: string;
  /** Icon to display */
  icon: string;
  /** Icon aria-hidden label */
  iconLabel: string;
}

function getVisualConfig(state: RecitationState): VisualConfig {
  switch (state.kind) {
    case "recording":
      return {
        ringClasses:
          "absolute inset-0 rounded-full bg-red-400/30 dark:bg-red-500/30 animate-ping",
        buttonClasses:
          "bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 border-red-400 dark:border-red-500 text-white shadow-lg shadow-red-500/30",
        icon: "⏹",
        iconLabel: "Stop recording",
      };

    case "paused":
      return {
        ringClasses: "",
        buttonClasses:
          "bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 border-amber-400 dark:border-amber-500 text-white shadow-md",
        icon: "▶",
        iconLabel: "Resume recording",
      };

    case "silenceDetected":
      return {
        ringClasses:
          "absolute inset-0 rounded-full bg-amber-400/30 dark:bg-amber-500/30 animate-pulse-slow",
        buttonClasses:
          "bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 border-amber-400 dark:border-amber-500 text-white shadow-md",
        icon: "🎙",
        iconLabel: "Silence detected — tap to resume",
      };

    case "error":
      return {
        ringClasses: "",
        buttonClasses:
          "bg-gray-300 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed",
        icon: "⚠",
        iconLabel: "Microphone error",
      };

    case "idle":
    default:
      return {
        ringClasses: "",
        buttonClasses:
          "bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 border-emerald-500 dark:border-emerald-500 text-white shadow-md hover:shadow-lg hover:shadow-emerald-500/30 transition-shadow",
        icon: "🎙",
        iconLabel: "Start recording",
      };
  }
}

// ---------------------------------------------------------------------------
// Silence indicator
// ---------------------------------------------------------------------------

/**
 * Visual pulse indicator shown when silence is detected.
 * Provides a subtle visual cue that the microphone is waiting.
 */
function SilenceIndicator() {
  return (
    <div
      className="flex items-center gap-1"
      role="status"
      aria-live="polite"
      aria-label="Stille erkannt"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="block w-1 h-1 rounded-full bg-amber-400 dark:bg-amber-300 animate-bounce"
          style={{ animationDelay: `${i * 150}ms` }}
          aria-hidden="true"
        />
      ))}
      <span className="sr-only">Stille erkannt</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status label
// ---------------------------------------------------------------------------

function StatusLabel({ state }: { state: RecitationState }) {
  let label: string | null = null;
  let labelClass = "text-xs text-gray-500 dark:text-gray-400";

  switch (state.kind) {
    case "recording":
      label = "Aufnahme läuft…";
      labelClass = "text-xs text-red-600 dark:text-red-400 font-medium";
      break;
    case "paused":
      label = "Pausiert";
      labelClass = "text-xs text-amber-600 dark:text-amber-400 font-medium";
      break;
    case "silenceDetected":
      label = "Stille erkannt";
      labelClass = "text-xs text-amber-600 dark:text-amber-400 font-medium";
      break;
    case "error":
      label =
        "message" in state.error
          ? String(state.error.message).slice(0, 40)
          : "Fehler";
      labelClass = "text-xs text-red-600 dark:text-red-400";
      break;
    default:
      label = null;
  }

  if (!label) return null;

  return (
    <p className={labelClass} dir="ltr" aria-live="polite" role="status">
      {label}
    </p>
  );
}

// ---------------------------------------------------------------------------
// MicrophoneButton component
// ---------------------------------------------------------------------------

/**
 * MicrophoneButton — A touch-friendly button for controlling audio recording.
 *
 * Visual states:
 * - idle:            Green, microphone icon
 * - recording:       Red with pulsing ring animation, stop icon
 * - paused:          Amber, play icon
 * - silenceDetected: Amber with slow pulse, microphone icon + silence dots
 * - error:           Gray, warning icon, disabled
 *
 * ARIA:
 * - aria-label: dynamic ("Aufnahme starten" / "Aufnahme stoppen" / …)
 * - aria-pressed: true when recording or silenceDetected
 * - role="button" (implicit from <button>)
 *
 * Touch: minimum 44×44 px tap target (WCAG 2.5.5)
 *
 * Requirements: 4.6, 9.1, 9.5
 */
export default function MicrophoneButton({
  state,
  onToggle,
  className = "",
  disabled = false,
}: MicrophoneButtonProps) {
  const visual = getVisualConfig(state);
  const pressed = isPressed(state);
  const ariaLabel = getAriaLabel(state);
  const isError = state.kind === "error";
  const isDisabled = disabled || isError;
  const isSilence = state.kind === "silenceDetected";

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      {/* Button wrapper — provides the minimum touch target */}
      <div className="relative touch-target flex items-center justify-center">
        {/* Pulsing ring (recording / silence) */}
        {visual.ringClasses && (
          <span className={visual.ringClasses} aria-hidden="true" />
        )}

        {/* Main button */}
        <button
          type="button"
          onClick={onToggle}
          disabled={isDisabled}
          aria-label={ariaLabel}
          aria-pressed={pressed}
          className={[
            // Base layout — always 44×44 px minimum (WCAG 2.5.5)
            "relative z-10 w-14 h-14 rounded-full border-2",
            "flex items-center justify-center",
            "text-xl",
            "transition-all duration-200",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500",
            "active:scale-95",
            isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
            visual.buttonClasses,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <span aria-hidden="true">{visual.icon}</span>
          <span className="sr-only">{visual.iconLabel}</span>
        </button>
      </div>

      {/* Silence indicator dots */}
      {isSilence && <SilenceIndicator />}

      {/* Status label */}
      <StatusLabel state={state} />
    </div>
  );
}
