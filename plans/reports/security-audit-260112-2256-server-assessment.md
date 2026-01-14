# Server Security Audit Report

**Date:** 2026-01-12 | **Auditor:** Security Engineer | **Status:** Complete

---

## Executive Summary

| Category | Status | Risk |
|----------|--------|------|
| Server Infrastructure | ⚠️ | Medium |
| Brute Force Protection | 🔴 | **HIGH** |
| Firewall | ✅ | Low |
| Docker Security | ✅ | Low |
| SSL/TLS | ✅ | Low |
| Application Errors | ⚠️ | Medium |

**Overall Risk Level: MEDIUM-HIGH** - Immediate action required for SSH brute force protection.

---

## 1. Server Status

| Metric | Value | Status |
|--------|-------|--------|
| OS | Ubuntu 22.04 (5.15.0-164) | ✅ |
| Uptime | 16 days | ✅ |
| Disk | 81% used (62G/78G) | ⚠️ Watch |
| Memory | 1.2G/3.8G used | ✅ |
| Swap | 924M/2G used | ⚠️ |
| Docker containers | 11 running | ✅ |

---

## 2. CRITICAL: Brute Force Attacks Detected

### Attack Statistics
```
Top Attacking IPs (total attempts):
   5533 attempts - 209.38.225.203
    618 attempts - 185.246.130.20
    390 attempts - 167.71.7.232
    374 attempts - 102.44.123.126
    330 attempts - 13.201.189.19
```

### Current Attack in Progress
```
Jan 12 15:50-16:00: Active SSH brute force from 178.128.252.251
Usernames tried: user, ubuntu, guest, admin, oracle
```

### Root Cause
- **fail2ban NOT INSTALLED** ❌
- `PermitRootLogin yes` enabled ❌
- `PasswordAuthentication` status unknown

### IMMEDIATE ACTION REQUIRED

```bash
# 1. Install fail2ban
apt update && apt install -y fail2ban

# 2. Configure fail2ban for SSH
cat > /etc/fail2ban/jail.local << 'EOF'
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 86400
findtime = 600
EOF

# 3. Start fail2ban
systemctl enable fail2ban
systemctl start fail2ban

# 4. Block top attacking IPs immediately
ufw deny from 209.38.225.203
ufw deny from 185.246.130.20
ufw deny from 178.128.252.251

# 5. Disable root login (after creating non-root user)
# sed -i 's/PermitRootLogin yes/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
# systemctl restart sshd
```

---

## 3. Firewall Status

| Port | Service | Status | Risk |
|------|---------|--------|------|
| 22 | SSH | Open to all | ⚠️ Should restrict |
| 25 | SMTP (Postfix) | Open | ✅ Required |
| 80 | HTTP (Caddy) | Open | ✅ |
| 443 | HTTPS (Caddy) | Open | ✅ |
| 143 | IMAP (Dovecot) | Open | ✅ |
| 587 | Submission | Open | ✅ |
| 993 | IMAPS | Open | ✅ |
| 2525 | SMTP Alt | Open | ⚠️ Internal only? |
| 3000 | Grafana | Open | ⚠️ Should restrict |
| 3001 | API | Open | ⚠️ Should be behind Caddy |

### Recommendations
- Restrict port 22 to known IPs or use VPN
- Close port 3000 (Grafana) - access via Caddy proxy
- Close port 3001 - already proxied via Caddy

---

## 4. SSL/TLS Configuration

| Domain | Certificate | Expiry | Status |
|--------|-------------|--------|--------|
| api.manhquy.click | Let's Encrypt | Mar 17, 2026 | ✅ Valid |

CORS configured correctly: `access-control-allow-origin: https://app.manhquy.click`

---

## 5. Docker Security

| Container | Privileged | Status |
|-----------|------------|--------|
| api | false | ✅ |
| web | false | ✅ |
| postgres | false | ✅ |
| postfix | false | ✅ |
| dovecot | false | ✅ |

**Database exposure:** PostgreSQL (5432) and Redis (6379) NOT exposed to internet ✅

---

## 6. Application Issues Found

### VisibilityEngine Audit Log Errors
```
[VisibilityEngine] Failed to log audit: PrismaClientKnownRequestError
```
**Cause:** Missing database migration or table
**Fix:** Run `npx prisma migrate deploy` on production

### SMTP Rejection (Normal)
```
NOQUEUE: reject: VRFY from unknown[91.209.135.33]: 450 4.7.25 Client host rejected
```
This is expected behavior - Postfix rejecting spam probes.

---

## 7. Action Items - COMPLETED

| Priority | Action | Status | Notes |
|----------|--------|--------|-------|
| 🔴 P0 | Install fail2ban | ✅ Done | Auto-banned 2 IPs immediately |
| 🔴 P0 | Block attacking IPs | ✅ Done | 5 top attackers blocked via UFW |
| 🟠 P1 | Fix VisibilityEngine migration | ✅ Done | Added `reason` column |
| 🟠 P1 | Restrict Grafana port 3000 | ✅ Done | Removed from UFW |
| 🟡 P2 | Monitor disk usage (81%) | ⏳ Watch | No action needed yet |
| 🟡 P2 | Consider SSH key-only auth | ⏳ Optional | Already using key auth |

### Actions Performed (2026-01-12)

1. **Installed fail2ban** - Auto-bans after 3 failed attempts, 24h ban time
2. **Blocked 5 attacking IPs** via UFW:
   - 209.38.225.203 (5533 attempts)
   - 185.246.130.20 (618 attempts)
   - 167.71.7.232 (390 attempts)
   - 102.44.123.126 (374 attempts)
   - 13.201.189.19 (330 attempts)
3. **Closed Grafana port 3000** - Access via Caddy proxy only
4. **Fixed VisibilityEngine** - Added missing `reason` column to MessageVisibilityAudit
5. **Fixed postgres auth** - Updated pg_hba.conf for container networking

---

## 8. Positive Findings

- ✅ UFW firewall active with deny-by-default
- ✅ Docker containers not running as privileged
- ✅ Database not exposed to internet
- ✅ SSL certificates valid and auto-renewed
- ✅ CORS properly configured
- ✅ Postfix rejecting spam probes correctly
- ✅ All health containers running (ClamAV, Rspamd healthy)

---

## Appendix: Quick Commands

```bash
# Check fail2ban status after install
fail2ban-client status sshd

# View banned IPs
fail2ban-client status sshd | grep "Banned IP"

# Unban an IP if needed
fail2ban-client set sshd unbanip <IP>

# Check current attacks
grep "Invalid user" /var/log/auth.log | tail -20
```
