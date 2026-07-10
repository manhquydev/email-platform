# Phase 03 — Env & compose defaults

**Risk:** 🟡 · **Depends:** none (song song với 02)

## Files
- `.env.production.template`: header comment, `WEB_URL=https://app.manhquy.id.vn`, `API_URL=https://api.manhquy.id.vn`, `MAIL_DOMAIN="manhquy.id.vn"`.
- `docker-compose.yml`: defaults `DOMAIN:-manhquy.id.vn`, `WEB_URL:-https://app.manhquy.id.vn`, `VITE_API_BASE:-https://api.manhquy.id.vn`.
- `docker-compose.prod.yml:192`: `EXTRA_DOMAINS: manhquy.online` → `manhquy.id.vn` (M1 migrate, đã chốt). Đây là literal DUY NHẤT cần sửa trong prod compose (phần còn lại `${DOMAIN}`-driven).
- `services/api/.env.example`, `services/mobile/.env.example`: mọi domain → mới.

## Replace
Áp Pass A+B (như Phase 02) lên đúng 4 file này (bare-apex không có ở đây; chủ yếu subdomained + MAIL_DOMAIN apex).
Xác nhận `MAIL_DOMAIN` = `manhquy.id.vn` (apex, KHÔNG `mail.`).

## Lưu ý
- KHÔNG đổi `DEFAULT_ADMIN_EMAIL="manhquydev@gmail.com"` (gmail, không phải domain dự án).
- Không tạo/sửa `.env` thật (secrets) — chỉ template/example. `.env` server do user cập nhật (Phase 06 guide).

## Validation
`grep -rI "manhquy\.click" .env.production.template docker-compose.yml services/api/.env.example services/mobile/.env.example` → rỗng.
