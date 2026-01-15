# Phase 1: Project Setup

## Context

- **Parent Plan:** [plan.md](./plan.md)
- **Research:** [Chrome MV3](./research/researcher-01-chrome-mv3.md), [CRXJS](./research/researcher-02-crxjs-vite.md)
- **Codebase:** [code-standards.md](../../docs/code-standards.md)

## Overview

| Field | Value |
|-------|-------|
| Priority | P0 - Critical Path |
| Status | Pending |
| Effort | 3-4 days |
| Dependencies | None |

Initialize Chrome extension project with Vite + CRXJS, configure Manifest V3, set up TailwindCSS, and establish development workflow.

## Key Insights

- CRXJS requires `manifest.json` in `src/` directory (not `public/`)
- Service Workers are ephemeral - no persistent state in memory
- Use `chrome.storage` for all state persistence
- Request minimal permissions - avoid `<all_urls>` for faster review

## Requirements

### Functional
- Extension loads in Chrome without errors
- Popup opens when clicking extension icon
- Hot Module Replacement works during development
- Build produces valid extension package

### Non-Functional
- Manifest V3 compliant
- TypeScript strict mode
- ESLint + Prettier configured
- < 500KB bundle size target

## Architecture

```
services/extension/
├── src/
│   ├── manifest.json          # MV3 manifest
│   ├── background/
│   │   └── index.ts           # Service Worker
│   ├── content/
│   │   └── index.ts           # Content Script (Phase 4)
│   ├── popup/
│   │   ├── index.html         # Popup entry
│   │   ├── main.tsx           # React root
│   │   └── App.tsx            # Main component
│   ├── options/
│   │   └── index.html         # Options page (future)
│   ├── components/            # Shared UI
│   ├── hooks/                 # Custom hooks
│   ├── stores/                # Zustand stores
│   ├── utils/
│   │   ├── api.ts             # API client
│   │   └── storage.ts         # chrome.storage wrapper
│   └── types/
│       └── chrome.d.ts        # Chrome API types
├── public/
│   └── icons/                 # Extension icons
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

## Related Code Files

### Create
- `services/extension/package.json`
- `services/extension/vite.config.ts`
- `services/extension/tsconfig.json`
- `services/extension/tailwind.config.js`
- `services/extension/postcss.config.js`
- `services/extension/src/manifest.json`
- `services/extension/src/popup/index.html`
- `services/extension/src/popup/main.tsx`
- `services/extension/src/popup/App.tsx`
- `services/extension/src/background/index.ts`
- `services/extension/src/utils/storage.ts`
- `services/extension/public/icons/*` (16, 32, 48, 128px)

### Reference
- `services/web/vite.config.ts` - Vite config pattern
- `services/web/tailwind.config.js` - TailwindCSS config
- `services/web/src/utils/api.ts` - API client pattern

## Implementation Steps

### Step 1: Initialize Project (1h)

```bash
cd services
mkdir extension && cd extension
npm init -y
```

### Step 2: Install Dependencies (30m)

```bash
# Core
npm install react react-dom zustand

# Dev dependencies
npm install -D typescript vite @vitejs/plugin-react
npm install -D @crxjs/vite-plugin@latest
npm install -D tailwindcss postcss autoprefixer
npm install -D @types/react @types/react-dom @types/chrome
npm install -D eslint prettier eslint-plugin-react-hooks
```

### Step 3: Configure Vite (30m)

Create `vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './src/manifest.json'

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  server: {
    port: 5174, // Different from web (5173)
    strictPort: true,
    hmr: { port: 5174 }
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: 'src/popup/index.html'
      }
    }
  }
})
```

### Step 4: Create Manifest V3 (30m)

Create `src/manifest.json`:
```json
{
  "manifest_version": 3,
  "name": "Ephemera - Disposable Email",
  "version": "1.0.0",
  "description": "Create disposable email addresses instantly. Protect your privacy.",
  "action": {
    "default_popup": "src/popup/index.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "background": {
    "service_worker": "src/background/index.ts",
    "type": "module"
  },
  "permissions": [
    "storage",
    "alarms",
    "clipboardWrite",
    "notifications"
  ],
  "host_permissions": [
    "https://api.manhquy.click/*"
  ],
  "icons": {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

### Step 5: Setup TailwindCSS (30m)

```bash
npx tailwindcss init -p
```

Update `tailwind.config.js`:
```javascript
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,html}"
  ],
  theme: {
    extend: {
      // Match web app theme
    }
  },
  plugins: []
}
```

### Step 6: Create Popup Entry (1h)

Create `src/popup/index.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ephemera</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./main.tsx"></script>
</body>
</html>
```

Create `src/popup/main.tsx`:
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import '../index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

Create `src/popup/App.tsx`:
```tsx
export default function App() {
  return (
    <div className="w-[360px] min-h-[400px] bg-slate-900 text-white p-4">
      <h1 className="text-xl font-bold">Ephemera</h1>
      <p className="text-slate-400 mt-2">Disposable email, instantly.</p>
    </div>
  )
}
```

### Step 7: Create Service Worker (30m)

Create `src/background/index.ts`:
```typescript
// Service Worker - Event-driven, no persistent state
console.log('Ephemera extension loaded')

// Register event listeners at top level
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details.reason)
})

// Message handler for popup/content script communication
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received:', message)
  // Handle async responses
  return true
})

export {}
```

### Step 8: Create Storage Utility (30m)

Create `src/utils/storage.ts`:
```typescript
type StorageData = {
  token: string | null
  userId: string | null
  inboxes: Array<{ id: string; email: string }>
  settings: {
    autoCopy: boolean
    notifications: boolean
  }
}

const defaults: StorageData = {
  token: null,
  userId: null,
  inboxes: [],
  settings: {
    autoCopy: true,
    notifications: true
  }
}

export async function getStorage<K extends keyof StorageData>(
  key: K
): Promise<StorageData[K]> {
  const result = await chrome.storage.local.get(key)
  return result[key] ?? defaults[key]
}

export async function setStorage<K extends keyof StorageData>(
  key: K,
  value: StorageData[K]
): Promise<void> {
  await chrome.storage.local.set({ [key]: value })
}

export async function clearStorage(): Promise<void> {
  await chrome.storage.local.clear()
}
```

### Step 9: Create Icons (30m)

Generate icons at 16x16, 32x32, 48x48, 128x128 pixels.
Place in `public/icons/`:
- `icon16.png`
- `icon32.png`
- `icon48.png`
- `icon128.png`

### Step 10: Add npm Scripts (15m)

Update `package.json`:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint src --ext .ts,.tsx",
    "preview": "vite preview"
  }
}
```

## Todo List

- [ ] Create `services/extension` directory
- [ ] Initialize npm project
- [ ] Install all dependencies
- [ ] Configure Vite with CRXJS
- [ ] Create Manifest V3 file
- [ ] Setup TailwindCSS
- [ ] Create popup HTML/TSX files
- [ ] Create background service worker
- [ ] Create storage utility
- [ ] Generate extension icons
- [ ] Test extension loads in Chrome
- [ ] Verify HMR works

## Success Criteria

- [ ] `npm run dev` starts without errors
- [ ] Extension loads in `chrome://extensions` (unpacked)
- [ ] Clicking icon shows popup with "Ephemera" title
- [ ] Console shows "Extension loaded" from service worker
- [ ] Changes to popup trigger hot reload
- [ ] `npm run build` produces valid `dist/` folder

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| CRXJS compatibility issues | Low | High | Pin specific version, check GitHub issues |
| HMR not working | Medium | Low | Fall back to manual reload |
| Icon generation | Low | Low | Use placeholder, replace later |

## Security Considerations

- No sensitive data in manifest
- Host permissions limited to API domain only
- No eval() or remote code execution
- CSP configured in manifest

## Next Steps

After completion:
1. Proceed to [Phase 2: Authentication](./phase-02-authentication.md)
2. Verify extension works with real API calls
