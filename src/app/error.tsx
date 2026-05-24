'use client';

import { useEffect } from "react";

/**
 * Global error boundary for the Quran Memorization app.
 * Displayed when an unhandled error occurs in the app.
 *
 * Requirements: 9.2, 9.3
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console in development
    console.error("Application error:", error);
  }, [error]);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-8"
      dir="rtl"
      lang="ar"
      role="alert"
      aria-live="assertive"
    >
      <div className="max-w-md w-full text-center space-y-6">
        {/* Arabic error heading */}
        <h1 className="arabic-text arabic-text--md text-2xl font-bold text-red-600 dark:text-red-400">
          حدث خطأ
        </h1>

        {/* Subtitle in Latin script */}
        <p className="text-gray-600 dark:text-gray-400 text-sm" dir="ltr">
          An unexpected error occurred. Please try again.
        </p>

        {/* Error details (development only) */}
        {process.env.NODE_ENV === "development" && (
          <pre className="text-xs text-left bg-gray-100 dark:bg-gray-800 rounded-lg p-4 overflow-auto text-red-700 dark:text-red-300">
            {error.message}
          </pre>
        )}

        {/* Retry button */}
        <button
          onClick={reset}
          className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors duration-200 touch-target"
          aria-label="إعادة المحاولة"
        >
          <span className="arabic-text" dir="rtl">إعادة المحاولة</span>
        </button>
      </div>
    </div>
  );
}
