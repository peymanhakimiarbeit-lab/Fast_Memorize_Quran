# Memorize Faster — Quran Memorization Web App

Eine Web-App zum Auswendiglernen des Korans mit Echtzeit-Spracherkennung und progressivem Wort-Aufdecken.

---

## ⚠️ Hinweise / Disclaimer

### AI-generiert
Dieses Projekt wurde mit Hilfe von **Künstlicher Intelligenz (Kiro / Claude AI)** erstellt. Der gesamte Quellcode wurde durch AI generiert und vom Entwickler überprüft.

### Persönliches Projekt
Dies ist ein **privates, nicht-kommerzielles Lernprojekt**. Es wird nicht verkauft, nicht monetarisiert und dient ausschließlich dem persönlichen Gebrauch zum Auswendiglernen des Korans.

### Kein Anspruch auf Korrektheit
Die Spracherkennung basiert auf der Web Speech API des Browsers und ist **nicht perfekt**. Die App ersetzt keinen qualifizierten Quran-Lehrer. Für die korrekte Rezitation und Tajweed-Regeln sollte immer ein Lehrer konsultiert werden.

---

## 📖 Quellen und Lizenzen

### Koran-Text
- **Quelle:** [Quran.com API v4](https://quran.com) — Uthmani-Schrift
- **Lizenz:** Der Koran-Text selbst ist **gemeinfrei (Public Domain)** — kein Copyright auf den heiligen Text
- **API-Nutzung:** Die Quran.com API ist öffentlich und kostenlos für nicht-kommerzielle Nutzung

### Übersetzungen
- **Quelle:** [AlQuran.cloud API](https://alquran.cloud/api) — Open Source Quran API
- **Lizenz:** MIT-Lizenz (frei nutzbar)
- **Deutsche Übersetzung:** Bubenheim & Elyas
- **Englische Übersetzung:** Saheeh International
- **Persische/Dari Übersetzung:** Ansarian

### Audio-Rezitationen
- **Quelle:** [verses.quran.com](https://quran.com) — Audio-CDN von Quran.com
- **Rezitatoren:** Mishary Alafasy, Yasser Al-Dosari, Abdul Basit, Ali Al-Hudhaify, Al-Minshawi
- **Nutzung:** Frei verfügbar für Koran-Anwendungen

### Schriftart
- **Amiri Font:** [Google Fonts](https://fonts.google.com/specimen/Amiri) — OFL (Open Font License)
- Hochwertige arabische Schriftart für Koran-Darstellung

### Spracherkennung
- **Web Speech API:** Browser-native API (Chrome, Edge) — keine externe Abhängigkeit
- Keine Audiodaten werden an Dritte gesendet (läuft lokal im Browser)

---

## 🛠️ Technologie-Stack

| Bereich | Technologie | Lizenz |
|---|---|---|
| Framework | [Next.js 14](https://nextjs.org) | MIT |
| Sprache | TypeScript | Apache 2.0 |
| Styling | [Tailwind CSS](https://tailwindcss.com) | MIT |
| State Management | [Zustand](https://github.com/pmndrs/zustand) | MIT |
| Spracherkennung | Web Speech API (Browser-nativ) | — |
| Hosting | GitHub Pages | Kostenlos |

---

## 🔒 Datenschutz

- **Keine Registrierung** erforderlich
- **Keine Daten** werden an Server gesendet
- **Kein Tracking**, keine Analytics, keine Cookies
- Lernfortschritt wird nur **lokal im Browser** gespeichert (localStorage)
- Spracherkennung läuft **im Browser** — Audio wird nicht aufgezeichnet oder gespeichert

---

## 📋 Lokale Entwicklung

```bash
# Repository klonen
git clone <repo-url>
cd memorize_faster

# Abhängigkeiten installieren
npm ci

# Entwicklungsserver starten
npm run dev

# Produktions-Build
npm run build
```

---

## 📄 Lizenz

Dieses Projekt ist ein privates Lernprojekt. Der Quellcode ist nicht zur Weiterverbreitung bestimmt.

- Koran-Text: Public Domain
- Übersetzungen: Jeweilige Übersetzer-Lizenzen (siehe oben)
- Audio: Quran.com (frei für Koran-Apps)
- Code: Privat, AI-generiert, nicht-kommerziell
