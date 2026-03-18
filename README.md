# RecipeClip Chrome Extension

Save recipes from any website to your [RecipeClip](https://recipeclip.app) library in one click — including sites like AllRecipes that block server-side fetches.

## Features

- 📎 **One-click save** — detect and save recipes directly from any recipe page
- 🔍 **JSON-LD extraction** — works on AllRecipes, BBC Good Food, Sally's Baking Addiction, and thousands more
- ✏️ **Edit before saving** — review and edit all fields in the side panel
- 🔖 **Context menu** — right-click any page to save
- 🔔 **Smart badge** — turns green when a recipe is detected
- 🔐 **Secure auth** — sign in once via recipeclip.app, tokens stored in Chrome sync storage

## Install (Load Unpacked)

1. Clone this repo and build it (see Development below)
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked**
5. Select the `dist/` folder

## Development

### Prerequisites

- Node.js 18+
- npm 9+

### Setup

```bash
git clone https://github.com/AvaPhylix/recipeclip-extension.git
cd recipeclip-extension
npm install
```

### Watch mode (dev)

```bash
npm run dev
```

This runs `vite build --watch` — the `dist/` folder updates on every file save.

Load `dist/` as an unpacked extension in Chrome. After changes, click the refresh icon on `chrome://extensions`.

### Build (production)

```bash
npm run build
```

Output is in `dist/`. This folder is what you submit to the Chrome Web Store.

### Run tests

```bash
npm test
```

Tests use [Vitest](https://vitest.dev/) with jsdom. They cover:
- `json-ld.ts` — JSON-LD extraction from all major recipe site formats
- `api.ts` — RecipeClip API client (mocked fetch)

## Project Structure

```
src/
├── shared/
│   ├── types.ts           # Shared TypeScript types
│   ├── json-ld.ts         # JSON-LD recipe extractor (standalone)
│   ├── api.ts             # RecipeClip API client
│   └── auth.ts            # Chrome storage auth management
├── background/
│   └── service-worker.ts  # Context menu, badge, auth handler
├── content/
│   └── content-script.ts  # Runs on every page, detects recipes
├── popup/
│   ├── index.html
│   ├── main.tsx
│   └── Popup.tsx          # Recipe preview + save UI (360px)
└── sidepanel/
    ├── index.html
    ├── main.tsx
    └── SidePanel.tsx      # Full recipe editor
```

## How It Works

1. The **content script** runs on every page and scans for `application/ld+json` script tags
2. If a Recipe schema is found, it sends a `RECIPE_DETECTED` message to the background service worker
3. The **service worker** updates the extension badge to show a recipe was found
4. Clicking the extension icon opens the **popup**, which shows the recipe preview
5. Clicking "Save" sends the recipe to `https://recipeclip.app/api/recipes` with the user's auth token
6. "Edit before saving" opens the **side panel** where all fields are editable

## Authentication

The extension authenticates via the RecipeClip web app:

1. Click "Sign in to RecipeClip" in the popup
2. Sign in at `https://recipeclip.app/auth?extension=1&extensionId=<your-id>`
3. The web app sends an `AUTH_TOKEN` message to the extension
4. The token is stored securely in `chrome.storage.sync`

## Publishing to Chrome Web Store

1. Run `npm run build`
2. Zip the `dist/` folder: `cd dist && zip -r ../recipeclip-extension.zip .`
3. Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/developer/dashboard)
4. Click **Add new item** and upload the zip
5. Fill in the store listing (description, screenshots, category: Productivity)
6. Submit for review

### Required assets for store listing

- 1280×800 or 640×400 screenshot(s)
- 128×128 icon (already in `icons/icon-128.png`)
- Promotional tile (optional): 440×280

## Tech Stack

- **Manifest V3**
- **React 18** + **TypeScript**
- **Vite 6** (multi-entry build)
- **Tailwind CSS v3**
- **Vitest** for tests

## License

MIT
