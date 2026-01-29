# Phase 1: OG Image and Assets

## Overview
- **Priority:** P1
- **Status:** ✅ done (2026-01-22)
- **Effort:** 1h

Create missing og-image.png and verify all referenced assets exist.

## Key Insights
- index.html references `og-image.png` and `logo.png` but files don't exist
- OG image dimensions: 1200x630px (Facebook/LinkedIn optimal)
- Twitter card uses same image

## Implementation Steps

1. **Create og-image.png (1200x630)**
   - Use Ephemera branding (dark theme, nebula glass aesthetic)
   - Include: Logo, tagline "Email Tạm Thời Chuyên Nghiệp"
   - Save to: `services/web/public/og-image.png`

2. **Create logo.png**
   - Export from existing favicon.svg or design
   - Size: 512x512 (recommended for JSON-LD)
   - Save to: `services/web/public/logo.png`

3. **Verify apple-touch-icon.png exists**
   - Check: `services/web/public/apple-touch-icon.png`
   - Create 180x180 if missing

4. **Test social previews**
   - Use: https://developers.facebook.com/tools/debug/
   - Use: https://cards-dev.twitter.com/validator

## Files to Create
- `services/web/public/og-image.png`
- `services/web/public/logo.png`

## Success Criteria
- [ ] og-image.png exists (1200x630)
- [ ] logo.png exists (512x512)
- [ ] Facebook debugger shows correct preview
- [ ] Twitter card validator passes
