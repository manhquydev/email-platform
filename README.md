# TempMail Pro - Email Platform

> 🚀 **Production Ready** | [manhquy.click](https://manhquy.click)

Multi-domain inbound email platform with disposable inboxes, modern UI, and comprehensive API. Self-hosted temp mail solution for developers and teams.

## ✨ Features

- **Multi-Domain Support** - Add unlimited custom domains
- **Disposable Inboxes** - Create temp email addresses instantly
- **Modern UI/UX** - Glassmorphism design, mobile responsive
- **SEO Optimized** - Meta tags, Open Graph, JSON-LD structured data
- **Admin Panel** - User management, logs, reports, statistics
- **RESTful API** - Full API access for automation
- **Real-time Delivery** - Instant email reception
- **Docker Ready** - One-command deployment

## 🔗 Live Demo

| Service | URL |
|---------|-----|
| **Web App** | https://app.manhquy.click |
| **API** | https://api.manhquy.click |
| **Grafana** | https://grafana.manhquy.click |

## 🛠 Stack

- **Backend**: Node.js + Fastify (JWT auth)
- **Database**: Prisma + PostgreSQL + Redis
- **SMTP**: smtp-server + mailparser (attachments saved to disk)
- **Frontend**: React 19 + Vite + TailwindCSS
- **Reverse Proxy**: Caddy (auto HTTPS)
- **Monitoring**: Prometheus + Grafana
- **Container**: Docker Compose

## Quick start (Docker)
1) Copy env and adjust secrets:
```powershell
cd services/api
copy .env.example .env
# update JWT_SECRET, DEFAULT_ADMIN_* if needed
# set ALLOW_AUTO_DOMAIN_CREATION=false for prod-like use
```
2) From repo root, build and run:
```powershell
docker compose up --build
```
API: `http://localhost:3001`, SMTP: `localhost:2525`.

3) Apply migrations:
```powershell
docker compose exec api npx prisma migrate deploy
```

4) Log in (default admin seeded on first boot):
- Email: `DEFAULT_ADMIN_EMAIL` (default `admin@example.com`)
- Password: `DEFAULT_ADMIN_PASSWORD` (default `changeme`)
Use `POST /auth/login` or the web UI.

## Frontend (Vite)
```powershell
cd services/web
copy .env.example .env   # set VITE_API_BASE if different
npm install
npm run dev   # http://localhost:5173
```
UI flows: login → manage domains (add/verify) → create inboxes → view inbound messages.

## Core API routes
- `/health`, `/ready`, `/metrics`
- Auth: `POST /auth/login` -> `{ token }`
- Domains (search/pagination): `GET /domains`, `POST /domains`, `POST /domains/:id/verify`
- Inboxes (search/pagination): `GET /inboxes?domain=example.com`, `POST /inboxes`, `POST /public/inboxes` (optional CAPTCHA)
- Messages: `GET /inboxes/:id/messages` (filters + pagination), `GET /messages/search`, `GET /messages/:id`, `DELETE /messages/:id`, `GET /attachments/:id/download`
- Abuse/rules: `GET/POST/DELETE /abuse/rules` (admin), `GET/POST /abuse/reports`

All except `/health` require `Authorization: Bearer <token>`.

## Sending a test email
With `ALLOW_AUTO_DOMAIN_CREATION=true` (default in compose):
```powershell
python - <<'PY'
import smtplib
from email.message import EmailMessage
m = EmailMessage()
m["From"] = "tester@local.test"
m["To"] = "hello@example.com"
m["Subject"] = "Hello inbound"
m.set_content("This is a test inbound email.")
s = smtplib.SMTP("localhost", 2525)
s.send_message(m); s.quit()
print("sent")
PY
```
Then query:
```powershell
# after obtaining TOKEN from /auth/login
curl -H "Authorization: Bearer TOKEN" http://localhost:3001/inboxes
```

## Local (non-Docker) dev
```powershell
# API
cd services/api
copy .env.example .env  # set DATABASE_URL to your Postgres
npm install
npm run prisma:generate
npx prisma migrate dev --name init
npm run dev

# Web
cd services/web
copy .env.example .env
npm install
npm run dev
```

## Deliverability & security notes
- Keep `ALLOW_AUTO_DOMAIN_CREATION=false` in any shared/prod environment.
- Configure SPF/DKIM/DMARC on your DNS; the UI wizard surfaces the records (plus MTA-STS/TLS-RPT) and `verificationToken` from `/domains` for TXT verification.
- Terminate TLS via reverse proxy (Caddy/NGINX) in front of API; obtain certs accordingly. PTR/rDNS should point your SMTP banner/hostname to the sending IP.
- Hybrid outbound (SES/Mailgun/SendGrid) + DKIM signing/bounce/complaint handling are still TODO; keep outbound disabled unless required.
- For public exposure, enable CAPTCHA + `PUBLIC_INBOX_ENABLED`, tighten rate limits, and add block/allow rules; attachment caps/allowlist via `MAX_ATTACHMENT_BYTES` + `ALLOWED_ATTACHMENT_*`.

## Abuse controls & data governance
- SMTP ingest rate limits per IP/domain/inbox (`SMTP_RATE_*`), quotas per inbox/domain, and CAPTCHA-gated `/public/inboxes` (off by default).
- Dynamic allow/block rules via `/abuse/rules`; abuse reports via `/abuse/reports`.
- Soft-delete for messages/attachments with audit logging; retention sweep interval configurable via `RETENTION_SWEEP_MINUTES`.
- Attachment allowlist by MIME prefix/extension; default size cap via `MAX_ATTACHMENT_BYTES`.

## Observability & ops
- Metrics endpoint: `GET /metrics` (Prometheus format).
- Health: `GET /health`; readiness checks: `GET /ready` (DB ping).
- Logging: Fastify/Pino structured logs; ship to Loki/ELK; include SMTP ingest logs.
- Alerts/dashboards: scrape `/metrics` into Prometheus/Grafana; alert on 5xx rates, ingest failures, and rate-limit saturation.
- Backup: snapshot Postgres DB (`pg_dump`/`pg_restore`) and the storage directory regularly; restore by re-seeding Prisma + storage.
- Incidents: for abuse, add block/allow rules or disable `PUBLIC_INBOX_ENABLED`; for delivery, re-check DNS (SPF/DKIM/DMARC/MTA-STS/TLS-RPT), TLS certs on the proxy, and provider bounce/complaint logs.

## Implemented vs. next
- Implemented: Multi-domain + verification token, inbox CRUD, message storage, attachment persistence, JWT auth, default admin seed, SMTP ingest, web UI with RBAC surfacing/search/pagination/onboarding wizard and attachment preview.
- Extras: IP/domain/inbox rate-limit, quotas, retention sweep (configurable), attachment size caps + allowlist, sender domain blocklist + dynamic rules, abuse reports, public-inbox CAPTCHA gate, Prometheus metrics, ready probe.
- Next: Outbound mail + DKIM signing + bounce/complaint webhooks, Rspamd/ClamAV integration, log shipping dashboards, backup/restore/runbooks, provider hybrid (SES/Mailgun/SendGrid) guardrails.

## Infra notes
- Ingress: Postfix receives MX traffic; place behind a reverse proxy for TLS termination and cert renewals (e.g., Caddy/NGINX + Let’s Encrypt).
- Secrets: load via env files in dev; in prod prefer secret stores (Docker/K8s secrets, Vault).
- Containers: run as non-root where possible; keep images minimal and apply regular base updates.

## Paths
- API: `services/api/src`
- Web UI: `services/web/src`
- Prisma: `services/api/prisma`
- Compose: `docker-compose.yml`
