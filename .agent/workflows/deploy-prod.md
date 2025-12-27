---
description: Deploy latest code to production with --no-cache to ensure fresh build
---
# Production Deployment Workflow

This workflow pulls the latest code from `main`, rebuilds the API and Web services WITHOUT cache to ensure code updates are applied, and restarts the services.

1.  **Pull Latest Code**
    Connect via SSH and pull the `main` branch.

2.  **Rebuild Scriptly (--no-cache)**
    This step is CRITICAL. It includes:
    *   `--no-cache`: Forces Docker to rebuild layers (fixing stale code).
    *   `--force-recreate`: Ensures containers are replaced.
    *   `prisma migrate deploy`: **REQUIRED** to apply database schema changes (fixes 500 errors).
    *   `restart`: Ensures the new binary is loaded relative to the environment.
    
    *Self-Correction Check*: Ensure `docker-compose.yml` maps `"25:2525"` for email ingestion.

// turbo
3.  **Execute Deployment**
    ```bash
    ssh -i .ssh/id_ed25519 -o StrictHostKeyChecking=no root@165.22.48.193 "cd ~/email-platform. && git pull origin main && docker compose build --no-cache web api && docker compose up -d --force-recreate web api && docker compose exec api npx prisma migrate deploy && docker compose restart web api"
    ```

4.  **Verify Deployment**
    Check the container creation timestamp to confirm freshness.
    ```bash
    ssh -i .ssh/id_ed25519 -o StrictHostKeyChecking=no root@165.22.48.193 "docker inspect --format='API: {{.Created}}' email-platform-api-1 && docker inspect --format='Web: {{.Created}}' email-platform-web-1"
    ```
