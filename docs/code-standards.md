# Ephemera Email Platform: Code Standards

## 1. General Guidelines

### File Naming
- **kebab-case** for all files: `email-forwarder.ts`, `admin-dashboard.tsx`
- Self-documenting names for LLM tool discoverability
- Group by feature, not by type

### File Size Limits
- **Max 200 lines** per file for optimal context management
- Split large files into smaller modules
- Use composition over inheritance

### Principles
- **YAGNI**: Only implement what's needed now
- **KISS**: Simple solutions over complex abstractions
- **DRY**: Extract common patterns into utilities

## 2. Backend Patterns (API)

### Route Structure
```typescript
// services/api/src/routes/example.ts
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const exampleSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

const routes: FastifyPluginAsync = async (app) => {
  app.post('/example', {
    preHandler: [app.authenticate],
    schema: { body: exampleSchema },
  }, async (request, reply) => {
    const { name, email } = request.body;
    // Business logic here
    return { success: true };
  });
};

export default routes;
```

### Validation
- **Zod** for all request/response validation
- Define schemas at route level
- Use `z.coerce.date()` for date strings

### Database Access
```typescript
// Use Prisma with transactions for atomic operations
const result = await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ data: {...} });
  await tx.auditLog.create({ data: {...} });
  return user;
});
```

### Error Handling
```typescript
// Centralized error handler in utils/errorHandler.ts
try {
  // operation
} catch (error) {
  app.log.error(error);
  reply.status(500).send({ error: 'Internal Server Error' });
}
```

### Authentication
- JWT tokens in `Authorization: Bearer <token>` header
- API keys in `X-API-KEY` header
- Use `app.authenticate` preHandler decorator
- Admin routes use `app.requireAdmin` decorator

## 3. Frontend Patterns (Web)

### Component Structure
```tsx
// services/web/src/components/example-component.tsx
import { useState, useEffect } from 'react';
import { api } from '../utils/api';

interface ExampleProps {
  id: string;
  onSuccess?: () => void;
}

export function ExampleComponent({ id, onSuccess }: ExampleProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await api.get(`/example/${id}`);
      setData(result);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;
  return <div>{/* component JSX */}</div>;
}
```

### Context Usage
```tsx
// Use contexts for global state
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

function Component() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
}
```

### Advanced Hook Patterns
- **Background Timers**: Always use `useEffect` with proper cleanup (`clearInterval`) to prevent memory leaks.
- **Cross-Tab Sync**: Use `BroadcastChannel` for synchronizing state across tabs. Close the channel in the cleanup function.
- **Lifecycle Optimization**: Use the Page Visibility API (`visibilitychange` event) to pause non-essential background tasks when the application is not active.

Example of a robust background worker hook:
```tsx
useEffect(() => {
  const channel = new BroadcastChannel('sync_channel');
  const timer = setInterval(() => {
    if (document.visibilityState === 'visible') {
      // perform task
    }
  }, 600000);

  channel.onmessage = (event) => {
    // handle sync
  };

  return () => {
    clearInterval(timer);
    channel.close();
  };
}, []);
```

### Custom Hooks
- Prefix with `use`: `useKeyboardShortcuts`, `useCopyToClipboard`
- Return object with named values
- Handle cleanup in useEffect return

### Styling
```tsx
// TailwindCSS utility classes
<div className="bg-slate-900 p-4 rounded-lg shadow-lg">
  <h1 className="text-xl font-bold text-white">Title</h1>
</div>

// CSS variables for theming
<div className="bg-[var(--neo-glass-bg)] backdrop-blur-xl">
```

### Glassmorphism Design System (Phase 1)
```tsx
// Card-based email redesign with frosted glass effect
// Utilities defined in tailwind.config.js

// Base glass card (10px blur)
<div className="glass rounded-lg p-4">

// Elevated glass card (12px blur + shadow)
<div className="glass-elevated rounded-lg p-4">

// Unread email card (gradient + left accent)
<div className="glass-unread rounded-lg p-4">

// Hover-interactive glass
<div className="glass glass-hover rounded-lg p-4">
```

**Browser Compatibility:**
- Safari: `-webkit-backdrop-filter` prefixes included
- Legacy browsers: Solid background fallbacks via `@supports` in index.css
- Performance: 60fps target with `transition-all duration-200`

### API Calls
```typescript
// Use centralized api utility
import { api } from '../utils/api';

const data = await api.get('/endpoint');
const result = await api.post('/endpoint', { body: data });
```

## 4. Database Patterns (Prisma)

### Schema Conventions
```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  domains   Domain[]
  inboxes   Inbox[]

  @@index([email])
}
```

### Query Patterns
```typescript
// Include related data
const user = await prisma.user.findUnique({
  where: { id },
  include: { domains: true, inboxes: true },
});

// Select specific fields
const users = await prisma.user.findMany({
  select: { id: true, email: true, role: true },
});

// Pagination
const messages = await prisma.message.findMany({
  skip: (page - 1) * limit,
  take: limit,
  orderBy: { receivedAt: 'desc' },
});
```

## 5. Testing

### Backend Tests
- Location: `services/api/src/test/` and `services/api/test/`
- Framework: Vitest
- Pattern: `*.test.ts`

### Frontend Tests
- Location: `services/web/src/__tests__/`
- Framework: Vitest with React Testing Library
- Pattern: `*.test.tsx`

### Test Structure
```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('FeatureName', () => {
  beforeEach(() => {
    // Setup
  });

  it('should do something', async () => {
    // Arrange
    // Act
    // Assert
    expect(result).toBe(expected);
  });
});
```

## 6. Security Standards

### Input Validation
- Validate all inputs with Zod
- **HTML Sanitization**: ALWAYS use `DOMPurify.sanitize()` before rendering untrusted HTML content via `dangerouslySetInnerHTML`.
- Use parameterized queries (Prisma handles this)

### Authentication
- JWT expiration configured in env
- **Token Rotation**: `POST /auth/refresh` implements rotation with reuse detection and family tracking.
- API keys hashed before storage
- 2FA secrets encrypted with AES-256-GCM

### Headers
- Helmet middleware for security headers
- CORS configured for allowed origins
- Rate limiting on sensitive endpoints

### Sensitive Data
- Never commit `.env` files
- Never commit generated extension artifacts (`services/extension/.output/`, `services/extension/.artifacts/`, `*.zip` from extension builds)
- Use environment variables for secrets
- Encrypt PII at rest when required

## 7. Extension Patterns (WXT)

### Framework
- Use **WXT** framework for browser extension development.
- Entrypoints are located in `src/entrypoints/`.

### Messaging & Storage
- Use `chrome.runtime.sendMessage` and `chrome.runtime.onMessage` for communication between components.
- Use `chrome.storage.local` for persistence, wrapped in a shared utility.

### Background & Side Panel
- Background logic in `background.ts` using `defineBackground`.
- Side Panel API integration for persistent UI across tabs.
- Use Alarms API for periodic background tasks (e.g., polling).

### Push Notifications
- Implement Web Push API in the Service Worker.
- Use a dedicated push handler for managing notification display and click actions.
