# Chrome Web Store Permission Justifications

## Required Permissions

### 1. `storage`
**Justification:** Store user preferences (theme, auto-copy setting, notification preferences) and cache inbox data locally for faster load times. No sensitive data stored; only settings and temporary email metadata.

**User Benefit:** Faster extension startup, persistent preferences across sessions.

---

### 2. `alarms`
**Justification:** Schedule periodic checks for inbox expiration and new message notifications. Alarms trigger background sync every 5 minutes when extension is active.

**User Benefit:** Timely notifications for new emails, automatic cleanup of expired temporary inboxes.

---

### 3. `clipboardWrite`
**Justification:** Allow one-click copying of temporary email addresses to clipboard. Only writes to clipboard when user explicitly clicks "Copy" button.

**User Benefit:** Quick copy of email addresses without manual selection.

---

### 4. `activeTab`
**Justification:** Detect email input fields on the current webpage when user activates the extension. Only accesses the active tab, not browsing history or other tabs.

**User Benefit:** Auto-detect email signup forms and offer to fill with temporary address.

---

### 5. `notifications`
**Justification:** Display desktop notifications when new emails arrive in user's temporary inboxes. Fully optional and can be disabled in settings.

**User Benefit:** Real-time alerts for important verification emails without keeping extension open.

---

### 6. `sidePanel`
**Justification:** Display extension interface in Chrome's side panel for persistent access while browsing. Alternative to popup for users who prefer side-by-side view.

**User Benefit:** Manage emails while viewing other content without popup closing.

---

### 7. `contextMenus`
**Justification:** Add right-click menu options to quickly create new temporary email or paste existing address into text fields.

**User Benefit:** Faster workflow without opening popup; context-aware actions.

---

### 8. `scripting`
**Justification:** Inject temporary email addresses into form fields when user requests auto-fill. Only executes on explicit user action (click "Fill" button).

**User Benefit:** One-click form filling with temporary email addresses.

---

## Host Permissions

### `https://api.manhquy.click/*`
**Justification:** Connect to Ephemera backend API for:
- User authentication
- Creating/managing temporary inboxes
- Fetching email messages
- Push notification registration

**User Benefit:** Core functionality requires API communication. No other domains accessed.

---

## Permissions NOT Requested

We intentionally avoid requesting:
- `tabs` - No need to access all tabs
- `history` - No browsing history access
- `bookmarks` - No bookmark access
- `downloads` - No file download access
- `webRequest` - No network request interception
- `<all_urls>` - No broad host access

---

## Privacy Commitment

- All permissions used for stated purposes only
- No data collection beyond core functionality
- No third-party analytics or advertising
- User data never sold or shared
