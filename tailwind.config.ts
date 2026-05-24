import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Quran app accent colors
        correct: {
          DEFAULT: "#22c55e",  // green-500
          light: "#86efac",    // green-300
          dark: "#15803d",     // green-700
        },
        incorrect: {
          DEFAULT: "#ef4444",  // red-500
          light: "#fca5a5",    // red-300
          dark: "#b91c1c",     // red-700
        },
      },
      fontFamily: {
        // Arabic font stack — Amiri is a high-quality Quranic font
        arabic: [
          "Amiri",
          "Scheherazade New",
          "Traditional Arabic",
          "Arial Unicode MS",
          "serif",
        ],
        // Latin/UI font stack
        sans: [
          "var(--font-geist-sans)",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        mono: [
          "var(--font-geist-mono)",
          "ui-monospace",
          "monospace",
        ],
      },
      fontSize: {
        // Arabic font sizes matching the spec (small: 14pt, medium: 20pt, large: 28pt)
        "arabic-sm": ["14pt", { lineHeight: "2.5" }],
        "arabic-md": ["20pt", { lineHeight: "2.5" }],
        "arabic-lg": ["28pt", { lineHeight: "2.5" }],
      },
      // RTL-aware spacing utilities
      spacing: {
        "safe-top": "env(safe-area-inset-top)",
        "safe-bottom": "env(safe-area-inset-bottom)",
        "safe-left": "env(safe-area-inset-left)",
        "safe-right": "env(safe-area-inset-right)",
      },
      animation: {
        "pulse-slow": "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.3s ease-in-out",
        "reveal-word": "revealWord 0.4s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        revealWord: {
          "0%": { opacity: "0", transform: "scale(0.8)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
