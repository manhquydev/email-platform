# Frontend UI Research: Compose Email Experience

**Date:** 2026-01-31
**Subject:** Best Practices for "Compose Email" UI in React 19
**Status:** Complete

## 1. Executive Summary

For a modern, professional email platform in 2025/2026, we recommend a **hybrid UX approach** (minimized/modal compose by default, expandable to full screen) built on **Tiptap** for rich text and **headless UI components** for recipient management.

**Core Recommendations:**
- **Editor:** [Tiptap](https://tiptap.dev/) (Headless wrapper around Prosemirror) - best for Tailwind integration.
- **Attachments:** `react-dropzone` with optimistic background uploading.
- **Recipient Input:** Custom "Chips" component built on `cmdk` or `shadcn/ui` primitives.
- **UX Pattern:** "Docked Modal" (Gmail-style) preserves context while allowing multi-tasking.

---

## 2. Rich Text Editor (RTE)

### Comparison Matrix

| Feature | **Tiptap** (Recommended) | **Lexical** (Facebook) | **Quill** |
| :--- | :--- | :--- | :--- |
| **React 19 Support** | Excellent (Headless) | Good | Legacy (Wrapper needed) |
| **Styling** | Headless (Use Tailwind classes) | Theme-based / CSS-in-JS | Opinionated CSS |
| **Customizability** | High (Node views) | High (Complex API) | Medium |
| **Output** | HTML / JSON | JSON | HTML / Delta |
| **Bundle Size** | Modular (Small) | Moderate | Moderate |

### Recommendation: Tiptap
**Why:**
- **Headless & Tailwind Friendly:** Tiptap does not ship with CSS. You apply Tailwind classes directly to editor elements via the `editorProps` configuration.
- **React Node Views:** You can render React components *inside* the editor (e.g., a custom "Attachment" block or "Link Preview" card).
- **Extension System:** Modular architecture keeps the bundle size small. Only install what you need (Bold, Italic, Image, etc.).

**Implementation Note:**
```tsx
const editor = useEditor({
  extensions: [StarterKit, Image, Link],
  editorProps: {
    attributes: {
      class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none',
    },
  },
})
```

---

## 3. Recipient Input (Autocompletion & Chips)

There is no single "dominant" standalone library for email chips in 2025. The best practice is to compose this using **Headless UI** primitives to ensure accessibility and custom styling.

### Recommended Pattern: "Combobox with Multi-Select"
1.  **Input Field:** Text input that searches contacts.
2.  **Dropdown:** Popover showing matches (Name + Email + Avatar).
3.  **Selection:** Hitting enter/tab converts text to a "Chip" (pill).
4.  **Validation:**
    - Valid email → Blue Chip.
    - Invalid format → Red Chip / Error state.
    - External contact → Yellow warning (optional).

### Technical Choice: `shadcn/ui` (Command Primitive) or `cmdk`
- Use the `Command` component (based on `cmdk`) for the fuzzy search dropdown.
- Manually render selected items as `Badge` components *before* the input cursor.
- **Keyboard Navigation:** Backspace deletes the last chip. Arrow keys navigate between chips.

---

## 4. Attachment Handling

### Best Practices
1.  **Drag & Drop Zone:** The entire compose modal should be a drop zone, but visually highlighted only when dragging occurs (`onDragEnter`).
2.  **Optimistic Uploads:**
    - **Do NOT** wait for the user to click "Send" to start uploading.
    - **Start uploading immediately** when the file is dropped.
    - Show a progress bar on the file card.
    - **UX:** If the user clicks "Send" while uploading, disable the button and show "Uploading attachments...".
3.  **Storage Strategy:**
    - Upload to a temporary bucket (TTL 24h).
    - Return a `file_key` or `url`.
    - When email is sent, move/tag the file as permanent.

### Library: `react-dropzone`
Standard, reliable, headless. Easy to overlay on top of the Tiptap editor.

---

## 5. UX Patterns: Modal vs. Full Page

| Pattern | Pros | Cons | Use Case |
| :--- | :--- | :--- | :--- |
| **Docked Modal** (Gmail) | • Multitasking (reference other emails)<br>• Fast access<br>• Context preservation | • Limited screen real estate<br>• Can feel cramped for long emails | **Default** for most quick replies and standard emails. |
| **Full Page** | • Focus mode<br>• Maximum space for tools/formatting | • Loses context of inbox<br>• Heavy context switch | **Optional** expand button for "Deep Work" writing. |
| **Bottom Sheet** | • Mobile native feel | • Bad for desktop<br>• Limited height | **Mobile Only** strategy. |

### Recommendation: "Docked Modal" with Expand Option
- **Desktop:** Open as a docked modal in the bottom right (or centered overlay). Allow clicking a "maximize" icon to expand to full screen.
- **Mobile:** Full-screen modal or bottom sheet (slide up).

---

## 6. Proposed Tech Stack

| Component | Technology |
| :--- | :--- |
| **Framework** | React 19 |
| **Styling** | TailwindCSS + `clsx` / `tailwind-merge` |
| **Editor** | **Tiptap** (`@tiptap/react`, `@tiptap/starter-kit`) |
| **File Upload** | **react-dropzone** |
| **Icons** | Lucide React |
| **Inputs/Chips** | **shadcn/ui** (Command, Badge, Popover) |
| **State** | React Hook Form + Zod (for validation) |

## 7. Open Questions / Next Steps
- [ ] Determine storage provider for temporary attachment uploads (S3/R2/MinIO?).
- [ ] Define "Max File Size" limits (e.g., 25MB standard).
- [ ] Decide on "Paste Image" behavior (Auto-upload vs inline base64 - *Auto-upload recommended*).
