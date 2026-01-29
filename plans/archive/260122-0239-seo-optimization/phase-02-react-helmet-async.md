# Phase 2: React Helmet Async for Dynamic Meta Tags

## Overview
- **Priority:** P1
- **Status:** pending
- **Effort:** 2h

Add react-helmet-async for per-route meta tags.

## Key Insights
- Current: Static meta in index.html (same for all routes)
- Problem: Login page shows homepage description in search results
- Solution: react-helmet-async updates <head> per route

## Requirements
- Each public route has unique title/description
- Canonical URLs per route
- OG/Twitter tags update per route

## Implementation Steps

1. **Install dependency**
   ```bash
   cd services/web && npm install react-helmet-async
   ```

2. **Wrap App in HelmetProvider**
   ```tsx
   // src/main.tsx
   import { HelmetProvider } from 'react-helmet-async';

   <HelmetProvider>
     <App />
   </HelmetProvider>
   ```

3. **Create SEO component**
   ```tsx
   // src/components/SEOHead.tsx
   interface SEOProps {
     title: string;
     description: string;
     path?: string;
   }
   ```

4. **Add to public routes**
   - Landing page: "Ephemera - Email Tạm Thời Chuyên Nghiệp"
   - Login: "Đăng Nhập | Ephemera"
   - Register: "Đăng Ký | Ephemera"

5. **Update i18n for meta tags**
   - Add translation keys for page titles/descriptions

## Files to Modify
- `services/web/src/main.tsx`
- `services/web/src/pages/LandingPage.tsx`
- `services/web/src/pages/LoginPage.tsx`
- `services/web/src/pages/RegisterPage.tsx`

## Files to Create
- `services/web/src/components/seo/SEOHead.tsx`

## Success Criteria
- [ ] Each page has unique <title> in browser tab
- [ ] View source shows correct meta per route
- [ ] i18n translations work for both vi/en
