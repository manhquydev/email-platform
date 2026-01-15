# Chrome Manifest V3 Development Best Practices (2025)

## 1. Manifest V3 Structure
The `manifest.json` is the entry point. Key changes in MV3 include strict permissioning and the move to Service Workers.

### Recommended Schema
```json
{
  "manifest_version": 3,
  "name": "Extension Name",
  "version": "1.0.0",
  "description": "Concise description (used for store search)",
  "action": {
    "default_popup": "popup.html",
    "default_icon": "icons/icon128.png"
  },
  "background": {
    "service_worker": "background.js",
    "type": "module" // Allows ES modules
  },
  "permissions": ["storage", "activeTab"],
  "host_permissions": ["https://api.example.com/*"],
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  },
  "web_accessible_resources": [{
    "resources": ["assets/*"],
    "matches": ["<all_urls>"]
  }]
}
```

## 2. Service Workers (The "Background" Replacement)
**Crucial Concept**: Service Workers are ephemeral. They start up on events and terminate when idle. **Do not rely on global variables for state.**

### Best Practices
- **State Management**: Persist state immediately to `chrome.storage`.
- **Event Listeners**: Register listeners synchronously at the top level.
- **Timers**: Use `chrome.alarms` instead of `setInterval` or `setTimeout` (which stop when the worker sleeps).

```javascript
// background.js
// BAD: State is lost when worker sleeps
let requestCount = 0;

// GOOD: State persistence
chrome.storage.local.get(['count'], (result) => {
    // initialize
});

// Use alarms for periodic tasks
chrome.alarms.create('refreshData', { periodInMinutes: 5 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'refreshData') syncData();
});
```

## 3. Content Scripts & Messaging
Content scripts live in the "isolated world" of the web page. They cannot access window variables of the page directly but can manipulate the DOM.

### Messaging Pattern (Service Worker <-> Content Script)
Handle the "receiver" end carefully, as the connection may close if the service worker dies.

```javascript
// content.js (Sender)
const sendMsg = async (data) => {
  try {
    const res = await chrome.runtime.sendMessage(data);
    return res;
  } catch (e) {
    // Handle "Extension context invalidated" errors gracefully
    console.warn("Context invalidated, usually due to update/reload");
  }
};

// background.js (Receiver)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'FETCH_USER') {
    // Must return true to indicate async response
    fetchUser().then(sendResponse);
    return true;
  }
});
```

## 4. Chrome Storage API
Use `chrome.storage.local` over `localStorage`. It allows storing objects (not just strings) and is accessible from service workers.

### Optimization
- **Flatten Data**: Avoid deep nesting to prevent race conditions during updates.
- **Storage Limits**: Be aware of quota limits (10MB default for local).
- **Session Storage**: Use `chrome.storage.session` (in memory, clears on browser close) for sensitive data like encryption keys.

## 5. Web Store Submission (2025 Requirements)
- **Privacy Policy**: Mandatory. Must explicitly state what data is collected.
- **Justification**: "Host Permissions" and "Remote Code" are heavily scrutinized.
  - *Pitfall*: Requesting `<all_urls>` guarantees a manual review (slow). Use specific domains.
- **Remote Code**: Strictly forbidden. No `eval()`, no loading remote scripts via `<script src="...">`. All logic must be bundled.
- **Two-Step Verification**: Required for publisher accounts.

## Unresolved Questions
- Specific API limits for the target user base size?
- Are there specific third-party auth providers needed (Firebase/Auth0)?

## Sources
- [Chrome Extension Development Documentation](https://developer.chrome.com/docs/extensions/mv3/)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/mv3-migration/)
- [Chrome Web Store Policies](https://developer.chrome.com/docs/webstore/program_policies/)
