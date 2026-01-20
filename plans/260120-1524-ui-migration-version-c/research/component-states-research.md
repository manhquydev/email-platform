# Component Composition & UI State Patterns for Ultra-Minimal Design Systems

## 1. Component Hierarchy
**Principle:** Strict separation of concerns using composition over inheritance. Hierarchy favors flatness.

*   **Atomic Adaptation:**
    *   **Primitives (UI):** Dumb components (`@/components/ui`). Highly reusable, strictly visual (Button, Input, Card).
    *   **Composites:** Pattern-based assemblies (Input + Label + Error = `FormField`).
    *   **Features:** Smart components (`@/features/*`). Business logic aware, not reusable outside context.
*   **Composition Patterns:**
    *   **Compound Components:** For tightly coupled logic (e.g., `<Dialog.Root><Dialog.Trigger /><Dialog.Content /></Dialog.Root>`).
    *   **Slot Pattern:** Render props or `asChild` (Radix UI style) to merge behaviors without nesting DOM nodes.
*   **Shared vs Specific:**
    *   Shared components live in `ui/`.
    *   Page-specific components live alongside pages or in `features/` to prevent global pollution.

## 2. UI States
**Principle:** Zero layout shift. States are subtle but clear.

*   **Empty States:**
    *   **Context:** Never just "No items". Always "Why" + "Call to Action".
    *   **Visual:** Subtle gray-scale illustration or icon. Centered in available space.
    *   **First-time:** Interactive "Get Started" checklist instead of empty tables.
*   **Loading States:**
    *   **Skeleton:** Matches exact layout of content. Pulse animation. Prevents layout shift (CLS).
    *   **Spinner:** Only for buttons (inline) or small async updates. Never full screen.
    *   **Navigation:** Top-bar progress (NProgress) for route transitions.
*   **Error States:**
    *   **Form:** Inline red text, absolute positioned to avoid reflow, or reserved space.
    *   **System:** Toast notifications for transient errors (Network).
    *   **Critical:** Full-page minimal error boundary (Centered 404/500).
*   **Success:**
    *   **Micro-interaction:** Button turns green/check icon briefly.
    *   **Passive:** Toast notification (Bottom right), auto-dismiss.

## 3. Form Patterns
**Principle:** Keyboard-first, linear flow, focused.

*   **Layout:**
    *   **Single Column:** Standard for focus. Max-width 480px-600px.
    *   **Grouping:** Visual spacing (whitespace) over borders/boxes.
*   **Validation:**
    *   **Trigger:** OnBlur for validity, OnChange for formatting.
    *   **Style:** Input border color change (Red/Orange). Minimal text message.
*   **Navigation:**
    *   **Multi-step:** Progress bar for wizard flows. "Back" availability.
    *   **Shortcuts:** `Cmd+Enter` to submit. `Esc` to cancel/close.

## 4. Data Display
**Principle:** Information density with high scanability.

*   **Tables:**
    *   **Density:** Low borders, high whitespace. Hover row highlight.
    *   **Actions:** Reveal actions on hover (keeps default view clean).
    *   **Headers:** Subtle text, sort indicators only on hover/active.
*   **List vs Card:**
    *   **List:** For homogeneous data (Emails, logs, users).
    *   **Card:** For distinct objects with visuals (Integrations, Dashboards).
*   **Pagination:**
    *   **Infinite/Virtual:** For high-volume streams (Logs).
    *   **Cursor/Load More:** For actionable lists (prevents footer burying).

## Unresolved Questions
*   Adoption of "Command K" palette as primary navigation/action interface?
*   Strategy for mobile-specific interactions within shared component architecture?
