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
   - `SMTP_*`: Cấu hình SMTP relay (SES/Mailgun) nếu bạn sử dụng dịch vụ ngoài.

## 4. Triển khai

1. **Build và Khởi chạy**:
   ```bash
   docker-compose up -d --build
   ```
   
   Lệnh này sẽ khởi động:
   - Postgres (Database)
   - Redis (Queue/Cache)
   - API (Backend + SMTP Inbound)
   - Web (Frontend)
   - Prometheus & Grafana (Monitoring)

2. **Kiểm tra Dịch vụ**:
   ```bash
   docker-compose ps
   ```
   Tất cả services nên ở trạng thái `Up`.

3. **Xem Logs**:
   ```bash
   docker-compose logs -f api
   ```

## 5. Sau khi Triển khai

### Tạo User Admin
Bạn có thể tạo user admin thủ công thông qua API hoặc truy cập trực tiếp vào database.
```bash
# Ví dụ sử dụng docker exec để chạy seed script hoặc lệnh SQL trực tiếp
docker-compose exec postgres psql -U postgres -d email_service -c "INSERT INTO \"User\" (email, \"passwordHash\", role) VALUES ('admin@yourdomain.com', '...hash...', 'ADMIN');"
```
*Lưu ý: Công cụ CLI quản lý user sẽ được cập nhật trong tương lai.*

## 6. Giám sát & Bảo trì

- **Grafana**: Truy cập tại `http://<YOUR_IP>:3000` (Mặc định: admin/admin - Hãy đổi mật khẩu ngay!).
- **Prometheus**: Truy cập tại `http://<YOUR_IP>:9090`.
- **Sao lưu (Backups)**: Định kỳ sao lưu thư mục `./postgres-data` hoặc thiết lập job backup.

## Xử lý sự cố (Troubleshooting)

- **Port 25 bị chặn**: Nhiều nhà cung cấp cloud chặn port 25 chiều outbound. Hãy dùng relay (SendGrid/SES) qua port 587.
- **Connection Refused**: Kiểm tra Security Groups / Firewall (UFW) xem các port 80, 443, 25, 3000 có mở không.

## 7. Quy trình Cập nhật Code (Redeploy)

Khi bạn muốn cập nhật code mới từ repository về server:

1. **Kéo code mới về**:
   ```bash
   git pull origin main
   ```

2. **Dừng và Build lại Container**:
   ```bash
   # Build lại để cập nhật code mới vào container
   docker-compose up -d --build
   ```

3. **Chạy Migration (nếu có thay đổi DB)**:
   ```bash
   docker-compose exec api npx prisma migrate deploy
   ```

### Thay đổi Tài khoản Admin
Nếu bạn muốn đổi mật khẩu hoặc email admin, hãy chạy lệnh sau trên server:

```bash
# Cập nhật email thành manhquydev@gmail.com và mật khẩu mới
docker-compose exec -T postgres psql -U postgres -d email_service < scripts/update_admin.sql
```
(Lưu ý: File `scripts/update_admin.sql` cần có trên server. Nếu chưa có, bạn cần tạo nó hoặc pull code về trước).
