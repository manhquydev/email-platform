# Research: Ultra-Minimal Layout Patterns

Analysis of layout systems from Linear, Superhuman, Vercel (Geist), and Raycast.

## 1. Landing Page Layout
**Pattern:** Deep hierarchy, centered hero, distinct sections with ample whitespace.
- **Container:** `max-width: 1200px` (desktop), `padding: 0 24px` (mobile).
- **Grid:** 12-column responsive grid. Gutter: `24px`.
- **Vertical Rhythm:** Multiples of `128px` for major sections, `64px` for subsections.
- **Breakpoints:**
  - Mobile: `<640px` (Stack vertical)
  - Tablet: `640px - 1024px` (2 col)
  - Desktop: `>1024px` (12 col constraint)
- **Hierarchy:** H1 Hero (>64px) -> Feature Grid (3 col) -> Social Proof -> CTA.

## 2. Auth Page Layout
**Pattern:** Centered "Floating Card" or "Split View".
- **Container:**
  - *Centered:* `width: 380px-420px`, fixed height or auto. Vertically centered.
  - *Split:* 50% vw Image / 50% vw Form.
- **Spacing:** Inner padding `40px`. Input gap `16px`.
- **Rhythm:** Logo -> Header -> Form -> Footer Links.
- **Key Detail:** Minimal distractions. No navigation. Single prominent primary button.

## 3. Dashboard Layout (App Shell)
**Pattern:** Fixed/Collapsible Sidebar + Fluid Main Area.
- **Sidebar:** `width: 240px` (expanded), `64px` (collapsed).
- **Main Content:** `flex: 1`, `max-width: 1600px` or `100%` fluid.
- **Header:** Sticky, `height: 48px-60px`. Often blends with content background (glassmorphism).
- **Grid:** Fluid layout rather than strict columns.
- **Breakpoints:**
  - Mobile: Sidebar becomes hamburger menu/drawer.
  - Desktop: Sidebar persistent.

## 4. Admin / Data Layout
**Pattern:** Dense information density, horizontal scanning.
- **Container:** Full width (`100%`), `padding: 0 32px`.
- **Data Tables:**
  - Row height: `40px` (default), `32px` (compact).
  - Sticky header row.
- **Stat Cards:** Grid auto-fit, `min-width: 240px`. Gap `16px`.
- **Action Bar:** Placed top-right of table or sticky bottom.

## 5. Settings Layout
**Pattern:** "Master-Detail" or "Vertical Tabs".
- **Container:** Constrained readability width.
  - Nav: `width: 220px`.
  - Content: `max-width: 640px` (prevent line-length fatigue).
- **Spacing:** Section gap `48px`. Field gap `24px`.
- **Hierarchy:** Page Title -> Description -> Form Section -> Divider -> Danger Zone.
- **Mobile:** Nav becomes top-level list; clicking item slides to detail view.

## Core Design Tokens (Reference)
- **Space Base:** 4px (0.25rem). Most spacing is 4, 8, 16, 24, 32, 48, 64.
- **Radius:** `6px` (Standard), `8px` (Cards), `12px` (Modals).
- **Typography:** Inter or System UI. Base size `14px` (UI) / `16px` (Body).
- **Colors:**
  - Background: `#FFFFFF` / `#000000` (Dark Mode).
  - Surface: `#F5F5F5` / `#111111`.
  - Border: Subtle `#EAEAEA` / `#333333`.

## Unresolved Questions
- Exact blur values for glassmorphism headers in light vs dark mode?
- Handling of nested scroll areas in complex data tables on mobile?
