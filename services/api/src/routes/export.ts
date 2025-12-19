import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { exportService } from '../services/exportService';

export async function exportRoutes(app: FastifyInstance) {
  // Create export job
  app.post('/export', { preHandler: app.authenticate }, async (request, reply) => {
    const bodySchema = z.object({
      type: z.enum(['messages', 'inbox', 'organization', 'usage']),
      format: z.enum(['json', 'csv', 'xml', 'pdf']),
      filters: z.object({
        dateRange: z.object({
          from: z.string().datetime(),
          to: z.string().datetime(),
        }).optional(),
        inboxIds: z.array(z.string().uuid()).optional(),
        domainIds: z.array(z.string().uuid()).optional(),
        organizationId: z.string().uuid().optional(),
        includeAttachments: z.boolean().optional(),
        readStatus: z.enum(['all', 'read', 'unread']).optional(),
      }).optional(),
      options: z.object({
        compress: z.boolean().optional(),
        encrypt: z.boolean().optional(),
        password: z.string().optional(),
        chunkSize: z.number().min(100).max(10000).optional(),
      }).optional(),
    });

    const body = bodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid request body', details: body.error.flatten() });
    }

    const userId = (request.user as any).userId;

    try {
      // Convert date strings to Date objects
      const exportRequest = {
        ...body.data,
        filters: body.data.filters ? {
          ...body.data.filters,
          dateRange: body.data.filters.dateRange ? {
            from: new Date(body.data.filters.dateRange.from),
            to: new Date(body.data.filters.dateRange.to)
          } : undefined
        } : undefined
      };

      const job = await exportService.createExportJob(userId, exportRequest);
      return { success: true, data: job };
    } catch (error: any) {
      app.log.error(error, 'Failed to create export job');
      return reply.status(500).send({ error: 'Failed to create export job' });
    }
  });

  // Get export job status
  app.get('/export/:jobId', { preHandler: app.authenticate }, async (request, reply) => {
    const paramsSchema = z.object({ jobId: z.string() });
    const params = paramsSchema.safeParse(request.params);

    if (!params.success) {
      return reply.status(400).send({ error: 'Invalid job ID' });
    }

    const userId = (request.user as any).userId;

    try {
      const job = await exportService.getExportJob(userId, params.data.jobId);
      if (!job) {
        return reply.status(404).send({ error: 'Export job not found' });
      }
      return { data: job };
    } catch (error: any) {
      app.log.error(error, 'Failed to get export job');
      return reply.status(500).send({ error: 'Failed to get export job' });
    }
  });

  // List export jobs
  app.get('/export', { preHandler: app.authenticate }, async (request, reply) => {
    const querySchema = z.object({
      organizationId: z.string().uuid().optional(),
      limit: z.coerce.number().min(1).max(100).default(20),
      offset: z.coerce.number().min(0).default(0),
      status: z.enum(['pending', 'processing', 'completed', 'failed', 'expired']).optional(),
    });

    const query = querySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({ error: 'Invalid query parameters', details: query.error.flatten() });
    }

    const userId = (request.user as any).userId;

    try {
      const jobs = await exportService.listExportJobs(
        userId,
        query.data.organizationId,
        query.data.limit,
        query.data.offset
      );
      return { data: jobs };
    } catch (error: any) {
      app.log.error(error, 'Failed to list export jobs');
      return reply.status(500).send({ error: 'Failed to list export jobs' });
    }
  });

  // Delete export job
  app.delete('/export/:jobId', { preHandler: app.authenticate }, async (request, reply) => {
    const paramsSchema = z.object({ jobId: z.string() });
    const params = paramsSchema.safeParse(request.params);

    if (!params.success) {
      return reply.status(400).send({ error: 'Invalid job ID' });
    }

    const userId = (request.user as any).userId;

    try {
      // Verify job exists and belongs to user
      const job = await exportService.getExportJob(userId, params.data.jobId);
      if (!job) {
        return reply.status(404).send({ error: 'Export job not found' });
      }

      await exportService.deleteExportJob(userId, params.data.jobId);
      return { success: true };
    } catch (error: any) {
      app.log.error(error, 'Failed to delete export job');
      return reply.status(500).send({ error: 'Failed to delete export job' });
    }
  });

  // Download export file
  app.get('/export/:jobId/download', { preHandler: app.authenticate }, async (request, reply) => {
    const paramsSchema = z.object({ jobId: z.string() });
    const params = paramsSchema.safeParse(request.params);

    if (!params.success) {
      return reply.status(400).send({ error: 'Invalid job ID' });
    }

    const userId = (request.user as any).userId;

    try {
      const job = await exportService.getExportJob(userId, params.data.jobId);
      if (!job) {
        return reply.status(404).send({ error: 'Export job not found' });
      }

      if (job.status !== 'completed') {
        return reply.status(400).send({ error: 'Export job not completed yet' });
      }

      if (new Date() > job.expiresAt) {
        return reply.status(410).send({ error: 'Export file has expired' });
      }

      if (!job.downloadUrl) {
        return reply.status(404).send({ error: 'Export file not available' });
      }

      // In production, you would serve the file from storage
      // For now, redirect to the URL
      return reply.redirect(job.downloadUrl);
    } catch (error: any) {
      app.log.error(error, 'Failed to download export');
      return reply.status(500).send({ error: 'Failed to download export' });
    }
  });

  // Get available export formats
  app.get('/export/formats', { preHandler: app.authenticate }, async (request, reply) => {
    try {
      const formats = exportService.getAvailableFormats();
      return { data: formats };
    } catch (error: any) {
      app.log.error(error, 'Failed to get export formats');
      return reply.status(500).send({ error: 'Failed to get export formats' });
    }
  });

  // Get export statistics
  app.get('/export/stats', { preHandler: app.authenticate }, async (request, reply) => {
    const querySchema = z.object({
      organizationId: z.string().uuid().optional(),
      period: z.enum(['day', 'week', 'month', 'year']).default('month'),
    });

    const query = querySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({ error: 'Invalid query parameters', details: query.error.flatten() });
    }

    const userId = (request.user as any).userId;

    try {
      const stats = await exportService.getExportStats(userId, query.data.organizationId);
      return { data: stats };
    } catch (error: any) {
      app.log.error(error, 'Failed to get export statistics');
      return reply.status(500).send({ error: 'Failed to get export statistics' });
    }
  });

  // Preview export (show sample data without creating job)
  app.post('/export/preview', { preHandler: app.authenticate }, async (request, reply) => {
    const bodySchema = z.object({
      type: z.enum(['messages', 'inbox']),
      filters: z.object({
        dateRange: z.object({
          from: z.string().datetime(),
          to: z.string().datetime(),
        }).optional(),
        inboxIds: z.array(z.string().uuid()).optional(),
        readStatus: z.enum(['all', 'read', 'unread']).optional(),
      }).optional(),
      limit: z.number().min(1).max(100).default(10),
    });

    const body = bodySchema.safeParse(request.body);
    if (!params.success) {
      return reply.status(400).send({ error: 'Invalid request body', details: body.error.flatten() });
    }

    const userId = (request.user as any).userId;

    try {
      // Generate preview data (sample records)
      const preview = {
        totalRecords: 0, // Would calculate actual count
        sampleRecords: [
          {
            id: 'sample-id-1',
            from: 'sender@example.com',
            to: 'inbox@tempmail.pro',
            subject: 'Sample Subject',
            receivedAt: new Date().toISOString(),
            read: false,
            attachments: 0
          }
        ],
        fields: [
          { name: 'id', type: 'string' },
          { name: 'from', type: 'string' },
          { name: 'to', type: 'string' },
          { name: 'subject', type: 'string' },
          { name: 'receivedAt', type: 'datetime' },
          { name: 'read', type: 'boolean' },
          { name: 'attachments', type: 'number' }
        ]
      };

      return { data: preview };
    } catch (error: any) {
      app.log.error(error, 'Failed to generate export preview');
      return reply.status(500).send({ error: 'Failed to generate export preview' });
    }
  });
}