'use client';

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getQuranRepository } from "@/repositories/quranRepository";
import { searchSurahs } from "@/domain/progressCalculator";
import { useProgressStore } from "@/stores/useProgressStore";
import type { SurahMetadata } from "@/types/quran";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AppMode = "read" | "hifz";

interface ModeModalProps {
  surah: SurahMetadata;
  onSelect: (mode: AppMode) => void;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Skeleton loading card
// ---------------------------------------------------------------------------

function SurahSkeleton() {
  return (
    <li
      className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 animate-pulse"
      aria-hidden="true"
    >
      {/* Number badge skeleton */}
      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />

      {/* Text skeleton */}
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
      </div>

      {/* Progress bar skeleton */}
      <div className="w-16 space-y-1">
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full" />
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Mode selection modal
// ---------------------------------------------------------------------------

function ModeModal({ surah, onSelect, onClose }: ModeModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mode-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-6 space-y-5 animate-fade-in">
        {/* Surah name */}
        <div className="text-center space-y-1">
          <p className="arabic-text arabic-text--md text-2xl font-bold text-gray-900 dark:text-gray-100">
            {surah.nameArabic}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400" dir="ltr">
            {surah.nameTransliterated} · {surah.verseCount} verses
          </p>
        </div>

        {/* Mode buttons */}
        <div className="space-y-3">
          <button
            onClick={() => onSelect("read")}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-emerald-200 dark:border-emerald-800 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-all duration-200 group touch-target"
            aria-label={`فتح ${surah.nameArabic} في وضع القراءة`}
          >
            <span className="text-2xl" aria-hidden="true">📖</span>
            <div className="text-right flex-1">
              <p className="arabic-text font-semibold text-gray-900 dark:text-gray-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                وضع القراءة
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400" dir="ltr">
                Read with real-time feedback
              </p>
            </div>
          </button>

          <button
            onClick={() => onSelect("hifz")}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-amber-200 dark:border-amber-800 hover:border-amber-500 dark:hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950 transition-all duration-200 group touch-target"
            aria-label={`فتح ${surah.nameArabic} في وضع الحفظ`}
          >
            <span className="text-2xl" aria-hidden="true">🧠</span>
            <div className="text-right flex-1">
              <p className="arabic-text font-semibold text-gray-900 dark:text-gray-100 group-hover:text-amber-700 dark:group-hover:text-amber-400">
                وضع الحفظ
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400" dir="ltr">
                Memorize with progressive reveal
              </p>
            </div>
          </button>
        </div>

        {/* Cancel */}
        <button
          onClick={onClose}
          className="w-full py-2 text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="إلغاء"
        >
          <span className="arabic-text">إلغاء</span>
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Surah list item
// ---------------------------------------------------------------------------

interface SurahItemProps {
  surah: SurahMetadata;
  progress: number; // 0–100
  lastMode: AppMode | null;
  isLastOpened: boolean;
  onClick: (surah: SurahMetadata) => void;
}

function SurahItem({ surah, progress, lastMode, isLastOpened, onClick }: SurahItemProps) {
  return (
    <li>
      <button
        onClick={() => onClick(surah)}
        className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md transition-all duration-200 text-right group"
        aria-label={`${surah.nameArabic} — ${surah.nameTransliterated}، ${surah.verseCount} آية`}
      >
        {/* Surah number badge */}
        <div
          className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0 text-sm font-bold text-emerald-700 dark:text-emerald-400"
          aria-hidden="true"
        >
          {surah.id}
        </div>

        {/* Names and verse count */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="arabic-text arabic-text--sm font-bold text-gray-900 dark:text-gray-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
              {surah.nameArabic}
            </span>
            {/* Last mode badge */}
            {isLastOpened && lastMode && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  lastMode === "read"
                    ? "bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300"
                    : "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300"
                }`}
                dir="ltr"
                aria-label={`Last mode: ${lastMode}`}
              >
                {lastMode === "read" ? "📖 Read" : "🧠 Hifz"}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate" dir="ltr">
            {surah.nameTransliterated} · {surah.verseCount} verses
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-16 shrink-0 space-y-1" aria-hidden="true">
          <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 dark:bg-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          {progress > 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center" dir="ltr">
              {progress}%
            </p>
          )}
        </div>
      </button>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Main SurahList component
// ---------------------------------------------------------------------------

const LAST_SURAH_KEY = "quran-last-surah";
const LAST_MODE_KEY = "quran-last-mode";

/**
 * SurahList — Client Component that displays all 114 Surahs with search,
 * progress bars, and mode selection.
 *
 * Uses useEffect for client-side API calls (Static Export compatible).
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 9.1
 */
export default function SurahList() {
  const router = useRouter();
  const getProgressForSurah = useProgressStore((s) => s.getProgressForSurah);

  // Data state
  const [allSurahs, setAllSurahs] = useState<SurahMetadata[]>([]);
  const [filteredSurahs, setFilteredSurahs] = useState<SurahMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Last opened surah/mode from localStorage
  const [lastSurahId, setLastSurahId] = useState<number | null>(null);
  const [lastMode, setLastMode] = useState<AppMode | null>(null);

  // Mode selection modal
  const [selectedSurah, setSelectedSurah] = useState<SurahMetadata | null>(null);

  // ---------------------------------------------------------------------------
  // Load last surah/mode from localStorage on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    try {
      const storedSurahId = localStorage.getItem(LAST_SURAH_KEY);
      const storedMode = localStorage.getItem(LAST_MODE_KEY) as AppMode | null;
      if (storedSurahId) setLastSurahId(parseInt(storedSurahId, 10));
      if (storedMode === "read" || storedMode === "hifz") setLastMode(storedMode);
    } catch {
      // localStorage not available (SSR or private browsing)
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Fetch all surahs on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function loadSurahs() {
      setIsLoading(true);
      setError(null);

      try {
        const repo = getQuranRepository();
        const surahs = await repo.fetchAllSurahs();
        if (!cancelled) {
          setAllSurahs(surahs);
          setFilteredSurahs(surahs);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error
              ? err.message
              : typeof err === "object" && err !== null && "message" in err
              ? String((err as { message: unknown }).message)
              : "Failed to load surahs. Please check your connection.";
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadSurahs();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Debounced search (300 ms)
  // ---------------------------------------------------------------------------
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const query = e.target.value;
      setSearchQuery(query);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setFilteredSurahs(searchSurahs(allSurahs, query));
      }, 300);
    },
    [allSurahs]
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Mode selection
  // ---------------------------------------------------------------------------
  const handleSurahClick = useCallback((surah: SurahMetadata) => {
    setSelectedSurah(surah);
  }, []);

  const handleModeSelect = useCallback(
    (mode: AppMode) => {
      if (!selectedSurah) return;

      // Persist last surah and mode
      try {
        localStorage.setItem(LAST_SURAH_KEY, String(selectedSurah.id));
        localStorage.setItem(LAST_MODE_KEY, mode);
      } catch {
        // Ignore localStorage errors
      }

      setLastSurahId(selectedSurah.id);
      setLastMode(mode);
      setSelectedSurah(null);

      router.push(`/surah/${selectedSurah.id}/${mode}`);
    },
    [selectedSurah, router]
  );

  const handleModalClose = useCallback(() => {
    setSelectedSurah(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Retry on error
  // ---------------------------------------------------------------------------
  const handleRetry = useCallback(() => {
    setError(null);
    setIsLoading(true);

    const repo = getQuranRepository();
    repo
      .fetchAllSurahs()
      .then((surahs) => {
        setAllSurahs(surahs);
        setFilteredSurahs(surahs);
      })
      .catch((err) => {
        const message =
          err instanceof Error ? err.message : "Failed to load surahs.";
        setError(message);
      })
      .finally(() => setIsLoading(false));
  }, []);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <header className="text-center space-y-2">
        <h1 className="arabic-text arabic-text--lg font-bold text-gray-900 dark:text-gray-100">
          القرآن الكريم
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400" dir="ltr">
          114 Surahs · Select one to begin
        </p>
      </header>

      {/* Search field */}
      <div className="relative" role="search" aria-label="بحث في السور">
        <label htmlFor="surah-search" className="sr-only">
          ابحث عن سورة
        </label>
        <input
          id="surah-search"
          type="search"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="ابحث بالاسم أو الرقم…"
          dir="rtl"
          className="w-full px-4 py-3 pr-10 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 transition-shadow arabic-text"
          aria-label="ابحث عن سورة بالاسم أو الرقم"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        {/* Search icon */}
        <span
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          aria-hidden="true"
        >
          🔍
        </span>
      </div>

      {/* Error state */}
      {error && !isLoading && (
        <div
          role="alert"
          aria-live="assertive"
          className="p-4 rounded-2xl bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 space-y-3"
        >
          <p className="text-sm text-red-700 dark:text-red-300" dir="ltr">
            {error}
          </p>
          <button
            onClick={handleRetry}
            className="text-sm font-medium text-red-700 dark:text-red-300 underline hover:no-underline"
            aria-label="إعادة المحاولة"
          >
            <span className="arabic-text">إعادة المحاولة</span>
          </button>
        </div>
      )}

      {/* Surah list */}
      <ul
        role="list"
        aria-label="قائمة السور"
        aria-busy={isLoading}
        className="space-y-2"
      >
        {isLoading
          ? // Skeleton loading state — show 10 placeholders
            Array.from({ length: 10 }, (_, i) => <SurahSkeleton key={i} />)
          : filteredSurahs.map((surah) => {
              const progress = getProgressForSurah(surah.id).percentComplete;
              return (
                <SurahItem
                  key={surah.id}
                  surah={surah}
                  progress={progress}
                  lastMode={lastMode}
                  isLastOpened={surah.id === lastSurahId}
                  onClick={handleSurahClick}
                />
              );
            })}

        {/* Empty search results */}
        {!isLoading && !error && filteredSurahs.length === 0 && (
          <li
            className="text-center py-12 text-gray-400 dark:text-gray-500"
            role="status"
            aria-live="polite"
          >
            <p className="arabic-text arabic-text--sm">لا توجد نتائج</p>
            <p className="text-sm mt-1" dir="ltr">
              No surahs found for &ldquo;{searchQuery}&rdquo;
            </p>
          </li>
        )}
      </ul>

      {/* Mode selection modal */}
      {selectedSurah && (
        <ModeModal
          surah={selectedSurah}
          onSelect={handleModeSelect}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}
