# Chrome Web Store Permission Justifications

This document provides justifications for each permission requested by the Ephemera browser extension, as required for Chrome Web Store submission.

## Permissions

### `storage`
**Justification:** Store user authentication tokens and settings locally for persistent login across browser sessions. This allows users to remain logged in without re-entering credentials each time they open the browser.

### `alarms`
**Justification:** Schedule periodic badge updates to show unread email count without continuous background activity. The alarm triggers every 5 minutes to refresh the badge counter, ensuring battery efficiency.

### `clipboardWrite`
**Justification:** Allow users to copy email addresses to clipboard with one click for easy pasting into forms. When a user clicks the copy button next to an inbox, the email address is copied to their clipboard automatically.

### `activeTab`
**Justification:** Required for the content script to detect email input fields on the currently active tab and inject the auto-fill icon. This permission is only used when the user interacts with a page containing email fields.

## Host Permissions

### `https://api.manhquy.click/*`
**Justification:** Connect to Ephemera API to create inboxes, fetch messages, and manage user account. All API communication is encrypted via HTTPS. No other domains are accessed.

## Content Scripts

### `<all_urls>` Match Pattern
**Justification:** Content scripts are used to detect email input fields on web pages and inject a small icon that allows users to auto-fill the field with a disposable Ephemera email address. This provides seamless integration with signup forms across the web.

**Scope of functionality:**
- Detects `<input type="email">` and similar email fields
- Injects a small Ephemera icon (20x20px) inside detected fields
- Shows dropdown with existing inboxes when icon is clicked
- Fills selected email address into the form field
- Does NOT read or modify any other page content
- Does NOT access cookies, localStorage, or other page data
- Does NOT inject scripts into the page context

## Single Purpose Declaration

**Purpose:** Manage disposable email addresses for privacy protection.

The extension has a single, clearly defined purpose: to help users create and manage temporary email addresses to protect their privacy when signing up for websites and services.

## Data Usage

- **Collected:** Email addresses created, messages received, authentication tokens
- **Stored locally:** Auth tokens, user preferences
- **Sent to server:** API requests for inbox/message management only
- **Not collected:** Browsing history, form data (except email fields), personal information beyond what's needed for the service
- **Not shared:** No data is shared with third parties
