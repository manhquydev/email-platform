# Chrome Extension UI/UX Design Patterns (2025)

## 1. Popup UI Design Guidelines
The popup is the primary entry point for quick interactions.

### Best Practices
- **Dimensions**: Optimize for the standard maximum of **800px height x 600px width**.
- **Minimalism**: Focus on a single primary task. Use progressive disclosure (accordions, tabs) for secondary features.
- **Boot Time**: Ensure <100ms render time. Avoid heavy framework initialization if possible; use pre-rendered HTML skeleton.
- **Context Awareness**: Show different states based on the active tab (e.g., "Active on this site" vs "Not available").
- **Navigation**: Avoid complex deep nesting. Use a flat hierarchy with a clear "Back" action.

### Anti-Patterns
- **Scrollbars**: Avoid horizontal scrolling entirely. Vertical scrolling should be limited; use sticky headers/footers for actions.
- **Heavy Load**: Don't perform heavy data fetching on open; cache data in `storage.local` and update in background.

## 2. Side Panel UX Patterns
Side panels offer a persistent, companion experience unlike transient popups.

### UX Patterns
- **Persistence**: Maintain state across tab switches. The panel should not reset when the user navigates the main window.
- **Contextual Relevance**: Update content dynamically based on the active tab using `chrome.tabs.onUpdated`.
- **Drag & Drop**: Allow users to drag elements from the web page into the side panel (e.g., collecting images, text snippets).
- **User Control**: Respect user preference for side panel position (left/right) via `chrome.sidePanel.setPanelBehavior`.

### Implementation Tips
- Use `chrome.sidePanel.open` to trigger programmatically from context menus or action clicks.
- Design for verticality: The UI must work well in narrow widths (min 320px).

## 3. Content Script UI Injection
Injecting UI directly into the webpage requires strict isolation to prevent style bleeding.

### Isolation Strategies
- **Shadow DOM**: **Mandatory** for modern extensions. Create a `shadowRoot` (open mode) and attach styles/elements there. This prevents the host page's CSS from breaking your UI and vice versa.
  ```javascript
  const host = document.createElement('div');
  const shadow = host.attachShadow({mode: 'open'});
  shadow.appendChild(styleElement); // Inject extension-specific CSS here
  shadow.appendChild(rootComponent);
  document.body.appendChild(host);
  ```
- **Iframe Injection**: Use for complex apps requiring full isolation or specific security contexts, though harder to make "seamless" visually.

### Positioning
- **Overlay**: Floating action buttons (FAB) or corner notifications.
- **Inline**: Injecting bars at the top (`document.body.prepend`) requires adjusting `body { margin-top }` to prevent covering content.

## 4. Accessibility (a11y) Compliance
Extensions must adhere to WCAG 2.1 Level AA standards.

### Checklist
- [ ] **Keyboard Navigation**: All interactive elements must be focusable (`tabindex="0"`) and have visible `:focus` states.
- [ ] **Contrast**: Text/background contrast ratio must be at least **4.5:1** (normal text) and **3:1** (large text/graphics).
- [ ] **Screen Readers**: Use semantic HTML (`<button>`, `<nav>`) and ARIA labels (`aria-label`, `aria-expanded`) for custom controls.
- [ ] **Text Resizing**: UI must support 200% zoom without breaking layout or functionality.
- [ ] **Motion**: Respect `prefers-reduced-motion` media query to disable auto-playing animations.

## 5. Theme & Dark Mode
Seamless integration with the user's OS and browser preference is expected.

### Implementation
- **Media Queries**: Use `@media (prefers-color-scheme: dark)` in CSS to automatically switch themes.
- **Color Palette**:
  - **Avoid Pure Black (#000000)**: Use dark greys (e.g., `#121212`) to reduce eye strain and smearing.
  - **Desaturation**: Desaturate primary colors in dark mode to pass contrast checks and reduce vibration.
  - **Elevation**: Use lighter surface overlays (not shadows) to express depth in dark mode.
- **Icons**: Ensure SVG icons adapt (active/inactive states) or use CSS filters (`filter: invert(1)`) for simple adaptations.

### Sources
- [Chrome Extension Design Docs](https://developer.chrome.com/docs/extensions/mv3/user_interface/)
- [Material Design - Dark Theme](https://m3.material.io/styles/color/theming)
- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)

---
**Unresolved Questions**
- Does the target audience primarily use high-contrast modes?
- Are there specific host permissions (sites) that block Shadow DOM injection?
