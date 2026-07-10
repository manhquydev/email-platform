# Phase 06 — Infra guide + SSH verify deploy method

**Risk:** 🟡 · **Depends:** none (tài liệu); deploy thật sau Phase 05

## A. SSH verify deploy method (cần `DEPLOY_SSH_PASSWORD`)
Chạy read-only để chốt PM2 vs Docker + Caddy/Nginx + domain server hiện tại:
```
pm2 list; docker ps; systemctl is-active caddy nginx;
grep -rhoE '(DOMAIN|WEB_URL|API_URL|MAIL_DOMAIN)=[^ ]+' /root/email-platform*/.env* ;
ss -tlnp | grep -E ':(80|443|25|587|3001) '
```
→ Điều chỉnh bước deploy theo kết quả.

## B. DNS records (user tự set trên nhà cung cấp manhquy.id.vn)
| Type | Name | Value | Ghi chú |
|---|---|---|---|
| A | app | `165.22.48.193` | Web |
| A | api | `165.22.48.193` | API |
| A | mail | `165.22.48.193` | Mail host / SMTP banner |
| A | grafana | `165.22.48.193` | Monitoring |
| MX | @ (apex) | `mail.manhquy.id.vn` (prio 10) | Nhận mail @manhquy.id.vn |
| TXT | @ | `v=spf1 ip4:165.22.48.193 mx ~all` | SPF |
| TXT | _dmarc | `v=DMARC1; p=none; rua=mailto:dmarc@manhquy.id.vn` | DMARC (p=none lúc warm-up) |
| TXT | default._domainkey | DKIM (nếu bật outbound) | Từ Brevo/SES hoặc opendkim |

## C. Server .env update
Trên server, sửa `.env`(root) + `services/api/.env`:
```
DOMAIN=manhquy.id.vn
WEB_URL=https://app.manhquy.id.vn
API_URL=https://api.manhquy.id.vn
MAIL_DOMAIN=manhquy.id.vn
```

## D. Reverse proxy + TLS
- **Docker/Caddy:** Caddyfile dùng `{$DOMAIN}` → chỉ cần đổi env `DOMAIN` + `ACME_EMAIL`; Caddy auto-ACME cấp cert mới khi DNS trỏ đúng. `docker compose -f docker-compose.prod.yml up -d`.
- **PM2/Nginx:** cập nhật server_block sang subdomain mới + `certbot --nginx -d app.manhquy.id.vn -d api.manhquy.id.vn -d grafana.manhquy.id.vn`.

## E. Post-deploy
1. Reset Telegram webhook: `curl -X POST https://api.telegram.org/bot<TOKEN>/setWebhook -d url=https://api.manhquy.id.vn/telegram/webhook` (script `deploy_ssh.py` đã đổi sẵn).
2. Verify: `curl -I https://api.manhquy.id.vn/health`, đăng nhập `app.manhquy.id.vn` (kiểm cookie share).
3. Extension: nếu đã publish store → re-submit build mới (host_permissions đổi). Nếu unpacked → reload.
4. Gửi test email tới `<inbox>@manhquy.id.vn` xác nhận MX/ingest.
5. **Passkey/WebAuthn re-enroll (H2):** đổi domain đổi rpID → mọi passkey cũ vô hiệu. Thông báo user đăng ký lại passkey. (rpID: login user = `MAIL_DOMAIN` apex `manhquy.id.vn`; anonymous = webUrl host `app.manhquy.id.vn` — mismatch có sẵn, cân nhắc thống nhất ở pass sau.)
6. **manhquy.online (M1):** nếu giữ làm mail domain phụ → giữ MX/record + `EXTRA_DOMAINS` nguyên; nếu bỏ → xóa khỏi `docker-compose.prod.yml:192` + DNS.

## F. Giữ domain cũ tạm thời
Giữ `manhquy.click` DNS + cert 7 ngày để rollback; không xóa vội.
