# Hướng dẫn Triển khai

Tài liệu này hướng dẫn cách triển khai Nền tảng Email lên môi trường production (VPS/Cloud Server).

## Yêu cầu

- **Server**: Một VPS với IP tĩnh công khai (ví dụ: DigitalOcean Droplet, AWS EC2, Hetzner).
  - Cấu hình đề xuất: 2 vCPU, 4GB RAM (cho full stack + monitoring).
  - OS: Ubuntu 22.04 LTS (khuyên dùng).
- **Domain**: Bạn cần một tên miền (ví dụ: `yourdomain.com`).
- **Quyền quản lý DNS**: Quyền truy cập để quản lý các bản ghi DNS cho domain của bạn.
- **Docker & Docker Compose**: Đã được cài đặt trên server.

## 1. Cấu hình DNS

Trước khi triển khai, hãy cấu hình các bản ghi DNS trỏ về địa chỉ IP của VPS.

### Inbound Mail (Nhận thư)
| Loại | Host | Giá trị | Độ ưu tiên | Ghi chú |
|---|---|---|---|---|
| A | mail | `<YOUR_SERVER_IP>` | | Trỏ `mail.yourdomain.com` về IP của bạn |
| A | api | `<YOUR_SERVER_IP>` | | Trỏ `api.yourdomain.com` về IP của bạn |
| A | app | `<YOUR_SERVER_IP>` | | Trỏ `app.yourdomain.com` về IP của bạn (Web UI) |
| MX | @ | `mail.yourdomain.com` | 10 | Điều hướng email đến server của bạn |

### Outbound Mail (Gửi thư) - Tùy chọn/Khuyên dùng
Nếu bật tính năng gửi email, hãy thêm các bản ghi sau để tăng độ tin cậy được gửi (deliverability):

- **SPF**: `v=spf1 mx -all` (Chặt chẽ) hoặc `v=spf1 ip4:<YOUR_IP> -all`
- **DMARC**: `_dmarc.yourdomain.com` -> `v=DMARC1; p=none`

## 2. Thiết lập Server

1. **Cập nhật Hệ thống**:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Cài đặt Docker**:
   Làm theo hướng dẫn tại [docs.docker.com](https://docs.docker.com/engine/install/ubuntu/).

3. **Clone Repository (Mã nguồn)**:
   ```bash
   git clone https://github.com/your-username/email-platform.git
   cd email-platform
   ```

## 3. Cấu hình

Chúng tôi cung cấp script để tạo các file `.env` cần thiết cho production.

1. **Chạy trình tạo cấu hình**:
   ```bash
   # Cấp quyền thực thi
   chmod +x scripts/generate_env.sh
   
   # Chạy script
   ./scripts/generate_env.sh
   ```

2. **Kiểm tra Cấu hình**:
   Script sẽ tạo file `.env` trong thư mục `services/api/`, `services/web/`, và root nếu cần.
   Kiểm tra `services/api/.env` và cập nhật các giá trị quan trọng:
   - `JWT_SECRET`: Đảm bảo đủ mạnh (thường script đã tạo sẵn).
   - `OUTBOUND_ENABLED`: Đặt là `true` nếu bạn muốn gửi email.
   - **Lưu ý Development**: Nếu chạy local, bạn có thể dùng **Mailpit** (có sẵn trong docker-compose) bằng cách đặt:
     - `OUTBOUND_SMTP_HOST=mailpit`
     - `OUTBOUND_SMTP_PORT=1025`
     - `OUTBOUND_SMTP_SECURE=false`
     - `OUTBOUND_ENABLED=true`
     - Truy cập `http://localhost:8025` để xem email.

   - `WEB_URL`: Cấu hình URL trang web của bạn (ví dụ: `https://yourdomain.com`).
   - `VITE_API_BASE`: Cấu hình URL API cho frontend (ví dụ: `https://api.yourdomain.com`). Nếu chạy local hoặc docker-compose mặc định, nó sẽ tự nhận hoặc fallback về localhost.

# S3 Storage (Optional)
S3_ENABLED=false
S3_BUCKET=my-bucket
S3_REGION=us-east-1
S3_ENDPOINT=https://s3.amazonaws.com
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
   - `SMTP_*`: Cấu hình SMTP relay (SES/Mailgun) nếu bạn sử dụng dịch vụ ngoài.

## 4. Triển khai

### 4.1 Development (Local)
```bash
docker-compose up -d --build
```

Lệnh này sẽ khởi động:
- Postgres (Database)
- Redis (Queue/Cache)
- API (Backend + SMTP Inbound)
- Web (Frontend)
- Mailpit (Email Testing)
- Prometheus & Grafana (Monitoring)

### 4.2 Production (Với HTTPS tự động)

> [!IMPORTANT]
> Sử dụng `docker-compose.prod.yml` cho môi trường production để có HTTPS tự động với Let's Encrypt.

1. **Cấu hình biến môi trường**:
   ```bash
   # Tạo file .env ở thư mục root
   cat > .env << EOF
   DOMAIN=yourdomain.com
   ACME_EMAIL=admin@yourdomain.com
   POSTGRES_PASSWORD=$(openssl rand -base64 32)
   GRAFANA_PASSWORD=$(openssl rand -base64 16)
   
   # Outbound Email (xem section 4.3)
   OUTBOUND_ENABLED=true
   OUTBOUND_SMTP_HOST=email-smtp.us-east-1.amazonaws.com
   OUTBOUND_SMTP_PORT=587
   OUTBOUND_SMTP_USER=YOUR_SES_SMTP_USER
   OUTBOUND_SMTP_PASS=YOUR_SES_SMTP_PASS
   OUTBOUND_SMTP_SECURE=true
   EOF
   ```

2. **Build và Khởi chạy**:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d --build
   ```

3. **Kiểm tra SSL**:
   ```bash
   # Xem logs của Caddy để đảm bảo SSL được cấp
   docker-compose -f docker-compose.prod.yml logs caddy
   
   # Test HTTPS
   curl -I https://api.yourdomain.com/health
   ```

### 4.3 Cấu hình Outbound Email (Amazon SES / SendGrid)

> [!WARNING]
> **Không nên** tự build SMTP outbound server vì IP sẽ bị vào spam ngay lập tức. Hãy sử dụng dịch vụ gửi email chuyên nghiệp.

#### Option A: Amazon SES

1. **Tạo tài khoản SES** tại [AWS Console](https://console.aws.amazon.com/ses/)

2. **Verify domain của bạn** trong SES Console:
   - Thêm bản ghi TXT để verify domain
   - Thêm bản ghi DKIM (SES sẽ cung cấp 3 CNAME records)

3. **Tạo SMTP Credentials**:
   - Vào SES > SMTP Settings > Create SMTP Credentials
   - Lưu lại SMTP username và password

4. **Cập nhật `.env`**:
   ```bash
   OUTBOUND_ENABLED=true
   OUTBOUND_SMTP_HOST=email-smtp.us-east-1.amazonaws.com
   OUTBOUND_SMTP_PORT=587
   OUTBOUND_SMTP_USER=YOUR_SES_SMTP_USER
   OUTBOUND_SMTP_PASS=YOUR_SES_SMTP_PASS
   OUTBOUND_SMTP_SECURE=true
   ```

#### Option B: SendGrid

1. **Tạo API Key** tại [SendGrid Console](https://app.sendgrid.com/)

2. **Cấu hình trong `.env`**:
   ```bash
   OUTBOUND_ENABLED=true
   OUTBOUND_SMTP_HOST=smtp.sendgrid.net
   OUTBOUND_SMTP_PORT=587
   OUTBOUND_SMTP_USER=apikey
   OUTBOUND_SMTP_PASS=YOUR_SENDGRID_API_KEY
   OUTBOUND_SMTP_SECURE=true
   ```

#### DNS Records cho Outbound Mail

Thêm các bản ghi DNS sau để tăng deliverability:

| Loại | Host | Giá trị |
|------|------|---------|
| TXT | @ | `v=spf1 include:amazonses.com ~all` (cho SES) hoặc `v=spf1 include:sendgrid.net ~all` (cho SendGrid) |
| TXT | _dmarc | `v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com` |
| CNAME | (3 records từ SES/SendGrid) | DKIM signatures |

2. **Kiểm tra Dịch vụ**:
   ```bash
   docker-compose ps  # Development
   # hoặc
   docker-compose -f docker-compose.prod.yml ps  # Production
   ```
   Tất cả services nên ở trạng thái `Up`.

3. **Xem Logs**:
   ```bash
   docker-compose logs -f api
   ```

## 5. Sau khi Triển khai

### Tạo User Admin
Hệ thống tự động tạo user admin với thông tin được cấu hình trong docker-compose.yml:
- Email: `manhquydev@gmail.com`
- Password: (đã cấu hình trong file)

**Hãy đổi mật khẩu ngay sau khi đăng nhập!**

## 6. Sao lưu Tự động (Backup)

### 6.1 Script Backup

Dự án cung cấp script backup PostgreSQL tự động:

```bash
# Cấp quyền thực thi
chmod +x scripts/backup.sh

# Chạy backup thủ công
./scripts/backup.sh

# Xem các backup đã tạo
ls -la backups/
```

### 6.2 Cron Job (Mỗi 6 giờ)

```bash
# Mở crontab editor
crontab -e

# Thêm dòng sau (backup mỗi 6 giờ)
0 */6 * * * /path/to/email-platform/scripts/backup.sh >> /var/log/email-backup.log 2>&1
```

### 6.3 Upload lên S3 (Tùy chọn)

```bash
# Cấu hình AWS CLI trước
aws configure

# Backup với upload S3
S3_BACKUP_BUCKET=my-backup-bucket ./scripts/backup.sh --upload-s3
```

### 6.4 Restore từ Backup

```bash
# Giải nén backup
gunzip backups/email_platform_YYYYMMDD_HHMMSS.sql.gz

# Restore vào database
docker-compose exec -T postgres psql -U postgres -d email_service < backups/email_platform_YYYYMMDD_HHMMSS.sql
```

## 7. Giám sát & Bảo trì

- **Grafana**: `https://grafana.yourdomain.com` (Mặc định: admin/admin - Hãy đổi mật khẩu ngay!)
- **Prometheus**: `https://prometheus.yourdomain.com`

## 8. Anti-Abuse (Tùy chọn nâng cao)

Nếu bạn cần quét virus và lọc spam, uncomment các service sau trong `docker-compose.prod.yml`:

```yaml
# ClamAV - Virus scanning
clamav:
  image: clamav/clamav:latest
  restart: unless-stopped
  volumes:
    - clamav_data:/var/lib/clamav
  networks:
    - email_network

# Rspamd - Spam filtering  
rspamd:
  image: rspamd/rspamd:latest
  restart: unless-stopped
  volumes:
    - rspamd_data:/var/lib/rspamd
  networks:
    - email_network
```

> [!NOTE]
> ClamAV và Rspamd cần cấu hình thêm để tích hợp với API. Xem documentation của từng project để biết chi tiết.

## 9. Xử lý sự cố (Troubleshooting)

| Vấn đề | Giải pháp |
|--------|-----------|
| Port 25 bị chặn | Dùng relay (SES/SendGrid) qua port 587 |
| Connection Refused | Kiểm tra Firewall/Security Groups (mở port 80, 443, 25) |
| SSL không hoạt động | Kiểm tra DNS đã propagate chưa, xem logs Caddy |
| Email vào spam | Kiểm tra SPF/DKIM/DMARC đã cấu hình đúng chưa |

### KeyError: 'ContainerConfig'
```bash
docker-compose down
docker-compose rm -f
docker-compose up -d --build
```

## 10. Quy trình Cập nhật Code (Redeploy)

```bash
# 1. Kéo code mới
git pull origin main

# 2. Build lại và restart
docker-compose -f docker-compose.prod.yml up -d --build

# 3. Chạy migration (nếu có)
docker-compose -f docker-compose.prod.yml exec api npx prisma migrate deploy
```

