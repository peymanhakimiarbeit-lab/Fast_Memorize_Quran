# Requirements Document

## Introduction

Die Quran-Memorization-App ist eine iOS-Anwendung, die Muslimen dabei hilft, den Koran effizienter auswendig zu lernen. Die App bietet zwei Hauptmodi: einen **Lese-Modus**, in dem alle Verse sichtbar sind und die Rezitation mit Echtzeit-Feedback (grün/rot) begleitet wird, sowie einen **Hifz-Modus** (Auswendiglern-Modus), der das echte Memorieren trainiert. Im Hifz-Modus sind die Verse vollständig ausgeblendet — der Benutzer rezitiert aus dem Gedächtnis, und die Wörter erscheinen progressiv Wort für Wort, sobald sie korrekt ausgesprochen werden. Falsch ausgesprochene Wörter werden rot markiert und mit der offiziellen Koran-Datenbank verglichen. Ein Vers gilt als gelernt, wenn er vollständig korrekt rezitiert wurde.

---

## Glossary

- **App**: Die iOS-Quran-Memorization-Anwendung
- **Benutzer**: Eine Person, die die App auf einem Apple-iOS-Gerät verwendet
- **Sure**: Ein Kapitel des Korans (insgesamt 114 Suren)
- **Vers**: Ein einzelner Satz/Abschnitt innerhalb einer Sure (auch „Ayah" genannt)
- **Wort**: Ein einzelnes arabisches Wort innerhalb eines Verses
- **Lese-Modus**: Betriebsmodus der App, in dem Suren und Verse vollständig sichtbar angezeigt werden; Rezitation wird mit grün/rot-Feedback begleitet
- **Hifz-Modus**: Betriebsmodus der App (Auswendiglern-Modus), in dem Verse vollständig ausgeblendet sind und Wörter erst beim korrekten Rezitieren progressiv erscheinen
- **Spracherkennungs-Engine**: Die Komponente der App, die gesprochene Sprache in Text umwandelt (Arabisch)
- **Transkription**: Die Echtzeit-Umwandlung gesprochener Sprache in Text durch die Spracherkennungs-Engine
- **Wort-Matching**: Der Vergleich eines transkribierten Wortes mit dem erwarteten arabischen Koranwort
- **Fortschrittsanzeige**: Die visuelle Darstellung des Lernfortschritts des Benutzers
- **Session**: Eine einzelne Übungseinheit im Auswendiglern-Modus für eine ausgewählte Sure oder einen Versbereich

---

## Requirements

### Requirement 1: Suren-Navigation und Auswahl

**User Story:** Als Benutzer möchte ich eine Sure aus einer vollständigen Liste aller 114 Suren auswählen, damit ich gezielt mit dem Lesen oder Auswendiglernen beginnen kann.

#### Acceptance Criteria

1. THE App SHALL eine vollständige Liste aller 114 Suren des Korans anzeigen, einschließlich Surenname (arabisch und transliteriert), Surennummer und Anzahl der Verse.
2. WHEN der Benutzer eine Sure auswählt, THE App SHALL den Benutzer zu einer Moduswahl (Lese-Modus oder Hifz-Modus) weiterleiten.
3. THE App SHALL eine Suchfunktion bereitstellen, mit der der Benutzer Suren nach Name oder Nummer filtern kann.
4. WHEN der Benutzer die App erneut öffnet, THE App SHALL die zuletzt geöffnete Sure und den zuletzt verwendeten Modus anzeigen.

---

### Requirement 2: Lese-Modus mit Sprach-Feedback

**User Story:** Als Benutzer möchte ich eine Sure im Lese-Modus vollständig lesen und dabei meine Rezitation mit Echtzeit-Feedback verfolgen können, damit ich den Korantext studieren und meine Aussprache verbessern kann.

#### Acceptance Criteria

1. WHEN der Benutzer den Lese-Modus für eine Sure auswählt, THE App SHALL alle Verse der Sure in arabischer Schrift vollständig sichtbar anzeigen, ohne Abschneidung und mit einer Mindestschriftgröße von 14pt.
2. THE App SHALL die Verse in korrekter arabischer Schriftrichtung (rechts nach links) darstellen.
3. THE App SHALL eine einstellbare Schriftgröße für den arabischen Text bereitstellen, mit mindestens drei Größenstufen: klein (14pt), mittel (20pt) und groß (28pt); die Änderung tritt sofort ohne Neustart in Kraft.
4. WHEN der Benutzer durch die Verse scrollt, THE App SHALL die Versnummer des obersten vollständig sichtbaren Verses dauerhaft eingeblendet anzeigen.
5. WHERE der Benutzer eine Übersetzung aktiviert hat, THE App SHALL eine Übersetzung des jeweiligen Verses in der gewählten Sprache unterhalb des arabischen Textes anzeigen.
6. WHEN der Benutzer die Aufnahme im Lese-Modus startet und ein Wort rezitiert, THE App SHALL das erkannte Wort grün (korrekt) oder rot (falsch) markieren, während der vollständige Text sichtbar bleibt.
7. IF die Übersetzungsdaten für die gewählte Sprache nicht verfügbar sind, THEN THE App SHALL eine Fehlermeldung anzeigen und den arabischen Text ohne Übersetzung darstellen.
8. IF die Surendaten nicht geladen werden können, THEN THE App SHALL eine Fehlermeldung mit Retry-Option anzeigen.

---

### Requirement 3: Hifz-Modus (Auswendiglern-Modus) — Progressives Aufdecken

**User Story:** Als Benutzer möchte ich im Hifz-Modus Verse vollständig auswendig rezitieren, wobei die Wörter erst beim korrekten Aussprechen sichtbar werden, damit ich den Koran wirklich aus dem Gedächtnis aufbaue.

#### Acceptance Criteria

1. WHEN der Benutzer den Hifz-Modus für eine Sure startet, THE App SHALL alle Wörter des aktuellen Verses vollständig ausblenden — es werden keine Platzhalter oder Wortumrisse angezeigt.
2. WHEN der Benutzer ein Wort korrekt rezitiert, THE App SHALL dieses Wort sofort grün hervorgehoben im Text erscheinen lassen (progressives Aufdecken Wort für Wort).
3. WHEN der Benutzer ein Wort falsch rezitiert, THE App SHALL das erkannte Wort rot markiert anzeigen und es mit dem erwarteten Koranwort aus der offiziellen Koran-Datenbank vergleichen.
4. WHEN der Benutzer einen Vers vollständig korrekt rezitiert hat (alle Wörter grün erschienen), THE App SHALL automatisch zum nächsten Vers wechseln.
5. WHEN der Benutzer einen Vers nicht vollständig korrekt rezitiert hat, THE App SHALL den Vers zurücksetzen (alle aufgedeckten Wörter wieder ausblenden) und zur erneuten Rezitation bereitstellen.
6. WHEN der Benutzer einen Versbereich für die Session auswählt, THE App SHALL ausschließlich die Verse dieses Bereichs im Hifz-Modus anzeigen.
7. WHEN der aktuelle Vers auf beliebige Weise weitergeschaltet wird (Überspringen oder Timeout nach 10 Sekunden Stille), THE App SHALL den vollständigen Vers für 2 Sekunden sichtbar anzeigen, bevor zum nächsten Vers gewechselt wird.
8. WHEN der Benutzer den letzten Vers einer Session abgeschlossen hat, THE App SHALL zur Session-Zusammenfassung navigieren.

---

### Requirement 4: Echtzeit-Spracherkennung und Transkription

**User Story:** Als Benutzer möchte ich einen Vers laut rezitieren und sofortiges Feedback erhalten, damit ich weiß, welche Wörter ich korrekt ausgesprochen habe.

#### Acceptance Criteria

1. WHEN der Benutzer die Aufnahme startet, THE Spracherkennungs-Engine SHALL gesprochenes Arabisch in Echtzeit transkribieren, mit einer Latenz von maximal 550 ms pro Wort (Zielwert: 500 ms; Toleranz: bis zu 50 ms Überschreitung vor Fehlerbehandlung).
2. THE Spracherkennungs-Engine SHALL arabische Koranrezitation erkennen und dabei Tajweed-Aussprache (koranische Rezitationsregeln) berücksichtigen.
3. WHEN ein transkribiertes Wort mit dem erwarteten Koranwort übereinstimmt, THE App SHALL dieses Wort grün markieren.
4. WHEN ein transkribiertes Wort nicht mit dem erwarteten Koranwort übereinstimmt, THE App SHALL dieses Wort rot markieren.
5. THE Wort-Matching SHALL diakritische Zeichen (Harakat/Tashkeel) bei der Bewertung berücksichtigen, mit einer konfigurierbaren Toleranzstufe (streng: exakte Übereinstimmung inkl. Harakat; moderat: Übereinstimmung ohne Harakat).
6. IF die Spracherkennungs-Engine kein Audiosignal (kein Schall detektiert) für mehr als 5 Sekunden erkennt, THEN THE App SHALL die Aufnahme automatisch pausieren und den Benutzer durch ein visuelles Signal darauf hinweisen. Nicht verarbeitbares Audio (z. B. Hintergrundgeräusche ohne erkennbare Sprache) gilt nicht als Stille für diesen Timeout.
7. THE Spracherkennungs-Engine SHALL offline funktionieren, sodass keine aktive Internetverbindung für die Kernerkennung erforderlich ist.

---

### Requirement 5: Vers-Wiederholung und Fortschritt

**User Story:** Als Benutzer möchte ich einen Vers so lange wiederholen, bis ich ihn vollständig korrekt rezitiert habe, damit ich sicherstellen kann, dass ich ihn wirklich auswendig kenne.

#### Acceptance Criteria

1. WHEN der Benutzer einen Vers vollständig und korrekt rezitiert hat (alle Wörter grün markiert), THE App SHALL automatisch zum nächsten Vers wechseln.
2. WHEN der Benutzer einen Vers nicht vollständig korrekt rezitiert hat, THE App SHALL den Vers zur erneuten Rezitation bereitstellen, ohne automatisch weiterzugehen.
3. THE App SHALL die Anzahl der Wiederholungsversuche pro Vers für die aktuelle Session anzeigen.
4. WHEN der Benutzer alle Verse einer Session abgeschlossen hat, THE App SHALL eine Zusammenfassung der Session anzeigen, einschließlich Anzahl der Verse, durchschnittliche Versuche pro Vers und Gesamtdauer.
5. IF der Benutzer die Session vorzeitig beendet, THEN THE App SHALL den Fortschritt speichern, sodass die Session beim nächsten Start an derselben Stelle fortgesetzt werden kann.

---

### Requirement 6: Lernfortschritt und Statistiken

**User Story:** Als Benutzer möchte ich meinen langfristigen Lernfortschritt verfolgen können, damit ich motiviert bleibe und meinen Fortschritt einschätzen kann.

#### Acceptance Criteria

1. THE App SHALL für jede Sure den prozentualen Anteil der bereits korrekt rezitierten Verse anzeigen.
2. THE App SHALL eine Gesamtübersicht des Fortschritts über alle Suren hinweg bereitstellen.
3. WHEN der Benutzer einen Vers zum ersten Mal vollständig korrekt rezitiert, THE App SHALL diesen Vers als „gelernt" markieren und den Fortschritt persistent speichern.
4. THE App SHALL tägliche Lernstatistiken erfassen, einschließlich Anzahl der geübten Verse und Gesamtübungszeit.
5. IF der Benutzer die App deinstalliert und neu installiert, THEN THE App SHALL den Fortschritt aus einem iCloud-Backup wiederherstellen, sofern der Benutzer iCloud-Synchronisierung aktiviert hat.

---

### Requirement 7: Audioausgabe und Referenzrezitation

**User Story:** Als Benutzer möchte ich die korrekte Rezitation eines Verses anhören können, damit ich meine Aussprache mit einer Referenz vergleichen kann.

#### Acceptance Criteria

1. WHEN der Benutzer die Audioausgabe für einen Vers aktiviert, THE App SHALL eine Referenzrezitation des Verses durch einen anerkannten Rezitator abspielen.
2. THE App SHALL mindestens einen Rezitator als Standard bereitstellen, mit der Option, weitere Rezitatoren herunterzuladen.
3. WHEN die Audioausgabe abgespielt wird, THE App SHALL das aktuell gesprochene Wort im Text synchron hervorheben.
4. WHERE der Benutzer die Audioausgabe im Auswendiglern-Modus aktiviert hat, THE App SHALL die Referenzrezitation nur auf ausdrückliche Anfrage des Benutzers abspielen, um das aktive Erinnern nicht zu beeinträchtigen.

---

### Requirement 8: Spracherkennungs-Kalibrierung und Fehlertoleranz

**User Story:** Als Benutzer möchte ich, dass die App meine individuelle Aussprache berücksichtigt, damit auch nicht-muttersprachliche Rezitatoren fair bewertet werden.

#### Acceptance Criteria

1. THE App SHALL eine Kalibrierungsfunktion bereitstellen, bei der der Benutzer vor der ersten Session einige Referenzverse rezitiert, um die Spracherkennungs-Engine auf die individuelle Stimme anzupassen.
2. THE Spracherkennungs-Engine SHALL eine Konfidenzwert-Schwelle verwenden, die konfigurierbar ist (Standard: 80 %), unterhalb derer ein Wort als falsch markiert wird.
3. WHEN ein Wort als falsch markiert wurde, THE App SHALL dem Benutzer die Möglichkeit geben, das Wort manuell als korrekt zu markieren (Override-Funktion). Die Override-Funktion ist ausschließlich nach der Markierung eines Wortes als falsch verfügbar.
4. IF die Spracherkennungs-Engine für mehr als 30 % der Wörter eines Verses einen niedrigen Konfidenzwert zurückgibt, THEN THE App SHALL dem Benutzer empfehlen, die Kalibrierung zu wiederholen.

---

### Requirement 9: Barrierefreiheit und iOS-Integration

**User Story:** Als Benutzer möchte ich, dass die App die iOS-Systemstandards einhält, damit sie nahtlos in mein Apple-Ökosystem integriert ist.

#### Acceptance Criteria

1. THE App SHALL VoiceOver (iOS-Screenreader) für alle interaktiven Elemente unterstützen.
2. THE App SHALL den iOS Dark Mode und Light Mode unterstützen und automatisch zwischen beiden wechseln, wenn der Benutzer die Systemeinstellung ändert.
3. THE App SHALL Dynamic Type (iOS-Schriftgrößenanpassung) für alle Textelemente außer dem arabischen Korantext unterstützen.
4. WHEN die App in den Hintergrund wechselt, THE App SHALL jede aktive Audioaufnahme pausieren und den aktuellen Zustand speichern, unabhängig vom aktiven Modus.
5. THE App SHALL mit iOS 16 und neueren Versionen kompatibel sein.
