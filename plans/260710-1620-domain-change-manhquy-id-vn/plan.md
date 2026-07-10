---
title: Đổi domain manhquy.click → manhquy.id.vn
status: code-complete
verified: api-tsc-pass, web-tsc-pass, web-build-pass, openapi-regenerated, grep-zero-clean, sanity-grep-clean
blocked: extension-build (pre-existing missing src/background/network-interceptor.ts, unrelated to domain change)
created: 2026-07-10
branch: chore/domain-manhquy-id-vn
strategy: C-Hybrid
brainstorm: ./brainstorm-domain-change-report.md
---

# Đổi domain: manhquy.click → manhquy.id.vn (Hybrid)

## Mục tiêu & acceptance
- Runtime app + config + docs trỏ domain mới; `tsc --noEmit` (api+web) + `build` (web+extension) pass.
- Login/CSRF cross-subdomain OK trên `app./api.manhquy.id.vn`; extension không bị CORS/CSP chặn.
- 0 tham chiếu `manhquy.click` trong runtime source (trừ history/build artifacts).

## Setup chốt
Web/canonical `app.` · API `api.` · Grafana `grafana.` · Mail host `mail.` · MAIL_DOMAIN apex `manhquy.id.vn` · Cookie parent `.manhquy.id.vn`.

## Chiến lược C — Hybrid
- **App runtime (API/web/extension):** đọc env/config; chỉ sửa fallback hardcode + cookie logic + extension build-time/CSP.
- **SDK/CLI/openapi/emails/docs:** blanket replace literal (giá trị public *nên* hardcode).

## Rủi ro #1 (bắt buộc, không chỉ replace)
`services/api/src/routes/auth/auth-cookies.ts` `getCookieDomain`: đổi từ `parts.slice(-2)` → strip leftmost label (`parts.slice(1)` khi ≥3 label; `="."+hostname` khi =2; localhost/IP→undefined). Tránh cookie `.id.vn` (public suffix) bị browser reject.

## EXCLUDE khỏi mọi replace
`node_modules/`, `.git/`, `**/dist/`, `**/coverage/`, `services/extension/.output/`, `plans/archive/`, `plans/reports/`, `plans/260710-1620-*` (plan này), `docs/journals/`, `log/`, `*.txt`, `buglog.md`, `blueprint.md`, `repomix-output.xml`.
> **coverage/** (H1 red-team): gitignored + untracked nhưng đang có trong working tree với domain cũ → PHẢI exclude khỏi grep/sed, nếu không gate grep-zero (Phase 05) fail giả. Khuyến nghị `rm -rf **/coverage` trước verify.

## Generated artifacts — regenerate, KHÔNG hand-edit (M2 red-team)
`services/api/openapi/openapi.{json,yaml}` sinh từ `src/openapi/registry.ts` qua `scripts/generate-openapi.ts`. → Chỉ sửa `registry.ts` (Pass A contact.url→app., Pass B server→api.), rồi regenerate; LOẠI 2 artifact khỏi sed. Phase 05 chạy generate + contract test.

## Verified non-issues (đừng đụng)
- `Caddyfile`, `docker-compose.prod.yml` đã `${DOMAIN}`-driven → không literal replace.
- `.github/workflows/deploy.yml` domain ≠ web domain (DB relay) → không đụng.
- `k8s/ingress-hpa.yaml` dùng placeholder `example.com` → ngoài phạm vi.

## Kỹ thuật replace 2-pass (trên target list đã lọc)
- **Pass A:** `https?://manhquy\.click` → `https://app.manhquy.id.vn` (bare-apex web base: SEO/openapi/vite/robots/extension upgradeUrl).
- **Pass B:** còn lại `manhquy\.click` → `manhquy.id.vn` (api./app./mail./grafana./emails/MAIL_DOMAIN/prose/cookie-comment).
- Thứ tự A trước B để không biến bare-apex thành apex mới sai.

## Phases
| # | File | Tóm tắt | Risk |
|---|------|---------|------|
| 01 | [phase-01-cookie-and-runtime-config.md](./phase-01-cookie-and-runtime-config.md) | Cookie logic + app runtime fallbacks + extension config/CSP + apex-web spots | 🔴 |
| 02 | [phase-02-blanket-replace-literals.md](./phase-02-blanket-replace-literals.md) | 2-pass replace SDK/CLI/openapi/emails/web-content | 🟡 |
| 03 | [phase-03-env-compose-defaults.md](./phase-03-env-compose-defaults.md) | .env.production.template, docker-compose, .env.example | 🟡 |
| 04 | [phase-04-docs.md](./phase-04-docs.md) | README, deploy guides, docs-site, overview/roadmap | 🟢 |
| 05 | [phase-05-verify.md](./phase-05-verify.md) | typecheck, builds, grep-zero, code-reviewer | 🟡 |
| 06 | [phase-06-infra-guide.md](./phase-06-infra-guide.md) | DNS/proxy/env/webhook guide + SSH verify deploy method | 🟡 |

## Dependencies
01 độc lập (logic). 02–04 chạy được song song sau khi 01 xử bare-apex spots. 05 sau 01–04. 06 độc lập (tài liệu) nhưng deploy thật sau 05.

## Đã chốt (Validate)
- **manhquy.online → manhquy.id.vn**: sửa `docker-compose.prod.yml:192` `EXTRA_DOMAINS` (Phase 03).
- **rpID unify → apex `manhquy.id.vn`**: `anonymous-auth.ts` đổi từ `new URL(webUrl).hostname` (app.) sang cùng nguồn apex như `webauthn.ts` (`appConfig.mailDomain`); DRY 1 nguồn rpID (Phase 01). User re-enroll passkey (thông báo Phase 06).

## Unresolved (không chặn code change)
- PM2 vs Docker (cần SSH; `DEPLOY_SSH_PASSWORD` chưa có).
- Extension đã publish store chưa.
