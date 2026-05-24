/**
 * RecitationEngine — orchestrates audio capture and verse-level matching.
 *
 * NEW APPROACH: Instead of word-by-word matching, we now do VERSE-LEVEL matching.
 * The engine receives the current verse, listens for a full sentence from the
 * Web Speech API, then compares the whole sentence against the whole verse.
 * This is much more robust for Arabic Quran recitation.
 */

import type { Verse } from '../types/quran';
import type {
  ASRProvider,
  RecitationConfig,
  RecitationEngine,
  RecitationState,
  TranscriptionSegment,
  WordMatchEvent,
} from '../types/recitation';
import { WebSpeechASRProvider } from '../asr/webSpeechProvider';
import { WhisperWasmASRProvider } from '../asr/whisperWasmProvider';
import { matchVerseTranscript } from './wordMatcher';

const SILENCE_SENTINEL = '__silence__';

class RecitationEngineImpl implements RecitationEngine {
  private _state: RecitationState = { kind: 'idle' };

  get state(): RecitationState {
    return this._state;
  }

  private provider: ASRProvider | null = null;
  private currentVerse: Verse | null = null;
  private config: RecitationConfig | null = null;

  private wordMatchCallbacks: Set<(event: WordMatchEvent) => void> = new Set();
  private unsubscribeTranscript: (() => void) | null = null;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly boundVisibilityChange: () => void;

  constructor() {
    this.boundVisibilityChange = this.handleVisibilityChange.bind(this);
  }

  // ── startRecitation ──────────────────────────────────────────────────────

  async startRecitation(
    verse: Verse,
    config: RecitationConfig,
  ): Promise<void> {
    if (this._state.kind !== 'idle') {
      await this.stopRecitation();
    }

    this.currentVerse = verse;
    this.config = config;
    this.provider = this.selectProvider();

    if (this.provider === null) {
      this._state = {
        kind: 'error',
        error: { kind: 'asrNotSupported', message: 'No ASR provider available. Use Chrome or Edge.' },
      };
      return;
    }

    this.unsubscribeTranscript = this.provider.onTranscript(
      this.handleTranscript.bind(this),
    );

    try {
      await this.provider.startStream('ar');
    } catch (err) {
      this.unsubscribeTranscript?.();
      this.unsubscribeTranscript = null;
      this._state = {
        kind: 'error',
        error: {
          kind: 'microphonePermissionDenied',
          message: err instanceof Error ? err.message : 'Microphone access denied.',
        },
      };
      return;
    }

    this._state = { kind: 'recording' };
    this.resetSilenceTimer(config.silenceTimeoutSeconds);

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.boundVisibilityChange);
    }
  }

  // ── stopRecitation ───────────────────────────────────────────────────────

  async stopRecitation(): Promise<void> {
    this.clearSilenceTimer();
    this.removeVisibilityListener();
    this.unsubscribeTranscript?.();
    this.unsubscribeTranscript = null;

    if (this.provider !== null) {
      try { await this.provider.stopStream(); } catch { /* ignore */ }
      this.provider = null;
    }

    this._state = { kind: 'idle' };
    this.currentVerse = null;
    this.config = null;
  }

  // ── pauseRecitation ──────────────────────────────────────────────────────

  async pauseRecitation(): Promise<void> {
    if (this._state.kind !== 'recording') return;
    this.clearSilenceTimer();
    if (this.provider !== null) {
      try { await this.provider.stopStream(); } catch { /* ignore */ }
    }
    this._state = { kind: 'paused' };
  }

  // ── resumeRecitation ─────────────────────────────────────────────────────

  async resumeRecitation(): Promise<void> {
    if (this._state.kind !== 'paused') return;
    if (this.provider === null || this.config === null) return;

    try {
      await this.provider.startStream('ar');
    } catch (err) {
      this._state = {
        kind: 'error',
        error: {
          kind: 'microphonePermissionDenied',
          message: err instanceof Error ? err.message : 'Microphone access denied.',
        },
      };
      return;
    }

    this._state = { kind: 'recording' };
    this.resetSilenceTimer(this.config.silenceTimeoutSeconds);
  }

  // ── onWordMatch ──────────────────────────────────────────────────────────

  onWordMatch(callback: (event: WordMatchEvent) => void): () => void {
    this.wordMatchCallbacks.add(callback);
    return () => { this.wordMatchCallbacks.delete(callback); };
  }

  // ── handleTranscript ─────────────────────────────────────────────────────

  private handleTranscript(segment: TranscriptionSegment): void {
    if (this._state.kind !== 'recording') return;

    const text = segment.text.trim();

    if (text === SILENCE_SENTINEL) {
      this.transitionToSilenceDetected();
      return;
    }

    if (text.length === 0) return;
    if (this.currentVerse === null || this.config === null) return;

    this.resetSilenceTimer(this.config.silenceTimeoutSeconds);

    // ── Verse-level matching ──────────────────────────────────────────────
    // Compare the whole transcribed sentence against the whole verse.
    // This is far more robust than word-by-word matching.
    const verseResult = matchVerseTranscript(text, this.currentVerse, this.config);

    const now = Date.now() / 1000;

    // Emit one WordMatchEvent per word in the verse
    for (const { word, result } of verseResult.wordResults) {
      const event: WordMatchEvent = {
        word,
        transcribedText: text,
        result,
        confidence: segment.confidence > 0 ? segment.confidence : 0.9,
        latencyMs: 0,
      };
      this.dispatchWordMatchEvent(event);
    }
  }

  // ── helpers ──────────────────────────────────────────────────────────────

  private dispatchWordMatchEvent(event: WordMatchEvent): void {
    this.wordMatchCallbacks.forEach((cb) => {
      try { cb(event); } catch { /* ignore */ }
    });
  }

  private transitionToSilenceDetected(): void {
    this.clearSilenceTimer();
    this._state = { kind: 'silenceDetected', since: new Date() };
  }

  private resetSilenceTimer(timeoutSeconds: number): void {
    this.clearSilenceTimer();
    this.silenceTimer = setTimeout(() => {
      if (this._state.kind === 'recording') {
        this.transitionToSilenceDetected();
      }
    }, timeoutSeconds * 1_000);
  }

  private clearSilenceTimer(): void {
    if (this.silenceTimer !== null) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  private handleVisibilityChange(): void {
    if (typeof document === 'undefined') return;
    if (document.visibilityState === 'hidden' && this._state.kind === 'recording') {
      void this.pauseRecitation();
    }
  }

  private removeVisibilityListener(): void {
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.boundVisibilityChange);
    }
  }

  private selectProvider(): ASRProvider | null {
    const webSpeech = new WebSpeechASRProvider();
    if (webSpeech.isAvailable) return webSpeech;
    const whisper = new WhisperWasmASRProvider();
    if (whisper.isAvailable) return whisper;
    return null;
  }
}

export function createRecitationEngine(): RecitationEngine {
  return new RecitationEngineImpl();
}
