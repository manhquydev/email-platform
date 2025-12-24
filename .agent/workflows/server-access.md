---
description: Truy cập vào Terminal của server DigitalOcean để kiểm tra và test
---

# Quy trình Truy cập Terminal Server

Dưới đây là thông tin và các lệnh cần thiết để bạn có thể truy cập và quản lý server trực tiếp qua Terminal.

## 1. Thông tin kết nối SSH

Sử dụng lệnh sau trên máy tính của bạn (Windows Terminal, CMD, hoặc PowerShell):

```bash
ssh root@165.22.48.193
```

- **Mật khẩu:** `Manhquy203@`
- **Thư mục project:** `/root/email-platform.`

---

## 2. Các lệnh kiểm tra cơ bản

Sau khi đã đăng nhập (SSH) thành công, bạn có thể chạy các lệnh sau:

### Kiểm tra trạng thái các dịch vụ (Docker)
```bash
cd /root/email-platform.
docker compose -f docker-compose.prod.yml ps
```

### Xem logs thời gian thực (để debug)
```bash
# Xem log của toàn bộ hệ thống
docker compose -f docker-compose.prod.yml logs -f --tail 100

# Xem log riêng của API
docker compose -f docker-compose.prod.yml logs -f api

# Xem log riêng của giao diện (Web)
docker compose -f docker-compose.prod.yml logs -f web
```

### Kiểm tra Health Check (trên server)
```bash
# Kiểm tra API sống hay không
curl http://localhost:3001/health
```

---

## 3. Lệnh Deploy thủ công (nếu cần)

Nếu bạn muốn cập nhật code mới nhất từ GitHub và rebuild ngay trên terminal:

```bash
cd /root/email-platform.

# 1. Pull code mới (Sử dụng PAT Token)
git pull https://manhquydev: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@github.com/manhquydev/email-platform.git main

# 2. Rebuild container cụ thể (ví dụ web hoặc api)
docker compose -f docker-compose.prod.yml up -d --build web api

# 3. Restart toàn bộ (nếu cần sạch sẽ)
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 4. Truy cập vào bên trong Container (Debug sâu)

Ví dụ để kiểm tra hệ thống file hoặc chạy lệnh database:

```bash
# Vào bên trong container API
docker exec -it email-platform-api-1 sh

# Vào bên trong Postgres database
docker exec -it email-platform-postgres-1 psql -U postgres -d email_platform
```

> [!IMPORTANT]
> Hãy cẩn thận khi chạy các lệnh `rm` hoặc thay đổi trực tiếp file trên server. Luôn backup hoặc test kỹ trước.
