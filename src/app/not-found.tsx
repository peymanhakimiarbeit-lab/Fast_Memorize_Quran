import Link from "next/link";

/**
 * 404 Not Found page for the Quran Memorization app.
 * Displayed when a route is not found.
 *
 * Requirements: 9.2, 9.3
 */
export default function NotFound() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-8"
      dir="rtl"
      lang="ar"
      role="main"
    >
      <div className="max-w-md w-full text-center space-y-6">
        {/* Large 404 number */}
        <p className="text-8xl font-bold text-emerald-600 dark:text-emerald-400 select-none" dir="ltr">
          404
        </p>

        {/* Arabic heading */}
        <h1 className="arabic-text arabic-text--md text-2xl font-bold text-gray-800 dark:text-gray-200">
          الصفحة غير موجودة
        </h1>

        {/* Subtitle */}
        <p className="text-gray-500 dark:text-gray-400 text-sm" dir="ltr">
          The page you are looking for does not exist.
        </p>

        {/* Back to home link */}
        <Link
          href="/"
          className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors duration-200 touch-target"
          aria-label="العودة إلى القائمة الرئيسية"
        >
          <span className="arabic-text" dir="rtl">العودة إلى القائمة</span>
        </Link>
      </div>
    </div>
  );
}
