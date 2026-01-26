# Modern Dark Theme Design Systems Research (2025)

## 1. Color Palettes
Modern dark themes have moved away from pure black (`#000000`) to rich, deep grays with slight tinting (Zinc/Slate) to reduce eye strain and add depth.

### Recommended Tokens (Zinc/Neutral Base)
| Token | Hex/Tailwind | Usage |
|-------|--------------|-------|
| `bg-page` | `#09090b` (Zinc 950) | Main application background |
| `bg-surface` | `#18181b` (Zinc 900) | Cards, sidebars, modals |
| `bg-surface-hover` | `#27272a` (Zinc 800) | Hover states for list items |
| `border-subtle` | `#27272a` (Zinc 800) | Dividers, card borders |
| `border-active` | `#3f3f46` (Zinc 700) | Active inputs, selected items |

*Trend:* Use alpha channels for surfaces (e.g., `bg-zinc-900/50` + `backdrop-blur-xl`) to create depth and context awareness.

## 2. Gradients & Glow Effects
Moving beyond flat colors to lighting-based UI ("Luminescent UI").

### Hero Section Recipes
- **Spotlight Effect:** Radial gradient following cursor.
  `background: radial-gradient(600px circle at var(--x) var(--y), rgba(255,255,255,0.06), transparent 40%)`
- **Mesh Gradients:** Subtle animated background meshes.
  `bg-gradient-to-tr from-violet-900/20 via-zinc-900 to-zinc-900`
- **Border Glows:** Conic gradients on borders for emphasis.

## 3. Form Input Styling
Inputs should feel "carved out" or subtle until focused.

### Specifications
- **Background:** `bg-zinc-900/50` (Translucent)
- **Border:** `border border-zinc-800` (Subtle)
- **Focus State:**
  - Border lightens: `border-zinc-600`
  - Subtle Ring: `ring-2 ring-indigo-500/20` (Color match brand)
  - No hard outline, soft glow instead.
- **Placeholder:** `text-zinc-500`

## 4. Button Components
Hierarchy is established through brightness contrast rather than hue.

### Styles
| Type | Style | Tailwind Classes |
|------|-------|------------------|
| **Primary** | High Contrast | `bg-white text-black hover:bg-zinc-200 font-medium shadow-[0_0_20px_rgba(255,255,255,0.3)]` |
| **Secondary** | Surface Based | `bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700` |
| **Ghost** | Text Only | `text-zinc-400 hover:text-white hover:bg-white/5` |
| **Danger** | Red Tint | `text-red-400 hover:bg-red-500/10 hover:text-red-300` |

## 5. Typography & Accessibility
Contrast ratios are critical in dark mode.

### Recommendations (Inter/Sans)
- **Primary Text:** `text-zinc-100` (Opacity ~90-95%). Avoid pure white (`#FFFFFF`) to prevent halation.
- **Secondary Text:** `text-zinc-400` (Opacity ~60%).
- **Tertiary/Disabled:** `text-zinc-600` (Opacity ~40%).

### Font Weights
- Use slightly lighter weights for headings in dark mode to prevent them from looking too bold due to light bleed (optical illusion).
- **Body:** Regular (400)
- **Headings:** Medium (500) or SemiBold (600)

## Unresolved Questions
- Should we migrate existing `nebula` palette to standard `zinc` for better maintainability?
- Do we need to support high-contrast mode for accessibility beyond standard dark mode?
