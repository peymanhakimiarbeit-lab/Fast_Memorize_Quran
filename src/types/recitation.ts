/**
 * Recitation, ASR, and UI state types for the Quran Memorization Web App.
 * Corresponds to RecitationEngineProtocol and related types in the iOS sister app.
 */

import type { QuranWord, Verse } from './quran';

// ---------------------------------------------------------------------------
// Core recitation types
// ---------------------------------------------------------------------------

/**
 * The current state of the recitation engine.
 * Discriminated union covering all possible engine states.
 */
export type RecitationState =
  | { kind: 'idle' }
  | { kind: 'recording' }
  | { kind: 'paused' }
  | { kind: 'silenceDetected'; since: Date }
  | { kind: 'error'; error: QuranWebError };

/**
 * An event emitted when a spoken word is matched against the expected Quran word.
 */
export interface WordMatchEvent {
  /** The expected Quran word that was being matched */
  word: QuranWord;
  /** The text as transcribed by the ASR provider */
  transcribedText: string;
  /** The result of the match comparison */
  result: MatchResult;
  /** ASR confidence score for the transcription, 0.0–1.0 */
  confidence: number;
  /** Time elapsed from audio capture to match result, in milliseconds */
  latencyMs: number;
}

/**
 * The result of comparing a transcribed word against an expected Quran word.
 * Discriminated union covering all possible match outcomes.
 */
export type MatchResult =
  | { kind: 'correct' }
  | { kind: 'incorrect'; expected: string; got: string }
  | { kind: 'lowConfidence'; threshold: number };

/**
 * Configuration for the recitation engine and word matcher.
 */
export interface RecitationConfig {
  /** Minimum ASR confidence required to evaluate a word match. Default: 0.80 */
  confidenceThreshold: number;
  /** How strictly diacritics are compared during word matching. Default: 'moderate' */
  diacriticMode: DiacriticMode;
  /** Seconds of silence before the engine transitions to silenceDetected. Default: 5.0 */
  silenceTimeoutSeconds: number;
  /** Maximum acceptable latency from audio to match result in ms. Default: 550 */
  maxLatencyMs: number;
}

/**
 * Controls how strictly Arabic diacritics (Harakat) are compared during word matching.
 * - 'strict':   All Harakat must match exactly.
 * - 'moderate': Harakat are stripped before comparison; Alef variants, Ta Marbuta,
 *               and Hamza variants are normalized.
 */
export type DiacriticMode = 'strict' | 'moderate';

// ---------------------------------------------------------------------------
// RecitationEngine interface
// ---------------------------------------------------------------------------

/**
 * Central orchestrator for audio capture and word-by-word matching.
 * Corresponds to RecitationEngineProtocol in the iOS app.
 */
export interface RecitationEngine {
  /** Current state of the engine */
  readonly state: RecitationState;
  /**
   * Begin recitation for a specific verse.
   * The engine listens for a full sentence and matches it against the whole verse.
   */
  startRecitation(verse: Verse, config: RecitationConfig): Promise<void>;
  /** Stop recitation and release audio resources */
  stopRecitation(): Promise<void>;
  /** Pause recitation without releasing audio resources */
  pauseRecitation(): Promise<void>;
  /** Resume a paused recitation */
  resumeRecitation(): Promise<void>;
  /**
   * Register a callback to receive word match events.
   * @returns An unsubscribe function that removes the callback.
   */
  onWordMatch(callback: (event: WordMatchEvent) => void): () => void;
}

// ---------------------------------------------------------------------------
// ASR provider types
// ---------------------------------------------------------------------------

/**
 * A complete transcription result from the ASR provider.
 */
export interface TranscriptionResult {
  /** Individual transcription segments (e.g. sentences or phrases) */
  segments: TranscriptionSegment[];
  /** ISO 639-1 language code of the transcribed audio */
  language: string;
}

/**
 * A single segment of transcribed audio.
 */
export interface TranscriptionSegment {
  /** The transcribed text for this segment */
  text: string;
  /** Segment start time in seconds relative to the audio stream */
  startTime: number;
  /** Segment end time in seconds relative to the audio stream */
  endTime: number;
  /** ASR confidence score for this segment, 0.0–1.0 */
  confidence: number;
  /** Word-level timestamps within this segment */
  words: WordTimestamp[];
}

/**
 * Timing information for a single transcribed word.
 */
export interface WordTimestamp {
  /** The transcribed word text */
  word: string;
  /** Word start time in seconds relative to the audio stream */
  startTime: number;
  /** Word end time in seconds relative to the audio stream */
  endTime: number;
  /** ASR confidence score for this word, 0.0–1.0 */
  confidence: number;
}

/**
 * Abstraction over Web Speech API and Whisper.cpp/WASM.
 * Corresponds to ASRProvider in the iOS app.
 */
export interface ASRProvider {
  /** Whether this provider is supported in the current browser environment */
  readonly isAvailable: boolean;
  /** Whether the ASR model has been loaded and is ready to use */
  readonly isModelLoaded: boolean;
  /**
   * Start streaming audio and transcribing speech.
   * @param language ISO 639-1 language code, e.g. "ar"
   */
  startStream(language: string): Promise<void>;
  /** Stop the audio stream and transcription */
  stopStream(): Promise<void>;
  /**
   * Register a callback to receive transcription segments in real time.
   * @returns An unsubscribe function that removes the callback.
   */
  onTranscript(callback: (result: TranscriptionSegment) => void): () => void;
  /**
   * Load the ASR model by name. Only applicable for Whisper WASM provider.
   * @param modelName The model identifier to load (e.g. "whisper-small")
   */
  loadModel?(modelName: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// UI state types — Hifz mode
// ---------------------------------------------------------------------------

/**
 * UI state for a single word in the Hifz (memorization) mode.
 * Corresponds to HifzWordState in the iOS app.
 */
export interface HifzWordState {
  /** The QuranWord ID this state belongs to */
  readonly id: string;
  /** The underlying Quran word data */
  readonly word: QuranWord;
  /** Whether the word is currently hidden or revealed, and its color if revealed */
  visibility: WordVisibility;
  /** The match result for this word, if it has been evaluated */
  matchResult?: MatchResult;
}

/**
 * Visibility state for a word in Hifz mode.
 * - 'hidden':   The word is not shown to the user.
 * - 'revealed': The word is shown with a color indicating correctness.
 */
export type WordVisibility =
  | { kind: 'hidden' }
  | { kind: 'revealed'; color: WordColor };

/**
 * Color used to indicate whether a revealed word was recited correctly.
 */
export type WordColor = 'correct' | 'incorrect';

// ---------------------------------------------------------------------------
// UI state types — Reading mode
// ---------------------------------------------------------------------------

/**
 * UI state for a single word in the Reading mode.
 */
export interface ReadingWordState {
  /** The QuranWord ID this state belongs to */
  readonly id: string;
  /** The underlying Quran word data */
  readonly word: QuranWord;
  /** The match result for this word, if it has been evaluated during recitation */
  matchResult?: MatchResult;
}

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

/**
 * Discriminated union of all application error cases.
 * Use the `kind` field to narrow to a specific error type.
 */
export type QuranWebError =
  | {
      kind: 'apiUnavailable';
      /** Human-readable description of the API failure */
      message: string;
    }
  | {
      kind: 'surahNotFound';
      /** The Surah number that could not be found */
      surahNumber: number;
    }
  | {
      kind: 'networkOffline';
      /** Human-readable description of the network state */
      message: string;
    }
  | {
      kind: 'microphonePermissionDenied';
      /** Human-readable description of the permission error */
      message: string;
    }
  | {
      kind: 'asrNotSupported';
      /** Human-readable description of why ASR is unavailable */
      message: string;
    }
  | {
      kind: 'whisperModelLoadFailed';
      /** The model name that failed to load */
      modelName: string;
      /** Underlying error cause */
      cause?: unknown;
    }
  | {
      kind: 'localStorageQuotaExceeded';
      /** Human-readable description of the storage failure */
      message: string;
    }
  | {
      kind: 'unknown';
      /** Human-readable description of the unexpected error */
      message: string;
      /** Underlying error cause */
      cause?: unknown;
    };
