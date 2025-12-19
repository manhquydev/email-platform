# Quick Start Guide

This guide will help you get TempMail Pro up and running in just a few minutes. We'll use Docker Compose for the simplest deployment.

## Prerequisites

- Docker and Docker Compose installed
- At least 2GB of RAM available
- Port 3001 (API), 2525 (SMTP), 5173 (Web UI), and 80 (Caddy proxy) available

## Step 1: Clone and Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd TempMail-Pro
```

2. Copy and configure environment variables:
```bash
cd services/api
cp .env.example .env
```

3. Edit `.env` file with your settings:
```env
# Required for production
DATABASE_URL="postgresql://username:password@localhost:5432/tempmailpro"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
DEFAULT_ADMIN_EMAIL="admin@yourdomain.com"
DEFAULT_ADMIN_PASSWORD="changeme"

# Optional: Auto-create domains (false for production)
ALLOW_AUTO_DOMAIN_CREATION=true

# Optional: Enable public inboxes with CAPTCHA
PUBLIC_INBOX_ENABLED=true
CAPTCHA_SECRET_KEY="your-captcha-secret"
```

## Step 2: Build and Run

1. From the repository root, start all services:
```bash
docker compose up --build
```

2. Wait for all containers to start (this may take 2-3 minutes):
- `api`: TempMail Pro API server
- `web`: React web application
- `db`: PostgreSQL database
- `redis`: Redis cache
- `caddy`: Reverse proxy

## Step 3: Apply Migrations

Once the database is ready, apply migrations:
```bash
docker compose exec api npx prisma migrate deploy
```

## Step 4: Access TempMail Pro

### Web Interface
Open your browser and navigate to:
- **Main Application**: http://localhost (or your domain)
- **Direct Web UI**: http://localhost:5173

### API Endpoints
- **Base URL**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

### Test SMTP Server
- **SMTP Host**: localhost
- **Port**: 2525
- **No authentication required** (for testing)

## Step 5: Login to Admin Panel

Use the default admin credentials:
- **Email**: `DEFAULT_ADMIN_EMAIL` (from .env, default: admin@example.com)
- **Password**: `DEFAULT_ADMIN_PASSWORD` (from .env, default: changeme)

After login, you can:
1. **Add Custom Domains** - Verify your own domains for email receiving
2. **Create Inboxes** - Generate temporary email addresses
3. **View Messages** - Read received emails in real-time
4. **Manage Users** - Admin panel for user management

## Step 6: Send a Test Email

1. Create an inbox via the web UI
2. Send a test email to the generated address using any email client:
```bash
# Using command line (Python example)
python - <<'EOF'
import smtplib
from email.message import EmailMessage

msg = EmailMessage()
msg['From'] = 'sender@test.com'
msg['To'] = 'your-temp-inbox@yourdomain.com'
msg['Subject'] = 'Test Email'
msg.set_content('This is a test email to TempMail Pro')

with smtplib.SMTP('localhost', 2525) as server:
    server.send_message(msg)
    print("Test email sent successfully!")
EOF
```

3. Check the web interface - your email should appear instantly!

## Production Deployment

For production, follow these additional steps:

1. **Set secure environment variables**:
   - Use strong JWT secret
   - Set secure admin password
   - Configure proper database credentials

2. **Configure HTTPS**:
   - Obtain valid SSL certificates
   - Update Caddy configuration if needed

3. **Set security policies**:
   ```env
   ALLOW_AUTO_DOMAIN_CREATION=false
   PUBLIC_INBOX_ENABLED=false
   MAX_ATTACHMENT_BYTES=10485760  # 10MB max
   ```

4. **Configure monitoring**:
   - Set up alerts for error rates
   - Monitor database performance
   - Configure log aggregation

## Troubleshooting

### Common Issues

**Database won't start**:
```bash
# Check PostgreSQL logs
docker compose logs db

# Reset database volume (WARNING: loses all data)
docker compose down -v
docker compose up -d db
```

**API can't connect to database**:
```bash
# Check network connectivity
docker compose exec api ping db

# Verify database URL in .env
```

**Web UI shows 404**:
- The Caddy proxy may need time to configure
- Check `docker compose logs caddy` for errors

**Migrations fail**:
```bash
# View detailed error logs
docker compose logs api

# Reset database
docker compose down -v
docker compose up -d db
```

### Health Checks

Check service health:
```bash
# API health
curl http://localhost:3001/health

# Database readiness
curl http://localhost:3001/ready
```

## Next Steps

Now that you're up and running:
- [Create your first custom domain](../guides/custom-domains.md)
- [Explore the API documentation](../api/)
- [Learn about email forwarding](../guides/email-forwarding.md)
- [Set up advanced configuration](../system-architecture.md)

Need more help? Check our [FAQ](../faq/) or browse our [guides](../guides/) for detailed tutorials.