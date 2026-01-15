# Ephemera Email Platform: Product Development Requirements

## 1. Project Overview & Objectives

Ephemera is a high-performance, secure, and user-friendly email platform designed for professionals and businesses. It aims to provide a robust email solution with advanced features such as custom domain support, efficient inbox management, email forwarding, and seamless integration with essential services.

**Objectives:**
- Deliver a fast and reliable email sending and receiving service.
- Offer comprehensive email management tools including search, filtering, and forwarding.
- Ensure robust security through API key management, 2FA, and domain verification.
- Provide a scalable and extensible architecture for future growth.
- Offer a seamless user experience with a modern frontend and intuitive design.
- **Phase 1 Enhancements**: Migrate browser extension to WXT framework, integrate Chrome Side Panel API, and enhance security with DOMPurify sanitization.

## 2. Core Features & Capabilities

### 2.1. User Management & Authentication
- Secure user registration and login (magic link, passkey, TOTP 2FA).
- API key management for programmatic access.
- Role-based access control (ADMIN/USER).
- Profile and credential management.

### 2.2. Domain Management
- Support for custom email domains.
- DNS verification for domain ownership.
- Public and private domain configurations.

### 2.3. Inbox & Message Management
- Creation and management of mailboxes.
- Email ingestion and storage.
- Advanced search capabilities (fuzzy search).
- Read status tracking and message actions.
- Attachment handling.
- Spam scoring and filtering.

### 2.4. Email Sending & Forwarding
- Reliable outbound email sending (SMTP, Gmail fallback).
- Configurable email forwarding rules.
- Transactional email templates.

### 2.5. Billing & Subscriptions
- Subscription plans with tiered features and quotas.
- Integration with Stripe for payments.
- Webhook support for payment notifications.
- Redemption codes for plans and credits.

### 2.6. Security & Compliance
- API rate limiting.
- Security headers (Helmet).
- Audit logging.
- Abuse reporting.
- **Content Sanitization**: DOMPurify for sanitizing email content in web and extension.

### 2.7. Integrations
- Telegram Bot for notifications and account linking.
- Prometheus for metrics.
- **Browser Extension**: WXT-based extension with Side Panel support and real-time push notifications.

## 3. Tech Stack Summary

- **Backend**: Node.js, Fastify, Prisma (ORM)
- **Frontend**: React, react-router-dom, Tailwind CSS, Framer Motion
- **Browser Extension**: WXT Framework, React, Chrome Side Panel API, Service Workers
- **Database**: PostgreSQL, Redis
- **Infrastructure**: Docker, Caddy (Reverse Proxy), Prometheus, Grafana, Mailpit
- **Security**: DOMPurify, JWT, TOTP, AES-256-GCM
- **Other**: Stripe API, Telegram Bot API

## 4. User Personas & Use Cases

### 4.1. Small Business Owner
- **Use Case**: Managing company emails with a custom domain, handling customer inquiries, sending transactional emails.
- **Needs**: Reliability, custom domain support, professional appearance, cost-effectiveness.

### 4.2. Power User / Freelancer
- **Use Case**: Organizing high email volume, automating workflows with forwarding rules, secure API access for custom integrations.
- **Needs**: Advanced filtering, powerful search, API access, security features (2FA).

### 4.3. System Administrator (for Businesses)
- **Use Case**: Managing user accounts, domains, subscription plans, and monitoring system health.
- **Needs**: Admin dashboard, user management, billing oversight, security controls.

## 5. Future Roadmap Items

- Enhanced collaboration features (shared inboxes, team features).
- Advanced analytics and reporting on email traffic.
- Deeper integration with other productivity tools.
- AI-powered email summarization and response suggestions.
- Support for additional email protocols (IMAP/POP3 access).
