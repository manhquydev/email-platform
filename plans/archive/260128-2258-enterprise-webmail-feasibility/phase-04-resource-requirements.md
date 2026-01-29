# Phase 4: Resource Requirements

## Team Composition

### Core Team (Required)

| Role | Count | Salary Range | Notes |
|------|-------|--------------|-------|
| **Tech Lead / Architect** | 1 | $150-180K | Full-stack, system design |
| **Backend Engineer (Protocols)** | 1 | $130-160K | IMAP/SMTP specialist - CRITICAL hire |
| **Backend Engineer (General)** | 1 | $100-130K | API, integrations, LDAP |
| **Frontend Engineer** | 1 | $100-130K | React, UX focus |
| **DevOps/SRE** | 0.5 | $60-70K | Part-time or contractor |

**Minimum Viable Team: 4.5 FTE**

### Extended Team (Phase 2+)

| Role | When | Salary Range | Notes |
|------|------|--------------|-------|
| QA Engineer | Month 6 | $80-100K | Protocol testing, client compat |
| Security Engineer | Month 12 | $130-150K | Compliance, pen testing |
| Technical Writer | Month 12 | $70-90K | Docs, API reference |
| Support Engineer | Month 12 | $60-80K | Customer issues |

### Key Hire: Protocol Specialist

**This is the make-or-break hire.**

Requirements:
- 5+ years with IMAP/SMTP internals
- Experience with Dovecot, Postfix, or similar
- Understands RFC 3501 (IMAP), RFC 5321 (SMTP)
- Bonus: CalDAV/CardDAV experience

Where to find:
- Ex-Zimbra, ex-Fastmail, ex-Protonmail engineers
- Dovecot/Postfix mailing list contributors
- Open-source mail server maintainers

Expected salary: $140-180K (premium for rare skill)

## Infrastructure Costs

### Development Environment

| Resource | Monthly Cost | Notes |
|----------|--------------|-------|
| Dev VPS (4 instances) | $200 | Staging, CI runners |
| PostgreSQL managed | $50 | Development DB |
| GitHub Team | $20 | 5 seats |
| Misc tools | $100 | Figma, Slack, etc. |
| **Total Dev** | **$370/mo** | |

### Production Environment (at launch)

| Resource | Monthly Cost | Notes |
|----------|--------------|-------|
| App servers (3x) | $300 | 4 vCPU, 8GB each |
| PostgreSQL (HA) | $200 | Managed, 100GB |
| Redis cluster | $100 | Session, cache |
| Object storage | $50 | Attachments, 500GB |
| Load balancer | $50 | TLS termination |
| Monitoring | $100 | Grafana Cloud or self-hosted |
| Backup storage | $50 | Daily snapshots |
| Email delivery | $100 | SES/Mailgun for outbound |
| **Total Prod** | **$950/mo** | Starting estimate |

### Scaling Projections

| Users | Monthly Infra | Notes |
|-------|---------------|-------|
| 0-500 | $950 | Initial setup |
| 500-2000 | $1,500 | Scale app servers |
| 2000-5000 | $3,000 | Add IMAP capacity, larger DB |
| 5000-10000 | $6,000 | HA everything, CDN |
| 10000+ | $10,000+ | Custom architecture |

## Third-Party Services

### Required

| Service | Cost | Purpose |
|---------|------|---------|
| Transactional email (SES) | $0.10/1000 | Password resets, notifications |
| DNS (Cloudflare) | Free-$20/mo | DNS, DDoS protection |
| SSL certs (Let's Encrypt) | Free | TLS |
| Error tracking (Sentry) | $26/mo | Bug monitoring |

### Optional (Recommended)

| Service | Cost | Purpose |
|---------|------|---------|
| Spam filter (Rspamd cloud) | $50/mo | Or self-host |
| Virus scanning (ClamAV) | Free | Self-hosted |
| Legal/compliance consult | $5,000 one-time | SOC2 prep |
| Security audit | $10,000 one-time | Before enterprise launch |

## Budget Estimation

### 18-Month Development Budget

| Category | Cost | Notes |
|----------|------|-------|
| **Salaries (core team)** | $810,000 | 4.5 FTE avg $100K x 18mo |
| **Benefits/overhead** | $162,000 | 20% of salaries |
| **Infrastructure** | $20,000 | Dev + initial prod |
| **Tools/services** | $15,000 | SaaS, licenses |
| **Legal/compliance** | $15,000 | Consult, audits |
| **Contingency (15%)** | $153,000 | Buffer for unknowns |
| **Total** | **$1,175,000** | |

### Minimum Viable Budget (Aggressive)

| Category | Cost | Notes |
|----------|------|-------|
| **Salaries (3 FTE)** | $450,000 | Lean team, 18mo |
| **Benefits/overhead** | $90,000 | 20% |
| **Infrastructure** | $15,000 | Minimal |
| **Tools/services** | $10,000 | |
| **Contingency (10%)** | $56,500 | |
| **Total** | **$621,500** | High risk |

### Recommendation: Target $800K-1M

- $800K: Lean team (3-4 FTE), aggressive timeline, higher risk
- $1M: Proper team (4-5 FTE), buffer for pivots, lower risk
- $1.2M: Full team + QA + part-time security, safest path

## Funding Options

### Option 1: Bootstrap (If Profitable Core Business)
- Reinvest existing revenue
- Slower but retain control
- Timeline: 24-30 months

### Option 2: Angel/Seed Round
- Raise $1-1.5M at $5-8M valuation
- Give up 15-25% equity
- Timeline: 18-24 months

### Option 3: Strategic Partnership
- Partner with MSP or hosting provider
- They fund development, get exclusive distribution
- Retain product control

### Option 4: Grants
- NLNet (EU open source funding)
- Mozilla MOSS
- FOSS Responders
- Smaller amounts ($50-200K) but non-dilutive

## Unresolved Questions

1. **Protocol hire availability**: Can we find IMAP specialist at budget?
2. **Dovecot fallback**: If build fails, integration cost with Dovecot?
3. **CalDAV scope**: Full recurring events or basic-only for MVP?
4. **Hosting model**: Self-hosted only or also managed cloud?
5. **Open source strategy**: Full FOSS or open-core with paid modules?
