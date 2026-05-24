'use client';

/**
 * HifzWordDisplay — renders a single Arabic word in Hifz (memorization) mode.
 *
 * A word is either:
 * - hidden:   shown as a gray placeholder block (no text visible)
 * - revealed: shown with its Arabic text, colored green (correct) or red (incorrect)
 *
 * Smooth reveal animation is applied via Tailwind `transition` classes.
 * When a verse is shown during a timeout/skip (Req. 3.7), all words are revealed
 * simultaneously — the `isVerseReveal` prop enables a slightly different visual
 * treatment (neutral green, no match-result coloring).
 *
 * Requirements: 3.1, 3.2, 3.3, 3.7
 */

import type { HifzWordState } from '@/types/recitation';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface HifzWordDisplayProps {
  /** The Hifz word state to render */
  wordState: HifzWordState;
  /**
   * When true, the word is being shown as part of a full-verse reveal
   * (timeout / skip — Req. 3.7). Overrides the match-result color with a
   * neutral "shown" style so the user can read the verse before advancing.
   */
  isVerseReveal?: boolean;
  /** Optional additional CSS classes */
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Derive the CSS classes for the word span based on its visibility state.
 *
 * Uses pre-defined CSS classes from globals.css — no inline styles.
 * Tailwind `transition` classes provide the smooth reveal animation.
 */
function getWordClasses(
  wordState: HifzWordState,
  isVerseReveal: boolean,
): string {
  const base =
    'arabic-text inline-block transition-all duration-300 ease-in-out rounded px-0.5';

  if (wordState.visibility.kind === 'hidden') {
    // Hidden: gray placeholder block — text is transparent, min-width ensures
    // the block has a visible size so the verse layout doesn't collapse.
    return `${base} word--hidden`;
  }

  // Revealed
  if (isVerseReveal) {
    // Verse-reveal (timeout/skip): show in a neutral "revealed" style —
    // the user is reading the verse, not being evaluated.
    return `${base} word--correct opacity-80`;
  }

  const color = wordState.visibility.color;
  if (color === 'correct') {
    return `${base} word--correct`;
  }
  // incorrect
  return `${base} word--incorrect`;
}

/**
 * Build an accessible aria-label for the word.
 */
function getAriaLabel(wordState: HifzWordState, isVerseReveal: boolean): string {
  if (wordState.visibility.kind === 'hidden') {
    // Screen readers should announce that a word is hidden
    return 'verstecktes Wort';
  }

  const text = wordState.word.textUthmani;

  if (isVerseReveal) {
    return `${text} — angezeigt`;
  }

  const color = wordState.visibility.color;
  if (color === 'correct') {
    return `${text} — korrekt`;
  }
  return `${text} — falsch`;
}

// ---------------------------------------------------------------------------
// HifzWordDisplay component
// ---------------------------------------------------------------------------

/**
 * Renders a single Arabic word in Hifz mode.
 *
 * Visual states:
 * - hidden:            Gray placeholder block (word--hidden CSS class)
 * - revealed/correct:  Green text + background (word--correct CSS class)
 * - revealed/incorrect: Red text + background (word--incorrect CSS class)
 * - verse-reveal:      Green, slightly dimmed (timeout/skip display)
 *
 * Animation: Tailwind `transition-all duration-300` provides a smooth
 * opacity/color transition when a word is revealed.
 *
 * ARIA:
 * - aria-label: describes the word and its state
 * - aria-hidden: false (always announced by screen readers)
 *
 * Requirements: 3.1, 3.2, 3.3, 3.7
 */
export default function HifzWordDisplay({
  wordState,
  isVerseReveal = false,
  className = '',
}: HifzWordDisplayProps) {
  const wordClasses = getWordClasses(wordState, isVerseReveal);
  const ariaLabel = getAriaLabel(wordState, isVerseReveal);
  const isHidden = wordState.visibility.kind === 'hidden';

  return (
    <span
      className={[wordClasses, className].filter(Boolean).join(' ')}
      aria-label={ariaLabel}
      data-word-id={wordState.id}
      data-visibility={wordState.visibility.kind}
      data-match-result={wordState.matchResult?.kind ?? 'none'}
    >
      {/* When hidden, render a non-breaking space to preserve the block size */}
      {isHidden ? '\u00A0\u00A0\u00A0' : wordState.word.textUthmani}
    </span>
  );
}

// ---------------------------------------------------------------------------
// HifzVerseWordRow — renders all words of a verse in RTL order
// ---------------------------------------------------------------------------

export interface HifzVerseWordRowProps {
  /** Ordered list of Hifz word states for this verse */
  wordStates: HifzWordState[];
  /**
   * When true, all words are shown in verse-reveal mode (timeout/skip).
   * Req. 3.7: verse is displayed for 2 seconds before advancing.
   */
  isVerseReveal?: boolean;
  /** Font size class suffix: 'sm' | 'md' | 'lg' */
  fontSizeClass?: 'sm' | 'md' | 'lg';
}

/**
 * Renders all words of a verse in a right-to-left flex row for Hifz mode.
 *
 * `dir="rtl"` is applied on the container so Arabic words flow correctly.
 * Words wrap naturally for long verses.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.7
 */
export function HifzVerseWordRow({
  wordStates,
  isVerseReveal = false,
  fontSizeClass = 'lg',
}: HifzVerseWordRowProps) {
  return (
    <div
      dir="rtl"
      className={`arabic-text arabic-text--${fontSizeClass} flex flex-wrap gap-x-3 gap-y-2 justify-end`}
      aria-label="نص الآية"
      role="group"
    >
      {wordStates.map((ws) => (
        <HifzWordDisplay
          key={ws.id}
          wordState={ws}
          isVerseReveal={isVerseReveal}
        />
      ))}
    </div>
  );
}
