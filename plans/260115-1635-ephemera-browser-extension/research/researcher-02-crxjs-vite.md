# Research: CRXJS + Vite for Chrome Extensions (MV3)

## 1. Executive Summary
CRXJS is the de facto standard for modern Chrome Extension development using Vite. It provides a zero-config setup with Hot Module Replacement (HMR) for popups, options pages, and content scripts, solving the historical pain points of extension DX.

## 2. Setup & Configuration

### Initialization
```bash
npm create vite@latest my-extension -- --template react-ts
cd my-extension
npm install @crxjs/vite-plugin@latest -D
```

### Manifest V3 (`src/manifest.json`)
Create this in `src/` (not public) so CRXJS can process it.
```json
{
  "manifest_version": 3,
  "name": "My Extension",
  "version": "1.0.0",
  "action": { "default_popup": "index.html" },
  "background": { "service_worker": "src/background/index.ts", "type": "module" },
  "content_scripts": [
    { "matches": ["<all_urls>"], "js": ["src/content/index.ts"] }
  ]
}
```

### Vite Config (`vite.config.ts`)
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './src/manifest.json'

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  server: { port: 5173, strictPort: true, hmr: { port: 5173 } },
})
```

## 3. TailwindCSS Integration

1. **Install**: `npm install -D tailwindcss postcss autoprefixer && npx tailwindcss init -p`
2. **Config** (`tailwind.config.js`):
   ```javascript
   export default {
     content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
     theme: { extend: {} },
     plugins: [],
   }
   ```
3. **Import**: Add `@tailwind` directives to `src/index.css`.
4. **Usage**: Import CSS in popup/content scripts. CRXJS handles injection for content scripts automatically if imported in the entry file.

## 4. Project Structure (Recommended)
```text
├── src/
│   ├── background/
│   │   └── index.ts      # Service Worker (No DOM access)
│   ├── content/
│   │   └── index.ts      # Content Script (DOM access)
│   ├── popup/
│   │   ├── index.html    # Entry point
│   │   ├── main.tsx      # React root
│   │   └── App.tsx
│   ├── components/       # Shared React components
│   └── manifest.json     # Source manifest
├── public/               # Static assets (icons)
└── vite.config.ts
```

## 5. Development & Build

- **Dev**: `npm run dev`. CRXJS starts a dev server. Load `dist` (unpacked) in Chrome. HMR works instantly.
- **Build**: `npm run build`. Outputs optimized assets to `dist`.
- **HMR**:
  - **Popup/Options**: Full React Fast Refresh.
  - **Content Scripts**: Auto-reloads extension and refreshes page.
  - **Background**: Auto-reloads extension.

## 6. Common Pitfalls & Solutions

| Issue | Solution |
|-------|----------|
| **HMR Fails** | Ensure `server.hmr.clientPort` is set if using Docker/Remote. Ensure `manifest.json` is in `src`. |
| **Assets 404** | Use `chrome.runtime.getURL` for static assets in content scripts. |
| **CSS Conflicts** | Use Shadow DOM for content scripts to isolate styles from host page. |
| **Build Errors** | Avoid dynamic imports in background scripts unless targeting ES modules output. |

## 7. Unresolved Questions
- Is Shadow DOM isolation strictly required for this project's UI injection needs?
- Do we need multiple content scripts for different host matches?
