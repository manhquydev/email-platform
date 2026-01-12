# Server Configuration & Migration Guide

**Version:** 1.0 | **Updated:** 2026-01-13

---

## Table of Contents

1. [Server Requirements](#1-server-requirements)
2. [Initial Server Setup](#2-initial-server-setup)
3. [Security Hardening](#3-security-hardening)
4. [Docker Environment](#4-docker-environment)
5. [Application Deployment](#5-application-deployment)
6. [SSL/TLS Configuration](#6-ssltls-configuration)
7. [DNS Configuration](#7-dns-configuration)
8. [Monitoring Setup](#8-monitoring-setup)
9. [Migration Procedures](#9-migration-procedures)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Server Requirements

### Minimum Specifications

| Resource | Minimum | Recommended | Production |
|----------|---------|-------------|------------|
| CPU | 1 vCPU | 2 vCPU | 4 vCPU |
| RAM | 2 GB | 4 GB | 8 GB |
| Storage | 40 GB SSD | 80 GB SSD | 160 GB SSD |
| Bandwidth | 1 TB | 2 TB | 5 TB |

### Recommended Providers

| Provider | Plan | Cost/Month | Notes |
|----------|------|------------|-------|
| DigitalOcean | Basic Droplet | $24 | Current production |
| Hetzner | CX21 | €5.83 | Best value EU |
| Vultr | High Frequency | $24 | Good Asia latency |
| Linode | Dedicated 4GB | $36 | Reliable |

### OS Requirements

- **Ubuntu 22.04 LTS** (recommended)
- Alternative: Debian 12, AlmaLinux 9

---

## 2. Initial Server Setup

### 2.1 First Login & Updates

```bash
# SSH into new server
ssh root@YOUR_SERVER_IP

# Update system
apt update && apt upgrade -y

# Set timezone
timedatectl set-timezone Asia/Ho_Chi_Minh

# Set hostname
hostnamectl set-hostname email-platform

# Reboot if kernel updated
reboot
```

### 2.2 Create Non-Root User (Optional but Recommended)

```bash
# Create user
adduser deploy
usermod -aG sudo deploy

# Copy SSH keys
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

### 2.3 Essential Packages

```bash
apt install -y \
  curl \
  wget \
  git \
  htop \
  vim \
  tmux \
  unzip \
  ncdu \
  jq \
  tree
```

---

## 3. Security Hardening

### 3.1 SSH Configuration

Edit `/etc/ssh/sshd_config`:

```bash
# Disable root password login (keep key auth)
PermitRootLogin prohibit-password

# Disable password authentication entirely
PasswordAuthentication no

# Use SSH Protocol 2 only
Protocol 2

# Limit authentication attempts
MaxAuthTries 3

# Disconnect idle sessions after 10 minutes
ClientAliveInterval 300
ClientAliveCountMax 2
```

Apply changes:

```bash
systemctl restart sshd
```

### 3.2 Firewall (UFW)

```bash
# Install UFW
apt install ufw -y

# Default policies
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (IMPORTANT: Do this first!)
ufw allow ssh

# Allow web traffic
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS

# Allow email ports
ufw allow 25/tcp   # SMTP
ufw allow 587/tcp  # Submission
ufw allow 993/tcp  # IMAPS
ufw allow 143/tcp  # IMAP

# Enable firewall
ufw enable

# Verify rules
ufw status numbered
```

### 3.3 Fail2ban (Brute Force Protection)

```bash
# Install
apt install fail2ban -y

# Create local config
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 86400
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 86400

[postfix]
enabled = true
port = smtp,465,submission
filter = postfix
logpath = /var/log/mail.log
maxretry = 5

[dovecot]
enabled = true
port = pop3,pop3s,imap,imaps
filter = dovecot
logpath = /var/log/mail.log
maxretry = 5
EOF

# Start service
systemctl enable fail2ban
systemctl start fail2ban

# Check status
fail2ban-client status sshd
```

### 3.4 Automatic Security Updates

```bash
apt install unattended-upgrades -y
dpkg-reconfigure -plow unattended-upgrades
```

### 3.5 Block Known Attackers (Optional)

```bash
# Block specific IPs
ufw deny from 209.38.225.203
ufw deny from 185.246.130.20

# Block entire ranges if needed
ufw deny from 209.38.0.0/16
```

---

## 4. Docker Environment

### 4.1 Install Docker

```bash
# Official Docker installation
curl -fsSL https://get.docker.com | sh

# Add user to docker group
usermod -aG docker $USER

# Install Docker Compose plugin
apt install docker-compose-plugin -y

# Verify installation
docker --version
docker compose version
```

### 4.2 Docker Configuration

Create `/etc/docker/daemon.json`:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "live-restore": true
}
```

Restart Docker:

```bash
systemctl restart docker
```

### 4.3 Docker Network

```bash
# Create external network (optional)
docker network create email-network

# View networks
docker network ls
```

---

## 5. Application Deployment

### 5.1 Clone Repository

```bash
cd /root
git clone https://github.com/YOUR_ORG/email-platform.git
cd email-platform
```

### 5.2 Environment Configuration

```bash
# Copy example env
cp services/api/.env.example services/api/.env

# Edit configuration
vim services/api/.env
```

Required environment variables:

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/email_service

# JWT Secret (generate unique)
JWT_SECRET=$(openssl rand -hex 32)

# Domain configuration
DOMAIN=manhquy.click
WEB_URL=https://app.manhquy.click
API_URL=https://api.manhquy.click

# Admin credentials
DEFAULT_ADMIN_EMAIL=admin@example.com
DEFAULT_ADMIN_PASSWORD=SECURE_PASSWORD_HERE

# Telegram (optional)
TELEGRAM_BOT_TOKEN=your_bot_token
```

### 5.3 Build & Start Services

```bash
# Build images
docker compose build

# Start all services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f api
```

### 5.4 Database Migrations

```bash
# Run migrations
docker compose exec api npx prisma migrate deploy

# Seed data (if needed)
docker compose exec api npx prisma db seed
```

### 5.5 Verify Deployment

```bash
# Check API health
curl http://localhost:3001/health

# Check web
curl http://localhost:8080

# Check all containers
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

---

## 6. SSL/TLS Configuration

### 6.1 Caddy (Automatic SSL)

The project uses Caddy for automatic Let's Encrypt certificates.

`Caddyfile`:

```caddyfile
{
    email {$ACME_EMAIL}
}

api.{$DOMAIN} {
    reverse_proxy api:3001
}

app.{$DOMAIN} {
    reverse_proxy web:80
}

# Redirect www to non-www
www.{$DOMAIN} {
    redir https://{$DOMAIN}{uri} permanent
}
```

### 6.2 Certificate Verification

```bash
# Check certificate
openssl s_client -connect api.manhquy.click:443 -servername api.manhquy.click 2>/dev/null | openssl x509 -noout -dates

# View Caddy certificates
docker compose exec caddy caddy list-modules
```

### 6.3 Manual Certificate (Alternative)

If not using Caddy:

```bash
# Install certbot
apt install certbot python3-certbot-nginx -y

# Get certificate
certbot certonly --standalone -d api.manhquy.click -d app.manhquy.click

# Auto-renewal
certbot renew --dry-run
```

---

## 7. DNS Configuration

### 7.1 Required DNS Records

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | SERVER_IP | 300 |
| A | api | SERVER_IP | 300 |
| A | app | SERVER_IP | 300 |
| A | mail | SERVER_IP | 300 |
| MX | @ | mail.domain.com | 3600 |
| TXT | @ | v=spf1 mx ~all | 3600 |
| TXT | _dmarc | v=DMARC1; p=none | 3600 |

### 7.2 Email-Specific Records

```bash
# SPF Record
v=spf1 ip4:SERVER_IP mx ~all

# DKIM (generate with opendkim)
default._domainkey IN TXT "v=DKIM1; k=rsa; p=YOUR_PUBLIC_KEY"

# DMARC
_dmarc IN TXT "v=DMARC1; p=quarantine; rua=mailto:dmarc@domain.com"
```

### 7.3 Cloudflare Configuration

```bash
# Lower TTL before migration
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/ZONE_ID/dns_records/RECORD_ID" \
  -H "Authorization: Bearer API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"ttl": 120}'
```

---

## 8. Monitoring Setup

### 8.1 Basic Monitoring Script

Create `/root/scripts/health-check.sh`:

```bash
#!/bin/bash

TELEGRAM_BOT_TOKEN="your_token"
TELEGRAM_CHAT_ID="your_chat_id"

alert() {
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      -d chat_id="$TELEGRAM_CHAT_ID" \
      -d text="🚨 $1"
}

# Check API
if ! curl -sf http://localhost:3001/health > /dev/null; then
    alert "API health check failed!"
fi

# Check disk space
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')
if [ "$DISK_USAGE" -gt 85 ]; then
    alert "Disk usage critical: ${DISK_USAGE}%"
fi

# Check memory
MEM_USAGE=$(free | awk '/Mem:/ {printf "%.0f", $3/$2 * 100}')
if [ "$MEM_USAGE" -gt 90 ]; then
    alert "Memory usage critical: ${MEM_USAGE}%"
fi

# Check Docker containers
UNHEALTHY=$(docker ps --filter "health=unhealthy" --format "{{.Names}}")
if [ -n "$UNHEALTHY" ]; then
    alert "Unhealthy containers: $UNHEALTHY"
fi
```

Cron schedule:

```bash
# Every 5 minutes
*/5 * * * * /root/scripts/health-check.sh
```

### 8.2 Prometheus + Grafana (Already Configured)

Access:
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000 (admin/admin)

### 8.3 Log Management

```bash
# View all logs
docker compose logs -f

# View specific service
docker compose logs -f api --tail 100

# Rotate logs
cat > /etc/logrotate.d/docker << 'EOF'
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    missingok
    delaycompress
    copytruncate
}
EOF
```

---

## 9. Migration Procedures

### 9.1 Pre-Migration Checklist

```markdown
## Migration Checklist

### 1 Week Before
- [ ] Lower DNS TTL to 300 seconds
- [ ] Provision new server
- [ ] Complete initial setup (Sections 2-4)
- [ ] Test SSH access

### 1 Day Before
- [ ] Initial data sync with rsync
- [ ] Verify all services start correctly
- [ ] Test backup restore on new server

### Migration Day
- [ ] Announce maintenance window
- [ ] Stop services on old server
- [ ] Final data sync
- [ ] Update DNS records
- [ ] Start services on new server
- [ ] Verify all endpoints
- [ ] Monitor for issues

### Post-Migration
- [ ] Keep old server for 7 days
- [ ] Monitor error rates
- [ ] Update documentation
- [ ] Raise DNS TTL back to 3600
```

### 9.2 Step-by-Step Migration

#### Step 1: Initial Sync

```bash
# On NEW server
mkdir -p /root/email-platform

# From OLD server
rsync -avzP --progress \
  --exclude 'node_modules' \
  --exclude '.git' \
  /root/email-platform/ \
  root@NEW_SERVER:/root/email-platform/
```

#### Step 2: Sync Docker Volumes

```bash
# Stop services on OLD server
docker compose down

# Export volumes
docker run --rm \
  -v email_postgres_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/postgres.tar.gz -C /data .

# Transfer
scp postgres.tar.gz root@NEW_SERVER:/root/

# On NEW server
docker volume create email_postgres_data
docker run --rm \
  -v email_postgres_data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/postgres.tar.gz -C /data
```

#### Step 3: DNS Cutover

```bash
# Update A records to new IP
# Wait for propagation (check with)
dig +short api.manhquy.click
```

#### Step 4: Start Services

```bash
# On NEW server
docker compose up -d
docker compose logs -f
```

#### Step 5: Verification

```bash
# Health checks
curl https://api.manhquy.click/health
curl https://app.manhquy.click

# Check database
docker compose exec postgres psql -U postgres -c "SELECT count(*) FROM users;"

# Monitor logs
docker compose logs -f api --tail 100
```

### 9.3 Rollback Procedure

```bash
# If issues detected, revert DNS to old server
# Old server should remain running for 7 days

# Quick rollback:
# 1. Update DNS back to old IP
# 2. Restart services on old server
docker compose up -d

# 3. Investigate issues on new server
```

---

## 10. Troubleshooting

### 10.1 Common Issues

#### Container Won't Start

```bash
# Check logs
docker compose logs SERVICE_NAME

# Check exit code
docker inspect --format='{{.State.ExitCode}}' CONTAINER_NAME

# Rebuild
docker compose build --no-cache SERVICE_NAME
docker compose up -d SERVICE_NAME
```

#### Database Connection Failed

```bash
# Check postgres status
docker compose exec postgres pg_isready

# Check connection
docker compose exec api npx prisma db pull

# Reset if needed
docker compose down
docker volume rm email_postgres_data
docker compose up -d postgres
docker compose exec api npx prisma migrate deploy
```

#### SSL Certificate Issues

```bash
# Check Caddy logs
docker compose logs caddy

# Force certificate renewal
docker compose exec caddy caddy reload

# Manual certificate test
openssl s_client -connect api.manhquy.click:443 2>/dev/null | openssl x509 -noout -dates
```

#### Port Already in Use

```bash
# Find process using port
lsof -i :3001
netstat -tulpn | grep 3001

# Kill process
kill -9 $(lsof -t -i:3001)
```

#### Disk Space Issues

```bash
# Check usage
df -h
ncdu /

# Clean Docker
docker system prune -a --volumes

# Clean old backups
find /root/email-platform/backups -mtime +7 -delete

# Clean logs
truncate -s 0 /var/lib/docker/containers/*/*-json.log
```

### 10.2 Emergency Recovery

```bash
# Full restart
docker compose down
docker compose up -d

# Database restore from backup
docker compose stop api
gunzip -c backups/latest.sql.gz | docker exec -i postgres psql -U postgres -d email_service
docker compose up -d api

# Rebuild everything
docker compose down --rmi all
docker compose build --no-cache
docker compose up -d
```

### 10.3 Useful Debug Commands

```bash
# System resources
htop
free -h
df -h

# Docker status
docker ps -a
docker stats
docker system df

# Network issues
docker network inspect email-platform_default
curl -v http://localhost:3001/health

# Database inspection
docker compose exec postgres psql -U postgres -d email_service

# Tail all logs
docker compose logs -f --tail 50
```

---

## Appendix: Quick Reference Card

### Essential Commands

```bash
# Start/Stop
docker compose up -d
docker compose down
docker compose restart SERVICE

# Logs
docker compose logs -f SERVICE --tail 100

# Database
docker compose exec postgres psql -U postgres -d email_service

# Backup
./scripts/backup.sh

# Health
curl http://localhost:3001/health
docker ps
```

### Important Paths

| Path | Purpose |
|------|---------|
| `/root/email-platform` | Project root |
| `/root/email-platform/backups` | Local backups |
| `/var/lib/docker/volumes` | Docker volumes |
| `/etc/fail2ban/jail.local` | Fail2ban config |
| `/etc/ssh/sshd_config` | SSH config |

### Service Ports

| Port | Service | Access |
|------|---------|--------|
| 22 | SSH | External |
| 80 | HTTP | External |
| 443 | HTTPS | External |
| 25 | SMTP | External |
| 3001 | API | Internal |
| 5432 | PostgreSQL | Internal |
| 6379 | Redis | Internal |

---

**Document Maintainer:** DevOps Team
**Last Review:** 2026-01-13
