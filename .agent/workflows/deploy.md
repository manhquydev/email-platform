---
description: Deploy code lên production server (DigitalOcean)
---

# Deploy Email Platform

// turbo-all

## Prerequisites
- Code đã được commit và push lên `main` branch
- Thông tin credentials xem tại: `.agent/credentials.local.md`

## Steps

### 1. Push code lên GitHub (nếu chưa push)
```bash
git add .
git commit -m "your commit message"
git push origin main
```

### 2. Truy cập DigitalOcean Console
- Mở browser tại: https://cloud.digitalocean.com
- Navigate đến Droplets → email-platform → Console

### 3. Di chuyển đến thư mục project
```bash
cd /root/email-platform.
```

### 4. Pull code mới từ GitHub
```bash
# Sử dụng PAT token để authenticate (xem credentials.local.md)
git pull https://manhquydev:<TOKEN>@github.com/manhquydev/email-platform.git main
```

### 5. Rebuild và restart Docker containers
```bash
docker compose -f docker-compose.prod.yml up -d --build web
```

### 6. Verify deployment
- Truy cập https://app.manhquy.click
- Kiểm tra các tính năng đã thay đổi

## Troubleshooting

### Git pull bị lỗi Permission denied
- Server không có SSH key, phải dùng HTTPS với PAT token
- Xem token trong `.agent/credentials.local.md`

### Docker build lỗi
```bash
# Xem logs
docker compose -f docker-compose.prod.yml logs web

# Restart từ đầu
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d --build
```
