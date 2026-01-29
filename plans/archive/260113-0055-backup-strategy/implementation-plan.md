# Implementation Plan: Enterprise Backup & Disaster Recovery

## Context
Current system relies on bind mounts (`./postgres-data`) which are prone to host-level accidents. No automated off-site backup exists.

## Objectives
1.  **Secure Storage**: Migrate from bind mounts to Docker Named Volumes.
2.  **Automated Off-site Backups**: Implement daily backups to S3-compatible storage.
3.  **Disaster Recovery**: Create a clear runbook for restoring service from scratch.

## Phase 1: Storage Migration (Bind Mounts -> Named Volumes)
**Risk**: High (Data manipulation). Requires downtime.

1.  **Stop Services**: `docker compose down`.
2.  **Backup Current Data**: `cp -r postgres-data postgres-data-backup-$(date +%F)`.
3.  **Create Named Volumes**:
    ```bash
    docker volume create email_postgres_data
    docker volume create email_redis_data
    docker volume create email_caddy_data
    docker volume create email_caddy_config
    ```
4.  **Migrate Data**: Use a temporary container to copy data from host bind mount to new named volume.
5.  **Update `docker-compose.yml`**:
    - Replace `volumes: - ./postgres-data:/var/lib/postgresql/data` with `email_postgres_data:/var/lib/postgresql/data`.
    - Define `volumes:` section at bottom.

## Phase 2: Automated Backup System
**Strategy**: "Sidecar" backup container + Restic.

1.  **Tool Selection**: Use `offen/docker-volume-backup` or a custom script with `restic`.
    - *Decision*: Custom script `scripts/backup-manager.sh` wrapped in a lightweight Alpine container is more flexible for our hybrid needs (DB dump + file backup).
2.  **PostgreSQL Backup**:
    - Enhance `scripts/backup.sh` to support S3 upload (already partially present, needs refinement).
    - Add `PG_DUMP` rotation policy.
3.  **Volume Backup**:
    - Backup `storage/` (attachments) and other critical volumes using Restic.
4.  **Integration**:
    - Add `backup` service to `docker-compose.yml`.
    - Mount necessary volumes read-only.

## Phase 3: Disaster Recovery Documentation
1.  Create `docs/DISASTER_RECOVERY.md`.
2.  Document:
    - **Total Site Failure**: How to provision VPS + restore.
    - **Data Corruption**: How to restore DB to previous state.
    - **Verification**: How to test backups.

## Action Items

### 1. Code Changes
- [ ] Modify `docker-compose.yml` (Volumes & Backup Service).
- [ ] Update `scripts/backup.sh` for robust S3 support.
- [ ] Create `scripts/restore.sh`.

### 2. Documentation
- [ ] Create `docs/DISASTER_RECOVERY.md`.

### 3. Execution (User Manual Step)
- [ ] Run migration commands (to be provided in a script `scripts/migrate-to-volumes.sh`).

## Timeline
- **Now**: Plan approval.
- **Next**: Create scripts and update compose file.
- **Finally**: User executes migration script during maintenance window.
