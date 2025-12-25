# Quy trình Truy cập Terminal Server & Deploy

Dưới đây là thông tin và các lệnh cần thiết để truy cập và deploy server.

## 1. Thông tin kết nối SSH

**QUAN TRỌNG**: Server yêu cầu authentication bằng SSH Key. File key nằm tại `.ssh/id_ed25519` trong thư mục dự án.

Lệnh kết nối chuẩn (từ thư mục gốc dự án):

```bash
ssh -i .ssh/id_ed25519 -o StrictHostKeyChecking=no root@165.22.48.193
```

- **IP:** `165.22.48.193`
- **User:** `root`
- **Project Path:** `/root/email-platform.`

---

## 2. Deploy Nhanh (One-Liner)

Để deploy code mới nhất từ nhánh `main` và rebuild lại service:

```bash
ssh -i .ssh/id_ed25519 -o StrictHostKeyChecking=no root@165.22.48.193 "cd /root/email-platform. && git pull https://manhquydev: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@github.com/manhquydev/email-platform.git main && docker compose -f docker-compose.prod.yml up -d --build web api"
```

---

## 3. Các lệnh kiểm tra & Debug

Sau khi SSH vào server (`cd /root/email-platform.`):

### Kiểm tra trạng thái
```bash
docker compose -f docker-compose.prod.yml ps
```

### Xem logs
```bash
# API Logs
docker compose -f docker-compose.prod.yml logs -f --tail 100 api

# Web Logs
docker compose -f docker-compose.prod.yml logs -f web
```

### Health Check
```bash
# Kiểm tra qua Public Domain (Khuyên dùng)
curl -I https://api.manhquy.click/health

# Hoặc kiểm tra Logs
docker compose -f docker-compose.prod.yml logs --tail 20 api
```

---

## 4. Truy cập Deep Debug

```bash
# Vào container API
docker exec -it email-platform-api-1 sh

# Database
docker exec -it email-platform-postgres-1 psql -U postgres -d email_platform
```

