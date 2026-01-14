# Researcher Report: Enterprise Backup & Disaster Recovery (2026-01-13)

## Executive Summary
This report outlines a production-ready backup and disaster recovery strategy for the Email Platform (PostgreSQL 16, Redis 7, Docker Compose) hosted on Ubuntu 22.04. The primary goal is to prevent data loss (recent volume deletion incident) and ensure rapid recovery with minimal downtime.

## 1. PostgreSQL Backup Strategy

| Feature | pg_dump (Logical) | WAL Archiving + PITR (Physical) |
| :--- | :--- | :--- |
| **Best For** | Small DBs, granular restore, portability | Large DBs, high availability, zero data loss |
| **Data Loss** | Up to 24h (since last dump) | Near zero (Point-in-Time Recovery) |
| **Performance**| Sequential scan, can slow down DB | Low overhead, block-level copying |
| **Recovery** | Slower (re-importing SQL) | Faster (file system restore + replay logs) |

**Recommendation:**
- **Tier 1:** Automated daily `pg_dump` for simplicity and object-level recovery.
- **Tier 2:** Implement WAL archiving to S3-compatible storage for critical production workloads requiring < 5 min RPO.

## 2. Docker Volume Backup Tools

| Tool | Deduplication | Encryption | Cloud Native | Use Case |
| :--- | :--- | :--- | :--- | :--- |
| **Restic** | Yes | Yes | Native S3/R2 | Modern, cloud-first, easy setup. |
| **BorgBackup**| Yes | Yes | Needs SSH/Rsync | Superior compression, best for self-hosting. |
| **Rclone** | No | Optional | All Providers | Best for simple sync/move operations. |

**Recommendation:**
Use **Restic** as the primary engine. It handles deduplication and encryption natively and integrates perfectly with S3/R2 storage.

## 3. Cloud Storage Comparison (2026 Projections)

| Provider | Storage Cost | Egress Cost | Best For |
| :--- | :--- | :--- | :--- |
| **Cloudflare R2**| ~$0.015/GB | **Free** | High retrieval frequency, cost predictability. |
| **Backblaze B2** | ~$0.006/GB | 3x storage free | Lowest storage cost. |
| **DO Spaces** | $5 (250GB incl) | 1TB included | Current ecosystem (DigitalOcean). |
| **AWS S3** | Tiered | Expensive | Enterprise compliance/ecosystem. |

**Recommendation:**
Use **Cloudflare R2** or **Backblaze B2** for off-site backups to achieve geographic redundancy away from DigitalOcean.

## 4. Disaster Recovery & Migration

### RTO/RPO Objectives
- **RPO (Recovery Point Objective):** 1 hour (Backups every hour).
- **RTO (Recovery Time Objective):** < 30 minutes (Automated Docker deployment).

### Migration Steps (Zero-Downtime)
1. **Prepare New Host:** Install Docker, clone repo, setup ENV.
2. **Initial Sync:** `rsync` or `rclone` data volumes while old server is live.
3. **Switch to Read-Only:** Put API in maintenance/RO mode.
4. **Final Sync:** Perform final high-speed delta sync of volumes.
5. **DNS Flip:** Update Cloudflare/DNS records to new IP.
6. **Docker Rollout:** Use `docker-rollout` plugin for future updates without stopping containers.

## 5. Security & Monitoring
- **Immutability:** Use S3 Object Lock (if using supported backend) or append-only mode to prevent Ransomware.
- **Monitoring:** Integrate `healthchecks.io` with backup scripts. No ping = Alert.
- **Verification:** Weekly automated "Restore Test" in a temporary container.

## 6. Implementation Recommendations for Email Platform
1. **Service Integration:** Add a `backup` service to `docker-compose.prod.yml` using `restic`.
2. **Persistence:** Move from "Named Volumes" to "Bind Mounts" or ensure volume-aware backup scripts are used to avoid `docker compose down -v` accidents.
3. **Rotation:** 7 daily, 4 weekly, 12 monthly snapshots.

## Unresolved Questions
- Is there a specific budget limit for monthly backup storage?
- Does the user prefer a specific geographic region for off-site backups?
- Should we implement PostgreSQL PITR immediately or start with hourly logical dumps?

## Sources
- [PostgreSQL 16 Documentation](https://www.postgresql.org/docs/16/backup.html)
- [Restic Official Documentation](https://restic.net/)
- [Cloudflare R2 Pricing](https://www.cloudflare.com/products/r2/)
- [Backblaze B2 Pricing](https://www.backblaze.com/b2/cloud-storage-pricing.html)
- [DigitalOcean Spaces Pricing](https://www.digitalocean.com/pricing/spaces)
- [Docker Rollout Plugin](https://github.com/wow-mario-6-4/docker-rollout)
- [Healthchecks.io](https://healthchecks.io/)
