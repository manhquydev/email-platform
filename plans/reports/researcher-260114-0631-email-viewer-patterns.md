# Research Report: Modern Email Viewing Patterns

**Date:** 2026-01-14
**Focus:** UX/UI patterns for email reading, threading, and interaction.

## 1. Layout & Reading Architecture

| Device | Pattern | Description | Best Practice |
| :--- | :--- | :--- | :--- |
| **Desktop** | **Split-Pane (3-Col)** | Folders \| List \| Reading Pane. | Default to 3-col. Allow toggling to 2-col (list/content) or vertical split. |
| **Mobile** | **Full-Page** | List View → Full Screen Reader. | Swipe-back navigation. Bottom-sheet actions for easy reachability. |
| **Quick View** | **Overlay/Side-Sheet** | Slide-over for quick triage. | Use for "peek" functionality without losing context of the inbox list. |

## 2. Thread Visualization

*   **Chronology:** Oldest top, newest bottom (like chat). Collapse read middle messages ("2 older messages").
*   **Visual Hierarchy:** Use indentation or nesting lines to show reply depth, though flat "conversation" view is trending for simplicity.
*   **Differentiation:** Distinct visual separation between messages (cards or dividers). Highlight the *current* focused message.
*   **Quote Management:** Aggressively hide quoted text (signatures, previous replies) behind a `...` expander.

## 3. Attachments & Rich Content

*   **Preview:** Grid of thumbnails at top or bottom of email.
    *   **Images:** Lightbox overlay with gallery navigation (prev/next).
    *   **Documents:** PDF/Office viewer integration (iframe or dedicated viewer) within the lightbox.
*   **Actions:** "Download All" button. Drag-and-drop out of browser (if supported).
*   **Safety (HTML):**
    *   **Sandboxing:** Render body in `iframe` with `sandbox` and `srcdoc`.
    *   **Sanitization:** Server-side (DOMPurify) + Client-side (CSP). Strip `<script>`, `object`, external styles.
    *   **Images:** Proxy external images to prevent tracking pixels. Default block with "Load images" button.

## 4. Interaction Patterns

*   **Inline Reply:**
    *   **Sticky Footer:** Always-visible reply box at bottom of thread.
    *   **Smart Defaults:** "Reply All" if multiple recipients; clear distinct toggle for "Reply" vs "Reply All".
    *   **Expansion:** Click to expand into full editor (pop-out/overlay).
*   **Actions:**
    *   **Desktop:** Hover actions on list items (Archive, Delete, Snooze, Mark Read). Keyboard shortcuts (`j`/`k` nav, `e` archive).
    *   **Mobile:** Swipe gestures (customizable). Left: Archive/Delete. Right: Mark Read/Snooze.
*   **OTP/Transactional:**
    *   **Pattern:** Detect OTP/Codes via Regex.
    *   **UX:** Display code prominently in Subject Line preview and distinct card at top of email body. One-click "Copy" button.

## 5. Recommendations for Implementation

1.  **Adopt 3-Column Layout:** Best balance for triage and reading on desktop.
2.  **Conversation View:** Group by `Message-ID` / `References`. Flat chronological list with collapsed read items.
3.  **Secure Rendering:** Strict `iframe` isolation for HTML content. No direct dangerouslySetInnerHTML.
4.  **OTP Extraction:** Implement server-side extraction to decorate the message metadata for UI highlighting.
5.  **Attachment "Cinema Mode":** Dark-overlay lightbox for all file types; prevent context switching.
6.  **Optimistic UI:** Archive/Delete actions should be instant (remove from UI immediately) with an "Undo" toast.

## Unresolved / Future Questions
*   Specific handling of "inline" images vs "attached" images in the gallery view?
*   Performance limits for very long threads (virtualization strategy)?
*   Dark mode handling for HTML emails with hardcoded colors?

## Sources
*   [Email Actions UX](https://uxdesign.cc/redesigning-the-email-experience-5a676f235540)
*   [OTP Patterns](https://uxdesign.cc/designing-a-better-verification-code-experience-4f7a7758360d)
*   [Thread Visualization](https://www.nngroup.com/articles/email-threading/)
