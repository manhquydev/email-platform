# Modern Email Inbox Viewer UI/UX Patterns & Best Practices

**Date:** 2026-01-24
**Status:** Complete
**Focus:** Modern UI patterns, Public Inbox nuances, Keyboard-first design, Performance

## 1. Modern Email Client Patterns (2024-2025)
Top-tier clients (Superhuman, Hey, Spark) share a philosophy of "Speed & Focus".

### Layout & Structure
*   **Split-Pane (Master-Detail):** Standard for desktop. Left sidebar (folders), Middle (message list), Right (content). Allows rapid scanning without losing context.
*   **Two-Line List Items:** Primary line for Sender/Subject (bold if unread), secondary line for preview text (muted).
*   **"The Imbox" vs. "The Feed":** Segregating human emails from transactional/newsletters (Hey methodology).
*   **Empty States:** Celebration moments (e.g., "Inbox Zero" graphics) rather than just "No messages".

### Interaction Design
*   **Hover Actions:** Reveal actions (Archive, Delete, Snooze) only on hover to reduce visual clutter (Gmail, Outlook).
*   **Bulk Actions:** "Select All" bar appears only when a checkbox is triggered or Shift-click is used.
*   **Optimistic UI:** Actions (delete, archive) happen instantly visually; network request follows. "Undo" toast is mandatory.

## 2. Public Inbox / Temp Mail Specifics
Public inboxes require zero-friction entry and immediate utility.

*   **Instant Provisioning:** No "Generate" button. The address exists the moment the page loads.
*   **Hero Copy Button:** The address + "Copy" button is the most dominant UI element.
*   **Real-Time "Pulse":** Visual indicator (pulsing dot or auto-refresh timer) showing the inbox is live.
*   **Auto-Expiry Countdown:** Clear visual timer showing when the inbox/message will vanish (Guerrilla Mail style).
*   **Render-Safe View:** Default to blocking remote images/scripts for security, with a "Show Images" toggle.

## 3. Keyboard-First Design
Power users expect to manage email without a mouse.

*   **Navigation:** `j` (next), `k` (previous) for traversing the list.
*   **Actions:** `e` (archive), `#` (delete), `r` (reply), `/` (search).
*   **Focus Management:**
    *   Active email in list needs high-contrast highlight (border-left or background tint).
    *   `Enter` opens details; `Esc` returns to list focus.
*   **Command Palette:** `Cmd+K` / `Ctrl+K` menu for rarely used actions (Superhuman pattern).

## 4. Performance UX (React Focus)
Handling lists of 1000+ emails requires virtualization.

*   **Virtual Scrolling:** Use `react-virtuoso` or `react-window`. Only render DOM nodes in viewport.
*   **Skeleton Loading:** Use text-line skeletons for message list loading instead of a central spinner.
*   **Lazy Rendering:** Load message body content only when the item is expanded or active.
*   **Stale-While-Revalidate:** Show cached list immediately, update in background.

## 5. Prioritized Recommendations for Implementation

1.  **Implement Virtualized List:** Critical for "public inbox" floods. Use `react-virtuoso` for variable height support.
2.  **Hero Address Component:** Big, bold email address with one-click copy at the top of the UI.
3.  **Keyboard Shortcuts:** Implement basic `j/k` navigation immediately.
4.  **Auto-Refresh UI:** WebSockets are best, but if polling, show a visual progress bar so user knows it's working.
5.  **Sanitized Rendering:** Use `dompurify` for message HTML to prevent XSS in public viewing context.

## 6. Unresolved Questions
*   Do we need "Raw Source" view for developers debugging emails?
*   Should we implement a "Pause" incoming feature for high-volume testing?
