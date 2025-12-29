# Ephemera API Service

Backend API service for the Ephemera email platform, built with Fastify, Prisma, and PostgreSQL.

## Features

- **Auth**: JWT-based authentication, registration, and role-based access control (USER/ADMIN).
- **Domains**: Management of custom domains with DNS verification support.
- **Inboxes**: Creation and management of temporary or permanent inboxes.
- **Messages**: Ingestion and retrieval of emails with attachment support.
- **API Keys**: Secure API key management for programmatic access.
- **Telegram Integration**: Real-time notifications for incoming emails via Telegram bot.
- **Auditing**: Comprehensive audit logs for critical actions.

## Tech Stack

- **Framework**: Fastify
- **Database**: PostgreSQL with Prisma ORM
- **Queue**: BullMQ with Redis
- **Documentation**: Swagger/OpenAPI
- **Testing**: Vitest, Supertest

## Getting Started

### Prerequisites

- Node.js 18+
- Docker (for PostgreSQL and Redis)

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Setup environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. Run migrations:
   ```bash
   npx prisma migrate dev
   ```

### Running the App

```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

## API Documentation

Interactive API documentation is available via Swagger UI at `/docs` when the server is running.

## Testing

The project includes unit, integration, and comprehensive system tests.

```bash
# Run all tests
npm test

# Run specific system tests
npx vitest src/test/system.test.ts
```

## Core Components

- `src/server.ts`: Server entry point and plugin registration.
- `src/routes/`: API endpoint definitions grouped by feature.
- `src/services/`: Core logic and third-party integrations (Stripe, Telegram, etc.).
- `src/worker.ts`: Background job processor for email ingestion.
- `src/plugins/`: Custom Fastify plugins (Swagger, Authentication, etc.).

---
Built with ❤️ for the Ephemera platform.
