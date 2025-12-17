# Tài liệu khởi tạo dự án: Nền tảng Email theo Domain (inbox tạm/alias) tự quản lý

**Phiên bản:** 1.0 (Production Ready)  
**Cập nhật:** 2025-12-17  
**Trạng thái:** ✅ **PRODUCTION READY**  
**Domain:** [manhquy.click](https://manhquy.click)  
**Mục đích tài liệu:** Làm rõ ý tưởng, mức độ phức tạp, yêu cầu DNS (MX/TXT…), chi phí, và đề xuất công nghệ/kiến trúc để bắt đầu triển khai dự án.

---

## 📊 Tình trạng dự án hiện tại

### Đã hoàn thành ✅
| Thành phần | Trạng thái | Chi tiết |
|------------|------------|----------|
| **Backend API** | ✅ Complete | Fastify + Prisma + PostgreSQL |
| **SMTP Inbound** | ✅ Complete | smtp-server + mailparser |
| **Frontend Web** | ✅ Complete | React 19 + Vite + TailwindCSS |
| **UI/UX Overhaul** | ✅ Complete | Landing page, Auth pages, Dashboard, Admin |
| **SEO Optimization** | ✅ Complete | Meta tags, Open Graph, JSON-LD, sitemap.xml |
| **Mobile Responsive** | ✅ Complete | Hamburger menu, touch-friendly |
| **Admin Panel** | ✅ Complete | Users, Logs, Reports, Dashboard |
| **Authentication** | ✅ Complete | JWT + Email verification |
| **Bulk Actions** | ✅ Complete | Select, delete, mark read |
| **Docker Setup** | ✅ Complete | docker-compose.yml + prod config |
| **HTTPS (Caddy)** | ✅ Complete | Auto SSL với Let's Encrypt |
| **Monitoring** | ✅ Complete | Prometheus + Grafana |

### Cấu hình Production
| Thông tin | Giá trị |
|-----------|---------|
| **Domain** | manhquy.click |
| **Server IP** | 165.22.48.193 |
| **Private IP** | 10.104.0.2 |
| **Frontend** | https://app.manhquy.click |
| **API** | https://api.manhquy.click |
| **Grafana** | https://grafana.manhquy.click |

### Build Metrics
| Asset | Size | Gzipped |
|-------|------|---------|
| CSS | 107 KB | 18 KB |
| JavaScript | 727 KB | 217 KB |



---

## 1) Bối cảnh & vấn đề bạn đang gặp

Bạn có **domain riêng** và muốn tạo/quản lý email theo domain đó. Khi dùng các dịch vụ email bên ngoài (workspace/mail hosting/email API), thường sẽ gặp:

- Giới hạn số mailbox/alias theo domain hoặc theo gói.
- Tính phí theo user/mailbox/số lượng gửi.
- Không linh hoạt khi muốn tạo nhiều inbox “tạm thời” phục vụ test/QA/đăng ký dịch vụ.

Bạn muốn build **một website** để:
- Thoải mái add nhiều domain (bạn sở hữu).
- Tạo và quản lý email theo kiểu “inbox tạm / alias”, kiểu như “temp mail” (tức là tạo địa chỉ nhanh, xem mail nhận được, có thể tự huỷ/auto-expire).

> Lưu ý định hướng: nếu hệ thống này mở công khai kiểu “temp mail public”, rủi ro lạm dụng (spam/fraud) rất cao và dễ bị đưa vào blocklist → ảnh hưởng danh tiếng IP/domain. Vì vậy, khuyến nghị thiết kế ban đầu cho **mục đích hợp pháp**: QA/test, onboarding nội bộ, sandbox cho dev, hoặc cung cấp cho user đã xác minh.

---

## 2) Kết luận nhanh: Website có phức tạp không?

**Có thể từ “vừa” đến “rất phức tạp”** tuỳ phạm vi:

### A. Nhận email + xem trên web (Inbound-only inbox viewer) ✅ (MVP phù hợp)
- Bạn **chỉ cần nhận mail**, lưu lại và hiển thị trên website.
- **Không cần gửi email ra ngoài** (outbound).
- Ưu điểm: dễ hơn nhiều, ít vướng deliverability.
- Nhược điểm: nếu bạn cần “gửi xác nhận/đặt lại mật khẩu”, outbound là bắt buộc.

### B. Full email provider (Inbound + Outbound + IMAP/SMTP submission) ❗ (phức tạp)
- Vừa nhận vừa gửi, quản lý mailbox thật sự như Gmail/Zoho.
- Cần SPF/DKIM/DMARC, PTR/rDNS, chống spam, giám sát IP reputation, bảo mật, vận hành liên tục.
- Dễ rơi vào spam, bị block.

### C. Hybrid hợp lý (Inbound tự host + Outbound dùng dịch vụ gửi) ✅
- Nhận mail: tự host (đúng ý tưởng “temp inbox”).
- Gửi mail: dùng SES/Mailgun/SendGrid… (giảm rủi ro deliverability).
- Đây thường là điểm “ngon” nhất giữa chi phí và độ ổn định.

---

## 3) Có cần mua/cấu hình MX, TXT không? (Sự thật kỹ thuật)

### 3.1. Bạn **không “mua” MX/TXT**  
Bạn chỉ cần **quyền quản trị DNS** của domain (thường có sẵn khi mua domain).  
DNS record là cấu hình kỹ thuật để internet biết mail của domain phải đi đâu.

### 3.2. Record tối thiểu để **NHẬN** mail (Inbound)
- **MX**: bắt buộc để internet route email về mail server của bạn.
- **A/AAAA** cho hostname mail (ví dụ `mail.yourdomain.com`) để trỏ về IP server.

Nếu không có MX, mail của domain sẽ không được gửi về server của bạn.

### 3.3. Record để **GỬI** mail (Outbound) & tăng deliverability
Nếu bạn có outbound, bạn gần như sẽ cần:
- **SPF (TXT)**: khai báo server nào được phép gửi thay domain.
- **DKIM (TXT)**: ký email để chứng minh email không bị sửa và đúng domain.
- **DMARC (TXT)**: policy hướng dẫn bên nhận xử lý nếu SPF/DKIM fail + nhận báo cáo.

Ngoài ra (khuyến nghị nâng cao):
- **PTR/rDNS** (reverse DNS) cho IP gửi mail.
- **MTA-STS (TXT + HTTPS policy)** và **TLS-RPT (TXT)** để cải thiện TLS giữa các MTA.

---

## 4) Mục tiêu sản phẩm (Product Scope)

### 4.1. Mục tiêu (Goals)
- Quản lý nhiều domain (multi-tenant): add/xoá domain, xác minh ownership.
- Tạo inbox/địa chỉ email nhanh (alias/disposable) theo domain.
- Nhận email và hiển thị web UI theo từng inbox.
- Tìm kiếm email, xem nội dung HTML/text, tải attachment.
- TTL/Retention: tự xoá email sau X giờ/ngày (tuỳ nhu cầu).
- API/Webhook cho automation test (ví dụ: đợi mail OTP đến → lấy mã).

### 4.2. Không nằm trong phạm vi ban đầu (Non-goals)
- Không hướng đến công cụ né tránh xác minh/truy cập trái phép.
- Không cung cấp công khai “mở toang” không kiểm soát (trừ khi bạn có đội vận hành anti-abuse mạnh).
- Không làm IMAP/POP3 ngay từ MVP (có thể bổ sung sau).

---

## 5) Kiến trúc tổng quan đề xuất (MVP ưu tiên Inbound-only)

### 5.1. Luồng nhận email (Inbound Pipeline)
1) Email từ internet → SMTP đến **MTA nhận** (ví dụ Postfix)  
2) MTA chuyển email đến **Message Ingestion Service** (LMTP/pipe/webhook nội bộ)  
3) Service parse mail (headers/body/attachments) → lưu trữ  
4) Web App hiển thị inbox theo địa chỉ/email alias

### 5.2. Thành phần chính
- **MTA nhận mail:** Postfix (phổ biến, ổn định)
- **Spam/virus filtering (tuỳ chọn MVP):** Rspamd/ClamAV
- **Backend API:** Node.js (NestJS) / Python (FastAPI) / Go (Gin/Fiber)
- **DB:** PostgreSQL (metadata), Redis (queue/cache)
- **Storage:** S3-compatible (MinIO) hoặc disk (MVP nhỏ)
- **Queue:** BullMQ (Redis) / RabbitMQ / Kafka (tuỳ scale)
- **Frontend:** React/Vue + SSR (Next/Nuxt) hoặc SPA
- **Auth:** JWT/OAuth2, RBAC (Admin/User), audit log
- **Reverse proxy + TLS:** Nginx/Caddy + Let’s Encrypt

---

## 6) Thiết kế tính năng “temp mail / alias” đúng cách (đỡ rủi ro)

### 6.1. Mô hình địa chỉ
- **Catch-all domain**: mọi địa chỉ `anything@yourdomain.com` đều nhận được  
  → phù hợp cho “tạo inbox tức thì”.
- **Recipient delimiter**: ví dụ `user+tag@domain.com` để tạo alias có cấu trúc.
- **Whitelisted patterns**: chỉ cho phép alias theo rule (giảm lạm dụng).

### 6.2. Vòng đời inbox
- Auto-create inbox khi có mail đến lần đầu.
- TTL: tự huỷ inbox/email sau X giờ/ngày.
- Quota: giới hạn số email/attachment per inbox.

### 6.3. Chống lạm dụng tối thiểu (nên có ngay từ đầu nếu public)
- Rate limit theo IP / theo domain.
- CAPTCHA khi tạo inbox (nếu mở public).
- Blocklist từ khoá/nguồn gửi (basic).
- Abuse report endpoint + logging đầy đủ.

---

## 7) DNS & cấu hình mẫu (minh hoạ)

> Đây là ví dụ minh hoạ. Khi triển khai bạn cần thay domain/IP cho đúng.

### 7.1. Nhận mail (Inbound)
- `A` record:
  - `mail.yourdomain.com -> <IP_SERVER>`
- `MX` record:
  - `yourdomain.com MX 10 mail.yourdomain.com.`

### 7.2. Nếu có outbound (khuyến nghị)
- `TXT` SPF (ví dụ cơ bản):
  - `yourdomain.com TXT "v=spf1 mx -all"`
- `TXT` DKIM (selector ví dụ: `s1`):
  - `s1._domainkey.yourdomain.com TXT "v=DKIM1; k=rsa; p=..."`
- `TXT` DMARC:
  - `_dmarc.yourdomain.com TXT "v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com"`

### 7.3. Bổ sung bảo mật (tuỳ chọn nâng cao)
- MTA-STS: TXT `_mta-sts.yourdomain.com` + host `mta-sts.yourdomain.com` phục vụ policy HTTPS
- TLS-RPT: TXT `_smtp._tls.yourdomain.com`

---

## 8) Hạ tầng triển khai & vận hành

### 8.1. Yêu cầu thực tế khi host mail server
- Cần **server có IP public** ổn định.
- Cần mở port SMTP phù hợp (ít nhất inbound 25 cho nhận mail; outbound cần 25/465/587 tuỳ).
- Nhiều cloud provider chặn SMTP mặc định để chống spam → phải chọn nhà cung cấp phù hợp hoặc dùng dịch vụ gửi mail bên ngoài.

### 8.2. Triển khai
- Docker Compose cho MVP:
  - `web` (frontend)
  - `api` (backend)
  - `postgres`
  - `redis`
  - `minio` (tuỳ chọn)
  - `postfix` (smtp-in)
  - `rspamd` (tuỳ chọn)
- Monitoring:
  - Prometheus + Grafana (metrics)
  - Loki/ELK (logs)
  - Alerting (email/telegram)

---

## 9) Chi phí cần chuẩn bị & “có thể build free không?”

### 9.1. Các khoản gần như chắc chắn
- **Domain**: phí thường niên (tuỳ TLD/registrar).
- **Server/VPS**: để chạy MTA + web + DB.
- **Storage/backup**: nếu bạn lưu mail + attachment.
- **Thời gian vận hành**: cập nhật bảo mật, theo dõi abuse, sự cố deliverability.

### 9.2. “Build free” có khả thi?
- Nếu chỉ làm demo nội bộ, có thể tận dụng free tier/credits, nhưng thường sẽ gặp:
  - Giới hạn tài nguyên.
  - Chặn SMTP (đặc biệt outbound).
  - Không ổn định dài hạn.
- Thực tế: **“free hoàn toàn” rất khó** nếu bạn muốn chạy thật, lâu dài, và nhận/gửi ổn định.

### 9.3. Gợi ý tiết kiệm & thực dụng
- MVP inbound-only: 1 VPS là đủ cho quy mô nhỏ.
- Outbound: dùng email API (SES/Mailgun/SendGrid…) để giảm rủi ro deliverability và vận hành.

---

## 10) Lộ trình triển khai (Roadmap)

### Phase 0 — Proof of Concept (1–3 ngày)
- Nhận email cho 1 domain và hiển thị được danh sách email trên web UI (thô).
- Lưu được subject/from/date/body.

### Phase 1 — MVP (1–2 tuần)
- Multi-domain + verify domain ownership (TXT verify).
- Inbox theo địa chỉ (catch-all + mapping).
- API lấy mail + filter + search cơ bản.
- TTL/Retention & xoá email tự động.
- Authentication + Admin panel tối thiểu.

### Phase 2 — Production-ready inbound (2–4 tuần)
- Anti-abuse: rate limit, quota, audit log.
- Attachment storage (S3/MinIO).
- Spam filter cơ bản.
- Observability: metrics/logs/alerts.
- Backup & restore.

### Phase 3 — Outbound (tuỳ nhu cầu)
- Tích hợp SES/Mailgun/SendGrid để gửi.
- UI quản lý template + webhook bounce/complaint.
- Thiết lập SPF/DKIM/DMARC theo từng domain.

---

## 11) Mô hình dữ liệu đề xuất (Data Model)

- `domains`
  - id, name, status(verified/pending), verification_token, created_at
- `inboxes`
  - id, domain_id, address_local_part, created_at, expires_at, flags
- `messages`
  - id, inbox_id, message_id, from, to, subject, received_at, text_body, html_body, headers(json), spam_score, size
- `attachments`
  - id, message_id, filename, mime_type, size, storage_key
- `users`
  - id, email, password_hash / oauth_provider, role
- `audit_logs`
  - id, user_id, action, meta(json), created_at

---

## 12) API phác thảo (cho dev bắt đầu)

- `POST /auth/login`
- `GET /domains`
- `POST /domains` (tạo domain + trả về TXT verify)
- `POST /domains/:id/verify`
- `GET /inboxes?domain=...`
- `POST /inboxes` (tạo inbox thủ công hoặc cho phép auto-create)
- `GET /inboxes/:id/messages`
- `GET /messages/:id`
- `DELETE /messages/:id`
- `POST /webhooks/test-wait-email` (tuỳ chọn cho QA automation)

---

## 13) Công nghệ gợi ý (2 hướng)

### Hướng 1: Tự xây MVP inbound (linh hoạt nhất)
- Postfix (SMTP inbound) + service ingest (Node/Go/Python) + PostgreSQL + S3/MinIO + Web UI.

### Hướng 2: Dựa trên nền tảng open-source kiểu “self-hosted Mailgun/Sendgrid”
- Dùng Postal (có web UI/logs mạnh), rồi build lớp “domain/inbox temp” + API phía trước (tuỳ biến theo ý tưởng của bạn).

---

## 14) Rủi ro & cách giảm rủi ro

- **Abuse/spam**: bắt buộc có quota/rate-limit nếu public.
- **Bị block SMTP từ nhà cung cấp**: chọn provider phù hợp hoặc outbound qua dịch vụ email API.
- **Bảo mật**: mail là dữ liệu nhạy cảm → cần TLS, phân quyền, audit log, backup.
- **Deliverability outbound**: khó nếu tự gửi; hybrid outbound sẽ an toàn hơn.

---

## 15) Tài liệu tham khảo (để team tra cứu khi triển khai)

- Amazon SES Pricing: https://aws.amazon.com/ses/pricing/
- DigitalOcean Droplet Pricing: https://www.digitalocean.com/pricing/droplets
- DigitalOcean SMTP Blocked: https://docs.digitalocean.com/support/why-is-smtp-blocked/
- SPF (RFC 7208): https://www.rfc-editor.org/rfc/rfc7208
- DKIM (RFC 6376): https://www.rfc-editor.org/rfc/rfc6376
- DMARC (RFC 7489): https://www.rfc-editor.org/rfc/rfc7489
- Gmail sender guidelines (2024+): https://support.google.com/a/answer/81126
- Yahoo Sender Hub best practices: https://senders.yahooinc.com/best-practices/
- Microsoft email authentication overview: https://learn.microsoft.com/defender-office-365/email-authentication-about
- PTR for SMTP banner check (Azure): https://learn.microsoft.com/azure/virtual-network/create-ptr-for-smtp-service
- Let’s Encrypt: https://letsencrypt.org/
- MTA-STS (RFC 8461): https://www.rfc-editor.org/rfc/rfc8461
- SMTP TLS Reporting (RFC 8460): https://www.rfc-editor.org/rfc/rfc8460
- Postal (GitHub): https://github.com/postalserver/postal
- Postal docs: https://docs.postalserver.io/
