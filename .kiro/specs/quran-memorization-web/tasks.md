# Implementation Plan: Quran Memorization Web App

## Overview

Schichtweise Implementierung einer Next.js 14 Static-Export-App für Koran-Memorierung. Die App läuft vollständig im Browser (GitHub Pages), nutzt die Quran.com API v4 für Koran-Daten, Web Speech API + Whisper WASM für Spracherkennung und localStorage für Fortschritt. Die Implementierung folgt der Feature-Slice-Architektur aus dem Design-Dokument.

## Tasks

- [x] 1. Projektsetup: Next.js 14 + GitHub Pages Konfiguration
  - [x] 1.1 Next.js 14 Projekt initialisieren und für Static Export konfigurieren
    - `npx create-next-app@14` mit TypeScript, Tailwind CSS, App Router
    - `next.config.js` mit `output: 'export'`, `basePath`, `trailingSlash: true` für GitHub Pages
    - `.gitignore`, `tsconfig.json` (strict mode), `tailwind.config.ts` mit RTL-Support
    - _Requirements: 10.1, 10.4_

  - [x] 1.2 Abhängigkeiten installieren und Testinfrastruktur einrichten
    - Produktionsabhängigkeiten: `zustand@^4.5.0`, `swr@^2.2.0`
    - Testabhängigkeiten: `vitest@^1.0.0`, `fast-check@^3.15.0`, `@testing-library/react@^14.0.0`, `msw@^2.0.0`
    - `vitest.config.ts` mit jsdom-Environment, Coverage-Konfiguration
    - `src/test/setup.ts` mit Testing Library Setup und MSW-Server-Initialisierung
    - _Requirements: 10.1_

  - [x] 1.3 GitHub Actions CI/CD Workflow für automatisches Deployment erstellen
    - `.github/workflows/deploy.yml`: Trigger auf `push` zu `main`
    - Steps: `npm ci` → `npm run build` → `actions/upload-pages-artifact` → `actions/deploy-pages`
    - Separater Job für Tests: `npm run test:run` vor dem Build
    - GitHub Pages in Repository-Settings aktivieren (Dokumentation im README)
    - _Requirements: 10.1, 10.2_

- [x] 2. TypeScript-Typen und Interfaces
  - [x] 2.1 Koran-Datenmodelle in `src/types/quran.ts` definieren
    - Interfaces: `SurahMetadata`, `Surah`, `Verse`, `QuranWord`, `Translation`
    - Alle Felder `readonly`, strikte Typen (z. B. `revelationType: 'meccan' | 'medinan'`)
    - JSDoc-Kommentare für alle Interfaces
    - _Requirements: 1.1, 2.1, 3.1_

  - [x] 2.2 Fortschritts-Datenmodelle in `src/types/progress.ts` definieren
    - Interfaces: `VerseProgress`, `SessionRecord`, `VerseAttemptRecord`, `DailyStats`, `SessionState`
    - `SurahProgress`, `OverallProgress` für Fortschrittsanzeige
    - localStorage-serialisierbare Typen (keine `Set`, `Map` — nur Plain Objects/Arrays)
    - _Requirements: 5.3, 5.4, 6.1, 6.2_

  - [x] 2.3 Rezitations- und ASR-Typen in `src/types/recitation.ts` definieren
    - Typen: `RecitationState`, `WordMatchEvent`, `MatchResult`, `RecitationConfig`, `DiacriticMode`
    - Interfaces: `RecitationEngine`, `ASRProvider`, `TranscriptionResult`, `TranscriptionSegment`, `WordTimestamp`
    - UI-State-Typen: `HifzWordState`, `WordVisibility`, `WordColor`, `ReadingWordState`
    - Fehlertyp: `QuranWebError` (discriminated union mit allen Fehlerfällen)
    - _Requirements: 4.1, 4.5, 4.7, 4.8_

- [x] 3. Domain-Logik: arabicNormalizer und WordMatcher
  - [x] 3.1 `arabicNormalizer.ts` in `src/domain/` implementieren
    - `normalizeArabic(text: string, mode: DiacriticMode): string`
    - `strict`-Modus: nur Whitespace-Normalisierung, alle Harakat erhalten
    - `moderate`-Modus: Harakat entfernen (U+064B–U+065F, U+0670), Alef-Varianten (U+0622, U+0623, U+0625 → U+0627), Ta Marbuta (U+0629 → U+0647), Hamza-Varianten normalisieren
    - Reine Funktion ohne Seiteneffekte
    - _Requirements: 4.5_

  - [ ]* 3.2 Property-Based Tests für `arabicNormalizer` schreiben
    - **Property 1: Arabische Normalisierung ist idempotent**
    - **Validates: Requirements 4.5**
    - **Property 2: Strict-Modus ist strenger als Moderate-Modus**
    - **Validates: Requirements 4.5**
    - Generatoren: `arabicStringWithHarakatArb` (U+0600–U+06FF + Harakat-Zeichen)
    - _Requirements: 4.5_

  - [x] 3.3 `wordMatcher.ts` in `src/domain/` implementieren
    - `match(transcribed: string, expected: QuranWord, config: RecitationConfig): MatchResult`
    - Konfidenz-Check zuerst: `confidence < threshold` → `{ kind: 'lowConfidence' }`
    - Normalisierter Textvergleich via `normalizeArabic`
    - `matchWithConfidence(text: string, word: QuranWord, confidence: number, config: RecitationConfig): MatchResult`
    - _Requirements: 4.3, 4.4, 4.5, 8.2_

  - [ ]* 3.4 Property-Based Tests für `wordMatcher` schreiben
    - **Property 3: Match-Ergebnis bestimmt Wort-Markierung**
    - **Validates: Requirements 2.6, 3.2, 3.3, 4.3, 4.4**
    - **Property 8: Konfidenz-Schwelle bestimmt Wort-Bewertung**
    - **Validates: Requirements 8.2**
    - _Requirements: 4.3, 4.4, 4.5, 8.2_

  - [x] 3.5 `progressCalculator.ts` in `src/domain/` implementieren
    - `calculateProgress(totalVerses: number, learnedVerses: number): SurahProgress`
    - `percentComplete = Math.round((learnedVerses / totalVerses) * 100)`
    - `evaluateCalibrationNeed(verse: Verse, confidences: number[], config: RecitationConfig): { shouldShowCalibrationHint: boolean }`
    - `getHighlightedWordIndex(words: QuranWord[], timestamp: number): number | null`
    - `searchSurahs(surahs: SurahMetadata[], query: string): SurahMetadata[]`
    - _Requirements: 1.3, 6.1, 6.2, 7.3, 8.4_

  - [ ]* 3.6 Property-Based Tests für `progressCalculator` schreiben
    - **Property 9: Suren-Suche liefert nur relevante Ergebnisse**
    - **Validates: Requirements 1.3**
    - **Property 12: Fortschrittsberechnung ist korrekt**
    - **Validates: Requirements 6.1, 6.2**
    - **Property 13: Audio-Wort-Highlighting ist synchron**
    - **Validates: Requirements 7.3**
    - **Property 14: Kalibrierungsempfehlung bei hoher Fehlerrate**
    - **Validates: Requirements 8.4**
    - _Requirements: 1.3, 6.1, 6.2, 7.3, 8.4_

- [x] 4. Repositories: QuranRepository und ProgressRepository
  - [x] 4.1 `quranRepository.ts` in `src/repositories/` implementieren
    - Interface `QuranRepository` implementieren
    - `fetchAllSurahs()`: `GET /chapters` mit SWR-Cache (`revalidate: 86400`)
    - `fetchSurah(number)`: `GET /chapters/{id}` + `GET /verses/by_chapter/{n}?words=true&word_fields=text_uthmani,text_simple`
    - `fetchVerses(surahNumber, range?)`: Verse mit optionalem Bereichsfilter
    - `fetchTranslation(verseKey, language)`: `GET /quran/translations/{id}?chapter_number={n}`
    - `searchSurahs(query)`: clientseitige Filterung via `progressCalculator.searchSurahs`
    - Fehlerbehandlung: `apiUnavailable`, `surahNotFound`, `networkOffline`
    - _Requirements: 1.1, 1.5, 1.6, 2.7, 2.8, 10.2, 10.3_

  - [ ]* 4.2 Unit-Tests für `quranRepository` mit MSW schreiben
    - MSW-Handler für alle Quran.com API v4 Endpunkte
    - Smoke-Test: Surah 1 (Al-Fatihah) laden und Struktur validieren
    - Fehlerfall: API nicht erreichbar → gecachte Daten verwenden
    - _Requirements: 1.5, 1.6, 10.3_

  - [x] 4.3 `progressRepository.ts` in `src/repositories/` implementieren
    - Interface `ProgressRepository` implementieren
    - `markVerseAsLearned(verseKey)`: `VerseProgress` in localStorage speichern
    - `getProgress(surahNumber)`: `SurahProgress` aus localStorage berechnen
    - `saveSessionResult(result)`: `SessionRecord` in localStorage-Array anhängen
    - `resumeSession(surahNumber)`: Letzte unvollständige Session laden
    - `getDailyStats(date)`: `DailyStats` für Datum aus localStorage
    - localStorage-Quota-Handling: FIFO-Löschung ältester Session-Records bei `QuotaExceededError`
    - _Requirements: 5.5, 6.3, 6.4, 6.5_

  - [ ]* 4.4 Property-Based Tests für `progressRepository` schreiben
    - **Property 7: Fortschritt-Persistenz Round-Trip**
    - **Validates: Requirements 5.5, 6.3**
    - Generatoren: `verseProgressArb` mit zufälligen `verseKey`-Strings und Datumswerten
    - localStorage-Mock via `vitest` `vi.stubGlobal`
    - _Requirements: 5.5, 6.3_

- [x] 5. ASR-Provider: WebSpeech und Whisper WASM
  - [x] 5.1 `webSpeechProvider.ts` in `src/asr/` implementieren
    - `WebSpeechASRProvider implements ASRProvider`
    - `isAvailable`: `typeof window !== 'undefined' && 'SpeechRecognition' in window`
    - `startStream(language: 'ar')`: `SpeechRecognition` mit `lang='ar-SA'`, `continuous: true`, `interimResults: true`
    - `onTranscript`-Callback mit `TranscriptionSegment` aus `SpeechRecognitionEvent`
    - Stille-Timeout: 5 Sekunden ohne Ergebnis → `silenceDetected`-State
    - _Requirements: 4.1, 4.2, 4.6, 4.7_

  - [x] 5.2 `whisperWasmProvider.ts` in `src/asr/` implementieren
    - `WhisperWasmASRProvider implements ASRProvider`
    - Lazy-Loading des WASM-Moduls (nur wenn Web Speech API nicht verfügbar)
    - `loadModel(modelName)`: Modell aus IndexedDB laden oder herunterladen (~150 MB)
    - Download-Fortschrittsanzeige via Callback
    - `startStream(language)`: Audio-Capture via `getUserMedia`, Chunk-basierte Transkription
    - Fehlerbehandlung: `whisperModelLoadFailed`
    - _Requirements: 4.1, 4.8_

- [x] 6. RecitationEngine
  - [x] 6.1 `recitationEngine.ts` in `src/domain/` implementieren
    - `RecitationEngine`-Interface implementieren
    - ASR-Provider-Auswahl: `WebSpeechASRProvider` bevorzugt, Fallback auf `WhisperWasmASRProvider`
    - `startRecitation(expectedWords, config)`: ASR starten, Wort-für-Wort-Matching orchestrieren
    - `onTranscript`-Handler: `WordMatcher.match()` aufrufen, `WordMatchEvent` dispatchen
    - Stille-Timeout-Handling: nach 5 Sekunden → `silenceDetected`-State
    - Latenz-Messung: `performance.now()` vor/nach Matching
    - `visibilitychange`-Event: Aufnahme bei Tab-Wechsel pausieren
    - _Requirements: 4.1, 4.2, 4.6, 4.7, 4.8, 9.4_

  - [ ]* 6.2 Unit-Tests für `recitationEngine` mit gemockten ASR-Providern schreiben
    - Mock `WebSpeechASRProvider` und `WhisperWasmASRProvider`
    - Test: Korrekte Transkription → `WordMatchEvent` mit `result.kind === 'correct'`
    - Test: Falsche Transkription → `WordMatchEvent` mit `result.kind === 'incorrect'`
    - Test: Stille > 5 Sekunden → `silenceDetected`-State
    - _Requirements: 4.1, 4.6_

- [x] 7. Checkpoint — Domain-Logik vollständig
  - Alle Tests in `src/domain/` und `src/repositories/` müssen grün sein.
  - Sicherstellen, dass `normalizeArabic`, `match`, `calculateProgress`, `searchSurahs` korrekt funktionieren.
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Zustand Stores
  - [x] 8.1 `useProgressStore.ts` in `src/stores/` implementieren
    - `ProgressStore`-Interface implementieren mit Zustand + `persist`-Middleware
    - `persist`-Konfiguration: `name: 'quran-progress'`, `storage: createJSONStorage(() => localStorage)`
    - `markVerseAsLearned(verseKey)`: `VerseProgress` aktualisieren, `ProgressRepository` aufrufen
    - `saveSession(record)`: `SessionRecord` anhängen
    - `getProgressForSurah(surahNumber)`: `SurahProgress` berechnen
    - _Requirements: 5.5, 6.1, 6.2, 6.3, 6.4_

  - [x] 8.2 `useReadingStore.ts` in `src/stores/` implementieren
    - `ReadingStore`-Interface implementieren
    - `loadSurah(surahNumber)`: `QuranRepository.fetchSurah()` aufrufen, `wordStates` initialisieren
    - `startRecitation()` / `stopRecitation()`: `RecitationEngine` steuern
    - `handleWordMatchEvent(event)`: `wordStates` aktualisieren (grün/rot)
    - `setFontSize`, `setTranslationLanguage`: UI-Präferenzen
    - _Requirements: 2.1, 2.3, 2.5, 2.6, 4.3, 4.4_

  - [x] 8.3 `useHifzStore.ts` in `src/stores/` implementieren
    - `HifzStore`-Interface implementieren
    - `initSession(surahNumber, verseRange)`: Session initialisieren, alle Wörter `hidden`
    - `handleWordMatchEvent(event)`: Wort aufdecken (korrekt → grün, falsch → rot + `resetVerse()`)
    - `resetVerse()`: Alle Wörter auf `hidden`, `matchResult: undefined`, `attemptCount++`
    - `advanceToNextVerse()`: Nächster Vers oder `isSessionComplete = true`
    - `completeSession()`: `SessionRecord` erstellen, `useProgressStore.saveSession()` aufrufen
    - Vers-Timeout: 10 Sekunden Stille → Vers für 2 Sekunden anzeigen → weiterschalten
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 5.1, 5.2, 5.3_

  - [ ]* 8.4 Property-Based Tests für `useHifzStore` schreiben
    - **Property 4: Progressives Aufdecken ist monoton**
    - **Validates: Requirements 3.2**
    - **Property 5: Vers-Reset stellt vollständigen Ausgangszustand wieder her**
    - **Validates: Requirements 3.3, 3.5, 5.2**
    - **Property 6: Vollständige Rezitation löst automatischen Vers-Wechsel aus**
    - **Validates: Requirements 3.4, 5.1**
    - **Property 10: Versbereich-Filter ist exakt**
    - **Validates: Requirements 3.6**
    - **Property 11: Versuch-Zähler ist korrekt**
    - **Validates: Requirements 5.3**
    - Generatoren: `verseArb`, `matchEventSequenceArb`, `partialRevealStateArb`
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 5.1, 5.2, 5.3_

- [x] 9. Checkpoint — Stores vollständig
  - Alle Store-Tests müssen grün sein.
  - Sicherstellen, dass `useHifzStore.resetVerse()` und `advanceToNextVerse()` korrekt funktionieren.
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. UI-Komponenten: Shared und Navigation
  - [x] 10.1 App-Layout und Root-Seite in `src/app/` erstellen
    - `src/app/layout.tsx`: HTML-Grundstruktur, Tailwind-Klassen, Dark/Light Mode (`prefers-color-scheme`), `<html lang="ar" dir="rtl">` für arabische Seiten
    - `src/app/page.tsx`: Server Component, lädt `SurahList`
    - Globale Fehlerbehandlung: `error.tsx` und `not-found.tsx`
    - _Requirements: 9.2, 9.3_

  - [x] 10.2 `SurahList`-Komponente in `src/components/shared/` erstellen
    - Client Component mit `useEffect` für clientseitigen API-Aufruf (Static Export)
    - Anzeige: Surennummer, arabischer Name, transliterierter Name, Versanzahl, Fortschrittsbalken
    - Suchfeld mit Debounce (300 ms) via `searchSurahs()`
    - Letzten Modus aus localStorage laden und als Badge anzeigen
    - Skeleton-Loading-State während API-Aufruf
    - ARIA: `role="list"`, `aria-label`, `aria-busy` während Laden
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 9.1_

  - [x] 10.3 `MicrophoneButton`-Komponente in `src/components/shared/` erstellen
    - Visueller Zustand: idle / recording (pulsierend) / paused / error
    - Stille-Indikator: visuelles Puls-Signal bei `silenceDetected`
    - ARIA: `aria-label` dynamisch ("Aufnahme starten" / "Aufnahme stoppen"), `aria-pressed`
    - Touch-freundlich: min. 44×44 px Tap-Target
    - _Requirements: 4.6, 9.1, 9.5_

- [x] 11. UI-Komponenten: Lese-Modus
  - [x] 11.1 `ReadingModeView`-Komponente in `src/components/reading/` erstellen
    - Client Component, verbindet `useReadingStore`
    - Schriftgrößen-Umschalter (klein/mittel/groß), Übersetzungs-Toggle
    - Scroll-Tracking für aktuelle Versnummer (`IntersectionObserver`)
    - Fehlerbehandlung: API-Fehler → Fehlermeldung + Retry-Button
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 2.7, 2.8_

  - [x] 11.2 `WordDisplay`-Komponente in `src/components/reading/` erstellen
    - Rendert einzelnes arabisches Wort mit Farbmarkierung (grün/rot/neutral)
    - CSS-Klassen-Toggle für Farben (kein Inline-Style für Performance)
    - `dir="rtl"` auf Vers-Container
    - ARIA: `aria-label` mit arabischem Text und Status
    - _Requirements: 2.2, 2.6, 4.3, 4.4_

  - [x] 11.3 `RecitationControls`-Komponente in `src/components/reading/` erstellen
    - Mikrofon-Button (via `MicrophoneButton`), Audio-Wiedergabe-Button
    - Override-Button: erscheint nur nach falsch markiertem Wort (Req. 8.3)
    - Kalibrierungs-Hinweis-Banner bei `shouldShowCalibrationHint === true`
    - _Requirements: 7.1, 7.2, 8.1, 8.3, 8.4_

  - [x] 11.4 Lese-Modus-Seite `src/app/surah/[id]/read/page.tsx` erstellen
    - Client Component (Mikrofon-Zugriff erfordert Browser)
    - `useReadingStore.loadSurah(id)` beim Mount
    - Audio-Wort-Highlighting via `getHighlightedWordIndex`
    - _Requirements: 2.1, 7.3_

- [x] 12. UI-Komponenten: Hifz-Modus
  - [x] 12.1 `HifzWordDisplay`-Komponente in `src/components/hifz/` erstellen
    - Rendert Wort als `hidden` (leer/Platzhalter) oder `revealed` (grün/rot)
    - Smooth-Reveal-Animation via Tailwind `transition`
    - Vers-Anzeige für 2 Sekunden bei Timeout/Skip (Req. 3.7)
    - _Requirements: 3.1, 3.2, 3.3, 3.7_

  - [x] 12.2 `HifzModeView`-Komponente in `src/components/hifz/` erstellen
    - Client Component, verbindet `useHifzStore`
    - Versbereich-Auswahl vor Session-Start
    - Versuch-Zähler-Anzeige (Req. 5.3)
    - Automatischer Vers-Wechsel nach vollständiger korrekter Rezitation
    - _Requirements: 3.1, 3.4, 3.6, 5.2, 5.3_

  - [x] 12.3 `SessionSummary`-Komponente in `src/components/hifz/` erstellen
    - Anzeige: Anzahl Verse, durchschnittliche Versuche, Gesamtdauer
    - "Nochmal üben"- und "Zurück zur Surenliste"-Buttons
    - _Requirements: 5.4_

  - [x] 12.4 Hifz-Modus-Seite `src/app/surah/[id]/hifz/page.tsx` erstellen
    - Client Component
    - `useHifzStore.initSession()` beim Mount
    - Navigation zur Session-Zusammenfassung bei `isSessionComplete`
    - Session-Persistenz: `beforeunload`-Event → `useProgressStore` speichern
    - _Requirements: 3.8, 5.5, 9.4_

- [x] 13. Checkpoint — UI vollständig
  - Alle Komponenten-Tests müssen grün sein.
  - Manuelle Überprüfung: RTL-Textdarstellung, Dark/Light Mode, Touch-Steuerung.
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Integrationstests und Koran-Fixtures
  - [x] 14.1 Koran-Fixtures und MSW-Handler erstellen
    - `src/test/fixtures/surah-1.json`: Al-Fatihah (7 Verse) als statische JSON-Datei
    - `src/test/fixtures/surah-1-translations.json`: Deutsche und englische Übersetzungen
    - `src/test/mocks/handlers.ts`: MSW-Handler für alle Quran.com API v4 Endpunkte
    - `src/test/mocks/server.ts`: MSW-Server-Setup für Node.js (Vitest)
    - _Requirements: 1.1, 2.1_

  - [ ]* 14.2 Integrationstests für Lese-Modus schreiben
    - End-to-End: Surah laden → Wort rezitieren (Mock ASR) → Wort grün markiert
    - Fehlerfall: API nicht erreichbar → gecachte Daten → Toast-Benachrichtigung
    - Übersetzungs-Toggle: Übersetzung ein-/ausblenden
    - _Requirements: 2.1, 2.6, 1.5_

  - [ ]* 14.3 Integrationstests für Hifz-Modus schreiben
    - End-to-End: Session starten → alle Wörter korrekt rezitieren → Auto-Advance
    - Fehlerfall: Falsches Wort → Vers-Reset → alle Wörter wieder hidden
    - Session-Persistenz: Session speichern → neu laden → fortsetzen
    - _Requirements: 3.2, 3.3, 3.4, 5.5_

- [x] 15. Finaler Checkpoint — Alle Tests grün, Deployment bereit
  - `npm run build` muss ohne Fehler durchlaufen (Static Export)
  - `npm run test:run` muss alle Tests bestehen
  - GitHub Actions Workflow muss erfolgreich deployen
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks mit `*` sind optional und können für ein schnelleres MVP übersprungen werden
- Jeder Task referenziert spezifische Requirements für Rückverfolgbarkeit
- Checkpoints stellen inkrementelle Validierung sicher
- Property-Tests validieren universelle Korrektheitseigenschaften (14 Properties aus dem Design-Dokument)
- Unit-Tests validieren konkrete Beispiele und Randfälle
- Die Domain-Schicht (`src/domain/`) ist vollständig ohne Browser testbar (kein `window`, kein `document`)
- Static Export (`output: 'export'`) bedeutet: keine Server-Side Rendering zur Laufzeit, alle API-Aufrufe clientseitig
- Whisper WASM wird lazy-geladen und in IndexedDB gecacht — kein Einfluss auf Initial Page Load

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.3"] },
    { "id": 2, "tasks": ["3.1", "3.3", "3.5"] },
    { "id": 3, "tasks": ["3.2", "3.4", "3.6", "4.1", "4.3"] },
    { "id": 4, "tasks": ["4.2", "4.4", "5.1", "5.2"] },
    { "id": 5, "tasks": ["6.1"] },
    { "id": 6, "tasks": ["6.2", "8.1"] },
    { "id": 7, "tasks": ["8.2", "8.3"] },
    { "id": 8, "tasks": ["8.4", "10.1"] },
    { "id": 9, "tasks": ["10.2", "10.3"] },
    { "id": 10, "tasks": ["11.1", "11.2", "11.3"] },
    { "id": 11, "tasks": ["11.4", "12.1"] },
    { "id": 12, "tasks": ["12.2", "12.3"] },
    { "id": 13, "tasks": ["12.4", "14.1"] },
    { "id": 14, "tasks": ["14.2", "14.3"] }
  ]
}
```
