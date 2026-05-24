'use client';

/**
 * WordDisplay — renders a single Arabic word with color marking and hover tooltip.
 * When hovered, the corresponding word in the translation below gets highlighted blue.
 */

import { useState } from 'react';
import type { ReadingWordState } from '@/types/recitation';

export interface WordDisplayProps {
  wordState: ReadingWordState;
  isAudioHighlighted?: boolean;
  className?: string;
  /** Called when mouse enters this word */
  onHover?: (index: number) => void;
  /** Called when mouse leaves */
  onHoverEnd?: () => void;
  /** Index of this word in the verse */
  wordIndex?: number;
}

function getWordClass(wordState: ReadingWordState, isAudioHighlighted: boolean): string {
  const base = 'arabic-text cursor-pointer select-text relative transition-all duration-150';

  if (isAudioHighlighted) return `${base} underline decoration-amber-500 decoration-2`;
  if (wordState.matchResult === undefined) return base;

  switch (wordState.matchResult.kind) {
    case 'correct':   return `${base} word--correct`;
    case 'incorrect': return `${base} word--incorrect`;
    case 'lowConfidence': return `${base} opacity-60`;
    default: return base;
  }
}

export default function WordDisplay({
  wordState,
  isAudioHighlighted = false,
  className = '',
  onHover,
  onHoverEnd,
  wordIndex,
}: WordDisplayProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const wordClass = getWordClass(wordState, isAudioHighlighted);
  const simpleText = wordState.word.textSimple;

  return (
    <span
      className={['relative inline-block hover:bg-blue-50 dark:hover:bg-blue-950 rounded px-0.5', wordClass, className].filter(Boolean).join(' ')}
      data-word-id={wordState.id}
      onMouseEnter={() => {
        setShowTooltip(true);
        if (onHover && wordIndex !== undefined) onHover(wordIndex);
      }}
      onMouseLeave={() => {
        setShowTooltip(false);
        onHoverEnd?.();
      }}
      tabIndex={0}
      aria-label={wordState.word.textUthmani}
    >
      {wordState.word.textUthmani}

      {/* Tooltip with simple text */}
      {showTooltip && simpleText && (
        <span
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 px-2 py-1 rounded-lg text-xs whitespace-nowrap bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 shadow-lg pointer-events-none animate-fade-in"
          dir="rtl"
          role="tooltip"
        >
          {simpleText}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100" />
        </span>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// VerseWordRow — with hover callback support
// ---------------------------------------------------------------------------

export interface VerseWordRowProps {
  wordStates: ReadingWordState[];
  audioHighlightedIndex: number | null;
  fontSizeClass: 'sm' | 'md' | 'lg';
  /** Called when a word is hovered — passes the word index */
  onWordHover?: (index: number) => void;
  /** Called when hover ends */
  onWordHoverEnd?: () => void;
}

export function VerseWordRow({ wordStates, audioHighlightedIndex, fontSizeClass, onWordHover, onWordHoverEnd }: VerseWordRowProps) {
  return (
    <div
      dir="rtl"
      className={`arabic-text arabic-text--${fontSizeClass} flex flex-wrap gap-x-2 gap-y-1 justify-end`}
      aria-label="نص الآية"
    >
      {wordStates.map((ws, index) => (
        <WordDisplay
          key={ws.id}
          wordState={ws}
          isAudioHighlighted={audioHighlightedIndex === index}
          onHover={onWordHover}
          onHoverEnd={onWordHoverEnd}
          wordIndex={index}
        />
      ))}
    </div>
  );
}
