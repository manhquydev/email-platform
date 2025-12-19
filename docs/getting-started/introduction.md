# Introduction to TempMail Pro

TempMail Pro is a multi-domain inbound email platform that provides disposable email addresses with a modern UI and comprehensive API. It's designed for developers and teams who need a reliable, self-hosted temporary email solution.

## What is TempMail Pro?

TempMail Pro allows you to:
- Create temporary email addresses instantly
- Receive emails without revealing your personal email
- Manage multiple custom domains
- Access your emails through a modern web interface
- Automate email handling through our REST API

## Key Features

- **Disposable Inboxes**: Create temporary email addresses that receive emails instantly
- **Multi-Domain Support**: Add and manage unlimited custom domains
- **Modern UI**: Clean, responsive interface with glassmorphism design
- **REST API**: Full programmatic access to all features
- **Real-time Delivery**: Emails are delivered instantly upon receipt
- **Admin Panel**: Comprehensive management dashboard
- **Docker Ready**: One-command deployment with Docker Compose

## Use Cases

TempMail Pro is perfect for:
- **Developers**: Testing email notifications in applications
- **QA Teams**: Verifying email workflows and integrations
- **Marketing Teams**: Safe newsletter testing without using personal emails
- **Security Researchers**: Anonymous email reception
- **Small Businesses**: Temporary email for specific campaigns or projects

## Getting Started

1. **Quick Start**: Follow our [Quick Start Guide](quick-start.md) to get running in minutes
2. **First Inbox**: Create your first disposable inbox with our [Your First Inbox](your-first-inbox.md) guide
3. **API Access**: Explore our [API Documentation](../api/) for programmatic access

## Architecture Overview

TempMail Pro is built with:
- **Backend**: Node.js + Fastify with JWT authentication
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis for performance optimization
- **Frontend**: React 19 + Vite + TailwindCSS
- **Reverse Proxy**: Caddy with automatic HTTPS
- **Monitoring**: Prometheus + Grafana for observability

## Security & Compliance

TempMail Pro includes built-in security features:
- JWT-based authentication
- Rate limiting to prevent abuse
- CAPTCHA protection for public inboxes
- SPF/DKIM/DMARC support for domain verification
- GDPR-compliant data retention policies
- Audit logging for all actions

## Support

If you need help:
- Check our [FAQ](../faq/) for common questions
- Browse [Guides](../guides/) for detailed tutorials
- Review [API Documentation](../api/) for technical details
- File an issue in our GitHub repository

Ready to get started? Begin with our [Quick Start Guide](quick-start.md).