# Troubleshooting FAQ

Find solutions to common technical issues with TempMail Pro.

## Installation Issues

### Docker won't start

**Problem**: Docker containers fail to start or crash immediately.

**Solutions**:
1. **Check Docker installation**:
   ```bash
   docker --version
   docker compose --version
   ```

2. **Check system requirements**:
   - Windows: Enable WSL 2
   - macOS: Install Docker Desktop
   - Linux: Install Docker and Docker Compose

3. **Check disk space**:
   ```bash
   df -h
   ```

4. **Clear Docker cache**:
   ```bash
   docker system prune -a
   ```

5. **Check logs for errors**:
   ```bash
   docker compose logs
   ```

### Database won't initialize

**Problem**: PostgreSQL container fails to start or can't connect.

**Solutions**:
1. **Check PostgreSQL logs**:
   ```bash
   docker compose logs db
   ```

2. **Reset database** (WARNING: Deletes all data):
   ```bash
   docker compose down -v
   docker compose up -d db
   ```

3. **Verify database URL** in `.env`:
   ```env
   DATABASE_URL="postgresql://postgres:password@db:5432/tempmailpro"
   ```

4. **Check port conflicts**:
   ```bash
   netstat -an | grep 5432
   ```

### API won't connect to database

**Problem**: API container starts but can't connect to PostgreSQL.

**Solutions**:
1. **Wait for database to fully start** (1-2 minutes)

2. **Check network connectivity**:
   ```bash
   docker compose exec api ping db
   ```

3. **Verify database URL** in API container:
   ```bash
   docker compose exec api env | grep DATABASE_URL
   ```

4. **Re-run migrations**:
   ```bash
   docker compose exec api npx prisma migrate deploy
   ```

## Email Delivery Issues

### Not receiving emails

**Problem**: SMTP server accepts emails but they don't appear in inboxes.

**Solutions**:
1. **Check SMTP server logs**:
   ```bash
   docker compose logs smtp
   ```

2. **Verify domain configuration**:
   - Check DNS records (SPF, DKIM, DMARC)
   - Verify domain status in admin panel
   - Test with default domain first

3. **Test SMTP connection manually**:
   ```bash
   telnet localhost 2525
   ```

4. **Check email filters**:
   - No spam filters blocking delivery
   - Check inbox name isn't reserved

5. **Check for errors in API logs**:
   ```bash
   docker compose logs api
   ```

### Emails bouncing

**Problem**: SMTP server rejects incoming emails.

**Solutions**:
1. **Check DNS records**:
   ```bash
   dig yourdomain.com MX
   dig yourdomain.com TXT
   ```

2. **Verify SPF alignment**:
   ```bash
   spfquery -m envelope-from@test.com -h yourdomain.com
   ```

3. **Check IP reputation**:
   - Use tools like mxtoolbox.com
   - Ensure sending IP isn't blacklisted

4. **Check DNS propagation**:
   ```bash
   dig yourdomain.com MX @8.8.8.8
   ```

### Slow email delivery

**Problem**: Emails take a long time to appear in inboxes.

**Solutions**:
1. **Check system resources**:
   ```bash
   docker stats
   ```

2. **Monitor queue processing**:
   - Check Redis for message backlog
   - Verify database performance

3. **Optimize database**:
   ```bash
   docker compose exec db psql -U postgres -d tempmailpro -c "VACUUM FULL;"
   ```

4. **Check network latency**:
   - Verify SMTP server isn't overloaded
   - Check for firewall delays

## API Issues

### Authentication errors

**Problem**: API returns 401 Unauthorized errors.

**Solutions**:
1. **Verify JWT token**:
   ```javascript
   // Decode JWT to check expiration
   const parts = token.split('.');
   const payload = JSON.parse(atob(parts[1]));
   console.log(payload.exp * 1000 > Date.now());
   ```

2. **Check login endpoint**:
   ```bash
   curl -X POST "http://localhost:3001/auth/login" \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"changeme"}'
   ```

3. **Verify environment variables**:
   ```bash
   docker compose exec api env | grep JWT
   ```

4. **Regenerate JWT secret** (if compromised):
   ```env
   JWT_SECRET="new-secret-key"
   ```

### Rate limiting errors

**Problem**: API returns 429 Too Many Requests errors.

**Solutions**:
1. **Check rate limit headers**:
   ```bash
   curl -I http://localhost:3001/inboxes
   # Look for X-RateLimit-* headers
   ```

2. **Implement retry logic**:
   ```javascript
   async function retryRequest(requestFn, maxRetries = 3) {
     let retries = 0;

     while (retries < maxRetries) {
       try {
         return await requestFn();
       } catch (error) {
         if (error.status === 429) {
           const waitTime = parseInt(error.headers['retry-after']) * 1000;
           await new Promise(resolve => setTimeout(resolve, waitTime));
           retries++;
         } else {
           throw error;
         }
       }
     }
   }
   ```

3. **Use caching** for frequently accessed data:
   ```javascript
   const cache = new Map();

   async function cachedRequest(key, requestFn, ttl = 60000) {
     const cached = cache.get(key);
     if (cached && Date.now() - cached.timestamp < ttl) {
       return cached.data;
     }

     const data = await requestFn();
     cache.set(key, { data, timestamp: Date.now() });
     return data;
   }
   ```

### Database connection errors

**Problem**: API returns database connection errors.

**Solutions**:
1. **Check database connectivity**:
   ```bash
   docker compose exec api npx prisma db ping
   ```

2. **Verify database URL** in API container:
   ```bash
   docker compose exec api printenv DATABASE_URL
   ```

3. **Check database connections**:
   ```sql
   -- In PostgreSQL container
   SELECT count(*) FROM pg_stat_activity;
   ```

4. **Increase connection pool**:
   ```env
   DATABASE_POOL_SIZE=10
   ```

## UI Issues

### Web UI not loading

**Problem**: Web interface shows errors or doesn't load.

**Solutions**:
1. **Check Caddy proxy logs**:
   ```bash
   docker compose logs caddy
   ```

2. **Check web container logs**:
   ```bash
   docker compose logs web
   ```

3. **Test direct access to web UI**:
   ```bash
   curl http://localhost:5173
   ```

4. **Clear browser cache** or try incognito mode

5. **Check CORS settings**:
   ```env
   CORS_ORIGIN="http://localhost:5173"
   ```

### Login not working

**Problem**: Can't log in to the web interface.

**Solutions**:
1. **Verify admin credentials**:
   - Check `.env` file for admin email/password
   - Default: admin@example.com / changeme

2. **Check API health**:
   ```bash
   curl http://localhost:3001/health
   ```

3. **Test API directly**:
   ```bash
   curl -X POST "http://localhost:3001/auth/login" \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"changeme"}'
   ```

4. **Check browser console** for errors (F12)

### Inboxes not showing

**Problem**: Inboxes section is empty or shows errors.

**Solutions**:
1. **Check if domains are configured**:
   - Need at least one domain to create inboxes
   - Domain must be verified

2. **Test API endpoint**:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3001/inboxes
   ```

3. **Check browser network tab** for API errors

## Performance Issues

### High memory usage

**Problem**: Server using excessive memory.

**Solutions**:
1. **Check container stats**:
   ```bash
   docker stats
   ```

2. **Monitor database queries**:
   ```bash
   docker compose exec db psql -U postgres -d tempmailpro -c "SELECT query, calls, total_time FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"
   ```

3. **Optimize database**:
   ```bash
   docker compose exec db psql -U postgres -d tempmailpro -c "VACUUM ANALYZE;"
   ```

4. **Increase memory limits**:
   ```yaml
   # docker-compose.yml
   services:
     api:
       mem_limit: 2g
     db:
       mem_limit: 4g
   ```

### Slow message loading

**Problem**: Messages take a long time to load.

**Solutions**:
1. **Optimize database indexes**:
   ```prisma
   // schema.prisma
   model Message {
     // ... existing fields
     @@index([inboxId, createdAt])
     @@index([from])
     @@index([subject])
   }
   ```

2. **Enable Redis caching**:
   ```env
   REDIS_URL="redis://redis:6379"
   REDIS_TTL=3600
   ```

3. **Implement pagination**:
   ```bash
   curl "http://localhost:3001/messages?limit=50&page=1"
   ```

4. **Lazy load messages** in UI

### Slow SMTP processing

**Problem**: SMTP server processes emails slowly.

**Solutions**:
1. **Check SMTP server configuration**:
   - Increase worker processes
   - Optimize connection limits

2. **Monitor queue length**:
   ```bash
   docker compose exec redis redis-cli llen smtp_queue
   ```

3. **Scale horizontally**:
   ```yaml
   # docker-compose.yml
   services:
     smtp:
       deploy:
         replicas: 2
   ```

## Security Issues

### Suspicious activity

**Problem**: Detect unusual email patterns or activity.

**Solutions**:
1. **Check abuse logs**:
   ```bash
   docker compose logs api | grep abuse
   ```

2. **Monitor rate limiting**:
   ```bash
   docker compose exec api curl "http://localhost:3001/metrics" | grep rate_limit
   ```

3. **Implement IP blocking**:
   ```bash
   # Add to API configuration
   BLOCKED_IPS="1.2.3.4,5.6.7.8"
   ```

4. **Enable CAPTCHA for public inboxes**:
   ```env
   PUBLIC_INBOX_ENABLED=true
   CAPTCHA_SECRET_KEY="your-captcha-secret"
   ```

### Unauthorized access

**Problem**: Someone accessed your TempMail Pro instance.

**Solutions**:
1. **Change all passwords** immediately
2. **Rotate JWT secrets**:
   ```env
   JWT_SECRET="new-secret"
   ```
3. **Revoke all tokens** (database level)
4. **Check audit logs** for unauthorized access
5. **Enable IP restrictions**:
   ```env
   ALLOWED_IPS="192.168.1.0/24"
   ```

## Backup & Recovery

### Database backup failed

**Problem**: Can't create database backups.

**Solutions**:
1. **Check disk space**:
   ```bash
   df -h
   ```

2. **Use proper dump command**:
   ```bash
   docker compose exec db pg_dump -U postgres tempmailpro > backup.sql
   ```

3. **Compress backup**:
   ```bash
   gzip backup.sql
   ```

4. **Verify backup integrity**:
   ```bash
   gunzip -t backup.sql.gz
   ```

### Data corruption

**Problem**: Database appears corrupted or inaccessible.

**Solutions**1. **Check database logs**:
   ```bash
   docker compose logs db
   ```

2. **Run database checks**:
   ```sql
   -- In PostgreSQL
   REINDEX DATABASE tempmailpro;
   ANALYZE tempmailpro;
   ```

3. **Restore from backup**:
   ```bash
   docker compose exec db psql -U postgres -d tempmailpro < backup.sql
   ```

4. **Create new database** and restore from last backup

## Advanced Troubleshooting

### Debug mode

**Problem**: Need detailed debugging information.

**Solutions**:
1. **Enable debug logging**:
   ```env
   LOG_LEVEL=debug
   ```

2. **Enable API debugging**:
   ```javascript
   // In API code
   process.env.DEBUG = 'tempmail:*'
   ```

3. **Check all container logs**:
   ```bash
   docker compose logs --follow
   ```

### Performance profiling

**Problem**: Need to optimize performance.

**Solutions**:
1. **Enable slow query logging**:
   ```env
   DATABASE_SLOW_QUERY_THRESHOLD=100
   ```

2. **Use profiling tools**:
   ```bash
   # CPU profiling
   docker compose exec api node --prof server.js

   # Memory profiling
   docker compose exec api node --inspect server.js
   ```

3. **Monitor with Prometheus**:
   ```bash
   curl http://localhost:3001/metrics
   ```

### Network debugging

**Problem**: Network-related issues.

**Solutions**:
1. **Test connectivity**:
   ```bash
   docker compose exec api ping db
   docker compose exec api ping redis
   ```

2. **Check port mappings**:
   ```bash
   docker compose ps
   ```

3. **Test with different networks**:
   ```yaml
   # docker-compose.yml
   networks:
     tempmail:
       driver: bridge
   ```

## Common Error Messages

### "Database connection failed"

**Cause**: PostgreSQL not accessible or misconfigured.

**Fix**:
1. Check database container status
2. Verify DATABASE_URL in .env
3. Wait for full database initialization
4. Re-run migrations

### "Authentication required"

**Cause**: Missing or invalid JWT token.

**Fix**:
1. Verify login credentials
2. Check token expiration
3. Ensure proper Authorization header
4. Re-authenticate

### "Domain not verified"

**Cause**: DNS records not configured.

**Fix**:
1. Verify SPF/DKIM/DMARC records
2. Check DNS propagation
3. Verify domain in admin panel
4. Use domain verification tool

### "Rate limit exceeded"

**Cause**: Too many API requests.

**Fix**:
1. Implement rate limiting in client
2. Use caching
3. Spread requests over time
4. Request API quota increase

### "Invalid domain format"

**Cause**: Invalid domain name.

**Fix**:
1. Use valid domain format
2. Check for typos
3. Verify domain ownership
4. Use test domain first

## Getting Help

If you can't resolve your issue:

1. **Check logs** first:
   ```bash
   docker compose logs --tail=100
   ```

2. **Search existing issues**:
   - GitHub issues
   - Community forums
   - Documentation

3. **Create detailed issue report** including:
   - Environment (OS, Docker version)
   - Exact error messages
   - Steps to reproduce
   - Expected vs actual behavior
   - Relevant logs

4. **Join our community**:
   - Discord/Slack
   - GitHub discussions
   - Stack Overflow

## Preventive Measures

### Regular maintenance

1. **Update regularly**:
   ```bash
   docker compose pull
   docker compose up -d
   ```

2. **Monitor logs**:
   ```bash
   docker compose logs --follow --tail=100
   ```

3. **Check performance**:
   ```bash
   docker stats
   ```

4. **Backup regularly**:
   ```bash
   # Daily backup script
   #!/bin/bash
   docker compose exec db pg_dump -U postgres tempmailpro > "backup-$(date +%Y%m%d).sql"
   gzip "backup-$(date +%Y%m%d).sql"
   ```

### Security best practices

1. **Rotate secrets regularly**:
   ```env
   JWT_SECRET="new-secret"
   ```

2. **Monitor access logs**:
   ```bash
   docker compose logs api | grep -E "(POST|GET|PUT|DELETE)"
   ```

3. **Keep updated**:
   ```bash
   docker compose pull
   docker compose up -d
   ```

### Performance optimization

1. **Regular database maintenance**:
   ```bash
   docker compose exec db psql -U postgres -d tempmailpro -c "VACUUM FULL;"
   ```

2. **Monitor resource usage**:
   ```bash
   docker stats --no-stream
   ```

3. **Optimize queries**:
   ```sql
   -- Add indexes for common queries
   CREATE INDEX idx_messages_inbox_created ON messages(inboxId, createdAt);
   ```

Still having issues? Check our [General FAQ](general.md) or contact our support team.