---
description: Deploy latest code to production with --no-cache to ensure fresh build
---
# Production Deployment Workflow

This workflow pulls the latest code from `main`, rebuilds the API and Web services WITHOUT cache to ensure code updates are applied, and restarts the services.

1.  **Pull Latest Code**
    Connect via SSH and pull the `main` branch.

2.  **Rebuild Scritply (--no-cache)**
    This step is CRITICAL. We use `--no-cache` and `--force-recreate` to avoid the "stale code" issue where Docker reuses old layers even after git pull.

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
