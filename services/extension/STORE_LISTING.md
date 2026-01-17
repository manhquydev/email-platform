# Chrome Web Store Listing

## Extension Details

**Name:** Ephemera - Temporary Email

**Short Description (132 chars max):**
Create disposable email addresses instantly. Protect your privacy and avoid spam with temporary inboxes.

**Category:** Productivity

**Language:** English (US)

---

## Full Description

Ephemera - Temporary Email

Create disposable email addresses instantly. Protect your privacy and avoid spam with temporary inboxes that work everywhere.

### KEY FEATURES

- Instant Email Creation - Generate temporary emails with one click
- Autofill Integration - Automatically detect and fill email fields on any website
- Multiple Inboxes - Manage several temporary addresses at once
- Real-time Notifications - Get notified when new emails arrive
- Dark Mode - Choose your preferred theme
- Side Panel View - Keep your inboxes accessible while browsing

### PRIVACY FOCUSED

- No personal information required to create inboxes
- Emails auto-expire after your chosen duration
- Your data never sold or shared

### HOW IT WORKS

1. Click the Ephemera icon in your toolbar
2. Create a new temporary email address
3. Use it on any website that requires email verification
4. Check your inbox for verification emails
5. Let the address expire when you're done

Perfect for:
- Newsletter signups
- Free trials
- Online shopping
- Forum registrations
- Avoiding marketing emails

### WORKS EVERYWHERE

The extension automatically detects email fields and offers to fill them with your temporary address. Right-click any text field for quick access.

### MULTI-LANGUAGE

Available in English and Vietnamese (more coming soon).

### SUPPORT

Questions? Visit https://manhquy.click/support

---

Note: This extension requires an Ephemera account. Sign up free at https://app.manhquy.click

---

## Permissions Justification

| Permission | Justification |
|------------|---------------|
| storage | Store authentication token and user preferences locally |
| alarms | Poll for new email messages periodically |
| clipboardWrite | Allow users to copy temporary email addresses |
| activeTab | Detect email input fields on the current page for autofill |
| notifications | Notify users when new emails arrive |
| sidePanel | Provide persistent access to inboxes via Chrome side panel |
| contextMenus | Enable right-click menu for quick email insertion |
| scripting | Inject autofill UI into web pages with email fields |
| host_permissions (api.manhquy.click) | Communicate with Ephemera API for authentication and inbox management |

---

## Required Assets

### Already Available
- [x] Icon 16x16: `public/icons/icon16.png`
- [x] Icon 32x32: `public/icons/icon32.png`
- [x] Icon 48x48: `public/icons/icon48.png`
- [x] Icon 128x128: `public/icons/icon128.png`

### Need to Create
- [ ] Promo Tile Small: 440x280 PNG
- [ ] Screenshots: 1280x800 or 640x400 (min 1, max 5)
  - Popup with inbox list
  - Message viewing
  - Autofill on email field
  - Settings/dark mode

---

## Privacy Policy URL

https://manhquy.click/privacy

---

## Package Location

`.output/ephemera-extension-0.1.0-chrome.zip` (122 KB)
