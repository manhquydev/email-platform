---
title: "Browser Extension Refinement and Growth Plan"
description: "Strategic roadmap for upgrading the Ephemera extension with Side Panel support, multi-browser compatibility, and enhanced UI injection."
status: in-progress
priority: P2
effort: 80h
branch: main
tags: [extension, chrome-extension, wxt, side-panel, react]
created: 2026-01-16
---

# Browser Extension Refinement and Growth Plan

This plan outlines the evolution of the Ephemera browser extension from a Chrome-centric popup tool to a persistent, multi-browser productivity suite.

## 1. Implementation Approaches

### Approach A: Incremental Refinement (Current CRXJS Stack)
Continue using the existing `@crxjs/vite-plugin` setup, manually adding features and polyfills.

**Pros:**
- No migration downtime or risk of breaking existing build pipelines.
- Developers maintain full control over the Vite configuration.
- Lower initial cognitive load for the team.

**Cons:**
- Manual implementation of cross-browser support (Firefox/Safari).
- Boilerplate-heavy for new entry points like Side Panel or Offscreen Documents.
- Harder to maintain as the number of background events and content scripts grows.

### Approach B: Migration to WXT Framework (Recommended)
Migrate the extension to **WXT (Web Extension Toolbox)**, the 2026 industry standard for Vite-based extensions.

**Pros:**
- **Native Multi-browser Support:** Built-in targets for Chrome, Firefox, Safari, Edge with a single codebase.
- **Auto-imports & Type Safety:** Reduces boilerplate and improves developer experience.
- **Side Panel Abstraction:** Streamlined handling of the `sidePanel` API.
- **Simplified Manifest:** Automatically generates `manifest.json` based on file structure and configuration.

**Cons:**
- Upfront migration effort (moving files, updating entry point logic).
- Slight learning curve for the WXT-specific file-based routing.

---

## 2. Recommended Approach: Approach B (Migration to WXT)
We recommend migrating to **WXT** to future-proof the extension for 2026 standards. The current CRXJS setup is functional but will become a bottleneck for Safari/iOS support and complex multi-context state management.

---

## 3. Phased Implementation Roadmap

### Phase 1: Stabilization & Foundation (Weeks 1-3) - [DONE 2026-01-16]
**Goal:** Migrate to WXT and implement the Side Panel API for persistent inbox management.

1.  **Framework Migration:** Initialize WXT and move `services/extension/src` logic into WXT’s entry-point structure (`entries/`, `components/`, etc.). - [DONE]
2.  **Side Panel API Integration:** - [DONE]
    - Enable `side_panel` permission in `wxt.config.ts`. - [DONE]
    - Implement `sidepanel.html` (React-based) as the primary interface for inbox management. - [DONE]
    - Add a toggle in the Popup to "Open in Side Panel." - [DONE]
3.  **CSP & Security Audit:** - [DONE]
    - Remove any potential `unsafe-eval` or inline script usage. - [DONE]
    - Configure strict CSP in WXT to allow only `api.manhquy.click`. - [DONE]
    - Ensure all API communication uses the hardened `ApiClient`. - [DONE]
4.  **Service Worker Reliability:** - [DONE]
    - Refine `background/push-handler.ts` to ensure VAPID registrations persist across service worker restarts. - [DONE]

### Phase 2: Feature Growth (Weeks 4-6)
**Goal:** Enhance the UI-injector and add contextual intelligence.

1.  **UI-Injector Optimization:**
    - Refactor `src/content/ui-injector.ts` to use a high-performance `MutationObserver` to handle dynamic forms (e.g., SPAs like Gmail/Outlook).
    - Improve `field-detector.ts` with fuzzy matching and ARIA label detection.
2.  **Contextual Actions:**
    - Implement "Quick Actions" in the Side Panel (e.g., "Generate Inbox for this Site," "Copy latest code from this tab").
    - Add "Right-click to Fill" context menu items.
3.  **UI/UX Refinement:**
    - Update styling to match 2026 "Glassmorphism" or "Material 3" trends.
    - Implement a "Dark Mode" that syncs with system settings.

### Phase 3: Multi-browser & Scaling (Weeks 7-10)
**Goal:** Expand to Firefox/Safari and optimize performance.

1.  **Multi-browser Deployment:**
    - Set up CI/CD pipelines for `.zip` (Chrome), `.xpi` (Firefox), and Xcode project generation (Safari).
    - Integrate `webextension-polyfill` for unified `browser.*` namespace usage.
2.  **Safari/iOS Support:**
    - Configure the WXT Safari target.
    - Create the necessary Swift wrapper for iOS Safari distribution.
3.  **Performance & Analytics:**
    - Implement lightweight, privacy-focused usage analytics.
    - Optimize bundle size using Vite's code-splitting for Side Panel vs. Content Scripts.

---

## 4. Key Technical Focus Areas

### Side Panel API Integration
The Side Panel will replace the Popup as the "Pro" way to use Ephemera.
```typescript
// Example configuration in wxt.config.ts
export default defineConfig({
  manifest: {
    permissions: ['sidePanel', 'storage'],
    side_panel: {
      default_path: 'sidepanel.html',
    },
  },
});
```

### Enhanced UI-Injector
The injector will use a Shadow DOM to prevent host site CSS from leaking into the Ephemera icon.
- **Old way:** Immediate DOM injection.
- **New way:** `MutationObserver` watches for new inputs + `RequestIdleCallback` for non-blocking injection.

### Security & CSP Compliance
- **Strict Fetch:** Only allow `https://api.manhquy.click`.
- **No Eval:** WXT/Vite will be configured to fail builds if `eval()` is detected.
- **Sanitization:** Use `DOMPurify` for rendering email content in the Side Panel.

---

## 5. Unresolved Questions
1. Should we support older Chrome versions, or strictly MV3 (Chrome 120+)?
2. Does the backend support the increased polling frequency if users keep the Side Panel open for hours?
3. Is a paid subscription tier planned, and should the extension handle license verification?
