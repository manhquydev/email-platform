import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { automationService } from '../services/automationService';
import { PermissionService } from '../services/permissionService';

export async function automationRoutes(app: FastifyInstance) {
  // Create automation rule
  app.post('/automation/rules', { preHandler: app.authenticate }, async (request, reply) => {
    const bodySchema = z.object({
      name: z.string().min(1).max(255),
      description: z.string().max(500).optional(),
      organizationId: z.string().uuid().optional(),
      inboxId: z.string().uuid().optional(),
      isActive: z.boolean().default(true),
      priority: z.number().min(0).max(100).default(50),
      conditions: z.array(z.object({
        field: z.enum(['from', 'to', 'subject', 'body', 'attachments', 'headers', 'size', 'receivedAt']),
        operator: z.enum(['equals', 'contains', 'startsWith', 'endsWith', 'regex', 'notEquals', 'notContains', 'greaterThan', 'lessThan', 'in', 'notIn']),
        value: z.any(),
        caseSensitive: z.boolean().default(true),
        negate: z.boolean().default(false),
      })),
      actions: z.array(z.object({
        type: z.enum(['forward', 'delete', 'markRead', 'markUnread', 'move', 'copy', 'label', 'archive', 'star', 'unstar', 'sendNotification', 'triggerWebhook', 'runScript', 'delay', 'stopProcessing']),
        parameters: z.record(z.any()),
        delay: z.number().optional(),
      })),
      schedule: z.object({
        enabled: z.boolean().default(false),
        timezone: z.string().optional(),
        schedule: z.string().optional(),
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
      }).optional().transform(data => data ? {
        ...data,
        schedule: data.schedule || null
      } : undefined),
      metadata: z.record(z.any()).optional(),
    });

    const body = bodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid request body', details: body.error.flatten() });
    }

    const userId = (request.user as any).userId;

    // Check permissions
    if (body.data.organizationId) {
      const canManage = await PermissionService.checkOrganizationPermission(
        userId,
        body.data.organizationId,
        'manage_members'
      );
      if (!canManage) {
        return reply.status(403).send({ error: 'Not authorized to create rules for this organization' });
      }
    }

    if (body.data.inboxId) {
      // TODO: Check inbox ownership/permission
    }

    try {
      const rule = await automationService.createRule(userId, body.data);
      return { success: true, data: rule };
    } catch (error: any) {
      app.log.error(error, 'Failed to create automation rule');
      return reply.status(500).send({ error: error.message || 'Failed to create automation rule' });
    }
  });

  // Get automation rules
  app.get('/automation/rules', { preHandler: app.authenticate }, async (request, reply) => {
    const querySchema = z.object({
      organizationId: z.string().uuid().optional(),
      inboxId: z.string().uuid().optional(),
      activeOnly: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
      limit: z.coerce.number().min(1).max(100).default(50),
      offset: z.coerce.number().min(0).default(0),
    });

    const query = querySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({ error: 'Invalid query parameters', details: query.error.flatten() });
    }

    const userId = (request.user as any).userId;

    // Check permissions for organization access
    if (query.data.organizationId) {
      const canView = await PermissionService.checkOrganizationPermission(
        userId,
        query.data.organizationId,
        'view'
      );
      if (!canView) {
        return reply.status(403).send({ error: 'Not authorized to view rules for this organization' });
      }
    }

    try {
      const rules = await automationService.getRules(
        userId,
        query.data.organizationId,
        query.data.inboxId,
        query.data.activeOnly
      );
      return { data: rules };
    } catch (error: any) {
      app.log.error(error, 'Failed to get automation rules');
      return reply.status(500).send({ error: 'Failed to get automation rules' });
    }
  });

  // Update automation rule
  app.patch('/automation/rules/:ruleId', { preHandler: app.authenticate }, async (request, reply) => {
    const paramsSchema = z.object({ ruleId: z.string() });
    const params = paramsSchema.safeParse(request.params);

    const bodySchema = z.object({
      name: z.string().min(1).max(255).optional(),
      description: z.string().max(500).optional(),
      isActive: z.boolean().optional(),
      priority: z.number().min(0).max(100).optional(),
      conditions: z.array(z.object({
        field: z.enum(['from', 'to', 'subject', 'body', 'attachments', 'headers', 'size', 'receivedAt']),
        operator: z.enum(['equals', 'contains', 'startsWith', 'endsWith', 'regex', 'notEquals', 'notContains', 'greaterThan', 'lessThan', 'in', 'notIn']),
        value: z.any(),
        caseSensitive: z.boolean().optional(),
        negate: z.boolean().optional(),
      })).optional(),
      actions: z.array(z.object({
        type: z.enum(['forward', 'delete', 'markRead', 'markUnread', 'move', 'copy', 'label', 'archive', 'star', 'unstar', 'sendNotification', 'triggerWebhook', 'runScript', 'delay', 'stopProcessing']),
        parameters: z.record(z.any()),
        delay: z.number().optional(),
      })).optional(),
      schedule: z.object({
        enabled: z.boolean(),
        timezone: z.string().optional(),
        schedule: z.string().optional(),
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
      }).optional(),
      metadata: z.record(z.any()).optional(),
    });

    if (!params.success) {
      return reply.status(400).send({ error: 'Invalid rule ID' });
    }

    const body = bodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid request body', details: body.error.flatten() });
    }

    const userId = (request.user as any).userId;

    try {
      const rule = await automationService.updateRule(userId, params.data.ruleId, body.data);
      return { success: true, data: rule };
    } catch (error: any) {
      if (error.message === 'Rule not found') {
        return reply.status(404).send({ error: error.message });
      }
      if (error.message.includes('Not authorized')) {
        return reply.status(403).send({ error: error.message });
      }
      app.log.error(error, 'Failed to update automation rule');
      return reply.status(500).send({ error: 'Failed to update automation rule' });
    }
  });

  // Delete automation rule
  app.delete('/automation/rules/:ruleId', { preHandler: app.authenticate }, async (request, reply) => {
    const paramsSchema = z.object({ ruleId: z.string() });
    const params = paramsSchema.safeParse(request.params);

    if (!params.success) {
      return reply.status(400).send({ error: 'Invalid rule ID' });
    }

    const userId = (request.user as any).userId;

    try {
      await automationService.deleteRule(userId, params.data.ruleId);
      return { success: true };
    } catch (error: any) {
      if (error.message === 'Rule not found') {
        return reply.status(404).send({ error: error.message });
      }
      if (error.message.includes('Not authorized')) {
        return reply.status(403).send({ error: error.message });
      }
      app.log.error(error, 'Failed to delete automation rule');
      return reply.status(500).send({ error: 'Failed to delete automation rule' });
    }
  });

  // Test automation rule
  app.post('/automation/rules/:ruleId/test', { preHandler: app.authenticate }, async (request, reply) => {
    const paramsSchema = z.object({ ruleId: z.string() });
    const params = paramsSchema.safeParse(request.params);

    const bodySchema = z.object({
      message: z.object({
        fromAddress: z.string(),
        toAddress: z.string(),
        subject: z.string().optional(),
        textContent: z.string().optional(),
        htmlContent: z.string().optional(),
        attachments: z.number().default(0),
        receivedAt: z.string().datetime().optional(),
      }),
    });

    if (!params.success) {
      return reply.status(400).send({ error: 'Invalid rule ID' });
    }

    const body = bodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid test message', details: body.error.flatten() });
    }

    const userId = (request.user as any).userId;

    try {
      const testMessage = {
        ...body.data.message,
        receivedAt: body.data.message.receivedAt ? new Date(body.data.message.receivedAt) : new Date()
      };

      const result = await automationService.testRule(userId, params.data.ruleId, testMessage);
      return { data: result };
    } catch (error: any) {
      if (error.message === 'Rule not found') {
        return reply.status(404).send({ error: error.message });
      }
      app.log.error(error, 'Failed to test automation rule');
      return reply.status(500).send({ error: 'Failed to test automation rule' });
    }
  });

  // Process message through automation
  app.post('/automation/process/:messageId', { preHandler: app.authenticate }, async (request, reply) => {
    const paramsSchema = z.object({ messageId: z.string().uuid() });
    const params = paramsSchema.safeParse(request.params);

    if (!params.success) {
      return reply.status(400).send({ error: 'Invalid message ID' });
    }

    const userId = (request.user as any).userId;

    try {
      const result = await automationService.processMessage(params.data.messageId, {
        metadata: { userId }
      });
      return { data: result };
    } catch (error: any) {
      if (error.message === 'Message not found') {
        return reply.status(404).send({ error: error.message });
      }
      app.log.error(error, 'Failed to process automation');
      return reply.status(500).send({ error: 'Failed to process automation' });
    }
  });

  // Get automation statistics
  app.get('/automation/stats', { preHandler: app.authenticate }, async (request, reply) => {
    const querySchema = z.object({
      organizationId: z.string().uuid().optional(),
    });

    const query = querySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({ error: 'Invalid query parameters', details: query.error.flatten() });
    }

    const userId = (request.user as any).userId;

    if (query.data.organizationId) {
      const canView = await PermissionService.checkOrganizationPermission(
        userId,
        query.data.organizationId,
        'view'
      );
      if (!canView) {
        return reply.status(403).send({ error: 'Not authorized to view stats for this organization' });
      }
    }

    try {
      const stats = await automationService.getAutomationStats(userId, query.data.organizationId);
      return { data: stats };
    } catch (error: any) {
      app.log.error(error, 'Failed to get automation statistics');
      return reply.status(500).send({ error: 'Failed to get automation statistics' });
    }
  });

  // Get available rule operators
  app.get('/automation/operators', { preHandler: app.authenticate }, async (request, reply) => {
    const operators = [
      {
        name: 'equals',
        label: 'Equals',
        description: 'Field equals the specified value',
        supportedFields: ['from', 'to', 'subject', 'attachments', 'size'],
        valueType: 'string'
      },
      {
        name: 'notEquals',
        label: 'Does not equal',
        description: 'Field does not equal the specified value',
        supportedFields: ['from', 'to', 'subject', 'attachments', 'size'],
        valueType: 'string'
      },
      {
        name: 'contains',
        label: 'Contains',
        description: 'Field contains the specified value',
        supportedFields: ['from', 'to', 'subject', 'body'],
        valueType: 'string'
      },
      {
        name: 'notContains',
        label: 'Does not contain',
        description: 'Field does not contain the specified value',
        supportedFields: ['from', 'to', 'subject', 'body'],
        valueType: 'string'
      },
      {
        name: 'startsWith',
        label: 'Starts with',
        description: 'Field starts with the specified value',
        supportedFields: ['from', 'to', 'subject'],
        valueType: 'string'
      },
      {
        name: 'endsWith',
        label: 'Ends with',
        description: 'Field ends with the specified value',
        supportedFields: ['from', 'to', 'subject'],
        valueType: 'string'
      },
      {
        name: 'regex',
        label: 'Regex match',
        description: 'Field matches the regular expression',
        supportedFields: ['from', 'to', 'subject', 'body'],
        valueType: 'string'
      },
      {
        name: 'greaterThan',
        label: 'Greater than',
        description: 'Field value is greater than the specified number',
        supportedFields: ['attachments', 'size'],
        valueType: 'number'
      },
      {
        name: 'lessThan',
        label: 'Less than',
        description: 'Field value is less than the specified number',
        supportedFields: ['attachments', 'size'],
        valueType: 'number'
      },
      {
        name: 'in',
        label: 'Is in list',
        description: 'Field value is in the specified list',
        supportedFields: ['from', 'to', 'subject'],
        valueType: 'array'
      },
      {
        name: 'notIn',
        label: 'Is not in list',
        description: 'Field value is not in the specified list',
        supportedFields: ['from', 'to', 'subject'],
        valueType: 'array'
      }
    ];

    return { data: operators };
  });

  // Get available actions
  app.get('/automation/actions', { preHandler: app.authenticate }, async (request, reply) => {
    const actions = [
      {
        name: 'forward',
        label: 'Forward message',
        description: 'Forward the message to specified email address',
        parameters: {
          toAddress: { type: 'string', required: true, label: 'To Address' },
          preserveOriginal: { type: 'boolean', required: false, label: 'Preserve Original Message' }
        }
      },
      {
        name: 'delete',
        label: 'Delete message',
        description: 'Permanently delete the message',
        parameters: {}
      },
      {
        name: 'markRead',
        label: 'Mark as read',
        description: 'Mark the message as read',
        parameters: {}
      },
      {
        name: 'markUnread',
        label: 'Mark as unread',
        description: 'Mark the message as unread',
        parameters: {}
      },
      {
        name: 'sendNotification',
        label: 'Send notification',
        description: 'Send a notification about this message',
        parameters: {
          message: { type: 'string', required: true, label: 'Notification Message' },
          channel: { type: 'string', required: false, label: 'Notification Channel (email, sms, push)' }
        }
      },
      {
        name: 'triggerWebhook',
        label: 'Trigger webhook',
        description: 'Trigger a webhook with message data',
        parameters: {
          webhookId: { type: 'string', required: false, label: 'Webhook ID (optional, will trigger all matching webhooks)' },
          data: { type: 'object', required: false, label: 'Additional data to send' }
        }
      },
      {
        name: 'delay',
        label: 'Delay processing',
        description: 'Wait before processing next actions',
        parameters: {
          seconds: { type: 'number', required: true, label: 'Delay in seconds' }
        }
      },
      {
        name: 'stopProcessing',
        label: 'Stop processing',
        description: 'Stop processing further rules for this message',
        parameters: {}
      }
    ];

    return { data: actions };
  });
}