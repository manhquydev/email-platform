# General FAQ

Find answers to common questions about TempMail Pro.

## Getting Started

### Q: What is TempMail Pro?
A: TempMail Pro is a self-hosted multi-domain email platform that provides temporary disposable email addresses with a modern UI and comprehensive API.

### Q: How is TempMail Pro different from other services?
A: Unlike other services, TempMail Pro is:
- Self-hosted (complete control over your data)
- Multi-domain capable (use your own domains)
- API-driven (programmable access)
- Open-source (auditable and customizable)

### Q: Do I need technical skills to use TempMail Pro?
A: Basic technical knowledge is helpful but not required. We provide:
- Docker deployment (one-command setup)
- Web-based admin panel
- Comprehensive documentation
- Community support

### Q: What are the system requirements?
A: Minimum requirements:
- 2GB RAM
- 20GB disk space
- Docker and Docker Compose
- Internet connection for initial setup

Recommended:
- 4GB+ RAM
- 50GB+ SSD
- Always-on server

## Installation & Setup

### Q: How long does setup take?
A: Typically 5-10 minutes using Docker:
1. Clone repository: 1 minute
2. Copy environment file: 1 minute
3. Run `docker compose up`: 2-5 minutes
4. Apply migrations: 1 minute
5. Login: 1 minute

### Q: Can I use TempMail Pro on Windows?
A: Yes! TempMail Pro supports:
- Windows (via Docker Desktop)
- macOS (via Docker Desktop)
- Linux (via Docker Compose)
- Cloud platforms (AWS, GCP, Azure)

### Q: Do I need to buy a domain?
A: No, TempMail Pro provides default domains for testing. For production, you can:
- Use existing domains
- Register new domains
- Use subdomains from existing domains

### Q: What ports does TempMail Pro use?
A: Default ports:
- API: 3001
- SMTP: 2525
- Web UI: 5173
- Caddy proxy: 80/443

Ports can be configured in `docker-compose.yml`.

## Features & Functionality

### Q: How many email addresses can I create?
A: There's no hard limit. The number depends on:
- Server resources (RAM, CPU, disk)
- Email volume
- DNS configuration

Most users can create hundreds to thousands of addresses.

### Q: Are emails stored permanently?
A: By default, emails are stored until you delete them. You can configure:
- Retention policies
- Automatic deletion
- Archive to storage

### Q: Can I attach files to emails?
A: TempMail Pro is inbound-only - it receives emails but doesn't send. However:
- Email attachments are saved and accessible
- You can download attachments from the web UI
- API provides attachment access

### Q: Does TempMail Pro support multiple users?
A: Yes, TempMail Pro includes:
- Multi-user support
- Role-based permissions
- User management in admin panel
- API key authentication (future)

### Q: Can I use TempMail Pro for outgoing emails?
A: Currently TempMail Pro is inbound-only. Outgoing email features are planned for future releases.

## Security & Privacy

### Q: Is TempMail Pro secure?
A: Yes, TempMail Pro includes:
- JWT-based authentication
- Rate limiting
- CAPTCHA protection
- SSL/TLS encryption
- Input validation
- Regular security updates

### Q: Where are my emails stored?
A: Emails are stored in:
- PostgreSQL database (structured data)
- File system (attachments)
- Optional: S3-compatible storage

All data is stored on your server - we never access your emails.

### Q: Can I encrypt my emails?
A: TempMail Pro stores emails as received. For encryption:
- Use encrypted email providers for sending
- Implement client-side encryption
- Store encrypted backups

### Q: What about GDPR compliance?
A: TempMail Pro helps with GDPR by:
- Providing complete data control
- Supporting data deletion requests
- Offering data export functionality
- Supporting retention policies

## Troubleshooting

### Q: Why am I not receiving emails?
A: Common causes and solutions:
1. **DNS not configured** - Verify SPF/DKIM/DMARC records
2. **SMTP server not running** - Check `docker compose logs smtp`
3. **Firewall blocking** - Ensure ports 25 (SMTP) are open
4. **Domain not verified** - Verify domain in admin panel
5. **Rate limiting** - Check if you've exceeded limits

### Q: The web UI isn't loading
A: Try these steps:
1. Check if services are running: `docker ps`
2. Check Caddy logs: `docker compose logs caddy`
3. Clear browser cache
4. Try direct access: `http://localhost:5173`
5. Check network connectivity

### Q: API returns 401 errors
A: Authentication issues:
1. Verify JWT token is valid
2. Check token expiration
3. Ensure correct Authorization header
4. Try re-authenticating

### Q: Database connection failed
A: Database issues:
1. Check PostgreSQL is running: `docker compose logs db`
2. Verify DATABASE_URL in .env
3. Apply migrations: `docker compose exec api npx prisma migrate deploy`
4. Check disk space

## Performance & Scaling

### Q: How many users can TempMail Pro handle?
A: Performance depends on:
- Server resources
- Email volume
- Database optimization
- Caching configuration

Typical capacity:
- Small: 100-1000 users
- Medium: 1000-10000 users
- Large: 10000+ users with optimization

### Q: Can I scale TempMail Pro?
A: Yes, TempMail Pro supports:
- Horizontal scaling with load balancers
- Database clustering
- Redis caching
- CDN for assets
- Kubernetes deployment

### Q: How much disk space do I need?
A: Estimate based on:
- 50KB per email (text only)
- 1MB+ per email with attachments
- Retention period

Example: 10,000 emails with attachments = 10GB+

### Q: Can I use TempMail Pro with high email volumes?
A: Yes, for high volumes:
- Use multiple SMTP servers
- Implement queue systems
- Optimize database indexes
- Use SSD storage
- Monitor performance metrics

## Integration & Development

### Q: What programming languages are supported?
A: TempMail Pro provides REST API compatible with any language:
- JavaScript/TypeScript
- Python
- Java
- C#
- Ruby
- PHP
- Go
- And more...

### Q: Can I integrate with other services?
A: Yes, common integrations:
- CRM systems
- Help desk software
- Marketing automation
- Development tools
- Custom applications

### Q: Does TempMail Pro have webhooks?
A: Webhook support is planned for future releases. Currently, you can:
- Poll the API for updates
- Use WebSocket for real-time updates
- Set up custom integrations

### Q: Can I customize the UI?
A: Yes, TempMail Pro is:
- Built with React components
- Customizable with CSS
- Themeable via Tailwind
- Extensible with plugins

## Pricing & Support

### Q: How much does TempMail Pro cost?
A: TempMail Pro is open-source with different licensing:
- Community: Free (MIT License)
- Professional: Commercial support
- Enterprise: Custom solutions

### Q: What support options are available?
A: Support includes:
- Documentation and guides
- Community forum
- GitHub issues
- Professional support (paid)
- Enterprise SLAs

### Q: Can I get help with setup?
A: Yes, we offer:
- Setup guides
- Video tutorials
- Community support
- Professional installation services

### Q: How often are updates released?
A: Updates are released:
- Bug fixes: Weekly
- Features: Monthly
- Major releases: Quarterly
- Security patches: As needed

## Migration & Backup

### Q: Can I migrate from other services?
A: Migration support:
- Import from CSV/JSON
- API-based migration
- Custom migration scripts
- Professional migration services

### Q: How do I back up TempMail Pro?
A: Backup strategy:
1. Database: `pg_dump` or Prisma migrations
2. Attachments: Regular file system backup
3. Configuration: Version control
4. Scripts: Automated backup scripts

Example backup script:
```bash
# Backup database
docker compose exec db pg_dump -U postgres tempmailpro > backup.sql

# Backup attachments
docker compose run --rm -v $(pwd):/backup busybox tar -czf /backup/attachments.tar.gz /app/storage

# Backup config
cp .env backup/
```

### Q: Can I restore from backups?
A: Yes, restoration process:
1. Stop services
2. Restore database
3. Restore attachments
4. Restore configuration
5. Restart services

## Legal & Compliance

### Q: Can I use TempMail Pro for business?
A: Yes, TempMail Pro is suitable for:
- Business email testing
- Newsletter verification
- Marketing campaigns
- Development testing
- Research purposes

### Q: Are there any usage restrictions?
A: Terms of service include:
- No illegal activities
- Respect for privacy
- Proper use of resources
- Compliance with laws

### Q: Can I use TempMail Pro for sending spam?
A: No, TempMail Pro prohibits:
- Unsolicited bulk email
- Spam activities
- Malicious use
- Abuse of the platform

### Q: What about email deliverability?
A: To ensure good deliverability:
- Configure proper DNS
- Monitor bounce rates
- Use authenticated domains
- Follow email best practices

## Community & Contributing

### Q: How can I contribute to TempMail Pro?
A: We welcome contributions:
- Code contributions
- Documentation improvements
- Bug reports
- Feature suggestions
- Community support

### Q: Where can I get help?
A: Community resources:
- GitHub discussions
- Stack Overflow
- Discord/Slack communities
- Meetups and conferences

### Q: How do I report bugs?
A: Bug reporting:
- GitHub issues
- Detailed reproduction steps
- Environment information
- Expected vs actual behavior

### Q: Can I request features?
A: Feature requests:
- GitHub issues
- Feature voting
- Community discussions
- Priority based on popularity

## Still Have Questions?

Check our other resources:
- [Troubleshooting FAQ](troubleshooting.md)
- [API Documentation](../api/)
- [Getting Started Guide](../getting-started/)
- [Community Forum](https://github.com/tempmailpro/tempmailpro/discussions)

If you can't find what you're looking for, feel free to:
- Open a GitHub issue
- Join our community discussions
- Contact support for professional assistance