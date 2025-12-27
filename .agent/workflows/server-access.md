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

**LƯU Ý QUAN TRỌNG (CACHING ISSUE)**:
Docker có thể cache các layer `COPY`, khiến code mới không được áp dụng. Luôn sử dụng `--no-cache` hoặc `--force-recreate` khi cập nhật code logic quan trọng.

Lệnh deploy an toàn (Force Rebuild):

```bash
ssh -i .ssh/id_ed25519 -o StrictHostKeyChecking=no root@165.22.48.193 "cd /root/email-platform. && git pull origin main && docker compose up -d --build --force-recreate --no-cache api web && docker compose restart api web"
```

---

## 3. Các lệnh kiểm tra & Debug

Sau khi SSH vào server (`cd /root/email-platform.`):

### Kiểm tra trạng thái & Timestamp (Quan trọng)
Kiểm tra xem container có thực sự mới được tạo không:
```bash
docker ps
# Hoặc kiểm tra chi tiết timestamp
docker inspect --format='{{.Created}}' email-platform-api-1
```

### Xem logs
```bash
# API Logs
docker compose logs -f --tail 100 api

# Web Logs
docker compose logs -f web
```

### Health Check
```bash
# Kiểm tra qua Public Domain (Khuyên dùng)
curl -I https://api.manhquy.click/health

# Hoặc kiểm tra Logs
docker compose logs --tail 20 api
```

---

## 4. Truy cập Deep Debug

```bash
# Vào container API
docker exec -it email-platform-api-1 sh

# Database
docker exec -it email-platform-postgres-1 psql -U postgres -d email_service
```

## 5. Các Lỗi Phổ Biến & Cách Fix (Deployment Checklist)

### 1. Lỗi 500 khi gọi API (Thiếu Migration)
- **Triệu chứng**: Logs báo lỗi `column "..." does not exist`.
- **Nguyên nhân**: Prisma schema thay đổi nhưng chưa chạy migration trên production.
- **Khắc phục**:
  ```bash
  docker exec email-platform-api-1 npx prisma migrate deploy
  ```

### 2. Không nhận được Email (Port 25 Closed)
- **Triệu chứng**: Gửi email từ bên ngoài không vào được, `netstat -tulpn | grep :25` trả về rỗng.
- **Nguyên nhân**: `docker-compose.yml` thiếu mapping cho port 25.
- **Khắc phục**:
  Sửa `docker-compose.yml`:
  ```yaml
  ports:
    - "3001:3001"
    - "25:2525" # Host Port 25 -> Container Port 2525
  ```
  Sau đó recreate container: `docker compose up -d --force-recreate api`

### 3. Code mới không chạy (Cache Issue)
- **Triệu chứng**: Đã git pull nhưng code cũ vẫn chạy.
- **Khắc phục**: Dùng `--no-cache` và `restart` (đã tích hợp trong `/deploy-prod`).

### 4. Lỗi 502 Bad Gateway / CORS (API Crash)
- **Triệu chứng**: Web báo lỗi CORS hoặc 502, API không phản hồi `/health`.
- **Nguyên nhân**: API container bị crash vòng lặp (restart loop), thường do thiếu bảng trong DB hoặc lỗi code runtime.
- **Khắc phục**:
  1. Kiểm tra logs: `docker compose logs --tail 50 api`
  2. Nếu lỗi "P2021: The table does not exist", chạy lại migration:
     ```bash
     docker exec email-platform-api-1 npx prisma migrate deploy
     ```

### 5. Database Migration Failed (Lock)
- **Triệu chứng**: Deploy thất bại với lỗi "Migration ... failed ... has been applied but failed".
- **Khắc phục**:
  Đánh dấu migration bị lỗi là đã rollback để thử lại:
  ```bash
  docker compose run --rm api npx prisma migrate resolve --rolled-back <NAME_OF_FAILED_MIGRATION>
  ```
