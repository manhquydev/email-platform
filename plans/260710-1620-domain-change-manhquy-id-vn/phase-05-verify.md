# Phase 05 — Verify

**Risk:** 🟡 · **Depends:** 01–04

## Steps
0. **Dọn coverage artifacts (H1):** `rm -rf services/*/coverage` (gitignored, chứa domain cũ, làm sai gate).
1. **Grep-zero runtime source:**
   ```bash
   grep -rIl "manhquy\.click" services packages scripts \
     --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.output --exclude-dir=coverage | grep -vE '\.(txt)$'
   ```
   → rỗng (bỏ qua `dist/`, `.output/`, `coverage/`, history).
2. **Regenerate openapi (M2):** `cd services/api && npx ts-node scripts/generate-openapi.ts` rồi `npx vitest run src/test/openapi-contract.test.ts` (đường dẫn test xác nhận khi chạy).
3. **Typecheck API:** `cd services/api && npx tsc --noEmit`.
3. **Typecheck + build Web:** `cd services/web && npx tsc --noEmit && npm run build` (Vite sitemap + SEO dùng domain mới).
4. **Build Extension:** `cd services/extension && npm run build` → regenerate `.output` với host_permissions/CSP mới; xác nhận manifest `host_permissions` = `https://api.manhquy.id.vn/*`.
5. **Cookie reasoning check:** đọc `getCookieDomain`, xác nhận 3 case (`.id.vn`/`.click`/localhost).
6. **code-reviewer subagent:** review diff — không regress public contract (SDK signatures, API response, env keys), không sót hardcode, apex-web spots đúng `app.`.

## Acceptance
- Bước 1 rỗng; 2–4 pass; 6 không finding blocking.

## Nếu fail
Theo HARD-GATE-NO-SIDE-EFFECTS: STOP, báo file/nguyên nhân, đưa 2–4 lựa chọn cho user.
