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

#### Semantic Design System (Phase 1+)

For all newly designed pages and components, use the **semantic token system**:

```tsx
// Semantic tokens — automatically theme-aware via .dark class
<div className="bg-semantic-bg-primary text-semantic-text-main p-4 rounded-md shadow-semantic-md">
  <h1 className="text-lg font-semibold">Title</h1>
  <p className="text-semantic-text-secondary">Subtitle</p>
</div>

// With borders
<div className="border border-semantic-border bg-semantic-bg-secondary rounded-lg p-4">
  {/* content */}
</div>

// Interactive states
<button className="bg-semantic-accent text-white rounded-md px-4 py-2 hover:bg-semantic-accent-hover transition-colors">
  Action
</button>
```

**Key Patterns:**
- Use `bg-semantic-bg-*` for backgrounds
- Use `text-semantic-text-*` for text hierarchy
- Use `border-semantic-border*` for dividers
- Use `bg-semantic-{success,warning,danger,info}-subtle` for status backgrounds
- Use `shadow-semantic-{sm,md,lg}` for shadows (minimal, Notion-style)
- All tokens automatically adapt to light/dark themes — no manual overrides needed

**Architecture:**
- Primitives layer: raw colors in `src/styles/primitives.css`
- Semantic layer: purpose-named tokens in `src/styles/semantic-tokens.css` with `.dark` overrides
- Tailwind integration: tokens mapped to `colors.semantic` and `shadows.semantic` in `tailwind.config.js`
- See `docs/design-guidelines.md` for complete token reference

#### Legacy Systems (v3-* and nebula-*)

For pages **not yet redesigned** (check phase scope in `services/web/plans/*/plan.md`), use the existing systems:

```tsx
// Version C (dark-only, superhuman style)
<div className="bg-v3-bg-primary text-v3-text-primary">
  {/* dark mode only */}
</div>

// Glassmorphism (legacy, pre-Phase-1 design)
<div className="glass rounded-lg p-4">
  {/* deprecated, for out-of-scope pages only */}
</div>
```

**Do not mix systems:** Keep `semantic-*`, `v3-*`, and `nebula-*` classes separate per component.

**Browser Compatibility (Semantic):**
- All modern browsers support CSS variables and `.dark` class selectors
- No build-time theme extraction needed — themes toggle at runtime via `ThemeContext`
- Performance: CSS variables have no runtime cost; theme switches are instant

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

### Security Conventions

#### Command Execution
- **NEVER use `exec()` with interpolated user input**
  - Use `execFile()` or `spawn()` with argument arrays (not shell strings)
  - Maintain a whitelist of allowed commands/scripts
  - Example: `execFile('script.sh', [userArg])` not `exec('script.sh ' + userArg)`

#### Path Validation
- **All user-provided file paths** must pass `validatePathWithin(userPath, baseDir)`
- Used for backup downloads, deletions, and maildir sync operations
- Prevents directory traversal attacks (e.g., `../../etc/passwd`)

#### Field Encryption
- **Secret-bearing database fields** must be encrypted via `field-encryptor`
  - Apply to: webhook secrets, API keys, DKIM private keys, TOTP secrets
  - Envelope format: `fenc:v1:{encryptedBase64}`
  - Use `encryptIfNeeded()` for idempotent migrations

#### Outbound Network Requests
- **All user-controlled outbound URLs** must use `ssrf-safe-fetch`
  - HTTPS-only, blocks private IPs (10.0.0.0/8, 127.0.0.0/8, 169.254.0.0/16), cloud metadata (169.254.169.254)
  - No redirects; port allowlist (443 for HTTPS)
  - Used by webhook delivery

#### Authentication Token Transport
- **Access tokens**: In-memory only (no localStorage, no URL parameters)
- **Refresh tokens**: httpOnly, Secure, SameSite=Strict cookies only
- **CSRF tokens**: Parent-domain cookie + localStorage fallback (iframe-safe)
- **Never embed tokens in URLs or query parameters** (use opaque SSE tickets for EventSource)

### Input Validation
- Validate all inputs with Zod
- **HTML Sanitization**: ALWAYS use `DOMPurify.sanitize()` before rendering untrusted HTML content via `dangerouslySetInnerHTML`.
- Use parameterized queries (Prisma handles this)

### Authentication
- JWT expiration configured in env
- **Token Rotation**: `POST /auth/refresh` implements rotation with reuse detection and family tracking.
- API keys hashed before storage
- 2FA secrets encrypted with AES-256-GCM
- **Token Revocation**: Fail-closed by default (`TOKEN_REVOCATION_FAIL_CLOSED=true`); if revocation store unavailable, logins rejected

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
