# Brainstorm — Đổi domain manhquy.click → manhquy.id.vn

**Date:** 2026-07-10 · **Mode:** brainstorm · **Status:** CONVERGED → handoff Plan

## Problem statement
Đổi domain production từ `manhquy.click` sang `manhquy.id.vn`. Apex mới KHÔNG serve web; dùng subdomain (`app./api./mail./grafana.`). Domain hiện hardcode rải rác 142 file (62 file code runtime).

## Requirements (chốt)
- **Expected output:** toàn bộ runtime app + config + docs trỏ domain mới; app build/typecheck pass; hướng dẫn hạ tầng (DNS/proxy/env) kèm theo.
- **Acceptance:** login/CSRF cross-subdomain hoạt động trên `app./api.manhquy.id.vn`; extension gọi API mới không bị CORS/CSP chặn; 0 tham chiếu `manhquy.click` sót trong runtime source (trừ history/build artifacts).
- **Out of scope:** `plans/archive`, `plans/reports`, `docs/journals`, `log/`, `*.txt`, `buglog.md`, `blueprint.md`, `dist/`, `.output/` (history + regenerable).
- **Constraints:** KISS/YAGNI/DRY; giữ public contract SDK (giá trị literal); không đổi hành vi ngoài domain.
- **Touchpoints:** `services/**`, `packages/**`, `scripts/**`, `docs/**`, `docs-site/**`, `docker-compose.yml`, `.env.production.template`.

## Quyết định thiết kế
| Hạng mục | Chốt | Lý do |
|---|---|---|
| Mail domain | apex `manhquy.id.vn` (MX→`mail.manhquy.id.vn`) | Chuẩn ngành; inbox ngắn; apex chỉ cần MX+TXT, không A/web |
| Web canonical | `https://app.manhquy.id.vn` | Apex không serve web |
| Cookie parent | `.manhquy.id.vn` (fix logic) | Public-suffix `.id.vn` phá logic 2-label cũ |
| Chiến lược | **C — Hybrid** | Đau thật ở app runtime + cookie; SDK/docs/legal *nên* literal |

## Approaches đã cân nhắc
- **A Blanket replace thuần:** nhanh, KISS, nhưng không giải quyết gốc hardcode → lần sau đau lại. ❌ chọn.
- **B Centralize toàn bộ:** 1 nguồn config, nhưng over-engineer SDK/docs/legal (phải literal khi publish) + bề mặt vỡ rộng, vi phạm YAGNI. ❌ chọn.
- **C Hybrid (CHỌN):** app runtime (API/web/extension) đọc env/config + fix cookie logic 1 lần; SDK/CLI/openapi/emails/docs blanket replace literal. Lấy 90% lợi ích của B, 20% rủi ro.

## Rủi ro & mitigation
| Rủi ro | Mức | Mitigation |
|---|---|---|
| `getCookieDomain` tạo `.id.vn` → login vỡ | 🔴 Cao | Sửa logic: strip leftmost label, không lấy 2-label cuối; test cả `.click`/`.id.vn`/localhost |
| Sed dính `dist/` `.output/` artifacts | 🟡 TB | Loại khỏi target list; regenerate bằng build |
| Bare-apex `https://manhquy.click` bị đổi thành apex mới (sai) | 🟡 TB | Pass A riêng: bare-apex → `app.manhquy.id.vn` trước Pass B |
| TLS cert domain mới | 🟡 TB | Caddy auto-ACME khi DNS trỏ đúng; hoặc certbot |
| DNS/MX/SPF/DKIM/DMARC | 🟡 TB | Hướng dẫn record cụ thể; user tự set |
| Extension host_permissions/CSP + re-publish store | 🟡 TB | Sửa `wxt.config.ts` + rebuild; re-submit nếu đã publish |
| Telegram webhook trỏ domain cũ | 🟢 Thấp | Reset webhook `api.manhquy.id.vn` sau deploy |
| Reputation domain mới → deliverability | 🟢 Thấp | Ngoài phạm vi code; lưu ý warm-up + DMARC p=none ban đầu |
| Deploy method chưa chốt (PM2 vs Docker) | 🟡 TB | SSH read-only kiểm tra ở stage triển khai (cần `DEPLOY_SSH_PASSWORD`) |

## Success metrics
- `npx tsc --noEmit` (api + web) pass; `npm run build` (web + extension) pass.
- Grep runtime source: 0 hit `manhquy.click`.
- Cookie unit reasoning: `app.manhquy.id.vn`→`.manhquy.id.vn`, `app.manhquy.click`→`.manhquy.click`, localhost/IP→undefined.

## Next steps
Plan (phased) → Red-team plan → Validate → triển khai + infra guide.

## Unresolved
- Production PM2 hay Docker → cần SSH kiểm tra (đã có lệnh read-only).
- Extension đã publish store chưa (ảnh hưởng re-submit).
- `DEPLOY_SSH_PASSWORD` chưa có trong env → chưa SSH tự động được.
