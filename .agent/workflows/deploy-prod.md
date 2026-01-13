---
description: Deploy latest code to production via GitHub Actions + SSH verification
---

# Production Deployment Workflow

Quy trình đẩy code và deploy dự án lên production server.

## Khi nào sử dụng

- Sau khi hoàn thành feature/fix và muốn deploy lên production
- User yêu cầu: "deploy", "push và deploy", "đẩy code lên server"

---

## Quy trình Chuẩn (GitHub Actions)

### Step 1: Commit Changes

```bash
cd D:/project/Clone/email-platform

# Check status
git status --short

# Stage files (chỉ stage files cần thiết)
git add <files>

# Commit với conventional commits
git commit -m "type(scope): description"
```

### Step 2: Push to GitHub (Triggers Deploy)

```bash
git push origin main
```

> **Note:** Push to `main` tự động trigger GitHub Action `.github/workflows/deploy.yml`

### Step 3: Monitor GitHub Action

```bash
# List recent runs
gh run list --limit 3

# Watch deployment workflow (chờ hoàn thành)
gh run watch <run-id> --exit-status
```

### Step 4: Verify Deployment via SSH

```bash
# Check container status
ssh -i .ssh/id_ed25519 -o StrictHostKeyChecking=no root@165.22.48.193 "docker ps --format 'table {{.Names}}\t{{.Status}}'"

# Health check API
ssh -i .ssh/id_ed25519 -o StrictHostKeyChecking=no root@165.22.48.193 "curl -sf https://api.manhquy.click/health"

# Check web app (should return 200)
ssh -i .ssh/id_ed25519 -o StrictHostKeyChecking=no root@165.22.48.193 "curl -sf -o /dev/null -w '%{http_code}' https://app.manhquy.click/"
```

---

## One-Liner Commands

### Quick Deploy (khi GitHub Action không hoạt động)

```bash
ssh -i .ssh/id_ed25519 -o StrictHostKeyChecking=no root@165.22.48.193 "cd ~/email-platform. && git pull origin main && docker compose -f docker-compose.prod.yml up -d --build --force-recreate --remove-orphans web api && docker compose -f docker-compose.prod.yml exec -T api npx prisma migrate deploy && docker compose -f docker-compose.prod.yml restart web api"
```

### Force Rebuild (cache issue)

```bash
ssh -i .ssh/id_ed25519 -o StrictHostKeyChecking=no root@165.22.48.193 "cd ~/email-platform. && docker compose -f docker-compose.prod.yml build --no-cache api web && docker compose -f docker-compose.prod.yml up -d --force-recreate api web"
```

### Rebuild Web với Vite Build Args

> **QUAN TRỌNG:** Vite env vars (`VITE_*`) cần truyền qua `--build-arg` khi build Docker, không phải runtime env.

```bash
ssh -i .ssh/id_ed25519 -o StrictHostKeyChecking=no root@165.22.48.193 "cd ~/email-platform. && git pull origin main && docker compose -f docker-compose.prod.yml build --no-cache --build-arg VITE_CLARITY_PROJECT_ID=uzly2516v2 web && docker compose -f docker-compose.prod.yml up -d --force-recreate web"
```

**Verify Clarity đã inject:**
```bash
ssh -i .ssh/id_ed25519 -o StrictHostKeyChecking=no root@165.22.48.193 "curl -s https://app.manhquy.click/assets/index-*.js | grep -o 'uzly2516v2' | head -1"
```

---

## Server Info

| Key | Value |
|-----|-------|
| IP | `165.22.48.193` |
| User | `root` |
| SSH Key | `.ssh/id_ed25519` |
| Project Path | `/root/email-platform.` |
| API URL | `https://api.manhquy.click` |
| Web URL | `https://app.manhquy.click` |

---

## Troubleshooting

### Container không khởi động

```bash
# Xem logs
ssh -i .ssh/id_ed25519 root@165.22.48.193 "cd /root/email-platform. && docker compose logs --tail 50 api"
```

### Database migration lỗi

```bash
# Run migration
ssh -i .ssh/id_ed25519 root@165.22.48.193 "docker exec email-platform-api-1 npx prisma migrate deploy"

# Nếu bị lock, resolve migration
ssh -i .ssh/id_ed25519 root@165.22.48.193 "cd /root/email-platform. && docker compose run --rm api npx prisma migrate resolve --rolled-back <MIGRATION_NAME>"
```

### 502 Bad Gateway

API đang crash. Kiểm tra logs và restart:

```bash
ssh -i .ssh/id_ed25519 root@165.22.48.193 "cd /root/email-platform. && docker compose logs --tail 100 api && docker compose restart api"
```

### Vite Environment Variables không hoạt động

**Triệu chứng:** Biến `VITE_*` như `VITE_CLARITY_PROJECT_ID` không có trong bundle.

**Nguyên nhân:** Vite inject env vars tại **build time**, không phải runtime. Docker `environment:` trong docker-compose chỉ set runtime env.

**Giải pháp:**
1. Đảm bảo Dockerfile có `ARG` và `ENV` cho biến Vite:
   ```dockerfile
   ARG VITE_CLARITY_PROJECT_ID
   ENV VITE_CLARITY_PROJECT_ID=${VITE_CLARITY_PROJECT_ID}
   ```

2. Build với `--build-arg`:
   ```bash
   docker compose build --build-arg VITE_CLARITY_PROJECT_ID=uzly2516v2 web
   ```

3. Verify trong bundle:
   ```bash
   curl -s https://app.manhquy.click/assets/index-*.js | grep -o 'uzly2516v2'
   ```

---

## Success Criteria

- [ ] GitHub Action completed successfully (hoặc manual deploy thành công)
- [ ] All containers running (Up status)
- [ ] API health check returns `{"ok":true}`
- [ ] Web app returns HTTP 200
