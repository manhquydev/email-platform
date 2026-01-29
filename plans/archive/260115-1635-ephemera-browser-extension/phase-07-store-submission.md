# Phase 7: Chrome Web Store Submission

## Context

- **Parent Plan:** [plan.md](./plan.md)
- **Depends On:** All previous phases complete
- **Research:** [Chrome MV3](./research/researcher-01-chrome-mv3.md)

## Overview

| Field | Value |
|-------|-------|
| Priority | P0 - Critical Path |
| Status | Completed |
| Effort | 3-4 days |
| Dependencies | Phases 1-6 complete |

Prepare and submit extension to Chrome Web Store. Includes asset creation, privacy policy, permission justifications, QA testing, and submission process.

## Key Insights

- Review typically takes 1-3 business days
- Single-purpose requirement - focus on temp email management
- Permission justifications are mandatory for each permission
- Privacy policy must be hosted on accessible URL
- Screenshots must show actual functionality

## Requirements

### Store Assets
- Extension icons (16, 32, 48, 128px PNG)
- Screenshots (1280x800 or 640x400, 1-5 images)
- Promotional tile (440x280 for featured)
- Marquee tile (1400x560, optional)

### Documentation
- Privacy policy URL
- Detailed description (up to 132 chars summary, full description)
- Permission justifications for each permission used

### Compliance
- Manifest V3 compliant
- No remote code execution
- Single purpose declaration
- GDPR/CCPA considerations

## Architecture

```
Submission Checklist:
┌─────────────────────────────────────────────────────────────┐
│                    Pre-Submission                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ☐ All features tested                               │   │
│  │ ☐ Icons exported at all sizes                       │   │
│  │ ☐ Screenshots captured                              │   │
│  │ ☐ Privacy policy published                          │   │
│  │ ☐ Permission justifications written                 │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                    Build & Package                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ npm run build → dist/                               │   │
│  │ zip -r ephemera-extension.zip dist/                 │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                    Developer Dashboard                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Upload ZIP → Fill metadata → Submit for review      │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Related Code Files

### Create
- `services/extension/public/icons/icon16.png`
- `services/extension/public/icons/icon32.png`
- `services/extension/public/icons/icon48.png`
- `services/extension/public/icons/icon128.png`
- `services/extension/store-assets/screenshot-*.png`
- `services/extension/store-assets/promo-tile.png`
- `services/web/public/privacy-policy.html` (or update existing)

### Reference
- `services/extension/src/manifest.json` - Permissions list
- `services/web/src/pages/privacy.tsx` - Existing privacy page

## Implementation Steps

### Step 1: Create Extension Icons (2h)

Create icons at required sizes with Ephemera branding:

```
public/icons/
├── icon16.png   # Toolbar icon (small)
├── icon32.png   # Windows icon
├── icon48.png   # Extensions page
└── icon128.png  # Chrome Web Store, install dialog
```

Design requirements:
- Simple, recognizable at 16px
- Match Ephemera brand colors (#0ea5e9 primary)
- Email/envelope motif
- No text (illegible at small sizes)
- PNG with transparency

### Step 2: Capture Screenshots (1h)

Create 1280x800 screenshots showing:

1. **Popup - Inbox List**
   - Show list of inboxes with unread counts
   - Highlight copy and create buttons

2. **Popup - Messages View**
   - Show message list in selected inbox
   - Display sender and subject

3. **Auto-fill Demo**
   - Show email field on signup form
   - Ephemera icon visible in field
   - Dropdown with email options

4. **Notification**
   - Browser notification for new email
   - Badge counter visible

5. **Settings**
   - Settings view with options

### Step 3: Write Store Listing (1h)

**Extension Name:** Ephemera - Disposable Email

**Short Description (132 chars max):**
```
Create disposable email addresses instantly. Protect your privacy from spam and tracking. Auto-fill signup forms with one click.
```

**Full Description:**
```
Ephemera is your privacy-first disposable email solution, directly in your browser.

FEATURES:
• Create temporary email addresses with one click
• Auto-fill signup forms on any website
• Receive emails in real-time with push notifications
• View and manage messages without leaving your browser
• Copy addresses to clipboard instantly

WHY EPHEMERA?
Stop giving your real email to every website. Ephemera creates unique, disposable addresses that forward to your account. When you're done, delete them - no more spam.

PRIVACY FOCUSED:
• No tracking or analytics
• Your data stays yours
• Open-source codebase

WORKS EVERYWHERE:
Ephemera detects email fields on signup forms and offers to auto-fill with a disposable address. Works on Gmail, Twitter, GitHub, and thousands of other sites.

FREE TO USE:
Create up to 5 inboxes free. Upgrade for unlimited inboxes and custom domains.

Get started in seconds - no account required for basic usage!
```

**Category:** Productivity

**Language:** English

### Step 4: Write Permission Justifications (1h)

Required justifications for each permission:

| Permission | Justification |
|------------|---------------|
| `storage` | Store user authentication tokens and settings locally for persistent login across browser sessions. |
| `alarms` | Schedule periodic badge updates to show unread email count without continuous background activity. |
| `clipboardWrite` | Allow users to copy email addresses to clipboard with one click for easy pasting into forms. |
| `notifications` | Display desktop notifications when new emails arrive, keeping users informed in real-time. |
| `host_permissions: api.manhquy.click` | Connect to Ephemera API to create inboxes, fetch messages, and manage user account. |

Content script justification:
```
Content scripts are used to detect email input fields on web pages and inject
a small icon that allows users to auto-fill the field with a disposable
Ephemera email address. This provides seamless integration with signup forms
across the web.
```

### Step 5: Update Privacy Policy (1h)

Update `services/web/public/privacy-policy.html` or create dedicated page:

```markdown
## Browser Extension Privacy Policy

### Data Collection
The Ephemera browser extension collects:
- Email addresses you create through the extension
- Messages received at those addresses
- Authentication tokens for account access

### Data Storage
- Authentication tokens stored locally in browser storage
- Email data stored on Ephemera servers
- No data shared with third parties

### Permissions Usage
- Storage: Save login state and preferences
- Notifications: Alert you to new emails
- Clipboard: Copy email addresses
- Host permissions: Communicate with Ephemera API only

### Data Retention
- Inboxes and messages deleted per your TTL settings
- Account data retained until account deletion

### Contact
For privacy concerns: privacy@manhquy.click
```

Host at: `https://app.manhquy.click/privacy` or `https://ephemera.email/privacy`

### Step 6: QA Testing Checklist (4h)

Manual testing before submission:

**Authentication:**
- [ ] Login with valid credentials
- [ ] Login with invalid credentials shows error
- [ ] Logout clears all data
- [ ] Token persists across popup close/open
- [ ] Expired token triggers re-login

**Inbox Management:**
- [ ] Create inbox works
- [ ] Inbox list displays correctly
- [ ] Copy email to clipboard works
- [ ] Delete inbox works
- [ ] Refresh updates list

**Messages:**
- [ ] Messages load for selected inbox
- [ ] Unread count accurate
- [ ] Message preview displays
- [ ] Mark as read works

**Content Script:**
- [ ] Icon appears in email fields
- [ ] Dropdown shows inboxes
- [ ] Create new from dropdown works
- [ ] Auto-fill triggers form events
- [ ] Works on: Gmail signup, Twitter, GitHub, generic forms

**Notifications:**
- [ ] Permission request appears
- [ ] Notifications received for new email
- [ ] Click notification opens message
- [ ] Badge updates correctly

**Edge Cases:**
- [ ] No network shows appropriate error
- [ ] Large inbox list scrolls properly
- [ ] Long email addresses truncate
- [ ] Multiple quick creates don't duplicate

### Step 7: Build Production Package (30m)

```bash
cd services/extension

# Build production bundle
npm run build

# Verify dist/ contents
ls -la dist/

# Create submission ZIP
cd dist
zip -r ../ephemera-extension.zip .

# Verify ZIP size (should be < 10MB)
ls -la ../ephemera-extension.zip
```

### Step 8: Submit to Chrome Web Store (1h)

1. Go to [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole)

2. Pay one-time $5 developer registration fee (if not already)

3. Click "New Item" → Upload ZIP

4. Fill in store listing:
   - Name, description, category
   - Upload icons and screenshots
   - Set privacy policy URL
   - Select target regions

5. Fill in privacy practices:
   - Single purpose: "Manage disposable email addresses"
   - Data usage certification
   - Permission justifications

6. Submit for review

7. Wait 1-3 business days for review

### Step 9: Post-Submission (Ongoing)

- Monitor developer dashboard for review status
- Respond promptly to any reviewer questions
- Prepare v1.0.1 with any required fixes
- Set up monitoring for user reviews
- Plan feature updates based on feedback

## Todo List

- [ ] Design and export extension icons (16, 32, 48, 128px)
- [ ] Capture 5 screenshots showing key features
- [ ] Create promotional tile (440x280)
- [ ] Write store listing (short + full description)
- [ ] Write permission justifications
- [ ] Update privacy policy with extension section
- [ ] Complete QA testing checklist
- [ ] Build production package
- [ ] Create developer account (if needed)
- [ ] Upload and submit to Chrome Web Store
- [ ] Monitor review status
- [ ] Address any reviewer feedback

## Success Criteria

- [ ] Extension approved and published
- [ ] Store listing displays correctly
- [ ] Install flow works smoothly
- [ ] No permission warnings beyond declared
- [ ] Extension functions correctly post-install
- [ ] 4.0+ initial rating target

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Review rejection | Medium | High | Follow all guidelines, clear justifications |
| Permission concerns | Low | Medium | Minimal permissions, clear explanations |
| Policy violation | Low | High | Review policies thoroughly before submit |
| Long review time | Medium | Low | Submit early, plan for delays |

## Security Considerations

- No sensitive data in store listing
- Privacy policy legally reviewed
- GDPR compliance verified
- No deceptive descriptions
- Accurate permission usage

## Store Listing URLs (Post-Publish)

- Chrome Web Store: `https://chrome.google.com/webstore/detail/ephemera/[extension-id]`
- Direct install: `https://chrome.google.com/webstore/detail/[extension-id]`

## Appendix: Review Guidelines Reference

Key points from Chrome Web Store policies:
- Single purpose: Extension must have one clear purpose
- Minimum permissions: Only request what's needed
- Privacy policy: Required for extensions that handle user data
- No deceptive behavior: Clear about what extension does
- Quality: Must be functional and bug-free
- Manifest V3: Required for new submissions

---

**Congratulations!** Upon successful publication, the Ephemera browser extension will be available to users worldwide through the Chrome Web Store.
