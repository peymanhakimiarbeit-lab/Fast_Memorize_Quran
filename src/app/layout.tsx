import type { Metadata } from "next";
import { Amiri } from "next/font/google";
import "./globals.css";
import LanguageSelector from "@/components/shared/LanguageSelector";

// Load Amiri font from Google Fonts — the primary Quranic Arabic font
const amiri = Amiri({
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-amiri",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Memorize Faster — Quran",
  description:
    "A web app for Quran memorization with real-time recitation feedback and progressive word-reveal (Hifz mode).",
  keywords: ["Quran", "memorization", "Hifz", "Arabic", "recitation"],
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Memorize Faster",
  },
};

// Next.js 14 requires viewport to be exported separately
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={amiri.variable}>
      <body className="antialiased min-h-screen bg-background text-foreground safe-area-inset">
        {/* Top navigation with language selector */}
        <LanguageSelector />
        {children}
      </body>
    </html>
  );
}
