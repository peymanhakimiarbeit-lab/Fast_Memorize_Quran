import SurahList from "@/components/shared/SurahList";

/**
 * Root page — Surah list entry point.
 *
 * This is a Server Component. The interactive SurahList (with search,
 * progress bars, and API calls) is a Client Component imported here.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 */
export default function HomePage() {
  return (
    <main
      className="min-h-screen"
      aria-label="قائمة السور"
    >
      <SurahList />
    </main>
  );
}
