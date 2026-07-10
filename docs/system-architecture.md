# Ephemera: System Architecture

## 1. Service Topology & Deployment

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────────────────────┐
│                           INTERNET (MX + HTTPS)                         │
└────────────────┬─────────────────────────────────┬─────────────────────┘
                 │                                 │
           Port 25/2525                     Port 80/443
                 │                                 │
    ┌────────────▼────────────────┬────────────────▼──────────────┐
    │                             │                               │
    │         POSTFIX MTA         │         CADDY                │
    │     (SMTP Ingest)           │   (Reverse Proxy + TLS)      │
    │                             │                               │
    └────────────┬────────────────┴──┬─────────┬──────────┬───────┘
                 │                   │         │          │
         ┌───────▼────────┐  ┌──────▼─────┐  │      ┌───▼──────┐
         │     RSPAMD     │  │   DOVECOT  │  │      │ GRAFANA  │
         │  (Spam Filter) │  │ (IMAP/LMTP)│  │      │ Port3000 │
         │                │  │            │  │      └──────────┘
         └────────┬───────┘  └──────┬─────┘  │
                  │                 │        │
         ┌────────▼─────────────────▼────────▼────────┐
         │          API (Fastify v5)                 │
         │  - REST Endpoints                         │
         │  - WebSocket Server                       │
         │  - SMTP/IMAP/POP3/WebDAV Handlers        │
         │  - BullMQ Workers                         │
         │  - Cron Jobs                              │
         │  Port 3001                                │
         └────────┬──────────────┬─────────┬─────────┘
                  │              │         │
      ┌───────────▼──────┐  ┌───▼────┐  ┌▼──────────┐
      │  WEB (React SPA) │  │POSTGRES│  │  REDIS   │
      │  Port 80         │  │Port5432│  │Port 6379 │
      │  - PWA Ready     │  │        │  │          │
      │  - Real-time     │  │- Data  │  │- Cache   │
      │  - Glassmorphism │  │- Auth  │  │- Queue   │
      │  - i18n          │  │        │  │- Sessions│
      └──────────────────┘  └────────┘  └──────────┘
```

### Extension & Mobile Layer
```
┌─────────────────┐    ┌──────────────────┐
│  Browser Ext    │    │  Mobile App      │
│  (WXT + MV3)    │◄──►│  (React Native)  │
│  - Side Panel   │    │  - Push notif    │
│  - Background   │    │  - Offline cache │
│  - Push Handler │    │  - Biometric     │
└─────────────────┘    └──────────────────┘
        │                       │
        └───────────────┬───────┘
                        │
                 ┌──────▼──────┐
                 │ API Gateway │
                 │ (Caddy)     │
                 └─────────────┘
```

---

## 2. Request Flow Diagrams

### 2.1 HTTP Request → Response

```
Client (Web/Mobile/API Consumer)
    │
    ▼
Caddy (TLS Termination, CORS, Security Headers)
    │
    ▼
Fastify Server
    │
    ├─► Rate Limiter Middleware (check IP + user quota)
    │
    ├─► Authentication (JWT decode or API Key lookup)
    │   └─► Validate token not revoked (Redis fail-closed)
    │
    ├─► Tenant Context Extraction (tenant ID from token/domain)
    │
    ├─► Zod Schema Validation (request body/params)
    │
    ├─► Route Handler Execution
    │   ├─► Business Logic (services/*) 
    │   ├─► Prisma Database Query
    │   │   └─► PostgreSQL
    │   │
    │   └─► Response formatting
    │
    ▼
Caddy (Compress, Cache headers)
    │
    ▼
Client Response (JSON + status)
```

**Latency Targets:**
- Auth: 10ms (cache hit), 50ms (DB lookup)
- DB Query: 50-200ms (avg)
- P95: < 200ms for reads, < 500ms for writes

---

### 2.2 Inbound Email Flow (SMTP)

```
External Mail Server
    │
    ▼
Postfix MTA (Port 25/2525)
    │ SMTP protocol handling
    │ Port/IP rate limiting
    │
    ├─► Rspamd (Spam/Virus Filter)
    │   └─► Spam score calculation
    │
    ├─► Dovecot LMTP
    │   └─► Maildir delivery
    │
    ▼
Email Message Stored (Filesystem)
    │
    ├─► Trigger Ingest Worker (BullMQ)
    │
    ▼
API Ingest Job
    │
    ├─► Parse Email (mailparser)
    │   ├─ From, To, Subject, Body, Headers
    │   └─ Extract attachments
    │
    ├─► Create Message Record (Prisma)
    │   ├─ Store headers + body (sanitized)
    │   ├─ Link attachments
    │   └─ Apply filters/rules
    │
    ├─► Trigger Forwarding Rules (queue job)
    │   ├─ Email forwarding
    │   ├─ Webhook delivery
    │   ├─ Telegram notification
    │   └─ Discord webhook
    │
    ├─► Real-time Notification (Redis pub/sub)
    │   ├─► WebSocket clients
    │   ├─► SSE subscribers
    │   └─► Browser extension
    │
    └─► Audit Log

Timeline: < 5 seconds from SMTP receipt to API delivery
```

---

### 2.3 Outbound Email Flow

```
User/API Request (Forward/Reply/Send)
    │
    ▼
Fastify Route Handler
    │
    ├─► Validate sender (owns inbox/domain)
    │
    ├─► Check rate limits + quota
    │
    ├─► Retrieve Forwarding Rules
    │   ├─ Email recipients
    │   ├─ Webhook URLs
    │   ├─ Telegram chat IDs
    │   └─ Discord webhooks
    │
    ├─► Queue Outbound Job (BullMQ)
    │
    ▼
Outbound Worker
    │
    ├─► DKIM Sign Email (private key from DB)
    │
    ├─► Select Email Provider
    │   ├─ Postfix (local)
    │   ├─ AWS SES
    │   ├─ SendGrid
    │   ├─ Mailgun
    │   └─ Brevo
    │
    ├─► Send Email
    │
    ├─► Collect Bounce/Complaint (SES webhooks)
    │   └─► Update delivery status
    │
    ├─► Deliver Webhooks (ssrf-safe-fetch)
    │   ├─ HTTPS-only, private IPs blocked
    │   └─► Retry with exponential backoff
    │
    └─► Create Delivery Log

Status callback: Real-time via WebSocket
```

---

### 2.4 Real-time Notification Flow

```
Message Ingested (DB + Redis pub/sub)
    │
    ├─► Emit to Redis channel: inbox:{{ inboxId }}
    │
    ▼
Connected Clients Receive
    │
    ├─► WebSocket Handler
    │   └─► Direct client connection (lowest latency)
    │
    ├─► SSE Handler
    │   └─► Server-Sent Events fallback
    │       └─► Opaque ticket (prevents token leak in URL)
    │
    └─► Browser Extension
        └─► Service Worker push handler
            └─► Native notification

Latency: ~100ms from SMTP receipt to client notification (Redis + Fastify overhead)
```

---

## 3. Data Model & Entity Relationships

### Core Entities

**User & Auth**
```
User
  ├─ id (cuid)
  ├─ email (unique)
  ├─ role (ADMIN | USER)
  ├─ createdAt, updatedAt
  │
  ├─ Profile (1:1)
  │  ├─ name, avatar
  │  └─ timezone
  │
  ├─ Session[] (1:many)
  │  ├─ token (hashed)
  │  ├─ expiresAt
  │  └─ userAgent
  │
  └─ ApiKey[] (1:many)
     ├─ name
     ├─ key (hashed + salted)
     └─ rateLimit
```

**Organization & Teams**
```
Organization
  ├─ id, name, slug
  │
  ├─ User[] (1:many via TeamMember)
  │  └─ role (ADMIN | MEMBER)
  │
  └─ Team[] (1:many)
     ├─ name, description
     │
     ├─ User[] (ADMIN | EDITOR | VIEWER)
     │
     └─ Inbox[] (1:many)
        └─ Read/Write/Delete access by role
```

**Domain & Inbox**
```
Domain
  ├─ id, name (example.com)
  ├─ verificationToken
  ├─ verifiedAt
  ├─ dkimPrivateKey (encrypted)
  │
  └─ Inbox[] (1:many)
     ├─ id, name
     ├─ address (user@domain.com)
     ├─ publicToken (for /e/:token access)
     │
     ├─ Message[] (1:many, soft-delete)
     │  ├─ from, to, subject
     │  ├─ bodyText, bodyHtml (sanitized before storage)
     │  ├─ receivedAt
     │  │
     │  └─ Attachment[] (1:many)
     │     ├─ filename, mimetype
     │     ├─ size
     │     └─ s3Key or diskPath
     │
     ├─ Filter[] (1:many)
     │  ├─ condition (regex match)
     │  └─ action (label/forward/delete)
     │
     ├─ Label[] (1:many)
     │  └─ Message[] (many:many)
     │
     ├─ MailForwardingRule[] (1:many)
     │  ├─ condition (sender regex)
     │  ├─ actions[] (Email/Webhook/Telegram/Discord)
     │  └─ enabled
     │
     └─ Subscription (1:1)
        ├─ tier (FREE | BASIC | PRO | ENTERPRISE)
        └─ quotas (inbox count, storage, API calls)
```

**Webhooks & Events**
```
WebhookEvent
  ├─ inboxId (foreign key)
  ├─ type (message.received, message.deleted)
  ├─ payload (JSON)
  ├─ createdAt
  │
  └─ WebhookDelivery[] (1:many)
     ├─ url
     ├─ status (PENDING | SUCCESS | FAILED)
     ├─ response (last attempt)
     └─ nextRetryAt (exponential backoff)

AuditLog
  ├─ userId, tenantId
  ├─ action (CREATE_INBOX, DELETE_MESSAGE, etc.)
  ├─ resourceType, resourceId
  ├─ oldValue, newValue
  └─ createdAt (immutable)
```

---

## 4. Database & Caching Strategy

### PostgreSQL Optimization
```
Indexes:
  ├─ User.email (unique)
  ├─ Inbox.address (unique)
  ├─ Message.inboxId + receivedAt (composite, for sorting)
  ├─ Message.fromAddress (for search)
  ├─ ApiKey.hash (for lookup)
  └─ AuditLog.userId + createdAt (for compliance)

Connection Pool:
  ├─ Max: 20 connections
  ├─ Idle timeout: 30s
  └─ Prisma queue: First-in-first-out

Query Patterns:
  ├─ Pagination (offset-limit)
  ├─ Full-text search (ts_vector + GIN index)
  ├─ Soft-delete (WHERE deletedAt IS NULL)
  └─ Transactions (atomic updates, rollback on error)
```

### Redis Caching
```
Keys:
  ├─ session:{{ sessionId }} (TTL: 7 days)
  ├─ user:{{ userId }}:quota (TTL: 1 hour)
  ├─ rate-limit:{{ ipOrUserId }}:{{ endpoint }} (TTL: 60s)
  ├─ refresh-token-family:{{ familyId }} (TTL: 30 days, for reuse detection)
  ├─ token-revocation:{{ tokenId }} (TTL: token lifetime)
  └─ inbox:{{ inboxId }}:unread (TTL: 7 days)

Job Queues (BullMQ):
  ├─ email-queue (outbound email)
  ├─ webhook-queue (delivery)
  ├─ ingest-queue (SMTP → DB)
  └─ cron-queue (scheduled tasks)

Pub/Sub Channels:
  ├─ inbox:{{ inboxId }} (message.received, message.deleted)
  ├─ user:{{ userId }} (session updates, quota changes)
  └─ system (admin broadcasts)
```

---

## 5. Security Architecture

### Defense Layers

**Layer 1: TLS & Transport**
- Caddy automatic HTTPS (Let's Encrypt)
- HSTS headers (1 year, includeSubdomains)
- Secure-only cookies (httpOnly, Secure, SameSite=Strict)

**Layer 2: Authentication**
- Access tokens: In-memory only (no localStorage)
- Refresh tokens: httpOnly cookies with rotation + family tracking
- Token revocation: Redis fail-closed (reject if store unavailable)
- Rate limiting: Per-IP (1000/hour), per-user (100/hour on auth endpoints)

**Layer 3: Authorization**
- RBAC middleware: Check role + tenantId before resource access
- Field-level: Encrypt secrets (API keys, TOTP seeds, webhook secrets)
- Audit logging: All actions tracked immutably

**Layer 4: Input Validation**
- Zod schemas on all endpoints
- HTML content sanitization: DOMPurify applied before storage and rendering
- Command execution: No user input in shell commands (spawn with array args)
- SQL injection: Parameterized queries (Prisma handles)

**Layer 5: Network Security**
- SSRF prevention: Private IP blocking for webhooks (10.0.0.0/8, 127.0.0.0/8, 169.254.0.0/16, cloud metadata)
- CORS: Configurable origin allowlist + extension-specific handling
- Rate limiting: IP + endpoint throttling
- Abuse detection: Domain/inbox/IP-based rules

**Layer 6: Data Protection**
- At-rest encryption: AES-256-GCM for sensitive fields
- Field encryptor: Envelope format (fenc:v1:{base64encrypted})
- PII handling: Encryption applied before storage
- Soft-delete: Retention sweep with configurable TTL

---

## 6. Deployment Topologies

### Single-Instance (Development)
```
Docker Compose (single host)
  ├─ Caddy (reverse proxy)
  ├─ Fastify API
  ├─ React Web
  ├─ PostgreSQL
  ├─ Redis
  └─ Prometheus + Grafana

Limitations:
  - No high availability
  - Single points of failure (API, DB)
  - Limited horizontal scaling
```

### Multi-Instance with Load Balancer (Recommended Production)
```
Load Balancer (HAProxy / NGINX)
  │
  ├─ API Instance 1 (Fastify)
  ├─ API Instance 2 (Fastify)
  └─ API Instance 3 (Fastify)

Shared Services:
  ├─ PostgreSQL (with replication + backup)
  ├─ Redis Cluster (for sessions, cache, queues)
  └─ S3/Storage (shared attachment bucket)

Monitoring:
  ├─ Prometheus (scrapes /metrics from all instances)
  └─ Grafana + Alertmanager
```

### Kubernetes (Enterprise)
```
Kustomize + Helm
  ├─ Namespace: tempmail
  ├─ API Deployment (3+ replicas, HPA, resource limits)
  ├─ Web Deployment (StaticSite via CDN)
  ├─ Worker StatefulSet (BullMQ consumers)
  ├─ PostgreSQL Operator (managed replication + backups)
  ├─ Redis Operator (cluster mode)
  └─ Ingress (NGINX, Let's Encrypt via cert-manager)

Auto-scaling:
  - Horizontal Pod Autoscaling (HPA) on CPU/memory
  - Vertical Pod Autoscaling (VPA) recommendations
  - KEDA for job queue-based scaling
```

---

## 7. Integration Points

### External Services
| Service | Purpose | Criticality |
|---------|---------|-------------|
| AWS SES | Outbound + bounce/complaint | Optional (fallback: Postfix) |
| Stripe | Payment processing | Required for billing |
| Google Gemini | AI email summarization | Optional (tier-gated) |
| Let's Encrypt | TLS certificates | Required (via Caddy) |
| SendGrid/Mailgun | Outbound email | Optional alternatives to SES |

### API Contracts
- OpenAPI 3.0 spec at `/docs/openapi.json`
- REST endpoints: `/api/v1/inboxes`, `/api/v1/messages`, etc.
- Webhook payloads: HMAC-SHA256 signed with shared secret
- SDK clients: JS, Python, Go, Java, PHP, .NET

---

## 8. Monitoring & Observability

### Metrics (Prometheus)
```
Counter:
  - fastify_http_request_total (by method, route, status)
  - smtp_ingest_total (by status)
  - message_received_total
  - email_forwarded_total

Gauge:
  - database_connections_active
  - redis_memory_bytes
  - queue_jobs_pending (by queue name)
  - inbox_message_count

Histogram:
  - fastify_http_request_duration_seconds
  - database_query_duration_seconds
  - smtp_message_processing_seconds
  - webhook_delivery_seconds
```

### Dashboards
- **Overview:** Request rate, error rate, latency P50/P95/P99
- **Database:** Connection count, query time, slow queries
- **Queue:** Job count, processing time, dead-letter count
- **Email:** Ingest rate, forwarding success, spam score distribution
- **Users:** Active sessions, API key usage, quota utilization

### Alerts
- 5xx error rate > 1%
- P95 latency > 500ms
- Database connection pool exhaustion
- Queue backlog > 10k jobs
- SMTP ingest failure rate > 5%
- Daily backup failure

---

## 9. Disaster Recovery

### RTO & RPO Targets
- **RTO (Recovery Time Objective):** < 1 hour
- **RPO (Recovery Point Objective):** < 15 minutes

### Backup Strategy
```
PostgreSQL:
  ├─ Daily WAL-enabled backups
  ├─ Point-in-time recovery (7 days)
  └─ Multi-destination (S3 + Google Drive)

Redis:
  ├─ AOF (Append-Only File) persistence
  ├─ Hourly RDB snapshots
  └─ Cluster replication

Attachments:
  ├─ S3 cross-region replication
  └─ Local backup mirrors
```

### Failover Procedures
1. **Database:** Switch to replica (read-only mode if needed)
2. **Cache:** Rebuild from disk snapshots
3. **API:** Route traffic to standby instances
4. **DNS:** Update MX records if mail server changes

---

## 10. Capacity Planning

### Single Instance Limits
- **Concurrent Users:** 1,000+
- **Message Throughput:** 10K/hour
- **Storage:** 100 GB (tunable)
- **Connections:** 20 DB + 200 Redis

### Scaling Checkpoints
- **Users > 10K:** Add read replica for DB
- **Messages > 1M:** Archive old messages, add RDS read replica
- **Throughput > 50K/hour:** Multi-region setup, queue sharding
- **Storage > 500GB:** S3 tiering (hot/cold), lifecycle policies
