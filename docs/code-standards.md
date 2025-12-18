# Code Standards - TempMail Pro

## Overview

This document outlines the coding standards, architectural patterns, and development practices for TempMail Pro. Following these standards ensures code quality, maintainability, and consistency across the entire codebase.

## Architecture Principles

### 1. Modular Design
- **Microservices Architecture**: Each service should be independently deployable
- **Loose Coupling**: Services communicate through well-defined APIs
- **Single Responsibility**: Each component has one clear purpose
- **Separation of Concerns**: Business logic, data access, and presentation layers are separate

### 2. Scalability Patterns
- **Horizontal Scaling**: Design for stateless services
- **Async Processing**: Use queues for long-running operations
- **Caching**: Implement caching for frequently accessed data
- **Connection Pooling**: Reuse database and network connections

### 3. Security by Design
- **Zero Trust**: Never trust internal requests
- **Defense in Depth**: Multiple security layers
- **Principle of Least Privilege**: Minimal required permissions
- **Secure by Default**: Enable security features by default

## Development Environment

### 1. Prerequisites
```bash
# Node.js 18+
node --version

# PostgreSQL 16+
psql --version

# Docker & Docker Compose
docker --version
docker-compose --version

# Git
git --version
```

### 2. Setup Instructions
```bash
# Clone repository
git clone https://github.com/your-repo/Email.git
cd Email

# Install dependencies for all services
npm install
cd services/api && npm install
cd services/web && npm install

# Copy environment files
cp services/api/.env.example services/api/.env
cp services/web/.env.example services/web/.env

# Start development environment
docker-compose up -d postgres redis
```

### 3. Code Quality Tools
```json
// .eslintrc.json
{
  "extends": [
    "eslint:recommended",
    "@typescript-eslint/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "rules": {
    "no-console": "warn",
    "prefer-const": "error",
    "no-var": "error",
    "indent": ["error", 2],
    "quotes": ["error", "single"]
  }
}
```

## API Service Standards

### 1. Directory Structure
```
services/api/
├── src/
│   ├── config/           # Configuration files
│   ├── controllers/      # Request handlers (not used, routes directly in server.ts)
│   ├── routes/           # Route definitions
│   ├── services/         # Business logic
│   ├── utils/            # Utility functions
│   ├── types/            # TypeScript definitions
│   ├── prisma/           # Database schema
│   └── test/             # Test files
├── prisma/               # Database migrations
└── .env.example         # Environment template
```

### 2. Naming Conventions

#### Files and Directories
- **kebab-case** for directories: `user-management`
- **PascalCase** for TypeScript files: `UserService.ts`
- **index.ts** for module entry points

#### Variables and Functions
- **camelCase** for variables: `userName`
- **PascalCase** for classes and interfaces: `UserService`
- **snake_case** for database fields: `user_name`

#### Constants
- **SCREAMING_SNAKE_CASE**: `MAX_LOGIN_ATTEMPTS`
- **Environment Variables**: `APP_DATABASE_URL`

### 3. Code Style

#### TypeScript Best Practices
```typescript
// ✅ Good
interface User {
  id: string;
  email: string;
  createdAt: Date;
  isActive: boolean;
}

class UserService {
  private userRepository: UserRepository;

  constructor(userRepository: UserRepository) {
    this.userRepository = userRepository;
  }

  async createUser(userData: CreateUserDto): Promise<User> {
    const hashedPassword = await this.hashPassword(userData.password);
    const user = await this.userRepository.create({
      ...userData,
      password: hashedPassword
    });

    this.logger.info('User created', { userId: user.id });
    return user;
  }

  private async hashPassword(password: string): Promise<string> {
    // Hashing logic
  }
}
```

#### Error Handling
```typescript
// ✅ Use custom error types
class UserNotFoundError extends Error {
  constructor(userId: string) {
    super(`User not found: ${userId}`);
    this.name = 'UserNotFoundError';
  }
}

// ✅ Proper error handling
async function getUserById(id: string): Promise<User> {
  const user = await userRepository.findById(id);

  if (!user) {
    throw new UserNotFoundError(id);
  }

  return user;
}
```

#### Logging Standards
```typescript
// ✅ Structured logging
import { Logger } from 'pino';

class EmailService {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger.child({ service: 'EmailService' });
  }

  async sendEmail(email: EmailData): Promise<void> {
    this.logger.info('Sending email', {
      to: email.to,
      subject: email.subject
    });

    try {
      await this.smtpClient.send(email);
      this.logger.info('Email sent successfully', {
        messageId: email.messageId
      });
    } catch (error) {
      this.logger.error('Failed to send email', {
        error: error.message,
        to: email.to
      });
      throw error;
    }
  }
}
```

### 4. Database Standards

#### Prisma Schema Best Practices
```prisma
// ✅ Clear organization
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ✅ Clear model naming
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  role      Role     @default(USER)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // ✅ Clear relationships
  domains   Domain[]
  inboxes   Inbox[]
  sessions  Session[]

  @@map("users")
}

enum Role {
  USER
  ADMIN
  SUPER_ADMIN
}
```

#### Database Queries
```typescript
// ✅ Use proper type safety
async function getUserWithDomains(userId: string) {
  return await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      domains: {
        select: {
          id: true,
          name: true,
          verified: true
        }
      }
    }
  });
}
```

### 5. API Standards

#### Route Structure
```typescript
// ✅ Organized route definitions
async function routes(app: FastifyInstance) {
  // Health check
  app.get('/health', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Authentication routes
  app.post('/auth/login', { schema: loginSchema }, loginHandler);
  app.post('/auth/logout', authMiddleware, logoutHandler);

  // Domain routes (admin only)
  app.addHook('preHandler', requireAdmin);
  app.post('/domains', { schema: createDomainSchema }, createDomainHandler);
  app.get('/domains', listDomainsHandler);
  app.post('/domains/:id/verify', verifyDomainHandler);
}
```

#### Request Validation
```typescript
// ✅ Use JSON Schema for validation
const createInboxSchema = {
  type: 'object',
  required: ['domainId'],
  properties: {
    domainId: {
      type: 'string',
      format: 'uuid'
    },
    prefix: {
      type: 'string',
      maxLength: 20
    }
  }
};

// ✅ Proper error responses
app.post('/inboxes', { schema: createInboxSchema }, async (request, reply) => {
  try {
    const inbox = await inboxService.create(request.body);
    return reply.code(201).send(inbox);
  } catch (error) {
    if (error instanceof ValidationError) {
      return reply.code(400).send({
        error: 'Validation error',
        details: error.message
      });
    }
    throw error;
  }
});
```

#### Response Formatting
```typescript
// ✅ Consistent response format
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: string;
    requestId: string;
  };
}

// ✅ Standard success response
app.get('/inboxes', async (request, reply) => {
  const inboxes = await inboxService.list(request.query);
  return {
    success: true,
    data: inboxes,
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: request.id
    }
  };
});
```

## Frontend Service Standards

### 1. Project Structure
```
services/web/
├── src/
│   ├── components/       # Reusable UI components
│   ├── pages/           # Page components
│   ├── hooks/           # Custom React hooks
│   ├── services/       # API services
│   ├── utils/           # Utility functions
│   ├── types/           # TypeScript definitions
│   ├── styles/          # CSS/Tailwind styles
│   └── App.tsx          # Root component
├── public/              # Static assets
└── .env.example         # Environment template
```

### 2. Component Standards

#### Functional Components with TypeScript
```typescript
// ✅ Type-safe component props
interface InboxCardProps {
  inbox: Inbox;
  onClick: (inbox: Inbox) => void;
  isSelected?: boolean;
}

const InboxCard: React.FC<InboxCardProps> = ({
  inbox,
  onClick,
  isSelected = false
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      onClick(inbox);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`inbox-card ${isSelected ? 'selected' : ''}`}
      onClick={handleClick}
      disabled={isLoading}
    >
      <h3>{inbox.address}</h3>
      <p>{inbox.domain}</p>
      {isLoading && <LoadingSpinner />}
    </div>
  );
};
```

#### Custom Hooks
```typescript
// ✅ Custom hooks with proper typing
const useInboxes = (domainId?: string) => {
  const [inboxes, setInboxes] = useState<Inbox[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInboxes = async () => {
      setLoading(true);
      try {
        const response = await api.get('/inboxes', { domainId });
        setInboxes(response.data);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchInboxes();
  }, [domainId]);

  return { inboxes, loading, error };
};
```

### 3. API Integration
```typescript
// ✅ Centralized API service
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const token = localStorage.getItem('authToken');

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
      },
      ...options
    });

    if (!response.ok) {
      throw new ApiError(response.statusText, response.status);
    }

    return response.json();
  }

  // CRUD operations
  async get<T>(endpoint: string): Promise<T> {
    const response = await this.request<T>(endpoint);
    return response.data;
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    const response = await this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return response.data;
  }
}
```

### 4. State Management

#### Using React Context
```typescript
// ✅ Type-safe context
interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      setUser(response.user);
      localStorage.setItem('token', response.token);
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
  };

  useEffect(() => {
    // Check for existing token
    const token = localStorage.getItem('token');
    if (token) {
      // Verify token and get user
    }
    setIsLoading(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
```

## Docker Standards

### 1. Dockerfile Best Practices
```dockerfile
# ✅ Multi-stage build for production
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Copy configuration
COPY docker/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Switch to non-root user
USER nextjs

EXPOSE 3001

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["node", "dist/server"]
```

### 2. Docker Compose Standards
```yaml
# ✅ Clear service definitions
version: '3.8'

services:
  api:
    build:
      context: ./services/api
      target: production
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/email_service
    volumes:
      - ./services/api/.env:/app/.env:ro
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: email_service
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped
```

## Testing Standards

### 1. Unit Testing
```typescript
// ✅ Unit test with Jest
import { UserService } from './UserService';
import { UserRepository } from '../repositories/UserRepository';

describe('UserService', () => {
  let userService: UserService;
  let userRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    userRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn()
    } as any;

    userService = new UserService(userRepository);
  });

  describe('createUser', () => {
    it('should create a user with hashed password', async () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        password: 'plain-text-password'
      };

      userRepository.create.mockResolvedValue({
        id: 'user-123',
        email: userData.email,
        password: 'hashed-password'
      } as any);

      // Act
      const user = await userService.createUser(userData);

      // Assert
      expect(userRepository.create).toHaveBeenCalledWith({
        ...userData,
        password: expect.any(String) // Should be hashed
      });
      expect(user.password).toBe('hashed-password');
    });

    it('should throw error if email already exists', async () => {
      // Arrange
      userRepository.create.mockRejectedValue(new Error('Email already exists'));

      // Act & Assert
      await expect(userService.createUser({
        email: 'existing@example.com',
        password: 'password'
      })).rejects.toThrow('Email already exists');
    });
  });
});
```

### 2. Integration Testing
```typescript
// ✅ Integration test with setup/teardown
describe('API Integration Tests', () => {
  let app: FastifyInstance;
  let testDb: PrismaClient;

  beforeAll(async () => {
    // Setup test database
    testDb = new PrismaClient();
    await testDb.$connect();

    // Clear database
    await testDb.user.deleteMany();

    // Create test user
    await testDb.user.create({
      data: {
        email: 'admin@example.com',
        password: await hashPassword('password'),
        role: 'ADMIN'
      }
    });

    // Setup app
    app = fastify();
    await registerRoutes(app, testDb);
  });

  afterAll(async () => {
    await testDb.$disconnect();
  });

  it('should authenticate user with valid credentials', async () => {
    // Arrange
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'admin@example.com',
        password: 'password'
      }
    });

    // Assert
    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveProperty('token');
  });

  it('should reject invalid credentials', async () => {
    // Arrange
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'admin@example.com',
        password: 'wrong-password'
      }
    });

    // Assert
    expect(response.statusCode).toBe(401);
  });
});
```

### 3. E2E Testing
```typescript
// ✅ E2E test with Playwright
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('user can login and access dashboard', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');

    // Fill login form
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password');

    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');

    // Should display welcome message
    await expect(page.locator('h1')).toContainText('Welcome');
  });

  test('login fails with invalid credentials', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');

    // Fill with invalid credentials
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrong-password');

    // Submit form
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('Invalid credentials');
  });
});
```

## Code Review Checklist

### 1. Code Quality
- [ ] Follows naming conventions
- [ ] Proper error handling
- [ ] No commented out code
- [ ] Clear and concise comments
- [ ] Consistent code style

### 2. Security
- [ ] No hardcoded secrets
- [ ] Input validation implemented
- [ ] Proper authentication checks
- [ ] SQL injection protection
- [ ] XSS prevention measures

### 3. Performance
- [ ] Database queries optimized
- [ ] Proper use of caching
- [ ] Memory leaks prevented
- [ ] Async/await used correctly
- [ ] Resource cleanup implemented

### 4. Testing
- [ ] Unit tests for new functionality
- [ ] Integration tests for API endpoints
- [ ] E2E tests for user flows
- [ ] Test coverage maintained
- [ ] Tests are deterministic

### 5. Documentation
- [ ] README updated with changes
- [ ] API documentation updated
- [ ] Comments for complex logic
- [ ] Database migrations documented
- [ ] Deployment instructions updated

## Git Workflow

### 1. Branch Strategy
- **main**: Production-ready code
- **develop**: Integration branch for features
- **feature/***: Feature branches
- **hotfix/***: Production fixes
- **release/***: Release preparation

### 2. Commit Messages
```
feat: add user authentication system
fix: resolve login validation bug
docs: update API documentation
style: format code with Prettier
refactor: extract database service
test: add unit tests for user service
chore: update dependencies
```

### 3. Pull Request Process
1. Create branch from develop
2. Implement feature with tests
3. Update documentation
4. Submit PR with clear description
5. Address review comments
6. Merge to develop after approval

## Deployment Standards

### 1. Pre-Deployment Checklist
- [ ] All tests passing
- [ ] Code review completed
- [ ] Documentation updated
- [ ] Database migration tested
- [ ] Security scan passed
- [ ] Performance benchmarks met

### 2. Deployment Steps
```bash
# 1. Build application
docker-compose build

# 2. Run tests
docker-compose run api npm test

# 3. Apply database migrations
docker-compose exec api npx prisma migrate deploy

# 4. Restart services
docker-compose up -d

# 5. Verify deployment
curl http://localhost:3001/health
```

### 3. Post-Deployment Verification
- [ ] Health checks passing
- [ ] All services running
- [ ] Database connectivity
- [ ] Email delivery working
- [ ] User authentication
- [ ] Monitoring alerts active

## Monitoring and Logging

### 1. Application Logging
```typescript
// ✅ Structured logging
import { Logger } from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label };
    }
  }
});

// Usage in service
logger.info('User login successful', {
  userId: user.id,
  email: user.email,
  userAgent: request.headers['user-agent']
});

logger.error('Database connection failed', {
  error: error.message,
  stack: error.stack,
  retryCount: retryCount
});
```

### 2. Performance Monitoring
```typescript
// ✅ Performance metrics
import { metrics } from './metrics';

// Track API performance
app.addHook('onRequest', (request, reply, done) => {
  request.startTime = Date.now();
  done();
});

app.addHook('onResponse', (request, reply, done) => {
  const duration = Date.now() - request.startTime;
  metrics.apiRequestDuration.record({ method: request.method, route: request.url }, duration);
  done();
});

// Track database queries
const trackQuery = (query: string) => {
  const start = Date.now();
  return {
    end: () => {
      const duration = Date.now() - start;
      metrics.databaseQueryDuration.record({ query }, duration);
    }
  };
};
```

## Conclusion

These code standards provide a foundation for building high-quality, maintainable software. All team members should follow these guidelines and contribute to improving them as the project evolves. Regular code reviews and automated quality checks ensure compliance with these standards.