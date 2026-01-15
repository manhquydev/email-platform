# Research Report: Chrome Extension Best Practices (2026)

**Target:** Ephemera Email Platform Extension
**Date:** 2026-01-16
**Status:** Completed

## 1. Manifest V3 Architectural Standards

### Service Workers (Background)
*   **Ephemeral Nature:** Service workers are non-persistent. They terminate after ~30 seconds of inactivity.
*   **Keep-Alive Patterns:** Use `chrome.alarms` for long-running tasks. Avoid `setInterval` as it clears on termination.
*   **State Management:** Never rely on global variables in the background script. Use `chrome.storage.local` or IndexedDB to persist state between restarts.
*   **Async Initialization:** Ensure `chrome.runtime.onInstalled.addListener` is used for one-time setup (e.g., setting default settings).

### Offscreen Documents
*   **Purpose:** Use for DOM parsing (e.g., parsing complex email HTML), clipboard operations, or playing audio—tasks that Service Workers cannot perform.
*   **Best Practice:** Open the document only when needed and close it immediately after the task is finished to save memory.

## 2. Performance Optimization for Email Tools

### Memory Management
*   **Context Script Isolation:** Content scripts for email (like Gmail injectors) should be lightweight. Injecting large React apps into the Gmail DOM can cause significant lag.
*   **Lazy Injection:** Use `chrome.scripting.executeScript` to inject logic only when the user interacts with an email field, rather than running on every page load.

### Build Optimization
*   **Vite + CRXJS:** The current project uses Vite. Ensure "Code Splitting" is active to keep the initial load of the popup/side-panel under 100ms.
*   **HMR:** Use CRXJS for Hot Module Replacement to speed up development.

## 3. Security & Privacy Standards

### Content Security Policy (CSP)
*   **Strict Mode:** Manifest V3 prohibits `unsafe-eval`. All logic must be pre-compiled.
*   **External Assets:** Prohibited. All scripts, styles, and fonts must be bundled within the extension package.
*   **Remote Code:** Fetching and executing remote JS is a violation. Use `fetch()` for data only.

### Handling Sensitive Data (Email)
*   **Privacy Policy:** Email extensions are classified as "Personal Communications" tools. A detailed privacy policy is mandatory for Chrome Web Store approval.
*   **Data Minimization:** Only request the `identity` or `email` permissions if absolutely necessary. Prefer `storage` and `unlimitedStorage` for local caching.
*   **Sanitization:** Use libraries like `DOMPurify` (in an offscreen document or content script) before rendering any HTML from emails to prevent XSS.

## 4. User Experience: The Side Panel API

*   **Persistent Interaction:** In 2026, the **Side Panel API** (`chrome.sidePanel`) is preferred over Popups for email tools. It allows users to browse emails while keeping the extension interface visible.
*   **Contextual Sidebars:** Use `chrome.sidePanel.setOptions` to show different panels based on the current URL (e.g., a specific panel for `mail.google.com`).
*   **UI Consistency:** Match the hosting site's design (e.g., Gmail's Material Design 3) to reduce cognitive load.

## 5. Communication Patterns

*   **Message Passing:** Use `chrome.runtime.sendMessage` with `async/await` patterns.
*   **Ports:** For high-frequency communication between a content script and the background (e.g., real-time email field tracking), use `chrome.runtime.connect` for a persistent connection.
*   **Zustand Sync:** In a multi-context extension (Popup, Side Panel, Background), use a storage-synced Zustand middleware to keep state consistent across all contexts.

## Summary for Ephemera
1.  **Migrate/Add Side Panel:** Consider adding a side panel for a better "inbox management" experience.
2.  **Audit Background Script:** Ensure `background/push-handler.ts` handles service worker restarts correctly by persisting registration state.
3.  **Refine Injector:** The `ui-injector.ts` should use `MutationObserver` efficiently to avoid performance hits on large inboxes.
4.  **Security:** Ensure all API calls to `api.manhquy.click` use HTTPS and valid JWT rotation.

## Unresolved Questions
*   Does the extension need to support cross-browser (Firefox/Safari) compatibility, or is it Chrome-only?
*   Should the extension handle attachments directly in the browser (requiring Offscreen Documents) or via the API?
