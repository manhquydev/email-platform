# Ephemera Email Platform: Codebase Summary

## 1. Directory Structure

```
email-platform/
├── .claude/
│   ├── skills/
│   │   └── .venv/
│   └── workflows/
│       ├── development-rules.md
│       ├── documentation-management.md
│       ├── orchestration-protocol.md
│       ├── primary-workflow.md
│       └── README.md
├── .dockerignore
├── .env.example
├── .eslintrc.js
├── .gitignore
├── .prettierrc.js
├── Caddyfile
├── CLAUDE.md
├── Dockerfile
├── README.md
├── docs/
│   ├── code-standards.md
│   ├── codebase-summary.md
│   ├── project-overview-pdr.md
│   ├── system-architecture.md
│   └── README.md
├── package.json
├── plans/
├── repomix-output.xml
├── services/
│   ├── api/
│   │   ├── plugins/
│   │   ├── services/
│   │   ├── routes/
│   │   ├── schemas/
│   │   ├── smtp/
│   │   ├── workers/
│   │   ├── cron/
│   │   ├── README.md
│   │   └── server.js
│   ├── extension/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── entrypoints/
│   │   │   │   ├── background.ts
│   │   │   │   ├── popup/
│   │   │   │   └── sidepanel/
│   │   │   ├── hooks/
│   │   │   └── utils/
│   │   ├── wxt.config.ts
│   │   └── package.json
│   ├── web/
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── App.tsx
│   │   │   ├── assets/
│   │   │   ├── components/
│   │   │   ├── contexts/
│   │   │   ├── hooks/
│   │   │   ├── layouts/
│   │   │   ├── pages/
│   │   │   ├── router/
│   │   │   ├── services/
│   │   │   ├── types/
│   │   │   ├── utils/
│   │   │   ├── index.css
│   │   │   └── main.tsx
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── vite.config.ts
│   └── Dockerfile
├── tsconfig.json
└── yarn.lock
```

## 2. LOC Breakdown (Estimate)

This is a high-level estimate. A precise count would require running a LOC tool.

- **services/api**: Largest codebase, contains core backend logic, routes, services, database interactions.
- **services/web**: Significant codebase, includes frontend components, pages, routing, and UI logic.
- **docs/**: Documentation files, expected to grow.
- **.claude/**: Agent-specific configurations and scripts.

## 3. Key File Purposes

- **`services/api/server.js`**: Fastify application entry point, plugin registration, server startup.
- **`services/web/src/main.tsx`**: Frontend application entry point, initializes React app and context providers.
- **`services/web/src/App.tsx`**: Main application component, sets up routing and theme.
- **`services/api/routes/*`**: API endpoint definitions.
- **`services/api/services/*`**: Business logic and service implementations (e.g., StripeService, OutboundService).
- **`services/api/schemas/*`**: Data validation schemas (likely Zod).
- **`services/web/src/components/*`**: Reusable UI components.
- **`services/web/src/components/ErrorBoundary/*`**: Error boundary components (SectionErrorBoundary, FeatureErrorBoundary).
- **`services/web/src/components/skeletons/*`**: Loading skeleton components (MessageListSkeleton, MessageDetailSkeleton, PageSkeleton).
- **`services/web/src/hooks/useAppToast.ts`**: Custom toast notification hook.
- **`services/web/src/pages/*`**: Top-level page components.
- **`services/web/src/contexts/*`**: React context providers (Auth, Theme).
- **`Dockerfile` (root, api, web)**: Containerization definitions.
- **`Caddyfile`**: Reverse proxy and HTTPS configuration.
- **`CLAUDE.md`**: Agent-specific instructions for the codebase.
- **`.env.example`**: Environment variable definitions.

## 4. Module Dependencies (High-Level)

- **Backend**: Core logic depends on database (Prisma), external services (Stripe, Telegram), and internal services (SMTP, EmailForwarder).
- **Frontend**: Depends on backend API (via `api.ts`), routing, state management (Context API), and UI libraries.
- **Infrastructure**: Docker orchestrates all services; Caddy manages ingress traffic.
