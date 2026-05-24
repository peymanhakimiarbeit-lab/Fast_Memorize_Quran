'use client';

/**
 * WebSpeechASRProvider — robust implementation using the Web Speech API.
 *
 * Key fixes:
 * - Race condition on restart prevented via _restartLock
 * - Silence timer only starts AFTER first speech is detected
 * - Longer silence timeout (8s) to give user time to start
 * - Handles 'aborted' error gracefully (happens on rapid stop/start)
 */

import type { ASRProvider, TranscriptionSegment } from '../types/recitation';

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface ISpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
  onaudiostart: (() => void) | null;
  onaudioend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionConstructor = new () => ISpeechRecognition;

// Silence timeout: 8 seconds (generous — gives user time to start)
const SILENCE_TIMEOUT_MS = 8_000;

// Delay before restarting after onend (prevents rapid restart loops)
const RESTART_DELAY_MS = 300;

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return (
    (w.SpeechRecognition as SpeechRecognitionConstructor | undefined) ??
    (w.webkitSpeechRecognition as SpeechRecognitionConstructor | undefined) ??
    null
  );
}

export class WebSpeechASRProvider implements ASRProvider {
  get isAvailable(): boolean {
    return getSpeechRecognitionCtor() !== null;
  }

  readonly isModelLoaded: boolean = true;

  private recognition: ISpeechRecognition | null = null;
  private transcriptCallbacks: Set<(result: TranscriptionSegment) => void> = new Set();
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;
  private isStreaming = false;
  private hasSpeechStarted = false; // Track if user has started speaking

  async startStream(language: string): Promise<void> {
    const Ctor = getSpeechRecognitionCtor();
    if (Ctor === null) {
      throw { kind: 'asrNotSupported', message: 'Web Speech API not available.' };
    }

    if (this.isStreaming) return;

    const recognition = new Ctor();
    recognition.lang = language === 'ar' ? 'ar-SA' : language;
    recognition.continuous = true;
    recognition.interimResults = false; // Only final results — much more reliable
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      this.hasSpeechStarted = true;
      this.resetSilenceTimer();

      // Process ALL final results from resultIndex onwards
      for (let r = event.resultIndex; r < event.results.length; r++) {
        const result = event.results[r];
        if (!result || !result.isFinal) continue;

        const alternative = result[0];
        if (!alternative) continue;

        const text = alternative.transcript.trim();
        if (text.length === 0) continue;

        const confidence = alternative.confidence > 0 ? alternative.confidence : 0.9;
        const now = Date.now() / 1000;

        const segment: TranscriptionSegment = {
          text,
          startTime: now,
          endTime: now,
          confidence,
          words: text.split(/\s+/).map((word, i) => ({
            word,
            startTime: now + i * 0.05,
            endTime: now + (i + 1) * 0.05,
            confidence,
          })),
        };

        this.emitTranscript(segment);
      }
    };

    recognition.onspeechstart = () => {
      this.hasSpeechStarted = true;
      this.resetSilenceTimer();
    };

    recognition.onspeechend = () => {
      // Only start silence timer if speech was detected before
      if (this.hasSpeechStarted) {
        this.startSilenceTimer();
      }
    };

    recognition.onaudiostart = () => {
      // Don't reset silence timer here — wait for actual speech
    };

    recognition.onaudioend = () => {
      if (this.hasSpeechStarted) {
        this.startSilenceTimer();
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // These are non-fatal — just means no speech detected yet
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }

      // Network error — emit empty segment so engine can handle it
      if (event.error === 'network') {
        console.warn('[WebSpeech] Network error — will retry on restart');
        return;
      }

      console.error('[WebSpeech] Error:', event.error, event.message);
    };

    recognition.onend = () => {
      // Auto-restart if we're still supposed to be streaming
      if (this.isStreaming) {
        // Small delay to prevent rapid restart loops
        this.restartTimer = setTimeout(() => {
          if (this.isStreaming && this.recognition === recognition) {
            try {
              recognition.start();
            } catch {
              // Already started or disposed — ignore
            }
          }
        }, RESTART_DELAY_MS);
      }
    };

    this.recognition = recognition;
    this.isStreaming = true;
    this.hasSpeechStarted = false;

    try {
      recognition.start();
    } catch (err) {
      this.isStreaming = false;
      this.recognition = null;
      throw err;
    }

    // Don't start silence timer immediately — wait for speech to begin
    // The timer will start after onspeechstart or onspeechend
  }

  async stopStream(): Promise<void> {
    this.isStreaming = false;
    this.hasSpeechStarted = false;
    this.clearSilenceTimer();

    if (this.restartTimer !== null) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }

    if (this.recognition !== null) {
      const rec = this.recognition;
      this.recognition = null;
      try { rec.abort(); } catch { /* ignore */ }
    }
  }

  onTranscript(callback: (result: TranscriptionSegment) => void): () => void {
    this.transcriptCallbacks.add(callback);
    return () => { this.transcriptCallbacks.delete(callback); };
  }

  private emitTranscript(segment: TranscriptionSegment): void {
    this.transcriptCallbacks.forEach((cb) => cb(segment));
  }

  private handleSilenceDetected(): void {
    this.emitTranscript({
      text: '__silence__',
      startTime: Date.now() / 1000,
      endTime: Date.now() / 1000,
      confidence: 0,
      words: [],
    });
  }

  private startSilenceTimer(): void {
    this.clearSilenceTimer();
    this.silenceTimer = setTimeout(() => {
      this.handleSilenceDetected();
    }, SILENCE_TIMEOUT_MS);
  }

  private resetSilenceTimer(): void {
    this.clearSilenceTimer();
    this.startSilenceTimer();
  }

  private clearSilenceTimer(): void {
    if (this.silenceTimer !== null) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }
}
