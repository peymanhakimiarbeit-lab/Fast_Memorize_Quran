# Implementation Plan: Quran Memorization App

## Overview

Implementierung einer iOS-App (Swift/SwiftUI, iOS 16+) mit MVVM + Clean Architecture. Die Umsetzung erfolgt schichtweise: zuerst Datenmodelle und Infrastruktur, dann Domänenlogik (RecitationEngine, WordMatcher, Repositories), dann ViewModels und zuletzt die SwiftUI-Views. WhisperKit übernimmt die offline-fähige arabische Spracherkennung; SwiftData + CloudKit sichern den Lernfortschritt.

---

## Tasks

- [ ] 1. Projektstruktur, Abhängigkeiten und Kerninterfaces
  - Xcode-Projekt anlegen (iOS 16+, SwiftUI, Swift Package Manager)
  - SwiftCheck via SPM einbinden (`github.com/typelift/SwiftCheck`)
  - WhisperKit via SPM einbinden (`github.com/argmaxinc/WhisperKit`)
  - Ordnerstruktur anlegen: `Domain/`, `Infrastructure/`, `Presentation/`, `Resources/`
  - Alle Protokolle definieren: `RecitationEngineProtocol`, `ASRProvider`, `WordMatcherProtocol`, `QuranRepositoryProtocol`, `ProgressRepositoryProtocol`, `AudioPlayerProtocol`
  - Alle Value-Type-Datenmodelle implementieren: `SurahMetadata`, `Surah`, `Verse`, `QuranWord`, `HifzWordState`, `WordVisibility`, `WordColor`, `MatchResult`, `RecitationConfig`, `DiacriticMode`, `SessionState`, `WordMatchEvent`, `RecitationState`
  - `QuranAppError`-Enum mit allen Fehlerfällen implementieren
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 9.5_

- [ ] 2. Koran-Datenbank (SQLite / Tanzil)
  - [ ] 2.1 Tanzil-SQLite-Datenbank ins App-Bundle einbinden und Schema definieren
    - Tanzil-Uthmani-Datenbank (~3 MB) als `quran.db` in `Resources/` ablegen
    - SQLite-Schema dokumentieren (Tabellen: `surahs`, `verses`, `words`)
    - `QuranDatabaseService` als konkreten SQLite-Adapter implementieren
    - _Requirements: 1.1, 2.1, 3.1_

  - [ ] 2.2 `QuranRepository` implementieren (offline SQLite + optionaler API-Fallback)
    - `fetchAllSurahs()`, `fetchSurah(number:)`, `fetchVerses(surahNumber:range:)` gegen SQLite implementieren
    - `searchSurahs(query:)` mit case-insensitiver Suche über arabischen Namen, transliterierten Namen und Nummer implementieren
    - `fetchTranslation(verseKey:language:)` mit lokalem Cache + Quran.com API v4 Fallback implementieren
    - _Requirements: 1.1, 1.3, 2.5, 2.7, 2.8_

  - [ ]* 2.3 Unit-Test: Surah 1 (Al-Fatihah) Smoke-Test
    - Surah 1 laden und prüfen: 7 Verse, korrekte Wortanzahl, Uthmani-Text nicht leer
    - _Requirements: 1.1, 2.1_

  - [ ]* 2.4 Property-Test für Suren-Suche (Property 9)
    - **Property 9: Suren-Suche liefert nur relevante Ergebnisse**
    - Für beliebige nicht-leere Suchanfrage: alle Ergebnisse enthalten den Suchbegriff im arabischen Namen, transliterierten Namen oder der Nummer
    - Für leere Suchanfrage: genau 114 Suren zurückgegeben
    - **Validates: Requirements 1.3**

- [ ] 3. Fortschritts-Persistenz (SwiftData + CloudKit)
  - [ ] 3.1 SwiftData-Modelle implementieren und CloudKit-Container konfigurieren
    - `VerseProgress`, `SessionRecord`, `DailyStats` als `@Model`-Klassen implementieren
    - `NSPersistentCloudKitContainer` konfigurieren (iCloud-Entitlement, CloudKit-Schema)
    - `ModelContainer` mit Offline-First-Fallback (lokale SwiftData ohne iCloud) einrichten
    - _Requirements: 5.5, 6.3, 6.5, 9.4_

  - [ ] 3.2 `ProgressRepository` implementieren
    - `markVerseAsLearned(verseKey:)`, `getProgress(surahNumber:)`, `getOverallProgress()` implementieren
    - `saveSessionResult(_:)`, `resumeSession(surahNumber:)`, `getDailyStats(date:)` implementieren
    - Fortschrittsberechnung: `(learned / total) * 100` gerundet auf ganze Zahlen
    - _Requirements: 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4_

  - [ ]* 3.3 Property-Test für Fortschritts-Round-Trip (Property 7)
    - **Property 7: Fortschritt-Persistenz Round-Trip**
    - Für beliebige `VerseProgress`- und `SessionState`-Objekte: nach Speichern und Laden sind alle Felder äquivalent (`isLearned`, `attemptCount`, `lastPracticed`, `currentVerseIndex`, `revealedWords`)
    - **Validates: Requirements 5.5, 6.3**

  - [ ]* 3.4 Property-Test für Fortschrittsberechnung (Property 12)
    - **Property 12: Fortschrittsberechnung ist korrekt**
    - Für beliebige Sure mit `total` Versen und `learned` gelernten Versen (`0 ≤ learned ≤ total`): angezeigter Prozentsatz == `round((learned / total) * 100)`
    - **Validates: Requirements 6.1, 6.2**

- [ ] 4. Checkpoint — Datenschicht vollständig
  - Alle Tests der Datenschicht (Tasks 2–3) müssen grün sein. Fragen an den Benutzer klären.

- [ ] 5. WordMatcher — Arabische Normalisierung und Matching
  - [ ] 5.1 `WordMatcher` implementieren
    - `normalizeArabic(_:mode:)` implementieren:
      - Strict: alle Harakat beibehalten (Fatha, Kasra, Damma, Sukun, Shadda, Tanwin)
      - Moderate: alle Harakat entfernen, Alef-Varianten normalisieren (أ إ آ → ا), Ta Marbuta (ة → ه), Hamza-Varianten normalisieren
    - `match(transcribed:expected:config:)` mit Konfidenz-Schwellen-Prüfung implementieren
    - _Requirements: 4.5, 8.2_

  - [ ]* 5.2 Unit-Tests für WordMatcher
    - Konkrete Tajweed-Beispiele: Alef-Varianten, Hamza, Ta Marbuta, Tanwin
    - Grenzfälle: leerer String, nur Harakat, gemischter Text
    - _Requirements: 4.5_

  - [ ]* 5.3 Property-Test: Normalisierung ist idempotent (Property 1)
    - **Property 1: Arabische Normalisierung ist idempotent**
    - Für beliebige arabische Strings und beide `DiacriticMode`-Werte: `normalize(normalize(s)) == normalize(s)`
    - Generator: zufällige Unicode-Strings im Bereich U+0600–U+06FF mit/ohne Harakat
    - **Validates: Requirements 4.5**

  - [ ]* 5.4 Property-Test: Strict strenger als Moderate (Property 2)
    - **Property 2: Strict-Modus ist strenger als Moderate-Modus**
    - Für beliebige arabische Wortpaare: wenn Strict-Match korrekt, dann auch Moderate-Match korrekt
    - **Validates: Requirements 4.5**

  - [ ]* 5.5 Property-Test: Konfidenz-Schwelle bestimmt Wort-Bewertung (Property 8)
    - **Property 8: Konfidenz-Schwelle bestimmt Wort-Bewertung**
    - Für beliebige Konfidenzwerte `c` und Schwellen `t`: `c < t` → Wort als falsch markiert; `c >= t` und Text stimmt überein → Wort als korrekt markiert
    - **Validates: Requirements 8.2**

- [ ] 6. WhisperKit ASR-Adapter
  - [ ] 6.1 `WhisperKitASR` implementieren
    - `ASRProvider`-Protokoll implementieren mit `transcribeStream(audioBuffer:)` und `loadModel(modelName:)`
    - Whisper-small-Modell für Arabisch beim ersten App-Start herunterladen und lokal cachen
    - Streaming-Transkription mit Wort-Timestamps aktivieren
    - Latenz-Messung pro Wort implementieren (Ziel: ≤ 550 ms)
    - _Requirements: 4.1, 4.2, 4.7_

  - [ ] 6.2 Mikrofon-Berechtigungshandling und AVAudioSession konfigurieren
    - `AVAudioSession`-Kategorie `.record` konfigurieren
    - Berechtigungsanfrage mit Fallback-UI (Link zu Einstellungen) implementieren
    - Hintergrund-/Unterbrechungshandling (Anruf, App-Wechsel) implementieren
    - _Requirements: 9.4_

- [ ] 7. RecitationEngine — Orchestrator
  - [ ] 7.1 `RecitationEngine` implementieren
    - `RecitationEngineProtocol` implementieren: `startRecitation`, `stopRecitation`, `pauseRecitation`, `resumeRecitation`
    - `AsyncStream<WordMatchEvent>` für Echtzeit-Wort-Events aufbauen
    - Stille-Timeout (5 Sekunden kein Audiosignal) mit visuellem Signal implementieren
    - Automatisches Pausieren bei App-Hintergrund implementieren
    - `WordMatcher` für jedes transkribierte Wort aufrufen und `WordMatchEvent` emittieren
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6, 4.7, 9.4_

  - [ ]* 7.2 Property-Test: Konfidenz-Schwelle in RecitationEngine (Property 8 — Integration)
    - **Property 8: Konfidenz-Schwelle bestimmt Wort-Bewertung (RecitationEngine-Ebene)**
    - Mock-ASRProvider mit kontrollierten Konfidenzwerten; prüfen, dass `WordMatchEvent.result` korrekt gesetzt wird
    - **Validates: Requirements 8.2**

  - [ ]* 7.3 Property-Test: Kalibrierungsempfehlung bei hoher Fehlerrate (Property 14)
    - **Property 14: Kalibrierungsempfehlung bei hoher Fehlerrate**
    - Für beliebige Verse mit `n` Wörtern: wenn mehr als `⌊n * 0.3⌋` Wörter niedrigen Konfidenzwert haben, wird Kalibrierungsempfehlung ausgelöst
    - **Validates: Requirements 8.4**

- [ ] 8. Checkpoint — Domänenschicht vollständig
  - Alle Tests der Domänenschicht (Tasks 5–7) müssen grün sein. Fragen an den Benutzer klären.

- [ ] 9. HifzViewModel — Hifz-Modus State-Management
  - [ ] 9.1 `HifzViewModel` implementieren
    - `@Observable`-Klasse mit `[HifzWordState]` als UI-State
    - `startSession(surahNumber:verseRange:)` implementiert Versbereich-Filter exakt
    - `processWordEvent(_:)` aktualisiert `HifzWordState.visibility` und `matchResult`
    - `resetVerse()` setzt alle Wörter auf `hidden` und `matchResult == nil`
    - Auto-Advance: wenn alle Wörter `revealed(.correct)` → nächster Vers oder Session-Zusammenfassung
    - Versuch-Zähler (`attemptCount`) pro Vers inkrementieren
    - Timeout-Handling: nach 10 Sekunden Stille → vollständigen Vers 2 Sekunden anzeigen → weiter
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 5.1, 5.2, 5.3_

  - [ ]* 9.2 Property-Test: Match-Ergebnis bestimmt Wort-Markierung (Property 3)
    - **Property 3: Match-Ergebnis bestimmt Wort-Markierung**
    - Für beliebige Wörter und Transkriptionen: korrekte Transkription → `revealed(.correct)`; falsche → `revealed(.incorrect)`; nicht betroffene Wörter unverändert
    - **Validates: Requirements 2.6, 3.2, 3.3, 4.3, 4.4**

  - [ ]* 9.3 Property-Test: Progressives Aufdecken ist monoton (Property 4)
    - **Property 4: Progressives Aufdecken ist monoton**
    - Für beliebige Sequenzen von Match-Events innerhalb eines Versversuchs: Menge der aufgedeckten Wörter kann nur wachsen (kein `revealed` → `hidden` ohne expliziten Reset)
    - **Validates: Requirements 3.2**

  - [ ]* 9.4 Property-Test: Vers-Reset stellt Ausgangszustand wieder her (Property 5)
    - **Property 5: Vers-Reset stellt vollständigen Ausgangszustand wieder her**
    - Für beliebige Zwischenzustände: nach `resetVerse()` haben alle `HifzWordState`-Einträge `visibility == .hidden` und `matchResult == nil`
    - **Validates: Requirements 3.5, 5.2**

  - [ ]* 9.5 Property-Test: Vollständige Rezitation löst Auto-Advance aus (Property 6)
    - **Property 6: Vollständige Rezitation löst automatischen Vers-Wechsel aus**
    - Für beliebige Verse mit n Wörtern: sobald alle n Wörter `revealed(.correct)` → Vers-Index inkrementiert oder Session-Zusammenfassung ausgelöst
    - **Validates: Requirements 3.4, 5.1**

  - [ ]* 9.6 Property-Test: Versbereich-Filter ist exakt (Property 10)
    - **Property 10: Versbereich-Filter ist exakt**
    - Für beliebige gültige Versbereiche `[a, b]`: angezeigte Versliste enthält genau die Verse `a` bis `b`
    - **Validates: Requirements 3.6**

  - [ ]* 9.7 Property-Test: Versuch-Zähler ist korrekt (Property 11)
    - **Property 11: Versuch-Zähler ist korrekt**
    - Für beliebige Sequenzen von `n` Rezitationsversuchen: `attemptCount == n` nach der Sequenz
    - **Validates: Requirements 5.3**

- [ ] 10. ReadingViewModel — Lese-Modus State-Management
  - [ ] 10.1 `ReadingViewModel` implementieren
    - `@Observable`-Klasse mit Vers-Liste und Wort-Markierungen
    - `processWordEvent(_:)` aktualisiert Wort-Farbe (grün/rot) bei sichtbarem Text
    - Schriftgrößen-State (klein/mittel/groß: 14pt/20pt/28pt) mit sofortiger Wirkung
    - Übersetzungs-Toggle und Sprachauswahl
    - Aktuelle Versnummer beim Scrollen tracken
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [ ]* 10.2 Property-Test: Match-Ergebnis bestimmt Wort-Markierung im Lese-Modus (Property 3)
    - **Property 3: Match-Ergebnis bestimmt Wort-Markierung (ReadingViewModel)**
    - Für beliebige Wörter und Transkriptionen: korrekte Transkription → grün; falsche → rot; nicht betroffene Wörter unverändert
    - **Validates: Requirements 2.6, 4.3, 4.4**

- [ ] 11. AudioPlayer — Referenzrezitation
  - [ ] 11.1 `AudioPlayer` implementieren
    - `AVAudioPlayer`-basierte Wiedergabe lokaler MP3-Dateien
    - Wort-Highlighting via vorberechnete `audioTimestamp`-Werte aus `QuranWord`
    - `downloadRecitator(_:)` mit `Progress`-Reporting implementieren
    - Hifz-Modus-Einschränkung: Wiedergabe nur auf explizite Anfrage
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ]* 11.2 Property-Test: Audio-Wort-Highlighting ist synchron (Property 13)
    - **Property 13: Audio-Wort-Highlighting ist synchron**
    - Für beliebige Wiedergabe-Timestamps `t`: hervorgehobener Wort-Index entspricht dem Wort, dessen `audioTimestamp`-Intervall `t` enthält
    - **Validates: Requirements 7.3**

- [ ] 12. Checkpoint — ViewModels und Audio vollständig
  - Alle Tests der ViewModel- und Audio-Schicht (Tasks 9–11) müssen grün sein. Fragen an den Benutzer klären.

- [ ] 13. SwiftUI Views — Suren-Navigation
  - [ ] 13.1 `SurahListView` implementieren
    - Liste aller 114 Suren mit arabischem Namen, transliteriertem Namen, Surennummer und Versanzahl
    - Suchfeld mit Echtzeit-Filterung (bindet an `QuranRepository.searchSurahs`)
    - Navigation zu Moduswahl (Lese-Modus / Hifz-Modus)
    - Zuletzt geöffnete Sure und Modus beim App-Start wiederherstellen
    - VoiceOver-Labels für alle interaktiven Elemente
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 9.1_

  - [ ] 13.2 Moduswahl-View und Versbereich-Auswahl für Hifz-Modus implementieren
    - Moduswahl-Sheet nach Sure-Auswahl
    - Versbereich-Picker für Hifz-Modus (Start- und Endvers)
    - _Requirements: 1.2, 3.6_

- [ ] 14. SwiftUI Views — Lese-Modus
  - [ ] 14.1 `ReadingModeView` implementieren
    - Arabischer Text RTL, vollständig sichtbar, Mindestschriftgröße 14pt
    - Schriftgrößen-Umschalter (14pt / 20pt / 28pt) mit sofortiger Wirkung
    - Übersetzungsanzeige unterhalb des arabischen Textes (togglebar)
    - Aktuelle Versnummer dauerhaft eingeblendet beim Scrollen
    - Aufnahme-Button mit Echtzeit-Wort-Farbmarkierung (grün/rot)
    - Dark Mode / Light Mode Unterstützung
    - Fehlerzustände: Retry-Button bei Ladefehler, Toast bei fehlender Übersetzung
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 9.2_

- [ ] 15. SwiftUI Views — Hifz-Modus
  - [ ] 15.1 `HifzModeView` implementieren
    - Verse vollständig ausgeblendet (keine Platzhalter, keine Umrisse)
    - Progressives Aufdecken: Wörter erscheinen grün/rot beim Rezitieren
    - Stille-Indikator (Puls-Signal nach 5 Sekunden)
    - Timeout-Anzeige: vollständiger Vers 2 Sekunden sichtbar vor Auto-Advance
    - Versuch-Zähler pro Vers anzeigen
    - Aufnahme-Button und manuelle Override-Funktion (Wort als korrekt markieren)
    - VoiceOver-Labels für alle interaktiven Elemente
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.7, 5.2, 5.3, 8.3, 9.1_

  - [ ] 15.2 Session-Zusammenfassung-View implementieren
    - Anzahl der Verse, durchschnittliche Versuche pro Vers, Gesamtdauer
    - Navigation zurück zur Suren-Liste
    - _Requirements: 3.8, 5.4_

- [ ] 16. SwiftUI Views — Fortschritt und Einstellungen
  - [ ] 16.1 Fortschritts-View implementieren
    - Prozentualer Fortschritt pro Sure
    - Gesamtübersicht über alle Suren
    - Tägliche Statistiken (geübte Verse, Übungszeit)
    - _Requirements: 6.1, 6.2, 6.4_

  - [ ] 16.2 Einstellungs-View implementieren
    - Kalibrierungsfunktion (Referenzverse rezitieren, Stimme anpassen)
    - Konfidenz-Schwelle konfigurieren (Standard: 80 %)
    - Diakritikmodus wählen (Strict / Moderate)
    - iCloud-Sync-Status-Indikator
    - Rezitator-Auswahl und Download
    - _Requirements: 8.1, 8.2, 7.2_

- [ ] 17. Barrierefreiheit und iOS-Integration
  - [ ] 17.1 Dynamic Type für alle Nicht-Koran-Textelemente implementieren
    - Alle UI-Labels, Buttons und Beschreibungen auf Dynamic Type umstellen
    - Arabischer Korantext bleibt bei konfigurierten Größen (14pt/20pt/28pt)
    - _Requirements: 9.3_

  - [ ] 17.2 App-Lifecycle-Handling implementieren
    - `scenePhase`-Observer: Aufnahme pausieren und Zustand speichern bei Hintergrundwechsel
    - Wiederaufnahme-Dialog bei Rückkehr aus dem Hintergrund
    - _Requirements: 9.4_

- [ ] 18. Integrationstests und End-to-End-Verdrahtung
  - [ ] 18.1 WhisperKit-Modell-Ladezeit-Test implementieren
    - Ladezeit < 3 Sekunden auf iPhone 12+ messen (Integrationstest mit echtem Modell)
    - _Requirements: 4.1_

  - [ ]* 18.2 End-to-End-Integrationstest: Aufnahme → Transkription → Matching → UI-Update
    - Test-Audio-Fixtures (korrekte und fehlerhafte Rezitationen von Al-Fatihah) verwenden
    - Vollständigen Datenpfad von `WhisperKitASR` über `RecitationEngine` bis `HifzViewModel` testen
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 19. Finaler Checkpoint — Alle Tests grün
  - Alle Unit-Tests, Property-Tests und Integrationstests müssen grün sein. Fragen an den Benutzer klären.

---

## Notes

- Tasks mit `*` sind optional und können für ein schnelleres MVP übersprungen werden
- Jeder Task referenziert spezifische Anforderungen für Rückverfolgbarkeit
- Property-Tests laufen mit mindestens 100 Iterationen (SwiftCheck-Standard)
- Checkpoints (Tasks 4, 8, 12, 19) sichern inkrementelle Validierung
- WhisperKit-Modell-Download (~150 MB) erfordert Netzwerkverbindung beim ersten Start
- iCloud-Integrationstests erfordern einen iCloud-Test-Account in der CI-Umgebung
- Arabische RTL-Darstellung und VoiceOver-Compliance erfordern manuelle Tests auf echtem Gerät

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1", "3.1"] },
    { "id": 1, "tasks": ["2.2", "3.2", "5.1"] },
    { "id": 2, "tasks": ["2.3", "2.4", "3.3", "3.4", "5.2", "5.3", "5.4", "5.5", "6.1"] },
    { "id": 3, "tasks": ["6.2", "7.1"] },
    { "id": 4, "tasks": ["7.2", "7.3", "9.1", "10.1", "11.1"] },
    { "id": 5, "tasks": ["9.2", "9.3", "9.4", "9.5", "9.6", "9.7", "10.2", "11.2"] },
    { "id": 6, "tasks": ["13.1", "13.2"] },
    { "id": 7, "tasks": ["14.1", "15.1"] },
    { "id": 8, "tasks": ["15.2", "16.1", "16.2", "17.1", "17.2"] },
    { "id": 9, "tasks": ["18.1", "18.2"] }
  ]
}
```
