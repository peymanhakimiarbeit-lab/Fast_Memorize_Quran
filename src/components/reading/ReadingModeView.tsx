'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useReadingStore } from '@/stores/useReadingStore';
import { getHighlightedWordIndex, evaluateCalibrationNeed } from '@/domain/progressCalculator';
import RecitationControls from './RecitationControls';
import { VerseWordRow } from './WordDisplay';
import type { Verse } from '@/types/quran';
import type { ReadingWordState } from '@/types/recitation';

const FONT_SIZE_LABELS: Record<'small' | 'medium' | 'large', string> = {
  small: 'A',
  medium: 'A+',
  large: 'A++',
};

const FONT_SIZE_CLASS: Record<'small' | 'medium' | 'large', 'sm' | 'md' | 'lg'> = {
  small: 'sm',
  medium: 'md',
  large: 'lg',
};

const TRANSLATION_LANGUAGES = [
  { code: 'de', label: 'DE' },
  { code: 'en', label: 'EN' },
  { code: 'ar', label: 'AR' },
  { code: 'fa', label: 'FA' },
];

// Reciters available for audio playback
const RECITERS = [
  { id: 'Alafasy', name: 'Mishary Alafasy', folder: 'Alafasy/mp3' },
  { id: 'Yasser_Ad-Dussary', name: 'Yasser Al-Dosari', folder: 'Yasser_Ad-Dussary/mp3' },
  { id: 'Abdul_Basit_Murattal', name: 'Abdul Basit (Murattal)', folder: 'Abdul_Basit_Murattal_192kbps' },
  { id: 'Hudhaify', name: 'Ali Al-Hudhaify', folder: 'Hudhaify_128kbps' },
  { id: 'Minshawy_Murattal', name: 'Al-Minshawi (Murattal)', folder: 'Minshawy_Murattal_128kbps' },
];

const AUDIO_CDN = 'https://verses.quran.com';

/** Build audio URL for a verse with selected reciter */
function buildAudioUrl(verseKey: string, reciterFolder: string): string {
  const [surah, ayah] = verseKey.split(':');
  const s = (surah ?? '1').padStart(3, '0');
  const a = (ayah ?? '1').padStart(3, '0');
  return `${AUDIO_CDN}/${reciterFolder}/${s}${a}.mp3`;
}

export interface ReadingModeViewProps {
  surahNumber: number;
}

function VerseSkeleton() {
  return (
    <div className="space-y-3 animate-pulse" aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 space-y-3">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full" />
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-3/4 ml-auto" />
        </div>
      ))}
    </div>
  );
}

interface VerseCardProps {
  verse: Verse;
  wordStates: ReadingWordState[];
  audioHighlightedIndex: number | null;
  fontSizeClass: 'sm' | 'md' | 'lg';
  translation: string | null;
  isLoadingTranslation: boolean;
  isActive: boolean;
  observerRef: (el: HTMLElement | null) => void;
  /** Called when the verse card is clicked to select it */
  onSelect: () => void;
}

function VerseCard({
  verse,
  wordStates,
  audioHighlightedIndex,
  fontSizeClass,
  translation,
  isLoadingTranslation,
  isActive,
  observerRef,
  onSelect,
}: VerseCardProps) {
  const [hoveredWordIdx, setHoveredWordIdx] = useState<number | null>(null);

  // Split translation into words for highlighting
  const translationWords = translation ? translation.split(/\s+/) : [];
  const totalArabicWords = wordStates.length;

  return (
    <article
      ref={observerRef}
      data-verse-number={verse.verseNumber}
      onClick={onSelect}
      className={[
        'p-5 rounded-2xl border space-y-4 transition-all cursor-pointer',
        isActive
          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 shadow-sm ring-2 ring-emerald-400 dark:ring-emerald-600'
          : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-sm',
      ].join(' ')}
      aria-label={`آية ${verse.verseNumber} — klicken zum Auswählen`}
      aria-current={isActive ? 'true' : undefined}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(); }}
    >
      <div className="flex items-center justify-between" dir="ltr">
        <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">{verse.id}</span>
        <span className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-sm font-bold text-emerald-700 dark:text-emerald-400">
          {verse.verseNumber}
        </span>
      </div>

      <VerseWordRow
        wordStates={wordStates}
        audioHighlightedIndex={audioHighlightedIndex}
        fontSizeClass={fontSizeClass}
        onWordHover={(idx) => setHoveredWordIdx(idx)}
        onWordHoverEnd={() => setHoveredWordIdx(null)}
      />

      {isLoadingTranslation && (
        <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded animate-pulse w-3/4" />
      )}
      {!isLoadingTranslation && translation !== null && (
        <p
          className="text-sm text-gray-600 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-3 leading-relaxed"
          dir="ltr"
        >
          {/* Highlight translation words that correspond to the hovered Arabic word */}
          {translationWords.map((word, i) => {
            // Simple proportional mapping: Arabic word index → translation word range
            const ratio = translationWords.length / Math.max(totalArabicWords, 1);
            const startIdx = hoveredWordIdx !== null ? Math.floor(hoveredWordIdx * ratio) : -1;
            const endIdx = hoveredWordIdx !== null ? Math.floor((hoveredWordIdx + 1) * ratio) : -1;
            const isHighlighted = hoveredWordIdx !== null && i >= startIdx && i < endIdx;

            return (
              <span
                key={i}
                className={isHighlighted ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded px-0.5 transition-colors' : 'transition-colors'}
              >
                {word}{' '}
              </span>
            );
          })}
        </p>
      )}
    </article>
  );
}

export default function ReadingModeView({ surahNumber }: ReadingModeViewProps) {
  const currentSurah = useReadingStore((s) => s.currentSurah);
  const wordStates = useReadingStore((s) => s.wordStates);
  const recitationState = useReadingStore((s) => s.recitationState);
  const fontSize = useReadingStore((s) => s.fontSize);
  const activeTranslationLanguage = useReadingStore((s) => s.activeTranslationLanguage);
  const currentVisibleVerseNumber = useReadingStore((s) => s.currentVisibleVerseNumber);
  const isLoading = useReadingStore((s) => s.isLoading);
  const error = useReadingStore((s) => s.error);
  const translations = useReadingStore((s) => s.translations);
  const isLoadingTranslations = useReadingStore((s) => s.isLoadingTranslations);

  const loadSurah = useReadingStore((s) => s.loadSurah);
  const startRecitation = useReadingStore((s) => s.startRecitation);
  const stopRecitation = useReadingStore((s) => s.stopRecitation);
  const nextVerse = useReadingStore((s) => s.nextVerse);
  const prevVerse = useReadingStore((s) => s.prevVerse);
  const selectVerse = useReadingStore((s) => s.selectVerse);
  const activeVerseIndex = useReadingStore((s) => s.activeVerseIndex);
  const setFontSize = useReadingStore((s) => s.setFontSize);
  const setTranslationLanguage = useReadingStore((s) => s.setTranslationLanguage);
  const setCurrentVisibleVerseNumber = useReadingStore((s) => s.setCurrentVisibleVerseNumber);
  const overrideLastIncorrectWord = useReadingStore((s) => s.overrideLastIncorrectWord);
  const loadTranslations = useReadingStore((s) => s.loadTranslations);

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioTimestamp] = useState(0);
  const [shouldShowCalibrationHint, setShouldShowCalibrationHint] = useState(false);
  const [selectedReciter, setSelectedReciter] = useState(RECITERS[0]!);
  const [hoveredWordIndex, setHoveredWordIndex] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const verseRefs = useRef<Map<number, HTMLElement>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    void loadSurah(surahNumber);
  }, [surahNumber, loadSurah]);

  // Sync with global language selector (top navbar) via localStorage
  useEffect(() => {
    const syncLang = () => {
      try {
        const stored = localStorage.getItem('quran-ui-language');
        if (stored && ['de', 'en', 'ar', 'fa'].includes(stored)) {
          setTranslationLanguage(stored);
        }
      } catch { /* ignore */ }
    };
    // Check on mount
    syncLang();
    // Listen for changes from the top navbar
    window.addEventListener('storage', syncLang);
    return () => window.removeEventListener('storage', syncLang);
  }, [setTranslationLanguage]);

  // Load translations when language changes OR when surah finishes loading
  useEffect(() => {
    if (activeTranslationLanguage !== null && currentSurah !== null && !isLoading) {
      void loadTranslations(activeTranslationLanguage);
    }
  }, [activeTranslationLanguage, currentSurah?.metadata.id, isLoading, loadTranslations]);

  useEffect(() => {
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        let topmost: { verseNumber: number; top: number } | null = null;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const verseNumber = parseInt(
              (entry.target as HTMLElement).dataset.verseNumber ?? '0',
              10,
            );
            const top = entry.boundingClientRect.top;
            if (topmost === null || top < topmost.top) topmost = { verseNumber, top };
          }
        }
        if (topmost !== null) setCurrentVisibleVerseNumber(topmost.verseNumber);
      },
      { root: null, rootMargin: '-10% 0px -60% 0px', threshold: 0 },
    );
    verseRefs.current.forEach((el) => observerRef.current?.observe(el));
    return () => observerRef.current?.disconnect();
  }, [currentSurah, setCurrentVisibleVerseNumber]);

  // ── Auto-scroll to active verse when it changes ────────────────────────
  useEffect(() => {
    const verseNumber = currentSurah?.verses[activeVerseIndex]?.verseNumber;
    if (verseNumber === undefined) return;
    const el = verseRefs.current.get(verseNumber);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeVerseIndex, currentSurah]);

  useEffect(() => {
    if (currentSurah === null) return;
    for (const verse of currentSurah.verses) {
      const hasAnyResult = verse.words.some((w) => wordStates[w.id]?.matchResult !== undefined);
      if (!hasAnyResult) continue;
      const confidences = verse.words.map((w) => {
        const ws = wordStates[w.id];
        if (ws?.matchResult?.kind === 'lowConfidence') return 0;
        if (ws?.matchResult?.kind === 'correct') return 1;
        if (ws?.matchResult?.kind === 'incorrect') return 0.5;
        return 1;
      });
      const { shouldShowCalibrationHint: show } = evaluateCalibrationNeed(verse, confidences, {
        confidenceThreshold: 0.8,
        diacriticMode: 'moderate',
        silenceTimeoutSeconds: 5,
        maxLatencyMs: 550,
      });
      if (show) { setShouldShowCalibrationHint(true); return; }
    }
  }, [wordStates, currentSurah]);

  const handleMicToggle = useCallback(() => {
    if (recitationState.kind === 'recording' || recitationState.kind === 'silenceDetected') {
      void stopRecitation();
    } else {
      // Stop audio if playing when mic starts
      if (isPlayingAudio && audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setIsPlayingAudio(false);
      }
      void startRecitation();
    }
  }, [recitationState, startRecitation, stopRecitation, isPlayingAudio]);

  const handleAudioToggle = useCallback(() => {
    if (isPlayingAudio) {
      // Stop audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setIsPlayingAudio(false);
    } else {
      // Play the current active verse
      const verse = currentSurah?.verses[activeVerseIndex];
      if (!verse) return;

      const url = buildAudioUrl(verse.id, selectedReciter.folder);
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setIsPlayingAudio(false);
      audio.onerror = () => setIsPlayingAudio(false);
      void audio.play().catch(() => setIsPlayingAudio(false));
      setIsPlayingAudio(true);
    }
  }, [isPlayingAudio, currentSurah, activeVerseIndex]);

  const handleOverride = useCallback(() => {
    overrideLastIncorrectWord();
  }, [overrideLastIncorrectWord]);

  const handleTranslationToggle = useCallback((langCode: string) => {
    setTranslationLanguage(activeTranslationLanguage === langCode ? null : langCode);
  }, [activeTranslationLanguage, setTranslationLanguage]);

  const hasIncorrectWord = Object.values(wordStates).some(
    (ws) => ws.matchResult?.kind === 'incorrect',
  );

  const getAudioHighlightForVerse = useCallback(
    (verse: Verse): number | null => {
      if (!isPlayingAudio) return null;
      return getHighlightedWordIndex(verse.words, audioTimestamp);
    },
    [isPlayingAudio, audioTimestamp],
  );

  const makeVerseRef = useCallback(
    (verseNumber: number) => (el: HTMLElement | null) => {
      if (el) { verseRefs.current.set(verseNumber, el); observerRef.current?.observe(el); }
      else { verseRefs.current.delete(verseNumber); }
    },
    [],
  );

  const fontSizeClass = FONT_SIZE_CLASS[fontSize];

  if (error !== null && !isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div role="alert" className="p-6 rounded-2xl bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 space-y-4 text-center">
          <p className="text-2xl">⚠️</p>
          <p className="text-sm font-medium text-red-700 dark:text-red-300" dir="ltr">{error}</p>
          <button type="button" onClick={() => void loadSurah(surahNumber)} className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors">
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  if (isLoading || currentSurah === null) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mx-auto animate-pulse" />
        <VerseSkeleton />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pb-48">
      {/* ── Sticky header — bigger, more breathing room ── */}
      <header className="sticky top-0 z-20 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800 py-4 px-1 space-y-3">
        {/* Row 1: Surah name + verse indicator */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="arabic-text arabic-text--md font-bold text-gray-900 dark:text-gray-100 leading-tight">
              {currentSurah.metadata.nameArabic}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5" dir="ltr">
              {currentSurah.metadata.nameTransliterated} · {currentSurah.metadata.verseCount} Verse
            </p>
          </div>
          <span
            className="text-sm font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-1 rounded-lg"
            aria-live="polite"
            dir="ltr"
          >
            آية {currentVisibleVerseNumber}
          </span>
        </div>

        {/* Row 2: Font size + Translation toggles */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Font size */}
          <div className="flex items-center gap-1" role="group" aria-label="Schriftgröße">
            {(['small', 'medium', 'large'] as const).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setFontSize(size)}
                aria-pressed={fontSize === size}
                className={[
                  'px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
                  fontSize === size
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
                ].join(' ')}
              >
                {FONT_SIZE_LABELS[size]}
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />

          {/* Translation language */}
          <div className="flex items-center gap-1 flex-wrap" role="group" aria-label="Übersetzung">
            <span className="text-xs text-gray-400 dark:text-gray-500">Übersetzung:</span>
            {TRANSLATION_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleTranslationToggle(lang.code)}
                aria-pressed={activeTranslationLanguage === lang.code}
                className={[
                  'px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
                  activeTranslationLanguage === lang.code
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
                ].join(' ')}
              >
                {lang.label}
              </button>
            ))}
            {isLoadingTranslations && (
              <span className="text-xs text-gray-400 animate-pulse ml-1">…</span>
            )}
          </div>

          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />

          {/* Reciter selector */}
          <div className="flex items-center gap-1" role="group" aria-label="Rezitator">
            <span className="text-xs text-gray-400 dark:text-gray-500">Sheikh:</span>
            <select
              value={selectedReciter.id}
              onChange={(e) => {
                const r = RECITERS.find((rec) => rec.id === e.target.value);
                if (r) setSelectedReciter(r);
              }}
              className="text-xs px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-none focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              aria-label="Rezitator auswählen"
            >
              {RECITERS.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* ── Verse list ── */}
      <main
        className="py-4 space-y-3"
        aria-label={`${currentSurah.metadata.nameTransliterated} — Verse`}
      >
        {currentSurah.verses.map((verse, index) => {
          const verseWordStates = verse.words.map(
            (w) => wordStates[w.id] ?? { id: w.id, word: w, matchResult: undefined },
          );
          const audioHighlightedIndex = getAudioHighlightForVerse(verse);
          const translation = translations[verse.id] ?? null;
          const isActive = index === activeVerseIndex;

          return (
            <VerseCard
              key={verse.id}
              verse={verse}
              wordStates={verseWordStates}
              audioHighlightedIndex={audioHighlightedIndex}
              fontSizeClass={fontSizeClass}
              translation={activeTranslationLanguage !== null ? translation : null}
              isLoadingTranslation={isLoadingTranslations && activeTranslationLanguage !== null}
              isActive={isActive}
              observerRef={makeVerseRef(verse.verseNumber)}
              onSelect={() => void selectVerse(index)}
            />
          );
        })}
      </main>

      {/* ── Fixed bottom controls ── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-t border-gray-100 dark:border-gray-800 px-4 py-4">
        <div className="max-w-2xl mx-auto space-y-3">
          {/* Verse navigation */}
          <div className="flex items-center justify-between" dir="ltr">
            <button
              type="button"
              onClick={() => void prevVerse()}
              disabled={activeVerseIndex === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Vorheriger Vers"
            >
              ← Vorheriger
            </button>

            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              {currentSurah.verses[activeVerseIndex]?.id ?? ''}
            </span>

            <button
              type="button"
              onClick={() => void nextVerse()}
              disabled={activeVerseIndex >= currentSurah.verses.length - 1}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Nächster Vers"
            >
              Nächster →
            </button>
          </div>

          {/* Recitation controls */}
          <RecitationControls
            recitationState={recitationState}
            onMicToggle={handleMicToggle}
            isPlayingAudio={isPlayingAudio}
            onAudioToggle={handleAudioToggle}
            hasIncorrectWord={hasIncorrectWord}
            onOverride={handleOverride}
            shouldShowCalibrationHint={shouldShowCalibrationHint}
            onDismissCalibrationHint={() => setShouldShowCalibrationHint(false)}
            onStartCalibration={() => setShouldShowCalibrationHint(false)}
            disabled={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
