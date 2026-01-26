/**
 * Admin Notification Templates Routes
 * CRUD operations for notification templates
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import * as templateService from '../../services/notification-template-service';

// Zod schemas
const variableSchema = z.object({
  name: z.string().min(1),
  required: z.boolean().default(false),
  description: z.string().optional(),
});

const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  title: z.string().min(1).max(200),
  message: z.string().min(1),
  type: z.enum(['INFO', 'WARNING', 'SUCCESS', 'ERROR', 'PROMOTION']).optional(),
  variables: z.array(variableSchema).optional(),
  imageUrl: z.string().url().optional(),
});

const updateTemplateSchema = createTemplateSchema.partial();

export async function notificationTemplateRoutes(app: FastifyInstance) {
  // List all templates
  app.get('/', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const user = await prisma.user.findUnique({ where: { id: request.user.userId } });
    if (user?.role !== 'ADMIN') return reply.status(403).send({ error: 'Unauthorized' });

    const { includeArchived } = request.query as { includeArchived?: string };
    const templates = await templateService.listTemplates(includeArchived === 'true');
    return { templates };
  });

  // Get single template
  app.get('/:id', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const user = await prisma.user.findUnique({ where: { id: request.user.userId } });
    if (user?.role !== 'ADMIN') return reply.status(403).send({ error: 'Unauthorized' });

    const { id } = request.params as { id: string };
    const template = await templateService.getTemplateById(id);
    if (!template) return reply.status(404).send({ error: 'Template not found' });
    return { template };
  });

  // Create template
  app.post('/', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const user = await prisma.user.findUnique({ where: { id: request.user.userId } });
    if (user?.role !== 'ADMIN') return reply.status(403).send({ error: 'Unauthorized' });

    const body = createTemplateSchema.parse(request.body);
    const template = await templateService.createTemplate(body);
    return reply.status(201).send({ template });
  });

  // Update template
  app.put('/:id', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const user = await prisma.user.findUnique({ where: { id: request.user.userId } });
    if (user?.role !== 'ADMIN') return reply.status(403).send({ error: 'Unauthorized' });

    const { id } = request.params as { id: string };
    const body = updateTemplateSchema.parse(request.body);
    const template = await templateService.updateTemplate(id, body);
    return { template };
  });

  // Archive template (soft delete)
  app.delete('/:id', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const user = await prisma.user.findUnique({ where: { id: request.user.userId } });
    if (user?.role !== 'ADMIN') return reply.status(403).send({ error: 'Unauthorized' });

    const { id } = request.params as { id: string };
    await templateService.archiveTemplate(id);
    return { success: true };
  });

  // Restore archived template
  app.post('/:id/restore', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const user = await prisma.user.findUnique({ where: { id: request.user.userId } });
    if (user?.role !== 'ADMIN') return reply.status(403).send({ error: 'Unauthorized' });

    const { id } = request.params as { id: string };
    const template = await templateService.restoreTemplate(id);
    return { template };
  });

  // Clone template
  app.post('/:id/clone', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const user = await prisma.user.findUnique({ where: { id: request.user.userId } });
    if (user?.role !== 'ADMIN') return reply.status(403).send({ error: 'Unauthorized' });

    const { id } = request.params as { id: string };
    const { name } = (request.body as { name?: string }) || {};
    const template = await templateService.cloneTemplate(id, name);
    return reply.status(201).send({ template });
  });

  // Get available system variables
  app.get('/variables/system', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const user = await prisma.user.findUnique({ where: { id: request.user.userId } });
    if (user?.role !== 'ADMIN') return reply.status(403).send({ error: 'Unauthorized' });

    return { variables: templateService.SYSTEM_VARIABLES };
  });
}
