# Scout Report: UI/UX Architecture & Patterns

## 1. Component Structure
- **Location**: `services/web/src/components/`
- **Pattern**: Feature-based modularity. Folders like `inbox-manager/` use nested `*-modules/` for sub-components and hooks.
- **Findings**: Very clean separation. However, layout components (`AppShell`, `MainLayout`, `ResponsiveLayout`) have redundant logic for navigation state and mobile detection.

## 2. Styling Approach
- **System**: "Nebula Glass" (Glassmorphism).
- **Files**: `design-tokens.css`, `nebula-glass.css`, `focus-stream.css`.
- **Pattern**: Heavy use of CSS variables for tokens and Tailwind for utility application.
- **Insights**: The system is visually sophisticated but relies on large CSS files that could be further integrated into Tailwind's config for better tree-shaking.

## 3. UI Logic Hooks
- **Location**: `services/web/src/hooks/`
- **Key Hooks**: `useSwipeActions`, `useBreakpoint`, `useModalAccessibility`, `useKeyboardShortcuts`.
- **Findings**: Strong focus on interaction quality. `useSwipeActions` enables native-feeling gestures on mobile.

## 4. Animations
- **Library**: `framer-motion` (via `utils/motion.ts`).
- **Implementation**: Optimized exports to ensure tree-shaking. Common variants (`fadeIn`, `slideUp`) are centralized.
- **Note**: CSS-based animations are also used for high-frequency background effects (`neo-blob-orb`).

## 5. Mobile Responsiveness
- **Logic**: Driven by `useBreakpoint.ts`.
- **Components**: `BottomSheet`, `PullToRefresh`, `SwipeableMessage`.
- **Pattern**: Layouts switch entirely between Desktop/Mobile versions rather than just reflowing.

## 6. Accessibility & Feedback
- **Utilities**: `utils/aria.ts` for ARIA IDs and live regions.
- **Loading**: Centralized `Skeleton.tsx` with `m.div` for shimmering effects.
- **Improvements**: Focus rings are defined but not universally applied to all custom interactive elements.

## Target Files for Modification
1. `services/web/src/layouts/AppShell.tsx`: Reduce layout redundancy.
2. `services/web/src/styles/nebula-glass.css`: Cleanup unused glass variants.
3. `services/web/src/components/ui/Button.tsx`: Improve touch-target sizing on mobile.
4. `services/web/src/components/Skeleton.tsx`: Add more granular skeleton types.
5. `services/web/src/utils/aria.ts`: Enhance keyboard navigation mapping.

## Unresolved Questions
1. Is there a shared state manager for global UI preferences (e.g., sidebar collapse) outside of `NavigationContext`?
2. Should glassmorphism effects be reduced on low-power devices (detected via hook)?
