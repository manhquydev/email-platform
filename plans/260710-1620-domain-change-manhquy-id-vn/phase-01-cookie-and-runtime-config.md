# Phase 01 — Cookie logic + apex-web spots + runtime fallbacks

**Risk:** 🔴 (cookie logic) · **Depends:** none

## Context
- `services/api/src/routes/auth/auth-cookies.ts` — `getCookieDomain` dùng `parts.slice(-2)`.
- App runtime domain phần lớn env-driven (`WEB_URL/API_URL/DOMAIN/VITE_API_BASE`); chỉ fallback hardcode.

## 1. Fix getCookieDomain (code change, KHÔNG phải replace chuỗi)
Thêm optional env override `COOKIE_DOMAIN` (M3 red-team: chống trường hợp WEB_URL=apex 3-label `.id.vn` → strip cho `.id.vn` public-suffix, browser reject):
```ts
const override = process.env.COOKIE_DOMAIN?.trim();
if (override) return override.startsWith(".") ? override : "." + override;
const { hostname } = new URL(appConfig.webUrl);
if (hostname === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return undefined;
const parts = hostname.split(".");
if (parts.length < 2) return undefined;
if (parts.length === 2) return "." + hostname;          // apex web host (rare)
return "." + parts.slice(1).join(".");                   // subdomain web → shared parent
```
Cập nhật doc-comment ví dụ `.manhquy.click` → `.manhquy.id.vn` + note public-suffix + COOKIE_DOMAIN.

Kết quả mong đợi:
- `app.manhquy.id.vn` → `.manhquy.id.vn` ✅
- `app.manhquy.click` → `.manhquy.click` ✅ (không regress)
- `localhost` / IP → `undefined` ✅

## 2. Apex-web spots → `https://app.manhquy.id.vn` (Pass A, làm trước Pass B)
Các chỗ bare-apex `https://manhquy.click` (là URL website chính, KHÔNG phải apex mới):
- `services/web/src/components/seo/SEOHead.tsx` (BASE_URL)
- `services/web/index.html` (~11 ref: canonical, hreflang, og:url/og:image, twitter, JSON-LD) — L1 red-team, chỗ nhiều nhất
- `services/web/vite.config.ts` (sitemap hostname)
- `services/web/public/robots.txt` (Sitemap: URL)
- `services/api/src/openapi/registry.ts` (contact.url — chỉ dòng contact, KHÔNG dòng server `api.`)
- `services/api/src/routes/extension.ts` (upgradeUrl `.../pricing`)
> **openapi.{yaml,json} KHÔNG hand-edit** (M2): sinh từ registry.ts. Sửa registry.ts rồi regenerate ở Phase 05. LOẠI 2 file này khỏi mọi sed.
> Pass A/B thực chất áp bằng sed toàn `services` ở Phase 02; danh sách này để verify thủ công (manifest/CSP/SEO/openapi nhạy).

## 3. Extension (literal đúng — build artifact tới user, không đọc env server)
- `services/extension/src/shared/config.ts`: `API_URL`, `WEB_URL` → domain mới (`api.`/`app.`).
- `services/extension/wxt.config.ts`: `host_permissions` `https://api.manhquy.id.vn/*` + CSP `connect-src` `https://api.manhquy.id.vn`.
→ 2 & 3 phần lớn được Pass A/B xử; verify thủ công vì manifest/CSP nhạy.

## 4. Unify WebAuthn rpID → apex (H2, đã chốt Validate)
- `services/api/src/routes/webauthn.ts:19`: `rpID = appConfig.mailDomain` (apex `manhquy.id.vn`) — GIỮ nguồn này.
- `services/api/src/routes/anonymous-auth.ts:41-42`: đổi `getRpId()` từ `new URL(appConfig.webUrl).hostname` (app.) → `appConfig.mailDomain` (apex) để 2 flow cùng rpID. Đọc file xác nhận origin vẫn `app.` (rpID=apex là suffix hợp lệ của origin app.). DRY: cùng nguồn `mailDomain`.

## Validation
- `cd services/api && npx tsc --noEmit` không lỗi ở auth-cookies / webauthn / anonymous-auth.
- Đọc lại spot Pass A xác nhận `app.` (không phải apex).
- Xác nhận `webauthn.ts` và `anonymous-auth.ts` cùng trả rpID = `manhquy.id.vn`.

## Rollback
`git checkout -- <file>` từng file; cookie logic độc lập, revert an toàn.
