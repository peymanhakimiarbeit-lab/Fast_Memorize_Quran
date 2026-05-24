/**
 * /surah/[id]/hifz — Hifz (memorization) mode page (Server Component wrapper).
 *
 * This file is intentionally a Server Component so that generateStaticParams
 * can be exported (required for Next.js output: 'export' with dynamic routes).
 *
 * The actual interactive UI is in HifzModeClient, which is a Client Component
 * because microphone access and Zustand stores require browser APIs.
 *
 * Requirements: 3.8, 5.5, 9.4, 10.1
 */

import HifzModeClient from './HifzModeClient';

// ---------------------------------------------------------------------------
// Static params — required for output: 'export' with dynamic routes
// ---------------------------------------------------------------------------

/**
 * Pre-generate static paths for all 114 Surahs.
 * Data is fetched client-side; this only tells Next.js which paths to emit.
 *
 * Requirements: 10.1
 */
export function generateStaticParams(): { id: string }[] {
  return Array.from({ length: 114 }, (_, i) => ({ id: String(i + 1) }));
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface HifzPageProps {
  params: Promise<{ id: string }>;
}

// ---------------------------------------------------------------------------
// Page component (Server Component)
// ---------------------------------------------------------------------------

export default async function HifzPage({ params }: HifzPageProps) {
  const { id } = await params;
  const surahNumber = parseInt(id, 10);

  // Guard against invalid surah numbers
  if (isNaN(surahNumber) || surahNumber < 1 || surahNumber > 114) {
    return (
      <div
        className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4"
        role="alert"
      >
        <p className="text-2xl" aria-hidden="true">⚠️</p>
        <p className="text-sm text-gray-600 dark:text-gray-400" dir="ltr">
          Ungültige Surennummer: {id}. Bitte wähle eine Sure zwischen 1 und 114.
        </p>
      </div>
    );
  }

  return <HifzModeClient surahNumber={surahNumber} />;
}
