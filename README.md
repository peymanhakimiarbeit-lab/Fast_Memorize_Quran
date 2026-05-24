# Quran Memorization Web App

Eine Next.js 14 Web-App zum Auswendiglernen des Korans — vollständig statisch, läuft auf GitHub Pages ohne eigenes Backend.

## Features

- **Lese-Modus**: Alle Verse sichtbar, Echtzeit-Rezitationsfeedback (grün/rot) per Spracherkennung
- **Hifz-Modus**: Verse ausgeblendet, progressives Aufdecken Wort für Wort beim korrekten Rezitieren
- **Spracherkennung**: Web Speech API (primär) + Whisper.cpp/WASM (Fallback)
- **Koran-Daten**: Quran.com API v4 (kein API-Key erforderlich)
- **Fortschritt**: Persistenz via localStorage, kein Backend nötig
- **Offline-fähig**: SWR-Cache für 24-Stunden-Revalidierung

---

## Lokale Entwicklung

### Voraussetzungen

- Node.js 20+
- npm 10+

### Setup

```bash
# Repository klonen
git clone https://github.com/<dein-username>/memorize_faster.git
cd memorize_faster/web

# Abhängigkeiten installieren
npm ci

# Entwicklungsserver starten
npm run dev
```

Die App ist dann unter [http://localhost:3000](http://localhost:3000) erreichbar.

### Verfügbare Skripte

```bash
# Entwicklungsserver
npm run dev

# Produktions-Build (Static Export nach ./out)
npm run build

# Tests einmalig ausführen
npm run test:run

# Tests im Watch-Modus
npm run test

# Linting
npm run lint
```

---

## GitHub Pages Deployment

### 1. GitHub Pages aktivieren

1. Gehe zu deinem Repository auf GitHub
2. Öffne **Settings** → **Pages**
3. Unter **Source**: wähle **GitHub Actions**
4. Speichern — GitHub Pages ist jetzt für Deployments via Actions konfiguriert

### 2. Repository-Berechtigungen prüfen

Stelle sicher, dass GitHub Actions Schreibzugriff auf Pages hat:

1. **Settings** → **Actions** → **General**
2. Unter **Workflow permissions**: wähle **Read and write permissions**
3. Speichern

### 3. Automatisches Deployment

Nach der Aktivierung wird die App bei jedem Push auf den `main`-Branch automatisch deployed:

```
Push to main
    │
    ▼
Job: test
    ├── npm ci
    └── npm run test:run
    │
    ▼ (nur wenn Tests bestehen)
Job: build-and-deploy
    ├── npm ci
    ├── npm run build  →  ./out/
    ├── Upload Pages artifact
    └── Deploy to GitHub Pages
```

Der Deployment-Status ist unter **Actions** im Repository einsehbar.

### 4. Deployment-URL

Nach dem ersten erfolgreichen Deployment ist die App unter folgender URL erreichbar:

```
https://<dein-username>.github.io/<repository-name>/
```

---

## Projektstruktur

```
memorize_faster/
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD Workflow für GitHub Pages
├── web/                        # Next.js App
│   ├── src/
│   │   ├── app/                # Next.js App Router
│   │   ├── components/         # React-Komponenten
│   │   │   ├── shared/         # Gemeinsame Komponenten
│   │   │   ├── reading/        # Lese-Modus Komponenten
│   │   │   └── hifz/           # Hifz-Modus Komponenten
│   │   ├── domain/             # Business-Logik (pure TypeScript)
│   │   ├── repositories/       # Datenzugriff (API + localStorage)
│   │   ├── stores/             # Zustand Stores
│   │   ├── asr/                # Spracherkennungs-Provider
│   │   └── types/              # TypeScript-Interfaces
│   ├── next.config.js          # Next.js Konfiguration (Static Export)
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

---

## Technologie-Stack

| Bereich | Technologie |
|---|---|
| Framework | Next.js 14 (App Router, Static Export) |
| Sprache | TypeScript (strict mode) |
| Styling | Tailwind CSS (RTL-Support) |
| State Management | Zustand |
| Spracherkennung | Web Speech API + Whisper.cpp/WASM |
| Koran-Daten | Quran.com API v4 |
| Testing | Vitest + fast-check (Property-Based Tests) |
| Deployment | GitHub Pages via GitHub Actions |

---

## Anforderungen (Requirements)

- **Req. 10.1**: Static Export (`output: 'export'`) — kein Server-Side Rendering zur Laufzeit
- **Req. 10.2**: Alle Koran-Daten werden ausschließlich clientseitig von der Quran.com API v4 abgerufen
- **Req. 10.4**: Vollständig funktionsfähig ohne eigenes Backend

Vollständige Anforderungen: [`.kiro/specs/quran-memorization-web/requirements.md`](.kiro/specs/quran-memorization-web/requirements.md)
