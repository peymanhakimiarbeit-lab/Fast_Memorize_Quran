'use client';

/**
 * ReadingModeClient — Client Component entry point for the Reading mode page.
 *
 * Microphone access requires browser APIs, so this must be a Client Component.
 * It simply delegates to ReadingModeView which contains all the UI logic.
 *
 * Requirements: 2.1, 7.3
 */

import ReadingModeView from '@/components/reading/ReadingModeView';

interface ReadingModeClientProps {
  surahNumber: number;
}

export default function ReadingModeClient({ surahNumber }: ReadingModeClientProps) {
  return <ReadingModeView surahNumber={surahNumber} />;
}
