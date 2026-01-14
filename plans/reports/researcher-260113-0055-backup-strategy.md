# Research Report: Enterprise Backup & Disaster Recovery Strategy

## 1. Executive Summary
This report outlines a comprehensive backup and disaster recovery (DR) strategy for the Email Platform. The recent data loss incident highlights the critical need to decouple data persistence from host directory structures (bind mounts) and implement automated, off-site backups.

**Recommendation:** Adopt a **"Hybrid Backup Strategy"**:
1.  **Database:** Daily `pg_dump` for portability + WAL Archiving (optional but recommended) or frequent incremental backups for low RPO.
2.  **Files/Volumes:** Use **Restic** for efficient, encrypted, deduplicated snapshots of Docker volumes (Redis, Storage, Caddy) to Object Storage (S3/R2/B2).
3.  **Infrastructure:** Treat the VPS as ephemeral; all state must reside in named volumes or external storage.

## 2. PostgreSQL Backup Strategies

| Strategy | RPO (Data Loss) | RTO (Downtime) | Complexity | Best For |
| :--- | :--- | :--- | :--- | :--- |
| **Logical (`pg_dump`)** | High (Last backup) | Slow (Replay SQL) | Low | Small DBs (<10GB), Development, migrations. |
| **Physical (`pg_basebackup`)** | High (Last backup) | Fast (File copy) | Medium | Medium DBs, faster restore than dump. |
| **WAL Archiving (PITR)** | Near Zero (<1s) | Fast | High | **Production**, critical data, zero data loss reqs. |

**Decision:**
*   **Immediate:** Enhance the current `pg_dump` script to version control backups and push to S3.
*   **Target:** Implement `WAL-G` or `pgBackRest` for Point-in-Time Recovery (PITR) to allow restoring to specific timestamps (e.g., "right before the bad `DELETE` query").

## 3. Docker Storage & Backup Tools

### Bind Mounts vs. Named Volumes
The recent incident stemmed from **Bind Mounts** (`./postgres-data:/data`).
*   **Bind Mounts:** Maps host files to container. Vulnerable to `rm -rf` on host, permission issues, and portability problems during migration.
*   **Named Volumes:** Managed by Docker (`/var/lib/docker/volumes`). harder to accidentally delete, perform better on non-Linux hosts, and easier to migrate between hosts.

**Recommendation:** Switch `postgres-data` and `redis_data` to **Named Volumes**.

### Tool Comparison: Restic vs. Borg

| Feature | Restic | BorgBackup |
| :--- | :--- | :--- |
| **Type** | Single binary, focused on remote backends | FUSE-based, focused on local/SSH efficiency |
| **Cloud Support** | **Native S3, B2, R2, Azure** | Requires `rclone` or SSH mount |
| **Encryption** | AES-256 (Default/Mandatory) | AES-256 (Optional/Configurable) |
| **Performance** | Excellent (Concurrent uploads) | Extreme (Local), Good (Remote) |
| **Simplicity** | High (Go binary, no dependencies) | Medium (Python/C, system dependencies) |

**Winner:** **Restic**.
Why: Native support for S3-compatible storage (DigitalOcean Spaces, Cloudflare R2, AWS S3) simplifies the architecture significantly compared to Borg + Rclone.

## 4. Disaster Recovery (DR) Planning

### Definitions
*   **RPO (Recovery Point Objective):** How much data can you lose? (Target: < 1 hour)
*   **RTO (Recovery Time Objective):** How long to get back online? (Target: < 4 hours)

### Scenarios & Playbooks

**Scenario A: Server Failure (Total Loss)**
1.  Provision new VPS.
2.  Install Docker & Compose.
3.  Pull repo & `.env`.
4.  Run `restore-script.sh` (pulls data from S3).
5.  `docker compose up`.

**Scenario B: Human Error (Bad SQL/Bug)**
1.  **If PITR:** Replay WALs to `timestamp = now() - 5min`.
2.  **If Dump:** Restore last night's dump (Data loss: ~12-24h).

**Scenario C: Ransomware**
1.  Nuke infected server.
2.  Provision new environment.
3.  Restore from immutable S3 bucket (Versioning Enabled).

## 5. Security Considerations
1.  **Encryption:** All backups must be encrypted at rest (Restic does this by default).
2.  **Immutability:** Enable "Object Lock" or "Versioning" on the S3 bucket to prevent ransomware from overwriting backups.
3.  **Isolation:** The backup agent should use an API Key with `PutObject` permissions; a separate admin key is needed for `DeleteObject`.

## 6. Migration Plan (Zero Downtime-ish)
1.  **Prepare:** Create named volumes on the new server.
2.  **Sync:** `rsync` current bind mount data to the new server's volume location.
3.  **Cutover:**
    *   Stop old app.
    *   Final `pg_dump` / `rsync`.
    *   Start new app.
    *   Switch DNS.

## 7. Recommended Implementation

**Step 1: Fix Docker Compose**
Stop using bind mounts for database. Migration required:
```bash
# 1. Stop containers
docker compose down
# 2. Create named volume
docker volume create email_postgres_data
# 3. Copy data from bind mount to named volume
docker run --rm -v ./postgres-data:/from -v email_postgres_data:/to alpine ash -c "cp -av /from/. /to/"
# 4. Update docker-compose.yml to use 'email_postgres_data'
```

**Step 2: Deploy Backup Container**
Add a service to `docker-compose.yml`:
```yaml
  backup:
    image: mmazzarolo/docker-postgres-backup-local
    # Or a custom restic container
    environment:
      POSTGRES_HOST: postgres
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      SCHEDULE: "@daily"
      S3_BUCKET: ...
```

**Step 3: Documentation**
Create `docs/DISASTER_RECOVERY.md` containing the restore commands.

## Unresolved Questions
*   Does DigitalOcean provide "Volume Snapshots" that could simplify this? (Yes, but they are full disk, not app-aware).
*   Is the current `postgres-data` folder consistent? (Assuming yes if app runs).

---
**Sources:**
- [Restic vs Borg](https://mangohost.net)
- [PostgreSQL WAL Archiving](https://postgresql.org)
- [Docker Volume Backups](https://offen.github.io/docker-volume-backup/)
