# Burn Book - Chrome Extension

A dual-purpose tracking system to track offenses/grievances and nurture good relationships.

## Features

### Phase 1 (Current - Local MVP)
- ✅ Master password protection with encryption
- ✅ Local storage using IndexedDB
- ✅ Popup interface with quick access
- ✅ Full-page interface with dashboard
- 🚧 Offense tracking (severity ratings, categories, evidence)
- 🚧 Relationship management (strength meter, positive moments)
- 🚧 Important dates and reminders

### Future Phases
- Phase 2: Firebase cloud sync
- Phase 3: Notifications and calendar
- Phase 4: Web application
- Phase 5: Privacy-controlled sharing

## Development Setup

### Prerequisites
- Node.js 16+ and npm
- Chrome browser

### Installation

1. Install dependencies:
```bash
npm install
```

2. Build the extension:
```bash
npm run build
```

3. Add icon files to `public/icons/` (see `public/icons/README.md`)

### Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `chrome-extension/dist` folder
5. The extension icon should appear in your toolbar

### Development

Watch mode for development:
```bash
npm run dev
```

This will rebuild the extension whenever you make changes.

## Usage

### First Time Setup

1. Click the extension icon in your toolbar
2. Set up a master password (minimum 8 characters with uppercase, lowercase, and numbers)
3. Your password will be used to encrypt all local data

### Using the Extension

**Popup (Quick Access):**
- Click the extension icon
- Enter password to unlock
- View quick stats
- Open full view for detailed interface

**Full View:**
- Click "Open Full View" from popup, or
- Right-click extension icon > Options
- Access dashboard, offenses, relationships, calendar, and settings

## Architecture

### Tech Stack
- React 18 + TypeScript
- Webpack 5
- Tailwind CSS
- IndexedDB (Dexie.js)
- Chrome Extension Manifest V3

### Project Structure
```
chrome-extension/
├── src/
│   ├── popup/          # Extension popup (300x600px)
│   ├── fullpage/       # Full-page view
│   ├── background/     # Service worker
│   └── shared/         # Shared code
│       ├── types/      # TypeScript interfaces
│       ├── models/     # Data models
│       ├── storage/    # IndexedDB wrapper
│       ├── utils/      # Utilities (encryption, validation)
│       └── constants/  # Constants
├── public/
│   └── icons/          # Extension icons
├── dist/               # Built extension (gitignored)
└── manifest.json       # Extension manifest
```

## Security

- All data encrypted with AES using PBKDF2-derived key
- Password hashed with PBKDF2 (100,000 iterations)
- Local-only storage (no cloud sync in Phase 1)
- Extension locks when browser restarts

## Roadmap

See `C:\Users\swann\.claude\plans\sassy-twirling-muffin.md` for detailed implementation plan.

## License

Private project - All rights reserved
