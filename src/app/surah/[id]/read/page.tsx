/**
 * /surah/[id]/read — Reading mode page (Server Component wrapper).
 *
 * This file is intentionally a Server Component so that generateStaticParams
 * can be exported (required for Next.js output: 'export' with dynamic routes).
 *
 * The actual interactive UI is in ReadingModeClient, which is a Client Component
 * because microphone access requires browser APIs.
 *
 * Requirements: 2.1, 7.3, 10.1, 10.2
 */

import ReadingModeClient from './ReadingModeClient';

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

interface ReadPageProps {
  params: Promise<{ id: string }>;
}

// ---------------------------------------------------------------------------
// Page component (Server Component)
// ---------------------------------------------------------------------------

export default async function ReadPage({ params }: ReadPageProps) {
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
          Invalid Surah number: {id}. Please select a Surah between 1 and 114.
        </p>
      </div>
    );
  }

  return <ReadingModeClient surahNumber={surahNumber} />;
}
