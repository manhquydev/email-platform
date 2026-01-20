# Chrome Extension Development Best Practices (2025-2026)

## 1. Manifest V3 Requirements & Migration
Manifest V3 (MV3) is the mandatory standard for all extensions. MV2 is deprecated and no longer accepted.

### Key Architectural Changes
- **Background Service Workers**: Replaces persistent background pages. They are ephemeral and event-driven.
- **No Remote Code**: All logic must be bundled with the extension. No loading scripts from CDNs or executing remote strings via `eval()`.
- **Network Request Blocking**: The blocking `webRequest` API is replaced by the declarative `declarativeNetRequest` API for privacy and performance.
- **Promise-Based APIs**: Most `chrome.*` APIs now support Promises (async/await) alongside callbacks.

### Migration Checklist
- Update `manifest.json` version to `3`.
- Convert background scripts to a Service Worker (remove DOM access dependencies).
- Replace `webRequestBlocking` with `declarativeNetRequest` rulesets.
- Move all external scripts (Google Analytics, libraries) to local bundles.
- Update CSP string to an object format in manifest.

## 2. Service Worker Architecture
Service workers are short-lived. They wake up on events and terminate when idle (typically after 30 seconds to 5 minutes).

### Patterns & Best Practices
- **State Management**: **NEVER** rely on global variables in background scripts. Use `chrome.storage.local` or `chrome.storage.session` to persist state across restarts.
- **Event Listeners**: Register listeners synchronously at the top level of the service worker.
- **Alarms**: Use `chrome.alarms` for periodic tasks instead of `setInterval` (which stops when the worker terminates).
- **DOM Access**: Service workers cannot access the DOM. Use **Offscreen Documents** for DOM-dependent background tasks (e.g., audio playback, HTML parsing).
- **Keep-Alive (Use sparingly)**: If a long-running task is critical, open a message port or use specific APIs that prolong life, but prefer designing for idempotency and resumption.

## 3. Security & CSP Requirements
Security is strictly enforced to prevent XSS and data exfiltration.

### Content Security Policy (CSP)
- **Default Policy**: Blocks all remote script/object resources.
- **Stricter Script Sources**: `script-src` only allows `'self'` and `'wasm-unsafe-eval'`. No remote URLs allowed.
- **Eval**: `eval()` and `new Function()` are strictly prohibited in the main extension context.
- **Sandboxing**: Use sandboxed iframes if you strictly need to execute unsafe code (e.g., templates).

### Implementation Tips
- **Least Privilege**: Request minimal permissions. Use `activeTab` where possible instead of broad host permissions.
- **Host Permissions**: Declared separately in manifest. Users can toggle these per-site. Handle cases where permissions are revoked.
- **Input Sanitization**: Always sanitize user input before inserting into the DOM, even in popups.

## 4. Performance Optimization
- **Lazy Loading**: Import resources only when needed using dynamic imports.
- **Efficient Storage**: Use `chrome.storage.local` (faster) over `sync` for large data.
- **Native APIs**: Prefer native APIs (e.g., `chrome.scripting` for injecting CSS/JS) over manual injection.
- **Memory Management**: Dereference objects and remove event listeners in content scripts when no longer needed (though service workers clean themselves up).
- **Chrome Flags**: Leverage native browser features (Smooth Scrolling, GPU Rasterization) rather than implementing JS polyfills.

## 5. Chrome Web Store Submission Checklist (2025)
- **Privacy Policy**: Mandatory field. Must detail what data is collected and how it is used.
- **Single Purpose**: The extension must have one clear, focused purpose. "Swiss Army Knife" extensions are often rejected.
- **Justification**: Detailed justification required for sensitive permissions (e.g., `tabs`, `storage`, `host_permissions`).
- **2-Step Verification**: Required for all developer accounts.
- **Testing**: Test strictly against the Production build (unpacked extensions behave slightly differently).
- **Review Time**: Plan for 24-72 hours typically, but up to 3 weeks for extensive permission requests.

## Unresolved Questions
- Specific limitations on `declarativeNetRequest` dynamic rule counts for the specific target tier (free vs paid users) if implementing ad-blocker features.
- Exact "keep-alive" constraints for WebSocket connections in MV3 Service Workers for 2026 (subject to browser updates).
