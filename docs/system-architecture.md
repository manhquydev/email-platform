# System Architecture - TempMail Pro

## Overview

TempMail Pro is a multi-domain email platform built with microservices architecture. The system provides disposable inboxes, real-time email delivery, and comprehensive API access. Phase 1 stabilization introduces enhanced security, backup systems, and outbound email capabilities.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         LOAD BALANCER                          │
│                        (Caddy - SSL)                          │
└─────────────┬─────────────────────┬─────────────────────────────┘
              │                     │
              ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                       APPLICATION LAYER                        │
│  ┌─────────┐   ┌──────────────┐  ┌─────────┐                  │
│  │  Web UI │   │   API       │  │ Grafana │                  │
│  │ (React) │   │ (Fastify)   │  │ (7.0+)  │                  │
│  └─────────┘   └──────────────┘  └─────────┘                  │
└─────────────┬─────────────────────┬─────────────────────────────┘
              │                     │
              ▔─────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                              │
│  ┌─────────┐   ┌──────────────┐  ┌─────────┐  ┌────────────┐  │
│  │   DB    │   │   Redis     │  │  Postfix│  │  Dovecot   │  │
│  │ (Postgres│   │ (Caching,   │  │ (SMTP)  │  │ (IMAP/POP3)│  │
│  │ 16+)    │   │ Queue)      │  │         │  │           │  │
│  └─────────┘   └──────────────┘  └─────────┘  └────────────┘  │
└─────────────┬─────────────────────┬─────────────────────────────┘
              │                     │
              ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY & FILTERS                         │
│  ┌─────────┐   ┌──────────────┐  ┌────────────┐               │
│  │ Rspamd  │   │   ClamAV    │  │   RBL     │               │
│  │ (Spam)  │   │ (Anti-Virus) │  │  Filters  │               │
│  └─────────┘   └──────────────┘  └────────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

## Phase 1 Services Overview

### Core Services

| Service | Purpose | Port | Volume | Health Check |
|---------|---------|------|--------|--------------|
| **web** | Frontend React application | 80/443 | - | HTTP GET / |
| **api** | Backend API server | 3001 | api_storage | HTTP GET /health |
| **caddy** | Reverse proxy & SSL termination | 80/443 | caddy_data/config | HTTP GET /health |
| **postgres** | Primary database | 5432 (internal) | postgres_data | PostgreSQL ping |
| **redis** | Caching & queue | 6379 (internal) | redis_data | Redis ping |

### Email Processing Services

| Service | Purpose | Port | Volume | Health Check |
|---------|---------|------|--------|--------------|
| **postfix** | SMTP server for inbound | 25, 587, 465 | maildir_data | SMTP connectivity |
| **dovecot** | IMAP/POP3 server | 143, 993, 995 | maildir_data | Dovecot check |
| **postfix_dkim** | DKIM signing | - | /etc/opendkim | DKIM key check |

### Security Services (Phase 1)

| Service | Purpose | Port | Volume | Health Check |
|---------|---------|------|--------|--------------|
| **rspamd** | Spam & malware filtering | 11333, 11334 | rspamd_data | Rspadm check |
| **clamav** | Anti-virus scanning | - | clamav_data | Clamdscan check |
| **grafana** | Monitoring dashboard | 3000 (internal) | grafana_data | Grafana health |

### Storage & Backups

| Service | Purpose | Port | Volume | Health Check |
|---------|---------|------|--------|--------------|
| **api_storage** | Email attachments & files | - | /app/storage | Disk space check |
| **backup-scheduler** | Automated backups | - | ./backups | Cron check |

## Network Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   External      │     │   Internal      │     │   Database      │
│   Network       │     │   Network       │     │   Network       │
│                 │     │                 │     │                 │
│   • Internet    │     │   • API         │     │   • Postgres    │
│   • Users       │     │   • Redis       │     │   • Redis       │
│   • Sending     │     │   • Postfix     │     │                 │
│   servers       │     │   • Dovecot     │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
          │                       │                       │
          │                       │                       │
          ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Caddy         │     │   Rspamd        │     │   ClamAV       │
│   (SSL/TLS)     │     │   (Filtering)   │     │   (Scanning)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Network Security

1. **External-to-Internal**: Only ports 80/443 exposed via Caddy
2. **Internal Communication**: Services communicate on `email_network`
3. **Database**: Isolated within the Docker network, no external access
4. **Security Services**: Rspamd & ClamAV filter all incoming email traffic

## Data Flow

### Inbound Email Flow
1. Email arrives on port 25 (Postfix)
2. Postfix performs initial filtering
3. Email routed to Dovecot for storage
4. Web API notifications sent via Redis
5. Messages delivered to user inboxes

### Outbound Email Flow (Phase 1)
1. API receives outbound request
2. Email queued in Redis
3. Postfix sends via configured SMTP provider
4. DKIM signature applied if enabled
5. Delivery status tracked in database

### Security Flow
1. Email received by Postfix
2. Rspamd scans for spam/malware
3. ClamAV scans for viruses
4. Clean messages delivered to Dovecot
5. Spam/quarantined messages handled based on rules

## Service Dependencies

```
web → api → postgres
     ↓    ↓
     redis
     ↓
     postfix
     ↓
     dovecot

api → rspamd → clamav
api → redis

postgres → backups
```

## Configuration Files

### Environment Variables
- **services/api/.env**: API configuration, database credentials, secrets
- **docker-compose.prod.yml**: Main service definitions
- **docker-compose.security.yml**: Security services (Rspamd/ClamAV)
- **docker-compose.backup.yml**: Backup scheduler

### Configuration Directories
- **./config/**: Service-specific configurations
- **./backups/**: Database and storage backups
- **./Caddyfile**: SSL/TLS and reverse proxy configuration

## Monitoring & Observability

### Metrics
- **Prometheus**: Collects metrics from all services
- **Grafana**: Dashboards for system health, email traffic, performance
- **Backup Exporter**: Tracks backup success/failure metrics

### Logging
- **Structured Logging**: All services use JSON logging
- **Log Aggregation**: Logs shipped to Loki/ELK (when configured)
- **Email Logs**: Separate log file for email delivery events

### Alerts
- Database connectivity issues
- High spam rates
- Backup failures
- Service health failures
- Disk space alerts

## Phase 1 Stabilization Features

### 1. Enhanced Security
- **Rspamd Integration**: Real-time spam filtering with machine learning
- **ClamAV Integration**: Anti-virus scanning for all attachments
- **RBL Filtering**: Real-time blackhole list checks
- **DKIM Signing**: Domain-level email authentication

### 2. Backup & Recovery
- **Automated Backups**: Daily database and storage backups
- **Retention Policy**: 30-day retention with configurable cleanup
- **Cloud Storage**: Optional S3/GCS backup replication
- **Checksum Verification**: Backup integrity verification
- **Point-in-Time Recovery**: Full restore capabilities

### 3. Outbound Email
- **Self-hosted SMTP**: Postfix-based outbound email
- **Email Verification**: Verification emails with click tracking
- **Welcome Emails**: Automated onboarding emails
- **Rate Limiting**: Configurable sending limits
- **DKIM Signing**: Domain-level authentication for sent emails

### 4. Performance Optimization
- **Redis Caching**: Session data and message caching
- **Connection Pooling**: Database connection optimization
- **Asynchronous Processing**: Background job queues
- **Compression**: Gzip compression for API responses

## Scaling Strategy

### Horizontal Scaling
- **Web/API**: Multiple instances behind load balancer
- **Database**: Read replicas for query scaling
- **Redis**: Cluster configuration for high availability

### Vertical Scaling
- **CPU**: Allocate based on email processing load
- **Memory**: Increase for larger attachment handling
- **Storage**: SSD volumes for fast I/O operations

## Future Enhancements

- **Multi-region Deployment**: Geographic distribution
- **Kubernetes Orchestration**: Container orchestration
- **Advanced Analytics**: Email delivery analytics
- **Custom Rules Engine**: Custom spam filtering rules
- **API Rate Limiting**: Fine-grained API throttling