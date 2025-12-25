import { FastifyRequest } from 'fastify';

declare module 'fastify' {
    interface FastifyRequest {
        rawBody?: string | Buffer;
    }
    interface FastifyContextConfig {
        rawBody?: boolean;
    }
}
