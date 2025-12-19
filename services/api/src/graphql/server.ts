import { FastifyInstance } from 'fastify';
import { createServer } from 'http';
import { createYoga } from 'graphql-yoga';
import { useLogger } from '@graphql-yoga/plugin-logger';
import { useResponseCache } from '@graphql-yoga/plugin-response-cache';
import { usePersistedOperations } from '@graphql-yoga/plugin-persisted-operations';
import { useDeferStream } from '@graphql-yoga/plugin-defer-stream';
import { useScheduler } from '@graphql-yoga/plugin-scheduler';
import { makeExecutableSchema } from '@graphql-eslint/schema';
import { createServer as createSubscriptionsServer } from 'subscriptions-transport-ws';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import { execute } from 'graphql';
import { SubscriptionContext } from './types';
import resolvers from './resolvers';
import { createContext } from './context';
import schema from './schema.graphql';

export class GraphQLServer {
  private yoga: any;
  private subscriptionServer: any;

  constructor() {
    this.setupServer();
  }

  private setupServer() {
    // Create executable schema
    const executableSchema = makeExecutableSchema({
      typeDefs: schema,
      resolvers,
    });

    // Create Yoga server with plugins
    this.yoga = createYoga({
      schema: executableSchema,
      context: createContext,
      plugins: [
        // Logger plugin for debugging
        useLogger({
          logFn: (eventName, { args, ...rest }) => {
            if (eventName === 'execute-start') {
              console.log('GraphQL Query:', args.operationName);
            }
          },
        }),

        // Response caching plugin
        useResponseCache({
          session: () => null, // Implement session-based caching
          ttl: 5000, // 5 seconds cache
        }),

        // Persisted operations for security
        usePersistedOperations({
          getPersistedOperation: async (hash) => {
            // Load persisted operations from database or file system
            return this.loadPersistedOperation(hash);
          },
        }),

        // Defer stream for large queries
        useDeferStream(),

        // Scheduler for background tasks
        useScheduler({
          taskQueue: {
            run: async (task) => {
              // Handle background tasks
              console.log('Background task:', task);
            },
          },
        }),

        // Performance monitoring
        {
          onExecute: ({ args }) => {
            const startTime = Date.now();

            return {
              onExecuteDone: ({ result }) => {
                const duration = Date.now() - startTime;
                console.log(`Query "${args.operationName}" executed in ${duration}ms`);

                // Log slow queries
                if (duration > 1000) {
                  console.warn(`Slow query detected: ${args.operationName} (${duration}ms)`);
                }
              },
            };
          },
        },

        // Complexity analysis
        {
          onExecute: ({ args }) => {
            // Simple complexity analysis
            const complexity = this.calculateComplexity(args);
            if (complexity > 1000) {
              throw new Error('Query too complex');
            }
          },
        },
      ],

      // GraphQL endpoint configuration
      graphqlEndpoint: '/graphql',
      healthCheckEndpoint: '/graphql/health',
      landingPage: false,
      graphiql: process.env.NODE_ENV === 'development',

      // CORS configuration
      cors: {
        origin: ['https://tempmail.pro', 'https://app.tempmail.pro'],
        credentials: true,
      },

      // Introspection (disable in production)
      introspection: process.env.NODE_ENV === 'development',

      // Mutation validation
      validationRules: [],
      middlewares: [],
    });
  }

  private calculateComplexity(args: any): number {
    // Simple complexity calculation
    let complexity = 1;

    if (args.operation === 'query') {
      // Add complexity based on query depth
      const depth = this.calculateDepth(args.document);
      complexity += depth * 10;

      // Add complexity for potentially expensive fields
      const expensiveFields = ['messages', 'analytics', 'admin'];
      for (const field of expensiveFields) {
        if (args.document.includes(field)) {
          complexity += 100;
        }
      }
    }

    return complexity;
  }

  private calculateDepth(document: any): number {
    // Simple depth calculation
    // In production, use a proper depth limiting library
    const documentStr = JSON.stringify(document);
    let depth = 0;
    let currentDepth = 0;

    for (const char of documentStr) {
      if (char === '{') {
        currentDepth++;
        depth = Math.max(depth, currentDepth);
      } else if (char === '}') {
        currentDepth--;
      }
    }

    return depth;
  }

  private async loadPersistedOperation(hash: string): Promise<any> {
    // Load persisted operation from database or Redis
    // This is a placeholder implementation
    try {
      // In production, load from Redis or database
      return null;
    } catch (error) {
      console.error('Failed to load persisted operation:', error);
      return null;
    }
  }

  async register(app: FastifyInstance) {
    // Register GraphQL endpoint
    app.all('/graphql', async (req, reply) => {
      const response = await this.yoga.handleIncomingMessage(req, {
        req,
        reply,
      });

      for (const [key, value] of response.headers) {
        reply.header(key, value);
      }

      reply.status(response.status);
      reply.send(response.body);
    });

    // GraphQL Health endpoint
    app.get('/graphql/health', async (req, reply) => {
      const health = await this.checkHealth();
      reply.send(health);
    });

    // Setup subscription server
    this.setupSubscriptions(app);
  }

  private setupSubscriptions(app: FastifyInstance) {
    // Create HTTP server for subscriptions
    const httpServer = createServer(app);

    // Create subscription server
    this.subscriptionServer = SubscriptionServer.create({
      schema: this.yoga.schema,
      execute,
      subscribe: (args) => execute(args),
      onConnect: async (connectionParams, websocket, context) => {
        // Authenticate WebSocket connection
        const token = connectionParams?.Authorization || connectionParams?.authToken;
        if (!token) {
          throw new Error('Authentication required');
        }

        const user = await this.authenticateToken(token);
        return { user };
      },
    });

    // Apply subscription server to HTTP server
    this.subscriptionServer.installHandlers(httpServer, {
      path: '/graphql/subscriptions',
      websocket: true,
    });

    // Upgrade HTTP server to support WebSockets
    app.server.on('upgrade', (request, socket, head) => {
      if (request.url === '/graphql/subscriptions') {
        this.subscriptionServer.handleUpgrade({ request, socket, head });
      } else {
        socket.destroy();
      }
    });
  }

  private async authenticateToken(token: string): Promise<any> {
    // Implement JWT verification
    // This is a placeholder implementation
    try {
      // Verify JWT token
      const decoded = this.verifyJWT(token);
      return decoded;
    } catch (error) {
      throw new Error('Invalid authentication token');
    }
  }

  private verifyJWT(token: string): any {
    // Implement JWT verification
    // This is a placeholder implementation
    return { userId: '123', email: 'user@example.com' };
  }

  private async checkHealth(): Promise<any> {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {},
    };

    try {
      // Check database connection
      health.services.database = await this.checkDatabase();

      // Check Redis connection
      health.services.redis = await this.checkRedis();

      // Check email service
      health.services.email = await this.checkEmailService();
    } catch (error) {
      health.status = 'unhealthy';
      health.error = error.message;
    }

    return health;
  }

  private async checkDatabase(): Promise<any> {
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      await prisma.$queryRaw`SELECT 1`;
      await prisma.$disconnect();
      return { status: 'healthy', latency: Date.now() };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }

  private async checkRedis(): Promise<any> {
    try {
      const Redis = require('ioredis');
      const redis = new Redis(process.env.REDIS_URL);
      await redis.ping();
      redis.disconnect();
      return { status: 'healthy', latency: Date.now() };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }

  private async checkEmailService(): Promise<any> {
    try {
      // Check email service health
      // This is a placeholder implementation
      return { status: 'healthy' };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }

  // Pub/Sub for real-time updates
  async publishUpdate(channel: string, data: any) {
    // Publish updates to subscribers
    try {
      // Use Redis pub/sub or WebSocket connections
      console.log(`Publishing to ${channel}:`, data);
    } catch (error) {
      console.error('Failed to publish update:', error);
    }
  }

  // Query optimization
  optimizeQuery(query: string): string {
    // Apply query optimizations
    let optimizedQuery = query;

    // Add LIMIT to queries that don't have it
    if (!query.includes('LIMIT') && !query.includes('limit')) {
      optimizedQuery += ' LIMIT 100';
    }

    // Add appropriate ORDER BY for pagination
    if (query.includes('cursor')) {
      if (!query.includes('ORDER BY')) {
        optimizedQuery += ' ORDER BY created_at DESC';
      }
    }

    return optimizedQuery;
  }

  // Response compression
  compressResponse(data: any): any {
    // Implement response compression for large payloads
    const jsonString = JSON.stringify(data);

    if (jsonString.length > 1024 * 1024) { // > 1MB
      // Use compression
      return {
        data,
        compressed: true,
        size: jsonString.length,
      };
    }

    return data;
  }

  // Cache management
  async getFromCache(key: string): Promise<any> {
    try {
      const Redis = require('ioredis');
      const redis = new Redis(process.env.REDIS_URL);
      const cached = await redis.get(`gql:${key}`);
      redis.disconnect();
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async setCache(key: string, data: any, ttl: number = 300): Promise<void> {
    try {
      const Redis = require('ioredis');
      const redis = new Redis(process.env.REDIS_URL);
      await redis.setex(`gql:${key}`, ttl, JSON.stringify(data));
      redis.disconnect();
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  // Rate limiting for GraphQL
  async checkRateLimit(identifier: string, limit: number = 100): Promise<boolean> {
    try {
      const Redis = require('ioredis');
      const redis = new Redis(process.env.REDIS_URL);
      const key = `gql:rate:${identifier}`;
      const current = await redis.incr(key);

      if (current === 1) {
        await redis.expire(key, 60); // 1 minute window
      }

      redis.disconnect();
      return current <= limit;
    } catch (error) {
      console.error('Rate limit check error:', error);
      return true; // Fail open
    }
  }
}

export default GraphQLServer;