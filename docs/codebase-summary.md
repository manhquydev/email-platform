# Codebase Summary - TempMail Pro

## Overview

This document provides a comprehensive overview of the TempMail Pro codebase, including architecture patterns, key components, and implementation details. The summary is generated from the complete codebase analysis using repomix.

## Architecture Overview

TempMail Pro is a microservices-based email platform built with modern web technologies. The system consists of multiple services working together to provide disposable email inboxes, spam filtering, and email management capabilities.

### Core Services

#### 1. API Service (`services/api/`)
- **Technology**: Node.js + Fastify + TypeScript + Prisma
- **Port**: 3001
- **Purpose**: Backend API server handling all business logic
- **Key Features**:
  - User authentication and authorization
  - Domain and inbox management
  - Email processing and storage
  - Outbound email capabilities
  - Security filtering integration

#### 2. Web Service (`services/web/`)
- **Technology**: React 19 + Vite + TypeScript + TailwindCSS
- **Port**: 3000
- **Purpose**: Frontend web application
- **Key Features**:
  - User dashboard
  - Domain management interface
  - Inbox creation and management
  - Email viewing and search
  - Admin panel

#### 3. Email Services
- **Postfix**: SMTP server for inbound email
- **Dovecot**: IMAP/POP3 server for email access
- **Rspamd**: Spam filtering with ML
- **ClamAV**: Anti-virus scanning

#### 4. Supporting Services
- **PostgreSQL**: Primary database
- **Redis**: Caching and queue management
- **Caddy**: Reverse proxy with SSL
- **Grafana**: Monitoring dashboard
- **Prometheus**: Metrics collection

## Directory Structure

```
Email/
├── services/
│   ├── api/              # Backend API service
│   │   ├── src/
│   │   │   ├── config/    # Configuration management
│   │   │   ├── routes/   # API route definitions
│   │   │   ├── services/ # Business logic services
│   │   │   ├── utils/    # Utility functions
│   │   │   ├── types/    # TypeScript definitions
│   │   │   └── prisma/   # Database schema and migrations
│   │   ├── prisma/       # Database schema files
│   │   ├── test/         # Test files
│   │   └── .env.example  # Environment template
│   └── web/              # Frontend web service
│       ├── src/
│       │   ├── components/ # React components
│       │   ├── pages/     # Page components
│       │   ├── hooks/     # Custom React hooks
│       │   ├── services/  # API client services
│       │   ├── utils/    # Utility functions
│       │   └── styles/   # CSS and Tailwind styles
│       ├── public/        # Static assets
│       └── .env.example   # Environment template
├── scripts/               # Utility and maintenance scripts
├── docs/                 # Documentation
├── docker-compose.yml     # Development compose file
├── docker-compose.prod.yml # Production compose file
├── docker-compose.security.yml # Security services
├── docker-compose.backup.yml # Backup services
├── Caddyfile            # Reverse proxy configuration
└── README.md            # Project overview
```

## Key Components

### 1. Authentication System

#### JWT-Based Authentication
- **Implementation**: `/services/api/src/routes/auth.ts`
- **Features**:
  - User login/logout
  - Token refresh
  - Password reset functionality
  - Email verification

```typescript
// Authentication flow
POST /auth/login -> returns JWT token
POST /auth/refresh -> refreshes token
POST /auth/logout -> invalidates token
POST /auth/forgot-password -> initiates password reset
```

#### Security Middleware
```typescript
// Authentication guard
const requireAuth = async (request: FastifyRequest, reply: FastifyReply) => {
  const token = request.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

    if (!user || !user.isActive) {
      return reply.code(401).send({ error: 'Invalid token' });
    }

    request.user = user;
  } catch (error) {
    return reply.code(401).send({ error: 'Invalid token' });
  }
};
```

### 2. Email Processing System

#### Inbound Email Flow
1. **Postfix** receives email on port 25
2. **Rspamd** scans for spam and malware
3. **ClamAV** scans attachments for viruses
4. **Dovecot** stores email in Maildir format
5. **API** notifies user via WebSocket

```typescript
// Email processing service
class EmailService {
  async processEmail(emailData: EmailData): Promise<void> {
    // Save to database
    const message = await prisma.message.create({
      data: {
        inboxId: emailData.inboxId,
        from: emailData.from,
        to: emailData.to,
        subject: emailData.subject,
        text: emailData.text,
        html: emailData.html,
        hasAttachments: emailData.attachments.length > 0
      }
    });

    // Save attachments
    for (const attachment of emailData.attachments) {
      await this.saveAttachment(attachment, message.id);
    }

    // Notify user
    await this.notifyUser(emailData.inboxId, message.id);
  }
}
```

#### Outbound Email System
```typescript
// Outbound email service
class OutboundService {
  async sendEmail(from: string, to: string, subject: string, text: string, html?: string, attachments?: Attachment[]): Promise<SendResult> {
    // Queue email in Redis
    const emailId = await this.queueEmail({
      from, to, subject, text, html, attachments
    });

    // Send via Postfix
    const result = await this.sendViaPostfix(emailId);

    // Track delivery status
    await this.updateDeliveryStatus(emailId, result);

    return result;
  }
}
```

### 3. Domain Management System

#### Domain Verification
- **SPF**: Sender Policy Framework
- **DKIM**: DomainKeys Identified Mail
- **DMARC**: Domain-based Message Authentication

```typescript
// Domain verification service
class DomainService {
  async verifyDomain(domainId: string): Promise<DomainVerification> {
    const domain = await prisma.domain.findUnique({ where: { id: domainId } });

    // Check DNS records
    const spfRecord = await this.checkSPF(domain.name);
    const dkimRecord = await this.checkDKIM(domain.name);
    const dmarcRecord = await this.checkDMARC(domain.name);

    // Update domain verification status
    await prisma.domain.update({
      where: { id: domainId },
      data: {
        verified: spfRecord.valid && dkimRecord.valid && dmarcRecord.valid,
        spfRecord: spfRecord.value,
        dkimRecord: dkimRecord.value,
        dmarcRecord: dmarcRecord.value
      }
    });

    return { spf: spfRecord, dkim: dkimRecord, dmarc: dmarcRecord };
  }
}
```

### 4. Security Filtering Integration

#### Rspamd Integration
```typescript
// Rspamd scanning service
class RspamdService {
  async scanEmail(emailContent: string): Promise<ScanResult> {
    const response = await fetch(`http://rspamd:11333/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: emailContent
    });

    const result = await response.json();

    return {
      score: result.score,
      action: result.action,
      symbols: result.symbols || [],
      url: result.url
    };
  }
}
```

#### ClamAV Integration
```typescript
// ClamAV scanning service
class ClamAVService {
  async scanFile(filePath: string): Promise<VirusScanResult> {
    const response = await fetch(`http://clamav:3310/scan`, {
      method: 'POST',
      body: fs.readFileSync(filePath)
    });

    const result = await response.text();

    return {
      isInfected: result.includes('INFECTED'),
      virusName: this.extractVirusName(result)
    };
  }
}
```

### 5. Frontend Components

#### Core UI Components
```typescript
// Reusable inbox component
interface InboxCardProps {
  inbox: Inbox;
  onClick: (inbox: Inbox) => void;
  isSelected?: boolean;
}

const InboxCard: React.FC<InboxCardProps> = ({ inbox, onClick, isSelected }) => {
  return (
    <div className={`inbox-card ${isSelected ? 'selected' : ''}`} onClick={() => onClick(inbox)}>
      <div className="inbox-address">{inbox.address}</div>
      <div className="inbox-domain">@{inbox.domain.name}</div>
      <div className="inbox-created">
        {new Date(inbox.createdAt).toLocaleDateString()}
      </div>
    </div>
  );
};
```

#### State Management
```typescript
// Global state with Context API
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const login = async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    setUser(response.user);
    setIsAuthenticated(true);
    localStorage.setItem('token', response.token);
  };

  // ... logout and other functions

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
```

## Database Schema

### Core Models
```prisma
// User model
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  role      Role     @default(USER)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  domains   Domain[]
  inboxes   Inbox[]
  sessions  Session[]
}

// Domain model
model Domain {
  id         String    @id @default(cuid())
  name       String    @unique
  verified   Boolean   @default(false)
  spfRecord  String?
  dkimRecord String?
  dmarcRecord String?
  userId     String
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  // Relations
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  inboxes    Inbox[]
}

// Inbox model
model Inbox {
  id        String   @id @default(cuid())
  address   String
  domainId  String
  userId    String
  expiresAt DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  domain    Domain    @relation(fields: [domainId], references: [id], onDelete: Cascade)
  messages  Message[]
}

// Message model
model Message {
  id          String   @id @default(cuid())
  inboxId     String
  from        String
  to          String
  subject     String
  text        String?
  html        String?
  read        Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  inbox       Inbox    @relation(fields: [inboxId], references: [id], onDelete: Cascade)
  attachments Attachment[]
}

// Attachment model
model Attachment {
  id       String @id @default(cuid())
  filename String
  path     String
  size     Int
  mimeType String
  messageId String
  createdAt DateTime @default(now())

  // Relations
  message Message @relation(fields: [messageId], references: [id], onDelete: Cascade)
}
```

## Configuration Management

### Environment Variables
```typescript
// services/api/src/config.ts
export const appConfig = {
  // Server configuration
  port: parseInt(process.env.HTTP_PORT || '3001'),
  host: process.env.HOST || '0.0.0.0',

  // Database
  databaseUrl: process.env.DATABASE_URL!,

  // Redis
  redisHost: process.env.REDIS_HOST || 'localhost',
  redisPort: parseInt(process.env.REDIS_PORT || '6379'),

  // Security
  jwtSecret: process.env.JWT_SECRET!,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // Email
  outboundEnabled: process.env.OUTBOUND_ENABLED === 'true',
  outboundSmtpHost: process.env.OUTBOUND_SMTP_HOST,
  outboundSmtpPort: parseInt(process.env.OUTBOUND_SMTP_PORT || '587'),

  // Services
  rspamdEnabled: process.env.RSPAMD_ENABLED === 'true',
  rspamdHost: process.env.RSPAMD_HOST || 'rspamd',
  rspamdPort: parseInt(process.env.RSPAMD_PORT || '11333'),

  // Storage
  storageDir: process.env.STORAGE_DIR || './storage',

  // Rate limiting
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000')
};
```

## Testing Implementation

### Unit Tests
```typescript
// services/api/src/services/userService.test.ts
describe('UserService', () => {
  let userService: UserService;
  let userRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    userRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn()
    } as any;

    userService = new UserService(userRepository);
  });

  it('should create user with hashed password', async () => {
    const userData = { email: 'test@example.com', password: 'password' };
    const hashedPassword = await bcrypt.hash('password', 10);

    userRepository.create.mockResolvedValue({
      ...userData,
      id: 'user-1',
      password: hashedPassword
    } as any);

    const user = await userService.createUser(userData);

    expect(user.password).toBe(hashedPassword);
    expect(userRepository.create).toHaveBeenCalledWith({
      ...userData,
      password: expect.any(String)
    });
  });
});
```

### Integration Tests
```typescript
// services/api/src/integration/auth.test.ts
describe('Authentication Integration', () => {
  let app: FastifyInstance;
  let testDb: PrismaClient;

  beforeAll(async () => {
    testDb = new PrismaClient();
    await testDb.$connect();
    app = fastify();
    await registerRoutes(app, testDb);
  });

  afterAll(async () => {
    await testDb.$disconnect();
  });

  it('should authenticate user and return token', async () => {
    // Create test user
    await testDb.user.create({
      data: {
        email: 'test@example.com',
        password: await bcrypt.hash('password', 10),
        role: 'USER'
      }
    });

    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'test@example.com',
        password: 'password'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveProperty('token');
  });
});
```

## Deployment and Operations

### Docker Configuration
```yaml
# Production docker-compose.yml
services:
  api:
    build:
      context: ./services/api
      target: production
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/email_service
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

### Backup and Recovery
```bash
# scripts/backup-database.sh
#!/bin/bash

# Backup configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="${DB_NAME:-email_service}"

# Create backup
pg_dump \
    --host="${DB_HOST}" \
    --port="${DB_PORT}" \
    --username="${DB_USER}" \
    --dbname="${DB_NAME}" \
    --format=custom \
    --compress=9 \
    --file="${BACKUP_DIR}/backup_${TIMESTAMP}.sql"

# Verify backup
if [ ! -f "${BACKUP_DIR}/backup_${TIMESTAMP}.sql" ]; then
    echo "Backup failed!"
    exit 1
fi

# Create checksum
sha256sum "${BACKUP_DIR}/backup_${TIMESTAMP}.sql" > "${BACKUP_DIR}/backup_${TIMESTAMP}.sql.sha256"

echo "Backup completed: ${BACKUP_DIR}/backup_${TIMESTAMP}.sql"
```

## Performance Considerations

### Caching Strategy
```typescript
// Redis caching service
class CacheService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379')
    });
  }

  async getOrSet<T>(key: string, fetcher: () => Promise<T>, ttl: number = 3600): Promise<T> {
    const cached = await this.redis.get(key);

    if (cached) {
      return JSON.parse(cached);
    }

    const data = await fetcher();
    await this.redis.setex(key, ttl, JSON.stringify(data));

    return data;
  }
}
```

### Database Optimization
```typescript
// Efficient database queries
const getInboxesWithMessages = async (userId: string, page: number, limit: number) => {
  return await prisma.inbox.findMany({
    where: { userId },
    include: {
      domain: true,
      messages: {
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
        select: {
          id: true,
          from: true,
          subject: true,
          read: true,
          createdAt: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
};
```

## Security Implementation

### Input Validation
```typescript
// Joi schema validation
const createInboxSchema = Joi.object({
  domainId: Joi.string().uuid().required(),
  prefix: Joi.string().max(20).pattern(/^[a-zA-Z0-9]+$/).optional()
});

// Usage in route
app.post('/inboxes', {
  schema: {
    body: createInboxSchema,
    response: {
      201: inboxResponseSchema,
      400: errorSchema
    }
  }
}, inboxController.create);
```

### SQL Injection Prevention
```typescript
// Prisma automatically parameterizes queries
const user = await prisma.user.findUnique({
  where: {
    id: userId  // Properly parameterized
  }
});

// Complex query with filtering
const messages = await prisma.message.findMany({
  where: {
    AND: [
      { inboxId: inboxId },
      { OR: [
        { subject: { contains: searchTerm } },
        { from: { contains: searchTerm } },
        { text: { contains: searchTerm } }
      ]}
    ]
  },
  orderBy: { createdAt: 'desc' }
});
```

## Monitoring and Observability

### Metrics Collection
```typescript
// Prometheus metrics
const metrics = {
  apiRequests: new Counter({
    name: 'api_requests_total',
    help: 'Total number of API requests',
    labelNames: ['method', 'route', 'status']
  }),

  databaseQueries: new Counter({
    name: 'database_queries_total',
    help: 'Total number of database queries',
    labelNames: ['operation', 'model']
  }),

  processingTime: new Histogram({
    name: 'request_duration_seconds',
    help: 'Request processing time in seconds',
    labelNames: ['route', 'method']
  })
};

// Track metrics in middleware
app.addHook('onRequest', (request, reply, done) => {
  request.startTime = Date.now();
  done();
});

app.addHook('onResponse', (request, reply, done) => {
  const duration = (Date.now() - request.startTime) / 1000;
  metrics.apiRequests.inc({
    method: request.method,
    route: request.url,
    status: reply.statusCode
  });
  metrics.processingTime.observe({
    route: request.url,
    method: request.method
  }, duration);
  done();
});
```

### Logging
```typescript
// Structured logging with pino
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label };
    },
    log: (object) => {
      return {
        ...object,
        timestamp: new Date().toISOString(),
        service: 'tempmail-api'
      };
    }
  }
});

// Usage
logger.info('User created', { userId: user.id, email: user.email });
logger.error('Database connection failed', { error: error.message });
```

## Future Enhancements

### Planned Features
1. **Multi-region Support**: Geographic distribution for scalability
2. **Kubernetes Orchestration**: Container orchestration for production
3. **Advanced Analytics**: Email delivery analytics and reporting
4. **AI-Powered Filtering**: Machine learning for improved spam detection
5. **Mobile Applications**: Native iOS and Android apps
6. **Custom Rules Engine**: User-configurable filtering rules
7. **API Rate Limiting**: Fine-grained throttling controls

### Technical Improvements
1. **Database Sharding**: Horizontal scaling for large deployments
2. **Message Queue**: Redis-based queue for async processing
3. **CDN Integration**: Faster delivery of attachments
4. **Multi-factor Authentication**: Enhanced security options
5. **Audit Logging**: Comprehensive compliance tracking

## Conclusion

The TempMail Pro codebase represents a well-architected, secure, and scalable email platform built with modern technologies. The modular design allows for easy maintenance and expansion, while the comprehensive testing and monitoring ensure reliability. The integration of security services like Rspamd and ClamAV provides enterprise-grade protection, making it suitable for both development and production environments.

The codebase follows best practices for TypeScript development, with proper error handling, input validation, and security measures. The Docker-based deployment simplifies setup and scaling, while the comprehensive documentation makes it easy for new developers to understand and contribute to the project.