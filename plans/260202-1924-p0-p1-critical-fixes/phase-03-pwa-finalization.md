---
parent: plan.md
priority: P1
status: pending
effort: 2h
---

# Phase 3: PWA Finalization

## Context
- **Issue:** PWA implementation exists but uncommitted
- **Uncommitted files:**
  - `services/web/src/components/InstallPrompt.tsx`
  - `services/web/src/components/OfflineBanner.tsx`
  - `services/web/public/pwa-192x192.svg`
  - `services/web/public/pwa-512x512.svg`
  - `services/web/src/lib/` (new folder)
  - `services/api/src/services/web-push-service.ts`
- **Impact:** Work may be lost, features not deployed

## Key Insights
- `vite-plugin-pwa` already installed (v1.2.0)
- PWA icons created (192x192, 512x512)
- Install prompt and offline banner components exist
- Web push service backend created

## Related Code Files

### Review & Test
- `services/web/src/components/InstallPrompt.tsx`
- `services/web/src/components/OfflineBanner.tsx`
- `services/web/src/lib/*`
- `services/web/vite.config.ts` (PWA config)
- `services/api/src/services/web-push-service.ts`

### Verify
- `services/web/public/manifest.json` or equivalent
- Service worker registration

## Implementation Steps

1. **Review uncommitted changes**
   ```bash
   git diff services/web/
   git diff services/api/src/services/web-push-service.ts
   ```

2. **Verify PWA manifest** - Check icons, name, start_url

3. **Test PWA locally**
   - Run `npm run build` in services/web
   - Serve with preview server
   - Check Chrome DevTools > Application > Manifest
   - Verify "Install" prompt appears

4. **Test offline functionality**
   - Enable offline mode in DevTools
   - Verify OfflineBanner appears
   - Check cached routes work

5. **Run test suite**
   ```bash
   cd services/web && npm test
   ```

6. **Commit changes** with proper message
   ```bash
   git add services/web/src/components/InstallPrompt.tsx
   git add services/web/src/components/OfflineBanner.tsx
   git add services/web/public/pwa-*.svg
   git add services/web/src/lib/
   git add services/api/src/services/web-push-service.ts
   git commit -m "feat(pwa): add install prompt, offline banner, and web push service"
   ```

## Todo List
- [ ] Review InstallPrompt.tsx implementation
- [ ] Review OfflineBanner.tsx implementation
- [ ] Verify PWA manifest configuration
- [ ] Test PWA install on Chrome
- [ ] Test offline mode functionality
- [ ] Run web test suite
- [ ] Run API test suite
- [ ] Commit all PWA-related changes
- [ ] Verify Lighthouse PWA score

## Success Criteria
- [ ] PWA installable on Android/iOS
- [ ] Offline banner shows when disconnected
- [ ] All tests pass
- [ ] Changes committed to git
- [ ] Lighthouse PWA score ≥ 80

## Risk Assessment
- **Risk:** PWA breaks existing functionality
- **Mitigation:** Full test suite before commit
