/**
 * API Versioning Plugin
 * Handles API version prefixing and backward compatibility
 */

import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

export interface ApiVersioningOptions {
  currentVersion: string;
  deprecatedVersions?: string[];
  sunsetDate?: string;
}

const apiVersioningPlugin: FastifyPluginAsync<ApiVersioningOptions> = async (
  app: FastifyInstance,
  options: ApiVersioningOptions
) => {
  const { currentVersion = 'v1', deprecatedVersions = [], sunsetDate } = options;

  // Add version info to all responses
  app.addHook('onSend', async (request, reply) => {
    reply.header('X-API-Version', currentVersion);

    // Add deprecation headers for old endpoints
    if (!request.url.startsWith(`/${currentVersion}/`) &&
        !request.url.startsWith('/health') &&
        !request.url.startsWith('/ready') &&
        !request.url.startsWith('/metrics')) {
      reply.header('Deprecation', 'true');
      if (sunsetDate) {
        reply.header('Sunset', sunsetDate);
      }
      reply.header('Link', `</${currentVersion}${request.url}>; rel="successor-version"`);
    }
  });

  // Log deprecated endpoint usage
  app.addHook('onRequest', async (request) => {
    if (!request.url.startsWith(`/${currentVersion}/`) &&
        !request.url.startsWith('/health') &&
        !request.url.startsWith('/ready') &&
        !request.url.startsWith('/metrics') &&
        request.url !== '/') {
      app.log.warn({
        msg: 'Deprecated API endpoint accessed',
        url: request.url,
        method: request.method,
        userAgent: request.headers['user-agent'],
      });
    }
  });
};

export default fp(apiVersioningPlugin, {
  name: 'api-versioning',
  fastify: '5.x',
});
