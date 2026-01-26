# Research: Dark Theme & Minimal UI Trends (2025-2026)

**Date:** 2026-01-24
**Context:** "Superhuman" Aesthetic (Pure Black, Zinc, Border-based)

## 1. Dark Theme Best Practices 2025-2026
The 2026 trend moves away from "dark gray" back to **Pure Black (#000000)** for OLED optimization and higher contrast "Linear-style" sharpness.

*   **Contrast & Hierarchy:**
    *   **Background:** `#000000` (Pure Black) for main canvas.
    *   **Surface/Hover:** `zinc-900` (`#18181b`) or `zinc-950` (`#09090b`).
    *   **Borders:** The primary divider mechanism. No shadows.
    *   **Text:** Avoid pure white (`#ffffff`) for long text to reduce eye strain.
        *   Headings: `zinc-50` (`#fafafa`)
        *   Body: `zinc-300` (`#d4d4d8`)
        *   Muted: `zinc-500` (`#71717a`)

## 2. Minimal UI Trends (Linear/Vercel Aesthetic)
The "Structural Minimalism" trend relies on **layout and typography** rather than decoration.

*   **Micro-Borders:** 1px borders used for separation instead of background shades.
    *   *Pattern:* `border-zinc-900` (subtle) vs `border-zinc-800` (active).
*   **Compact Density:** High information density with comfortable line-height (1.4-1.5).
*   **No Glass/Glow:** As requested, trends favor "solid" and "opaque" over glassmorphism for productivity tools to reduce rendering overhead and visual noise.
*   **Active States:** Defined by high-contrast border changes or subtle background shifts (e.g., `bg-zinc-900`), not elevation changes.

## 3. Email-Specific Dark UI Patterns
*   **Message List:**
    *   **Selected:** `bg-zinc-900` + `border-l-2 border-white` (indicator).
    *   **Unread:** text `zinc-100` + font-medium + `w-2 h-2 bg-zinc-100 rounded-full`.
    *   **Read:** text `zinc-500` + font-normal.
*   **Email Rendering:**
    *   **Sandboxing:** Render HTML content in a safe `iframe` or isolated container.
    *   **Strategy:** "Smart Inversion" is risky. 2026 Standard: Default to white "paper" container for HTML emails to preserve sender intent, OR offer a "Reader Mode" that strips styles and applies native dark theme typography.
*   **Selection:**
    *   Avoid native blue selection. Use `selection:bg-zinc-700 selection:text-white`.

## 4. Micro-interactions & Motion
Focus on **"Perceived Instantaneity"**.

*   **Timing:**
    *   Hover/Press: `duration-75` or `duration-100` (max 150ms).
    *   Transitions: `ease-out` (fast start, smooth end).
*   **Focus Rings:**
    *   Replace fuzzy glows with sharp rings: `ring-1 ring-white ring-offset-0`.
*   **Loading:**
    *   Skeleton loaders in `zinc-900` with subtle `zinc-800` pulse (avoid high contrast shimmer).

## 5. Tailwind Implementation Recommendations

### Color Palette (Zinc Monochrome)
```javascript
// tailwind.config.js extension
colors: {
  background: '#000000',
  surface: {
    DEFAULT: '#09090b', // zinc-950
    hover: '#18181b',   // zinc-900
    active: '#27272a',  // zinc-800
  },
  border: {
    subtle: '#27272a',  // zinc-800
    default: '#3f3f46', // zinc-700
    strong: '#52525b',  // zinc-600
  }
}
```

### Component Patterns
**List Item (Superhuman Style):**
```tsx
<div className="group flex items-center gap-3 px-4 py-3
  bg-black hover:bg-zinc-900
  border-b border-zinc-900 cursor-pointer
  transition-colors duration-100 ease-out">
  <div className="w-2 h-2 rounded-full bg-white opacity-0 group-hover:opacity-100" />
  {/* Content */}
</div>
```

**Button (Ghost/Minimal):**
```tsx
<button className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white
  hover:bg-zinc-900 rounded border border-transparent
  hover:border-zinc-800 transition-all duration-100">
  Action
</button>
```

### Unresolved Questions
1.  **HTML Email Rendering:** Should we enforce dark mode on 3rd party emails (risky) or use a white container (safe but breaks immersion)?
2.  **Mobile Swipe:** Are swipe actions needed for the list view, or is this desktop-keyboard focused?
