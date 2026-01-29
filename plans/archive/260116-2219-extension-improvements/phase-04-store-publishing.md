---
parent: ./plan.md
phase: 04
title: Chrome Web Store Publishing
---

# Phase 04: Chrome Web Store Publishing

## Context

- **Parent Plan:** [Extension Improvements](./plan.md)
- **Dependencies:** Phase 01-03 (testing, i18n)
- **Docs:** [Chrome Web Store Developer Guide](https://developer.chrome.com/docs/webstore/publish/)

## Overview

| Field | Value |
|-------|-------|
| Date | 2026-01-16 |
| Description | Prepare and submit extension to Chrome Web Store |
| Priority | P2 |
| Implementation Status | ⬜ Not Started |
| Review Status | ⬜ Pending |
| Effort | 2h |

## Key Insights

1. Chrome Web Store requires $5 one-time developer registration fee
2. Review process takes 1-3 business days
3. Need promotional assets (icons, screenshots, tiles)
4. Privacy policy required for extensions with user data

## Requirements

1. Chrome Developer account setup
2. Store listing assets (icons, screenshots, tiles)
3. Privacy policy URL
4. Properly packaged extension (.zip)
5. Accurate permissions justification

## Store Listing Checklist

| Asset | Spec | Status |
|-------|------|--------|
| Extension Icon | 128x128 PNG | ⬜ |
| Promo Tile (Small) | 440x280 PNG | ⬜ |
| Promo Tile (Large) | 920x680 PNG (optional) | ⬜ |
| Screenshots | 1280x800 or 640x400 (min 1, max 5) | ⬜ |
| Store Description | Max 16,000 chars | ⬜ |
| Privacy Policy | URL | ⬜ |

## Implementation Steps

### Step 1: Create Store Assets (45min)

#### Icon (128x128)
- Use existing brand icon, export at 128px
- PNG format with transparency

#### Screenshots (1280x800)
Capture these screens:
1. **Popup - Inbox List** - Show main functionality
2. **Popup - Messages** - Show message viewing
3. **Content Script - Autofill** - Show icon on email field
4. **Settings** - Show theme options

#### Promo Tile (440x280)
- Brand colors with tagline
- "Disposable Email Instantly"
- Show extension icon

### Step 2: Write Store Description (30min)

```
Ephemera - Temporary Email

Create disposable email addresses instantly. Protect your privacy and avoid spam with temporary inboxes that work everywhere.

✨ KEY FEATURES

• Instant Email Creation - Generate temporary emails with one click
• Autofill Integration - Automatically detect and fill email fields on any website
• Multiple Inboxes - Manage several temporary addresses at once
• Real-time Notifications - Get notified when new emails arrive
• Dark Mode - Choose your preferred theme
• Side Panel View - Keep your inboxes accessible while browsing

🔒 PRIVACY FOCUSED

• No personal information required to create inboxes
• Emails auto-expire after your chosen duration
• Your data never sold or shared

🚀 HOW IT WORKS

1. Click the Ephemera icon in your toolbar
2. Create a new temporary email address
3. Use it on any website that requires email verification
4. Check your inbox for verification emails
5. Let the address expire when you're done

Perfect for:
• Newsletter signups
• Free trials
• Online shopping
• Forum registrations
• Avoiding marketing emails

📱 WORKS EVERYWHERE

The extension automatically detects email fields and offers to fill them with your temporary address. Right-click any text field for quick access.

🌐 MULTI-LANGUAGE

Available in English and Vietnamese (more coming soon).

💬 SUPPORT

Questions? Visit https://manhquy.click/support

---

Note: This extension requires an Ephemera account. Sign up free at https://app.manhquy.click
```

### Step 3: Privacy Policy (15min)

Create/update privacy policy at `https://manhquy.click/privacy`:

```markdown
# Privacy Policy for Ephemera Extension

Last updated: 2026-01-16

## Data Collection

The Ephemera browser extension collects:
- Email and password for authentication
- Temporary email addresses you create
- Usage analytics (anonymized)

## Data Storage

- Authentication tokens stored locally in browser storage
- No data shared with third parties
- Emails stored on our servers (see main privacy policy)

## Permissions

- `storage`: Save your preferences and auth token
- `alarms`: Poll for new messages
- `notifications`: Alert you of new emails
- `activeTab`: Detect email fields on current page
- `clipboardWrite`: Copy email addresses
- `contextMenus`: Right-click menu integration

## Contact

privacy@manhquy.click
```

### Step 4: Build & Package (15min)

```bash
cd services/extension

# Clean build
npm run build

# Create zip for store upload
npm run zip
# Output: .output/ephemera-extension-0.1.0-chrome.zip
```

Verify zip contents:
- manifest.json (version matches)
- All JS/HTML/CSS files
- _locales directory
- icons directory

### Step 5: Submit to Store (15min)

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Pay $5 registration fee (one-time)
3. Click "New Item"
4. Upload zip file
5. Fill in store listing:
   - Title: Ephemera - Temporary Email
   - Description: (from Step 2)
   - Category: Productivity
   - Language: English (US)
6. Upload assets (icons, screenshots, tiles)
7. Add privacy policy URL
8. Justify permissions (see below)
9. Submit for review

### Permissions Justification

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

## Todo List

- [ ] Create 128x128 extension icon
- [ ] Create 440x280 promo tile
- [ ] Capture 4 screenshots at 1280x800
- [ ] Write store description
- [ ] Create/update privacy policy page
- [ ] Register Chrome Developer account ($5)
- [ ] Build production extension
- [ ] Create zip package
- [ ] Upload to Chrome Web Store
- [ ] Fill store listing form
- [ ] Submit for review
- [ ] Monitor review status
- [ ] Respond to any reviewer feedback

## Success Criteria

1. Extension approved and published on Chrome Web Store
2. Store listing looks professional with all assets
3. No policy violations flagged
4. Installation and functionality verified post-publish

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Review rejection | Medium | High | Follow all Chrome policies |
| Permission warnings | Low | Medium | Justify each permission clearly |
| Asset quality issues | Low | Low | Use professional designs |
| Privacy policy missing | Low | High | Create before submission |

## Security Considerations

- Ensure no hardcoded secrets in published code
- Remove console.log statements with sensitive data
- Verify API endpoint is HTTPS only
- Check CSP is strict

## Post-Publishing

After successful publication:
1. Add Web Store badge to website
2. Announce on social media
3. Submit to Firefox Add-ons (similar process)
4. Monitor reviews and ratings
5. Plan regular updates

## Next Steps

After completing Phase 04:
1. Monitor store reviews
2. Plan v0.2.0 features based on feedback
3. Consider Firefox/Edge store publishing
