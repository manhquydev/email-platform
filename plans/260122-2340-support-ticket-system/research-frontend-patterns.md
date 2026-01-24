# Frontend Patterns Research: Support Ticket System

## 1. UI Component Patterns
- **Layout Structure**: Pages use a centralized layout with `min-h-screen`, `pt-24 pb-20`, and `neo-mesh-bg` class for the signature gradient background.
- **Card Containers**: `GlassCard` (from `components/ui/GlassCard`) is the standard container for content sections, providing the glassmorphism effect.
- **Inputs**: `Input` component (from `components/ui/Input`) supports `label`, `error`, `icon` (left/right), and `forwardRef` for form libraries.
- **Buttons**: `Button` component (from `components/ui/Button`) supports variants (`primary`, `secondary`, `ghost`), loading states (`isLoading`), and success states (`isSuccess`).
- **Animation**: Frequent use of `animate-fade-in-up` for entrance animations.

## 2. Form Handling Approach
- **Current Support Page**: `services/web/src/pages/Support.tsx` is currently a static shell with hardcoded HTML forms and Vietnamese text. It lacks state management and validation.
- **Best Practice (Admin Modules)**:
  - Logic is separated from UI (e.g., `useNotificationForm` hook in admin modules).
  - Forms should handle loading states (`busy` prop) and validation errors.
  - The `Input` component is designed to work well with library-managed refs or controlled state.

## 3. Admin Panel Structure
- **Modularization**: Complex pages are split into sub-modules (e.g., `admin-notification-modules`).
- **Separation of Concerns**:
  - `*-page.tsx`: Main page layout and data fetching.
  - `*-components.tsx`: Presentational components.
  - `*-hooks.ts`: Business logic and form handling.
  - `types.ts`: TypeScript definitions.

## 4. i18n Localization
- **Library**: `react-i18next` with `LanguageDetector`.
- **Structure**:
  - `services/web/src/i18n/locales/{lang}.json`.
  - Namespaces used: `common`, `errors`.
- **Issue**: Current `Support.tsx` uses hardcoded strings.
- **Requirement**: New localization keys should be added to `support` namespace or integrated into `common`.

## 5. Recommendations for Ticket UI
1.  **Modularize**: Create `services/web/src/pages/support-modules/` to house components and logic.
2.  **State Management**: Use `react-hook-form` + `zod` (if available) or custom hooks (`useSupportForm`) to manage form state, matching the pattern in Admin pages.
3.  **Localization**: Extract all hardcoded strings from `Support.tsx` into `i18n/locales/*.json` under a new `support` key.
4.  **Component Reuse**:
    - Use `GlassCard` for the form container.
    - Use `Input` and `Button` from `ui` folder.
    - Create a `TicketList` component for viewing history (if applicable).
5.  **API Integration**: Create a service function in `services/web/src/services/` (e.g., `supportService.ts`) to handle API calls, keeping the UI layer clean.
