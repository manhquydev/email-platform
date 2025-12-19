import { FastifyRequest, FastifyReply } from 'fastify';
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Redis connection for rate limiting
let redis: Redis | null = null;

// Initialize Redis if configured
if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL);
  redis.on('error', (err) => {
    console.error('Redis connection error:', err);
  });
}

interface RateLimitConfig {
  max: number;
  windowMs: number;
  keyGenerator?: (req: FastifyRequest) => string;
  skipSuccessfulRequests?: boolean;
  message?: string;
}

// Enhanced rate limiting with Redis for distributed systems
export const createRateLimit = (config: RateLimitConfig) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const key = config.keyGenerator ? config.keyGenerator(request) : 'global';
    const identifier = request.ip || 'unknown';

    const limitKey = `rate_limit:${identifier}:${key}`;
    const windowStart = Date.now() - config.windowMs;

    try {
      // Try Redis first
      if (redis) {
        const current = await redis.incr(limitKey);
        if (current === 1) {
          await redis.expire(limitKey, Math.ceil(config.windowMs / 1000));
        }

        if (current > config.max) {
          const ttl = await redis.ttl(limitKey);
          return reply.status(429).send({
            error: 'TOO_MANY_REQUESTS',
            message: config.message || 'Too many requests, please try again later.',
            retryAfter: ttl
          });
        }
      } else {
        // Fallback to in-memory tracking
        const requestCounts = new Map<string, { count: number; resetTime: number }>();
        const existing = requestCounts.get(limitKey);

        if (!existing || existing.resetTime < windowStart) {
          requestCounts.set(limitKey, {
            count: 1,
            resetTime: Date.now() + config.windowMs
          });
        } else {
          existing.count++;

          if (existing.count > config.max) {
            return reply.status(429).send({
              error: 'TOO_MANY_REQUESTS',
              message: config.message || 'Too many requests, please try again later.',
              retryAfter: Math.ceil((existing.resetTime - Date.now()) / 1000)
            });
          }
        }
      }

      // Log suspicious activity
      if (requestCounts.get(limitKey)?.count === config.max) {
        console.warn(`Rate limit approaching for ${key} from ${identifier}`);

        // Create audit log for rate limit hit
        await prisma.auditLog.create({
          data: {
            action: 'RATE_LIMIT_HIT',
            meta: {
              identifier,
              limit: config.max,
              window: config.windowMs,
              endpoint: request.url,
              userAgent: request.headers['user-agent']
            }
          }
        });
      }

    } catch (error) {
      console.error('Rate limiting error:', error);
      // Fail open if rate limiting fails
    }
  };
};

// Pre-configured rate limiters
export const authRateLimit = createRateLimit({
  max: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  message: 'Too many authentication attempts. Please try again later.',
  keyGenerator: (req) => `auth:${req.ip}`
});

export const signupRateLimit = createRateLimit({
  max: 3,
  windowMs: 60 * 60 * 1000, // 1 hour
  message: 'Too many signup attempts. Please try again later.',
  keyGenerator: (req) => `signup:${req.ip}`
});

export const emailRateLimit = createRateLimit({
  max: 10,
  windowMs: 60 * 1000, // 1 minute
  message: 'Too many email sending attempts. Please try again later.',
  keyGenerator: (req) => `email:${req.ip}`
});

export const passwordResetRateLimit = createRateLimit({
  max: 3,
  windowMs: 60 * 60 * 1000, // 1 hour
  message: 'Too many password reset attempts. Please try again later.',
  keyGenerator: (req) => `password-reset:${req.ip}`
});

export const domainCreationLimit = createRateLimit({
  max: 5,
  windowMs: 60 * 60 * 1000, // 1 hour
  message: 'Too many domain creation attempts. Please try again later.',
  keyGenerator: (req) => {
    const user = (req as any).user;
    return `domain-creation:${user?.userId || req.ip}`;
  }
});

export const inboxCreationLimit = createRateLimit({
  max: 20,
  windowMs: 60 * 60 * 1000, // 1 hour
  message: 'Too many inbox creation attempts. Please try again later.',
  keyGenerator: (req) => {
    const user = (req as any).user;
    return `inbox-creation:${user?.userId || req.ip}`;
  }
});

export const publicEmailRateLimit = createRateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000, // 1 hour per IP
  message: 'Too many public emails received. Please try again later.',
  keyGenerator: (req) => `public-email:${req.ip}`
});

// API rate limiting
export const apiRateLimit = createRateLimit({
  max: 1000,
  windowMs: 60 * 60 * 1000, // 1 hour
  message: 'API rate limit exceeded. Please upgrade your plan for higher limits.',
  keyGenerator: (req) => {
    const user = (req as any).user;
    const apiKey = req.headers['x-api-key'];
    if (apiKey) {
      return `api:${apiKey}`;
    }
    return `api:${user?.userId || req.ip}`;
  }
});

// Advanced rate limiting with burst control
export const createBurstRateLimit = (config: RateLimitConfig & { burstLimit?: number }) => {
  const burstLimit = config.burstLimit || Math.ceil(config.max / 10);

  return async (request: FastifyRequest, reply: FastifyReply) => {
    const key = config.keyGenerator ? config.keyGenerator(request) : 'global';
    const identifier = request.ip || 'unknown';

    const burstKey = `rate_limit_burst:${identifier}:${key}`;
    const sustainedKey = `rate_limit_sustained:${identifier}:${key}`;

    try {
      let burstCount = 0;
      let sustainedCount = 0;

      // Check burst limit
      if (redis) {
        burstCount = await redis.incr(burstKey);
        if (burstCount === 1) {
          await redis.expire(burstKey, 60); // 1 minute
        }
      }

      // Check sustained limit
      const windowStart = Date.now() - config.windowMs;
      if (redis) {
        sustainedCount = await redis.incr(sustainedKey);
        if (sustainedCount === 1) {
          await redis.expire(sustainedKey, Math.ceil(config.windowMs / 1000));
        }
      }

      if (burstCount > burstLimit || sustainedCount > config.max) {
        return reply.status(429).send({
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded. Please slow down your requests.',
          retryAfter: Math.ceil((config.windowMs / 1000))
        });
      }

    } catch (error) {
      console.error('Advanced rate limiting error:', error);
    }
  };
};

// Abuse detection
export const detectAbuse = async (request: FastifyRequest, reply: FastifyReply) => {
  const identifier = request.ip || 'unknown';
  const userAgent = request.headers['user-agent'] || '';

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python-requests/i,
    /go-http-client/i
  ];

  const isBot = suspiciousPatterns.some(pattern => pattern.test(userAgent));

  if (isBot && !request.url.startsWith('/api/') && !request.url.includes('/health')) {
    console.warn(`Blocked bot access from ${identifier}: ${userAgent}`);

    // Log bot attempt
    await prisma.auditLog.create({
      data: {
        action: 'BOT_ACCESS_BLOCKED',
        meta: {
          identifier,
          userAgent,
          url: request.url,
          method: request.method
        }
      }
    });

    return reply.status(403).send({
      error: 'ACCESS_DENIED',
      message: 'Access denied. Bots are not allowed on this endpoint.'
    });
  }

  // Check for VPN/Proxy usage
  const suspiciousHeaders = [
    'x-forwarded-for',
    'x-real-ip',
    'via',
    'x-cluster-client-ip',
    'x-forwarded-server',
    'x-azure-socketaddress'
  ];

  const hasProxyHeaders = suspiciousHeaders.some(header => request.headers[header]);

  if (hasProxyHeaders && request.url.includes('/signup')) {
    console.warn(`Signup via proxy from ${identifier}`);

    // Apply stricter rate limit for proxy users
    await createRateLimit({
      max: 1,
      windowMs: 5 * 60 * 1000, // 5 minutes
      message: 'Signup via proxy is temporarily disabled.'
    })(request, reply);
  }
};

// IP-based blocking for known malicious IPs
const blockedIPs = new Set<string>();

export const blockIP = (ip: string, reason: string) => {
  blockedIPs.add(ip);
  console.log(`Blocked IP: ${ip} - ${reason}`);

  prisma.auditLog.create({
    data: {
      action: 'IP_BLOCKED',
      meta: { ip, reason, timestamp: new Date().toISOString() }
    }
  });
};

export const checkBlockedIP = async (request: FastifyRequest, reply: FastifyReply) => {
  const ip = request.ip || 'unknown';

  if (blockedIPs.has(ip)) {
    return reply.status(403).send({
      error: 'IP_BLOCKED',
      message: 'Your IP address has been blocked due to suspicious activity.'
    });
  }
};