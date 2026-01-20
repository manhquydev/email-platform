# Research: WXT Framework Advanced Features & Patterns

**Date:** 2026-01-20
**Status:** Completed
**Focus:** Advanced WXT usage, React integration, Testing, Optimization

## 1. Latest WXT Features (2025)

WXT (Next-gen Web Extension Framework) has solidified its position as the leading tool for modern extension development, specifically designed for Manifest V3 (MV3).

- **Unified Developer Experience**: Built on **Vite**, offering instant HMR and optimized Rollup builds.
- **Manifest V3 Native**: Abstracts away the complexity of MV3 while maintaining MV2 compatibility for Firefox/Safari.
- **File-System Routing**: `entrypoints/` directory structure automatically generates the `manifest.json`.
- **Auto-Imports**: Nuxt-style auto-imports for `browser` API and common utilities.
- **TypeScript First**: Strict type safety out of the box.
- **Hook System**: Lifecycle hooks for build process customization.

## 2. React Integration Patterns

### Setup
- **Module**: Use `@wxt-dev/module-react` for zero-config integration.
- **Alternative**: Manual setup with `@vitejs/plugin-react` in `wxt.config.ts`.

### Architecture Best Practices
- **Multi-Entrypoint Structure**:
  ```text
  entrypoints/
  ├── popup/
  │   ├── index.html
  │   └── main.tsx      # React root
  ├── options/
  │   ├── index.html
  │   └── main.tsx
  └── content.tsx       # Content script (can render React components into shadow DOM)
  ```
- **Routing**: Use **Hash Router** (`<HashRouter>`) for SPAs within extension pages (popup/options) because standard path routing fails in `chrome-extension://` protocol.
- **Shadow DOM**: For content scripts injecting UI, use Shadow DOM to isolate styles from the host page. WXT provides helpers to mount React roots inside Shadow Roots.

## 3. Testing Strategies

### Unit Testing (Vitest)
- **Tool**: Vitest is the native runner.
- **Mocking**: Use `@webext-core/fake-browser` to mock the `browser` (or `chrome`) global namespace.
- **Configuration**: Use `wxt-vitest` plugin to load WXT config (aliases, auto-imports) into the test environment.

### E2E Testing (Playwright)
- **Strategy**: Launch browser with the extension loaded.
- **Setup**:
  ```typescript
  // Load extension in Playwright
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${pathToExtension}`,
      `--load-extension=${pathToExtension}`,
    ],
  });
  ```
- **Target**: Build the extension first (`wxt build`), then point Playwright to the `.output` directory.

## 4. Build Optimization

### Code Splitting
- **Vite/Rollup**: WXT inherits Vite's robust code splitting.
- **Shared Chunks**: Common logic (utils, API clients) used across popup, background, and content scripts is automatically split into shared chunks to reduce bundle size and memory usage.

### Optimization Techniques
- **Dynamic Imports**: Use `import()` for heavy components or rare interactions to lazy-load chunks.
- **Tree Shaking**: Ensure dependencies are ESM-friendly to allow unused code removal.
- **Asset Handling**: WXT optimizes images and static assets automatically.

## 5. Cross-Browser Compatibility

### Unified API
- **`browser` Namespace**: WXT provides a polyfilled `browser` global that works everywhere (wrapping `chrome` API where necessary).
- **Promises**: Promisified APIs standard across all browsers (solving the callback vs. promise discrepancy).

### Build Targets
- **CLI Flags**: Build for specific browsers:
  ```bash
  wxt build -b chrome
  wxt build -b firefox
  ```
- **Runtime Detection**: Use `import.meta.env.BROWSER` to conditionalize logic (e.g., `if (import.meta.env.BROWSER === 'firefox') { ... }`).
- **Manifest Generation**: WXT automatically adjusts `manifest.json` keys for differences between Chromium (MV3) and Firefox (MV2/MV3) requirements.

## Unresolved Questions
- Specific configuration for `wxt-vitest` with complex React Context mocking?
- Performance benchmarks of WXT React Content Scripts vs Vanilla JS on heavy pages?
