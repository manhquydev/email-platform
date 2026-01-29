# Phase 01: i18n Setup

## Context Links
- [Plan](./plan.md)
- [Code Standards](../../docs/code-standards.md)

## Overview

Setup react-i18next for internationalization with Vietnamese (default) and English support. This is foundational for all error page translations.

## Key Insights

- No existing i18n in codebase - fresh setup required
- App currently has hardcoded Vietnamese text (e.g., ErrorBoundary, App.tsx skip link)
- react-i18next is industry standard for React i18n

## Requirements

1. Install react-i18next and i18next packages
2. Create i18n configuration with language detection
3. Create translation files for vi/en
4. Initialize i18n in main.tsx
5. Add error page translations namespace

## Architecture

```
services/web/src/
├── i18n/
│   ├── index.ts              # i18n config
│   └── locales/
│       ├── en.json           # English translations
│       └── vi.json           # Vietnamese translations
└── main.tsx                  # Import i18n/index.ts
```

**i18n Config Pattern:**
```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'vi',
    supportedLngs: ['vi', 'en'],
    ns: ['common', 'errors'],
    defaultNS: 'common',
    resources: { ... }
  });
```

## Related Code Files

- `services/web/src/main.tsx` - Entry point
- `services/web/package.json` - Dependencies

## Implementation Steps

1. Install dependencies: `yarn add react-i18next i18next i18next-browser-languagedetector`
2. Create `src/i18n/index.ts` with config
3. Create `src/i18n/locales/vi.json` with error translations
4. Create `src/i18n/locales/en.json` with error translations
5. Import i18n in `main.tsx` before React render
6. Test language switching works

## Todo List

- [ ] Install react-i18next, i18next, i18next-browser-languagedetector
- [ ] Create i18n/index.ts config file
- [ ] Create vi.json with error page translations
- [ ] Create en.json with error page translations
- [ ] Import i18n in main.tsx
- [ ] Verify language detection works

## Success Criteria

- [ ] `useTranslation()` hook available in components
- [ ] Language auto-detected from browser
- [ ] Manual language switch works via `i18n.changeLanguage()`
- [ ] Translations load without errors

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Bundle size increase | Medium | Low | ~15KB gzipped, acceptable |
| SSR hydration mismatch | N/A | N/A | SPA-only |

## Security Considerations

- No user input in translations - XSS not applicable
- Translation keys are static strings

## Next Steps

Proceed to Phase 02 (SVG Illustrations) after i18n is configured.
