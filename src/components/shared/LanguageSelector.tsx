'use client';

/**
 * LanguageSelector — top navigation bar with UI language selection.
 *
 * Supported languages: Deutsch (de), English (en), العربية (ar), دری (fa)
 * The selected language is stored in localStorage and used for translations.
 */

import { useEffect, useState } from 'react';

export type UILanguage = 'de' | 'en' | 'ar' | 'fa';

const STORAGE_KEY = 'quran-ui-language';

const LANGUAGES: { code: UILanguage; label: string; dir: 'ltr' | 'rtl' }[] = [
  { code: 'de', label: 'Deutsch', dir: 'ltr' },
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'ar', label: 'العربية', dir: 'rtl' },
  { code: 'fa', label: 'دری', dir: 'rtl' },
];

interface LanguageSelectorProps {
  /** Called when the user changes the language */
  onChange?: (lang: UILanguage) => void;
}

export default function LanguageSelector({ onChange }: LanguageSelectorProps) {
  const [selected, setSelected] = useState<UILanguage>('de');

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as UILanguage | null;
      if (stored && LANGUAGES.some((l) => l.code === stored)) {
        setSelected(stored);
      }
    } catch {
      // localStorage not available
    }
  }, []);

  const handleSelect = (lang: UILanguage) => {
    setSelected(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
      // Dispatch a custom event so same-tab listeners (ReadingModeView) can react.
      // The native 'storage' event only fires in OTHER tabs.
      window.dispatchEvent(new StorageEvent('storage', {
        key: STORAGE_KEY,
        newValue: lang,
        storageArea: localStorage,
      }));
    } catch {
      // ignore
    }
    onChange?.(lang);
  };

  return (
    <nav
      className="w-full bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-2"
      aria-label="Sprachauswahl"
      dir="ltr"
    >
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        {/* Home button + App name */}
        <a
          href="/"
          className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400 tracking-wide hover:text-emerald-600 dark:hover:text-emerald-300 transition-colors"
          aria-label="Zurück zur Startseite"
        >
          <span aria-hidden="true">🏠</span>
          <span>Memorize Faster</span>
        </a>

        {/* Language buttons */}
        <div
          className="flex items-center gap-1"
          role="group"
          aria-label="UI language"
        >
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleSelect(lang.code)}
              aria-pressed={selected === lang.code}
              aria-label={`Switch to ${lang.label}`}
              dir={lang.dir}
              className={[
                'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
                selected === lang.code
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800',
              ].join(' ')}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}

/**
 * Hook to read the current UI language from localStorage.
 * Returns 'de' as default.
 */
export function useUILanguage(): UILanguage {
  const [lang, setLang] = useState<UILanguage>('de');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as UILanguage | null;
      if (stored && ['de', 'en', 'ar', 'fa'].includes(stored)) {
        setLang(stored);
      }
    } catch {
      // ignore
    }
  }, []);

  return lang;
}
