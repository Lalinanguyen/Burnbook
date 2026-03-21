# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Burn Book is a Chrome Extension (Manifest V3) for tracking relationship "offenses" and nurturing relationships. It's a personal accountability/relationship ledger with password protection, local-first storage, and encrypted data. The project is in early development — many views (offenses, relationships, calendar, settings) are stubbed out.

## Build & Dev Commands

All commands run from `chrome-extension/`:

```bash
npm install              # Install dependencies
npm run dev              # Webpack dev build with watch mode
npm run build            # Webpack production build (outputs to dist/)
npm run type-check       # TypeScript type checking (tsc --noEmit)
```

To test: load `chrome-extension/dist/` as an unpacked extension in `chrome://extensions/` (enable Developer Mode).

No test runner is configured yet.

## Architecture

### Entry Points (3 webpack entries)

- **popup** (`src/popup/`) — Small popup when clicking the extension icon. Handles initial password setup and unlock. After unlock, shows quick stats and an "Open Full View" button.
- **fullpage** (`src/fullpage/`) — Full-page app opened in a new tab. Has sidebar navigation with views: dashboard, offenses, relationships, calendar, settings. Most views are placeholder stubs.
- **background** (`src/background/index.ts`) — Service worker handling alarms (periodic sync, reminders), message passing (LOCK/UNLOCK/SYNC_NOW/SCHEDULE_REMINDER), and notification clicks. Mostly TODO stubs.

### Shared Layer (`src/shared/`)

- **types/** — TypeScript interfaces for `Offense`, `Relationship`, `UserSettings` and their create/update variants.
- **models/** — `OffenseModel` and `RelationshipModel` classes that wrap types with business logic (severity lookup, strength score calculation, reminder scheduling). `RelationshipModel.calculateStrengthScore()` uses a points system based on contact recency, positive moments, frequency adherence, and offense count.
- **storage/LocalDB.ts** — Dexie (IndexedDB) wrapper. Singleton `db` instance with tables: `offenses`, `relationships`, `settings`. `LocalStorage` class provides CRUD + query methods. All updates set `localModified: true` for future sync support.
- **utils/encryption.ts** — `PasswordManager` (PBKDF2 hashing, AES encrypt/decrypt via crypto-js) and `SecureStorage` (encrypts data in chrome.storage.local, locks by clearing the in-memory key).
- **constants/** — `APP_CONFIG` (DB name, strength score weights, PBKDF2 iterations), `SEVERITY_LEVELS`, `CATEGORIES`, `STORAGE_KEYS`.

### Key Patterns

- Popup handles first-time setup (password creation); fullpage defers to popup for setup
- Both popup and fullpage independently check lock state and require password entry
- Communication between UI and background via `chrome.runtime.sendMessage` with message type switching
- Path alias: `@/` maps to `src/` (configured in both tsconfig and webpack)

## Stack

- React 18, TypeScript, Tailwind CSS
- Dexie (IndexedDB), crypto-js (AES/PBKDF2), zod (validation), lucide-react (icons)
- Webpack 5 with ts-loader, postcss-loader

## Coding Style

Use comments sparingly. Only comment complex code.
