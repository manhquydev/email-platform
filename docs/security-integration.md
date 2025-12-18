# Security Integration Guide

## Overview

This document provides comprehensive procedures for implementing and managing security services in TempMail Pro Phase 1. The integration includes Rspamd for spam filtering, ClamAV for anti-virus scanning, and overall email security best practices.

## Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Email Inbound Flow                         │
│                                                                 │
│  ┌─────────┐     ┌──────────────┐     ┌────────────┐          │
│  │ Postfix │───▶│   Rspamd     │───▶│  ClamAV    │          │
│  │ (SMTP)  │     │ (Spam/ML)   │     │ (Anti-Virus)│          │
│  └─────────┘     └──────────────┘     └────────────┘          │
│         │              │                   │                   │
│         ▼              ▼                   ▼                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                   Email Processing                         │ │
│  │ • Quarantine spam                                          │ │
│  │ • Block malware                                             │ │
│  │ • Tag suspicious emails                                     │ │
│  │ • Deliver clean emails                                     │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Rspamd Integration

### Installation

1. **Add security services to production**:

```bash
# Start security services
docker-compose -f docker-compose.prod.yml -f docker-compose.security.yml up -d

# Verify services are running
docker-compose -f docker-compose.prod.yml -f docker-compose.security.yml ps
```

2. **Configure Rspamd environment variables**:

```bash
# .env file
RSPAMD_CONTROLLER_PASSWORD=your-secure-password
RSPAMD_ENABLED=true
RSPAMD_HOST=rspamd
RSPAMD_PORT=11333
```

### Rspamd Configuration

#### 1. Override Files

Create override configurations in `./config/rspamd/`:

```bash
# ./config/rspamd/override.d/worker-controller.inc
password = "$RSPAMD_CONTROLLER_PASSWORD";
enable_password = "$RSPAMD_CONTROLLER_PASSWORD";
```

#### 2. Local Configuration

```bash
# ./config/rspamd/override.d/local.d/worker-proxy.inc
bind_socket = 127.0.0.1:11333;

# ./config/rspamd/override.d/local.d/milter_headers.inc
enable_mime = true;
enable_spam_headers = true;
enable_reject_headers = true;
```

#### 3. Spam Scores Configuration

```bash
# ./config/rspamd/override.d/local.d/groups.conf
.scores {
    actions {
        reject = 15;      # Auto-reject at 15 points
        add_header = 10;  # Add header at 10 points
        greylist = 5;     # Greylist at 5 points
    }
    # Symbol scores
    SYMBOL_FROM_HAS_DKIM_D = -1.0;
    SYMBOL_FROM_MISSING_DOMAIN = 2.0;
    SYMBOL_RCPT_COUNT_MANY = 3.0;
    SYMBOL_URL_SHORTENER = 1.5;
    BAYES_HAM = -2.0;
    BAYES_SPAM = 3.0;
}
```

### Monitoring Rspamd

#### 1. Web Interface

Access the Rspamd web interface:

```bash
# Port 11334 is exposed by default
http://localhost:11334

# Login with controller password
Username: admin
Password: ${RSPAMD_CONTROLLER_PASSWORD}
```

#### 2. Statistics

```bash
# View Rspamd statistics
curl http://localhost:11334/stat

# Check recent scans
curl http://localhost:11334/scan

# View greylist status
curl http://localhost:11334/greylist
```

#### 3. Log Monitoring

```bash
# View Rspamd logs
docker logs -f rspamd

# Search for specific actions
docker logs rspamd | grep -i "action.*reject"
docker logs rspamd | grep -i "symbol.*spam"
```

### Managing Rules

#### 1. Whitelisting Domains

```bash
# ./config/rspamd/override.d/local.d/whitelist_domain.inc
# whitelist domains
whitelist_domain = [
    "trusted-domain.com",
    "partner-company.org"
];
```

#### 2. Custom Rules

```bash
# ./config/rspamd/override.d/local.d/custom_rules.inc
# Add custom symbols
rules {
    "CUSTOM_LOGO" {
        score = 0.5;
        description = "Email with company logo";
        condition = "has_image('company-logo.png')";
    }
}
```

#### 3. Dynamic Updates

```bash
# Update rules without restart
docker-compose exec rspamd rspamadm configdump -u

# Check configuration
docker-compose exec rspamd rspamadm configtest -r
```

## ClamAV Integration

### Installation

1. **ClamAV runs automatically** with the security services

2. **Verify installation**:

```bash
# Check version
docker-compose -f docker-compose.prod.yml -f docker-compose.security.yml exec clamav clamscan --version

# Check database updates
docker-compose exec clamav freshclam --version
```

### Configuration

#### 1. Update Settings

```bash
# ./config/clamav/clamd.conf
# Enable scanning
ScanPE yes
ScanELF yes
ScanOLE2 yes
ScanPDF yes
ScanHTML yes
ScanArchive yes
MaxRecursion 16
MaxFileSize 262144000  # 250MB
MaxScanSize 524288000   # 500MB
```

#### 2. Database Updates

```bash
# Manual update
docker-compose exec clamav freshclam

# Check database status
docker-compose exec clamav clamscan --infected --recursive /tmp
```

### Monitoring ClamAV

#### 1. Health Checks

```bash
# Check clamd service
docker-compose exec clamav clamdscan --version

# Test scanning
echo "Test file" > /tmp/test.txt
docker-compose exec clamav clamscan --infected --recursive /tmp
```

#### 2. Performance Monitoring

```bash
# View clamd logs
docker logs -f clamav

# Check scan performance
docker logs clamav | grep "scanned in"
```

#### 3. Statistics

```bash
# Get scanning statistics
docker-compose exec clamav clamscan --summary

# Check database version
docker-compose exec clamav clamscan --version
```

## Integration with Email Flow

### 1. Postfix Integration

Configure Postfix to use Rspamd and ClamAV:

```bash
# /etc/postfix/main.cf (in postfix container)
smtpd_milters = inet:rspamd:11332
milter_protocol = 2
milter_default_action = accept
non_smtpd_milters = inet:rspamd:11332

# Enable content filtering
content_filter = scan:127.0.0.1:10025
```

### 2. API Integration

The API service integrates security services:

```typescript
// In services/api/src/services/emailFilters.ts
export class EmailFilters {
    private rspamdEnabled: boolean;
    private clamavEnabled: boolean;

    async scanEmail(emailContent: EmailContent): Promise<ScanResult> {
        const results: ScanResult = {
            spamScore: 0,
            viruses: [],
            suspicious: []
        };

        if (this.rspamdEnabled) {
            results.spamScore = await this.checkRspamd(emailContent);
        }

        if (this.clamavEnabled) {
            results.viruses = await this.checkClamAV(emailContent);
        }

        return results;
    }
}
```

## Security Monitoring

### 1. Grafana Dashboards

Configure dashboards for:

- **Email Security Overview**
  - Spam rate by hour
  - Virus detection count
  - Quarantine volume
  - Scan performance

- **Rspamd Statistics**
  - Symbol distribution
  - Action counters
  - Score distribution
  - Rule effectiveness

- **ClamAV Statistics**
  - File types scanned
  - Database updates
  - Detection by type
  - Scan latency

### 2. Alerting Rules

```yaml
# High spam rate alert
- alert: HighSpamRate
  expr: rate(email_spam_total[1h]) > 10
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High spam rate detected"
    description: "Spam rate is {{ $value }} emails per hour"

# Virus detection alert
- alert: VirusDetected
  expr: rate(email_virus_total[1h]) > 0
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: "Virus detected"
    description: "Virus detected in {{ $value }} emails"

# Scan timeout alert
- alert: ScanTimeout
  expr: rate(email_scan_timeout_total[1h]) > 5
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Scan timeout issues"
    description: "Scan timeouts at {{ $value }} per hour"
```

### 3. Log Analysis

```bash
# Aggregate security logs
docker logs api | grep -E "(spam|virus|quarantine)"

# Count security events
docker logs rspamd | grep "action.*" | wc -l

# Check for rejections
docker logs postfix | grep -i "rejected"
```

## Security Testing

### 1. Test Spam Detection

```bash
# Send test spam email
echo "XJS*C4JDBQADN1.NSBN3D*2IDNEN*GTUBE-STANDARD-ANTI-UBE-TEST-EMAIL*C.34X" | mailx -s "Test Spam" test@example.com

# Check Rspamd results
curl -d "email=test" http://localhost:11334/scan
```

### 2. Test Virus Detection

```bash
# Create test EICAR file (safe test virus)
echo 'X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*' > eicar.com

# Scan with ClamAV
docker-compose exec clamav clamscan eicar.com --infected
```

### 3. Performance Testing

```bash
# Test scan performance
time docker-compose exec clamav clamscan --recursive /var/mail

# Test Rspamd throughput
ab -n 1000 -c 10 -T 'text/plain' -p /tmp/test_email.txt http://localhost:11333/scan
```

## Troubleshooting

### 1. Rsp Issues

#### Rspamd Not Starting

```bash
# Check configuration
docker-compose exec rspamd rspamadm configtest

# View logs
docker logs rspamd

# Restart service
docker-compose restart rspamd
```

#### Low Spam Detection

```bash
# Check rule weights
curl http://localhost:11334/stat

# Update symbols
docker-compose exec rspamd rspamadm configdump -u

# Test individual emails
curl -d "email=spam_content" http://localhost:11334/scan
```

### 2. ClamAV Issues

#### Database Outdated

```bash
# Update database
docker-compose exec clamav freshclam

# Check for errors
docker logs clamav | grep -i "error"

# Force update
docker-compose exec clamav freshclam --force
```

#### High Memory Usage

```bash
# Check memory usage
docker stats clamav

# Reduce scan limits
echo "MaxFileSize 104857600" > /etc/clamav/clamd.conf
docker-compose restart clamav
```

### 3. Integration Issues

#### Emails Not Scanned

```bash
# Check postfix logs
docker logs postfix | grep -i "milter"

# Test connectivity
docker-compose exec postfix nc -zv rspamd 11332

# Verify milter configuration
docker-compose exec postfix postconf -d | grep milter
```

#### False Positives

```bash
# Check rule hits
curl http://localhost:11334/stat

# Whitlist domain
echo "whitelist_domain = ['false-positive.com']" >> ./config/rspamd/override.d/local.d/whitelist_domain.inc
docker-compose restart rspamd
```

## Security Best Practices

### 1. Regular Updates

```bash
# Update security containers weekly
docker-compose -f docker-compose.prod.yml -f docker-compose.security.yml pull

# Restart services
docker-compose -f docker-compose.prod.yml -f docker-compose.security.yml restart rspamd clamav
```

### 2. Configuration Auditing

```bash
# Audit Rspamd rules monthly
docker-compose exec rspamd rspamadm configdump > /tmp/rspamd_config_$(date +%Y%m%d).txt

# Check score changes
diff /tmp/rspamd_config_old.txt /tmp/rspamd_config_new.txt
```

### 3. Performance Optimization

```bash
# Enable Rspamd caching
echo "enable_cache = true;" >> ./config/rspamd/override.d/local.d/worker-proxy.inc

# Set appropriate cache size
echo "cache_expire = 1h;" >> ./config/rspamd/override.d/local.d/worker-proxy.inc

# Restart service
docker-compose restart rspamd
```

### 4. Incident Response

#### Security Incident Checklist

1. **Immediate Actions**
   - Isolate affected systems
   - Preserve logs
   - Notify security team

2. **Investigation**
   - Review security logs
   - Check for patterns
   - Identify root cause

3. **Containment**
   - Update rules if needed
   - Temporarily adjust scores
   - Implement additional filtering

4. **Recovery**
   - Monitor for recurrence
   - Update documentation
   - Schedule post-incident review

#### Emergency Procedures

```bash
# Emergency disable all security filters
docker-compose stop rspamd clamav
docker-compose exec api sh -c "echo 'RSPAMD_ENABLED=false' >> .env"

# Emergency whitelist
echo "whitelist_domain = ['*'];" >> ./config/rspamd/override.d/local.d/whitelist_domain.inc

# Restart services
docker-compose restart api
```

## Contact Information

For security issues:
- **Security Team**: security@tempmail.com
- **Slack Channel**: #security-ops
- **On-call Engineer**: 24/7 rotation
- **Incident Response**: +1-555-SECURITY