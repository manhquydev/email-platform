import { FastifyRequest, FastifyReply } from 'fastify';
import { createReadStream, statSync } from 'fs';
import { pipeline } from 'stream/promises';
import { createGzip, createDeflate, createBrotli } from 'zlib';

interface CompressionOptions {
  level?: number;
  threshold?: number;
  types?: string[];
}

interface StreamingOptions {
  chunkSize?: number;
  highWaterMark?: number;
}

/**
 * Performance optimization middleware
 * Implements HTTP/2, compression, and streaming optimizations
 */
export class PerformanceMiddleware {
  private compressionCache = new Map<string, Buffer>();
  private readonly COMPRESSION_CACHE_SIZE = 100;
  private readonly COMPRESSION_THRESHOLD = 1024; // 1KB

  constructor() {
    // Cleanup compression cache periodically
    setInterval(() => this.cleanupCache(), 60000);
  }

  /**
   * Response compression middleware
   */
  compression(options: CompressionOptions = {}) {
    const {
      level = 6,
      threshold = this.COMPRESSION_THRESHOLD,
      types = [
        'text/*',
        'application/json',
        'application/javascript',
        'application/xml',
        'text/xml',
        'text/html',
        'text/css',
        'text/plain',
      ],
    } = options;

    return async (request: FastifyRequest, reply: FastifyReply) => {
      // Skip compression for small responses
      const originalSend = reply.send.bind(reply);

      reply.send = (payload: any) => {
        // Get content type
        const contentType = reply.getHeader('content-type') || 'application/json';

        // Check if content type should be compressed
        const shouldCompress = types.some(type =>
          contentType.includes(type.replace('*', ''))
        );

        if (!shouldCompress) {
          return originalSend(payload);
        }

        // Convert payload to buffer
        let data: Buffer;
        if (Buffer.isBuffer(payload)) {
          data = payload;
        } else if (typeof payload === 'string') {
          data = Buffer.from(payload);
        } else {
          data = Buffer.from(JSON.stringify(payload));
        }

        // Skip compression for small responses
        if (data.length < threshold) {
          return originalSend(payload);
        }

        // Check compression cache
        const cacheKey = `${contentType}:${data.length}:${Buffer.from(data).toString('base64').slice(0, 50)}`;
        const cached = this.compressionCache.get(cacheKey);
        if (cached) {
          reply.header('Content-Encoding', 'gzip');
          reply.header('Vary', 'Accept-Encoding');
          return originalSend(cached);
        }

        // Get supported encodings
        const acceptEncoding = request.headers['accept-encoding'] || '';
        let encoding: string | null = null;
        let compressedData: Buffer | null = null;

        // Try Brotli first (best compression)
        if (acceptEncoding.includes('br')) {
          encoding = 'br';
          compressedData = await this.compressBrotli(data, level);
        }
        // Then Gzip
        else if (acceptEncoding.includes('gzip')) {
          encoding = 'gzip';
          compressedData = await this.compressGzip(data, level);
        }
        // Then Deflate
        else if (acceptEncoding.includes('deflate')) {
          encoding = 'deflate';
          compressedData = await this.compressDeflate(data, level);
        }

        // Send compressed response
        if (compressedData && compressedData.length < data.length * 0.9) {
          reply.header('Content-Encoding', encoding);
          reply.header('Vary', 'Accept-Encoding');
          reply.header('Content-Length', compressedData.length);

          // Cache compressed result
          this.setCompressionCache(cacheKey, compressedData);

          return originalSend(compressedData);
        }

        // Send uncompressed if compression doesn't help
        return originalSend(payload);
      };
    };
  }

  /**
   * HTTP/2 server push middleware
   */
  serverPush() {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      // Only works with HTTP/2
      if (request.raw.httpVersionMajor !== 2) {
        return;
      }

      // Push critical resources for API responses
      const pushResources: Array<{ path: string; type: string }> = [];

      // Push GraphQL schema for GraphQL requests
      if (request.url?.startsWith('/graphql')) {
        pushResources.push({
          path: '/graphql/schema',
          type: 'application/json',
        });
      }

      // Push user data for authenticated requests
      if ((request as any).user) {
        pushResources.push({
          path: `/api/user/${(request as any).user.id}`,
          type: 'application/json',
        });
      }

      // Execute pushes
      for (const resource of pushResources) {
        try {
          const stream = reply.raw.stream.push(resource.path, {
            request: {
              'accept': resource.type,
            },
            response: {
              'content-type': resource.type,
              'cache-control': 'public, max-age=300',
            },
          });

          if (stream) {
            // Send empty stream (actual content will be loaded by client)
            stream.end();
          }
        } catch (error) {
          // Push might not be supported
          console.debug('Server push failed:', error);
        }
      }
    };
  }

  /**
   * Response streaming for large payloads
   */
  streaming(options: StreamingOptions = {}) {
    const {
      chunkSize = 64 * 1024, // 64KB
      highWaterMark = 16 * 1024, // 16KB
    } = options;

    return async (request: FastifyRequest, reply: FastifyReply) => {
      // Override reply.send for streaming
      const originalSend = reply.send.bind(reply);

      reply.send = (payload: any) => {
        // Check if payload is streamable
        if (typeof payload === 'string' || Buffer.isBuffer(payload)) {
          const data = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);

          // Set headers for streaming
          reply.header('Transfer-Encoding', 'chunked');
          reply.header('X-Content-Length', data.length.toString());

          // Create readable stream
          const stream = createReadStream(data, {
            highWaterMark,
          });

          // Pipe to response
          return pipeline(stream, reply.raw);
        }

        return originalSend(payload);
      };
    };
  }

  /**
   * Keep-alive connection optimization
   */
  keepAlive() {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      // Set keep-alive headers
      reply.header('Connection', 'keep-alive');
      reply.header('Keep-Alive', 'timeout=60, max=1000');
      reply.header('X-Response-Time', Date.now().toString());

      // Log slow responses
      const start = Date.now();
      const originalSend = reply.send.bind(reply);

      reply.send = (payload: any) => {
        const duration = Date.now() - start;

        if (duration > 1000) {
          console.warn(`Slow response detected: ${duration}ms for ${request.url}`);
        }

        reply.header('X-Response-Time-Duration', duration.toString());
        return originalSend(payload);
      };
    };
  }

  /**
   * JSON streaming for large datasets
   */
  jsonStream() {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      reply.type('application/json');

      // Start JSON array
      reply.raw.write('[\n');

      let first = true;
      const originalSend = reply.send.bind(reply);

      reply.send = (payload: any) => {
        // Handle array data
        if (Array.isArray(payload)) {
          payload.forEach((item, index) => {
            if (!first) {
              reply.raw.write(',\n');
            }
            reply.raw.write(JSON.stringify(item));
            first = false;
          });

          reply.raw.write('\n]');
          reply.raw.end();
        } else {
          return originalSend(payload);
        }
      };
    };
  }

  /**
   * Compress data with Gzip
   */
  private async compressGzip(data: Buffer, level: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      createGzip({ level })(data, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
  }

  /**
   * Compress data with Deflate
   */
  private async compressDeflate(data: Buffer, level: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      createDeflate({ level })(data, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
  }

  /**
   * Compress data with Brotli
   */
  private async compressBrotli(data: Buffer, level: number): Promise<Buffer> {
    const { createBrotliCompress } = await import('zlib');

    return new Promise((resolve, reject) => {
      createBrotliCompress({
        params: {
          [import('zlib').constants.BROTLI_PARAM_QUALITY]: level,
        },
      })(data, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
  }

  /**
   * Set compression cache with LRU eviction
   */
  private setCompressionCache(key: string, data: Buffer): void {
    if (this.compressionCache.size >= this.COMPRESSION_CACHE_SIZE) {
      const firstKey = this.compressionCache.keys().next().value;
      if (firstKey) {
        this.compressionCache.delete(firstKey);
      }
    }

    this.compressionCache.set(key, data);
  }

  /**
   * Cleanup old compression cache entries
   */
  private cleanupCache(): void {
    // Simple cleanup - remove half the entries
    const entries = Array.from(this.compressionCache.entries());
    const toDelete = entries.slice(0, Math.floor(entries.length / 2));

    toDelete.forEach(([key]) => {
      this.compressionCache.delete(key);
    });
  }
}

// Export singleton instance
const performanceMiddleware = new PerformanceMiddleware();
export default performanceMiddleware;

// Export individual middleware functions
export const {
  compression,
  serverPush,
  streaming,
  keepAlive,
  jsonStream,
} = {
  compression: performanceMiddleware.compression.bind(performanceMiddleware),
  serverPush: performanceMiddleware.serverPush.bind(performanceMiddleware),
  streaming: performanceMiddleware.streaming.bind(performanceMiddleware),
  keepAlive: performanceMiddleware.keepAlive.bind(performanceMiddleware),
  jsonStream: performanceMiddleware.jsonStream.bind(performanceMiddleware),
};