---
parent: plan.md
priority: P1
status: pending
effort: 1h
---

# Phase 4: Extension CSP Fix

## Context
- **Issue:** `services/extension/wxt.config.ts:24` CSP missing `img-src` directive
- **Current CSP:** `script-src 'self'; object-src 'self'; connect-src 'self' https://api.manhquy.click`
- **Impact:** External images in emails blocked by browser
- **Risk:** Medium - broken email rendering, tracking pixels fail silently

## Key Insights
- Chrome MV3 CSP syntax requires explicit `img-src` for external images
- Emails contain: logos, avatars, tracking pixels, inline images
- Need to allow: `self`, `https:`, `data:` (base64 images)

## Related Code Files

### Modify
- `services/extension/wxt.config.ts` - Add img-src directive

## Implementation Steps

1. **Update CSP in wxt.config.ts**
   ```typescript
   content_security_policy: {
     extension_pages: "script-src 'self'; object-src 'self'; connect-src 'self' https://api.manhquy.click; img-src 'self' https: data:",
   },
   ```

2. **Rebuild extension**
   ```bash
   cd services/extension && npm run build
   ```

3. **Test in browser**
   - Load unpacked extension
   - Open email with external images
   - Verify images render correctly
   - Check console for CSP violations

4. **Test edge cases**
   - Emails with base64 inline images
   - Emails with HTTP images (should block or upgrade)
   - Avatar images from external domains

## Todo List
- [ ] Add `img-src 'self' https: data:` to CSP
- [ ] Rebuild extension
- [ ] Load in Chrome and test
- [ ] Verify external email images render
- [ ] Verify base64 images render
- [ ] Check no CSP console errors
- [ ] Test in Firefox (Gecko)
- [ ] Commit changes

## Success Criteria
- [ ] External images in emails render correctly
- [ ] Base64 inline images work
- [ ] No CSP violation errors in console
- [ ] Extension passes browser validation

## Security Considerations
- `https:` allows any HTTPS image source (acceptable for email)
- `data:` allows base64 encoded images (needed for inline)
- HTTP images intentionally blocked (security best practice)
- Consider adding specific domain allowlist if stricter control needed
