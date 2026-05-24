/**
 * WhisperWasmASRProvider — ASRProvider stub using Whisper.cpp/WASM.
 *
 * This is a placeholder implementation that satisfies the ASRProvider interface.
 * The full WASM implementation requires the @whisper-wasm/core package (TBD).
 *
 * When the actual package is available, replace the stub body of
 * `startStream()` and `loadModel()` with real Whisper.cpp WASM calls.
 *
 * Architecture:
 * - Lazy-loaded: only instantiated when Web Speech API is unavailable
 * - Model stored in IndexedDB (~150 MB, cached after first download)
 * - Audio captured via getUserMedia, processed in chunks
 *
 * Requirements: 4.1, 4.8
 */

import type { ASRProvider, TranscriptionSegment } from '../types/recitation';

// ---------------------------------------------------------------------------
// IndexedDB constants
// ---------------------------------------------------------------------------

const IDB_DB_NAME = 'quran-whisper-models';
const IDB_STORE_NAME = 'models';
const IDB_DB_VERSION = 1;

// ---------------------------------------------------------------------------
// Audio capture constants
// ---------------------------------------------------------------------------

/** Audio chunk duration in milliseconds for batch transcription */
const CHUNK_DURATION_MS = 3_000;

/** Sample rate expected by Whisper (16 kHz) */
const WHISPER_SAMPLE_RATE = 16_000;

// ---------------------------------------------------------------------------
// Download progress callback type
// ---------------------------------------------------------------------------

export type DownloadProgressCallback = (
  loaded: number,
  total: number,
) => void;

// ---------------------------------------------------------------------------
// WhisperWasmASRProvider
// ---------------------------------------------------------------------------

export class WhisperWasmASRProvider implements ASRProvider {
  // -------------------------------------------------------------------------
  // ASRProvider interface fields
  // -------------------------------------------------------------------------

  get isAvailable(): boolean {
    // Available as fallback when Web Speech API is not present
    return (
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      typeof navigator.mediaDevices !== 'undefined' &&
      typeof AudioContext !== 'undefined'
    );
  }

  get isModelLoaded(): boolean {
    return this._isModelLoaded;
  }

  // -------------------------------------------------------------------------
  // Private state
  // -------------------------------------------------------------------------

  private _isModelLoaded = false;
  private _modelName: string | null = null;
  private transcriptCallbacks: Set<(result: TranscriptionSegment) => void> =
    new Set();
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private chunkTimer: ReturnType<typeof setInterval> | null = null;
  private isStreaming = false;
  private audioChunks: Blob[] = [];

  // Download progress callback (optional, set before loadModel)
  onDownloadProgress: DownloadProgressCallback | null = null;

  // -------------------------------------------------------------------------
  // loadModel
  // -------------------------------------------------------------------------

  async loadModel(modelName: string): Promise<void> {
    console.warn(
      '[WhisperWasmASRProvider] Full WASM implementation requires the ' +
        '@whisper-wasm/core package (not yet installed). ' +
        'Using stub implementation.',
    );

    // Check IndexedDB cache first
    const cached = await this.loadModelFromIndexedDB(modelName);
    if (cached !== null) {
      this._isModelLoaded = true;
      this._modelName = modelName;
      console.info(
        `[WhisperWasmASRProvider] Model "${modelName}" loaded from IndexedDB cache.`,
      );
      return;
    }

    // Model not cached — would download here (~150 MB)
    // Stub: simulate a download with progress callbacks
    console.info(
      `[WhisperWasmASRProvider] Model "${modelName}" not in cache. ` +
        'In production, this would download ~150 MB from the model CDN.',
    );

    // Simulate download progress for UI feedback
    await this.simulateModelDownload(modelName);

    this._isModelLoaded = true;
    this._modelName = modelName;
  }

  // -------------------------------------------------------------------------
  // startStream
  // -------------------------------------------------------------------------

  async startStream(language: string): Promise<void> {
    console.warn(
      '[WhisperWasmASRProvider] Full WASM implementation requires the ' +
        '@whisper-wasm/core package. ' +
        'Audio will be captured but transcription is stubbed.',
    );

    if (!this.isAvailable) {
      throw {
        kind: 'asrNotSupported',
        message:
          'Whisper WASM requires getUserMedia and AudioContext support.',
      };
    }

    if (this.isStreaming) return;

    // Load default model if not already loaded
    if (!this._isModelLoaded) {
      await this.loadModel('whisper-small');
    }

    // Request microphone access
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: WHISPER_SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
    } catch (err) {
      throw {
        kind: 'microphonePermissionDenied',
        message:
          err instanceof Error
            ? err.message
            : 'Microphone access denied.',
      };
    }

    this.mediaStream = stream;
    this.isStreaming = true;

    // Set up MediaRecorder for chunk-based audio capture
    const mimeType = this.getSupportedMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});

    recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    recorder.start();
    this.mediaRecorder = recorder;

    // Process audio chunks every CHUNK_DURATION_MS
    this.chunkTimer = setInterval(() => {
      void this.processAudioChunk(language);
    }, CHUNK_DURATION_MS);
  }

  // -------------------------------------------------------------------------
  // stopStream
  // -------------------------------------------------------------------------

  async stopStream(): Promise<void> {
    this.isStreaming = false;

    if (this.chunkTimer !== null) {
      clearInterval(this.chunkTimer);
      this.chunkTimer = null;
    }

    if (this.mediaRecorder !== null) {
      try {
        this.mediaRecorder.stop();
      } catch {
        // Ignore
      }
      this.mediaRecorder = null;
    }

    if (this.mediaStream !== null) {
      for (const track of this.mediaStream.getTracks()) {
        track.stop();
      }
      this.mediaStream = null;
    }

    if (this.audioContext !== null) {
      try {
        await this.audioContext.close();
      } catch {
        // Ignore
      }
      this.audioContext = null;
    }

    this.audioChunks = [];
  }

  // -------------------------------------------------------------------------
  // onTranscript
  // -------------------------------------------------------------------------

  onTranscript(
    callback: (result: TranscriptionSegment) => void,
  ): () => void {
    this.transcriptCallbacks.add(callback);
    return () => {
      this.transcriptCallbacks.delete(callback);
    };
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private emitTranscript(segment: TranscriptionSegment): void {
    this.transcriptCallbacks.forEach((cb) => cb(segment));
  }

  /**
   * Process accumulated audio chunks through Whisper WASM.
   * STUB: In production, this would call the @whisper-wasm/core transcribe API.
   */
  private async processAudioChunk(_language: string): Promise<void> {
    if (this.audioChunks.length === 0) return;

    // Drain the chunk buffer
    const chunks = [...this.audioChunks];
    this.audioChunks = [];

    // STUB: In production, convert chunks to Float32Array PCM and call:
    //   const result = await whisperModule.transcribe(pcmData, { language });
    //   this.emitTranscript(mapWhisperResult(result));
    //
    // For now, log that we received audio data
    const totalBytes = chunks.reduce((sum, c) => sum + c.size, 0);
    console.debug(
      `[WhisperWasmASRProvider] Received ${totalBytes} bytes of audio. ` +
        'Transcription stubbed — install @whisper-wasm/core for real output.',
    );

    // Emit a stub segment so the engine knows audio is flowing
    const now = Date.now() / 1000;
    const stubSegment: TranscriptionSegment = {
      text: '',
      startTime: now - CHUNK_DURATION_MS / 1000,
      endTime: now,
      confidence: 0,
      words: [],
    };
    this.emitTranscript(stubSegment);
  }

  /**
   * Load a model binary from IndexedDB.
   * Returns null if the model is not cached.
   */
  private async loadModelFromIndexedDB(
    modelName: string,
  ): Promise<ArrayBuffer | null> {
    return new Promise((resolve) => {
      try {
        const request = indexedDB.open(IDB_DB_NAME, IDB_DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
            db.createObjectStore(IDB_STORE_NAME);
          }
        };

        request.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const tx = db.transaction(IDB_STORE_NAME, 'readonly');
          const store = tx.objectStore(IDB_STORE_NAME);
          const getRequest = store.get(modelName);

          getRequest.onsuccess = () => {
            const result = getRequest.result as ArrayBuffer | undefined;
            resolve(result ?? null);
            db.close();
          };

          getRequest.onerror = () => {
            resolve(null);
            db.close();
          };
        };

        request.onerror = () => {
          resolve(null);
        };
      } catch {
        resolve(null);
      }
    });
  }

  /**
   * Save a model binary to IndexedDB for future use.
   */
  private async saveModelToIndexedDB(
    modelName: string,
    data: ArrayBuffer,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(IDB_DB_NAME, IDB_DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
            db.createObjectStore(IDB_STORE_NAME);
          }
        };

        request.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
          const store = tx.objectStore(IDB_STORE_NAME);
          const putRequest = store.put(data, modelName);

          putRequest.onsuccess = () => {
            resolve();
            db.close();
          };

          putRequest.onerror = () => {
            reject(
              new Error(`Failed to save model "${modelName}" to IndexedDB.`),
            );
            db.close();
          };
        };

        request.onerror = () => {
          reject(new Error('Failed to open IndexedDB.'));
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Simulate a model download with progress callbacks.
   * STUB: Replace with real fetch + streaming in production.
   */
  private async simulateModelDownload(modelName: string): Promise<void> {
    const SIMULATED_TOTAL = 150 * 1024 * 1024; // 150 MB
    const STEPS = 10;

    for (let i = 1; i <= STEPS; i++) {
      await new Promise<void>((resolve) => setTimeout(resolve, 50));
      const loaded = Math.floor((SIMULATED_TOTAL / STEPS) * i);
      this.onDownloadProgress?.(loaded, SIMULATED_TOTAL);
    }

    // In production, the downloaded ArrayBuffer would be saved here:
    // await this.saveModelToIndexedDB(modelName, downloadedBuffer);
    //
    // For the stub, we save a tiny placeholder so the cache check passes
    // on subsequent calls.
    const placeholder = new ArrayBuffer(8);
    try {
      await this.saveModelToIndexedDB(modelName, placeholder);
    } catch {
      // Non-fatal — IndexedDB may not be available in all environments
    }
  }

  /**
   * Return the best supported MIME type for MediaRecorder.
   */
  private getSupportedMimeType(): string | null {
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ];

    for (const type of candidates) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return null;
  }
}
