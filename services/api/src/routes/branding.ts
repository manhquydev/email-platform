import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { brandingService } from '../services/brandingService';
import { PermissionService } from '../services/permissionService';

export async function brandingRoutes(app: FastifyInstance) {
  // Get organization branding
  app.get('/branding/:organizationId', { preHandler: app.authenticate }, async (request, reply) => {
    const params = z.object({ organizationId: z.string().uuid() }).safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'Invalid organization ID' });
    }

    const userId = (request.user as any).userId;
    const canView = await PermissionService.checkOrganizationPermission(
      userId,
      params.data.organizationId,
      'view'
    );

    if (!canView) {
      return reply.status(403).send({ error: 'Not authorized to view branding settings' });
    }

    try {
      const branding = await brandingService.getBranding(params.data.organizationId);
      return { data: branding };
    } catch (error: any) {
      app.log.error(error, 'Failed to fetch branding');
      return reply.status(500).send({ error: 'Failed to fetch branding settings' });
    }
  });

  // Update organization branding
  app.patch('/branding/:organizationId', { preHandler: app.authenticate }, async (request, reply) => {
    const params = z.object({ organizationId: z.string().uuid() }).safeParse(request.params);
    const body = z.object({
      colors: z.object({
        primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        background: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        text: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      }).optional(),
      fonts: z.object({
        heading: z.string().optional(),
        body: z.string().optional(),
        customCss: z.string().optional(),
      }).optional(),
      emailTemplates: z.object({
        header: z.string().optional(),
        footer: z.string().optional(),
        banner: z.string().optional(),
      }).optional(),
      whiteLabel: z.object({
        enabled: z.boolean().optional(),
        hideBranding: z.boolean().optional(),
        customFooter: z.string().optional(),
        customTerms: z.string().optional(),
        customPrivacy: z.string().optional(),
      }).optional(),
    }).safeParse(request.body);

    if (!params.success) {
      return reply.status(400).send({ error: 'Invalid organization ID' });
    }

    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid request body', details: body.error.flatten() });
    }

    const userId = (request.user as any).userId;
    const canManage = await PermissionService.checkOrganizationPermission(
      userId,
      params.data.organizationId,
      'manage'
    );

    if (!canManage) {
      return reply.status(403).send({ error: 'Not authorized to update branding settings' });
    }

    try {
      const branding = await brandingService.updateBranding(
        params.data.organizationId,
        userId,
        body.data
      );
      return { success: true, data: branding };
    } catch (error: any) {
      if (error.message.includes('Invalid hex color')) {
        return reply.status(400).send({ error: error.message });
      }
      app.log.error(error, 'Failed to update branding');
      return reply.status(500).send({ error: 'Failed to update branding settings' });
    }
  });

  // Upload logo
  app.post('/branding/:organizationId/logo', {
    preHandler: app.authenticate
  }, async (request, reply) => {
    const params = z.object({ organizationId: z.string().uuid() }).safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'Invalid organization ID' });
    }

    const userId = (request.user as any).userId;
    const canManage = await PermissionService.checkOrganizationPermission(
      userId,
      params.data.organizationId,
      'manage'
    );

    if (!canManage) {
      return reply.status(403).send({ error: 'Not authorized to upload logo' });
    }

    try {
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ error: 'No file uploaded' });
      }

      const buffer = await data.toBuffer();
      const result = await brandingService.uploadLogo(
        params.data.organizationId,
        userId,
        buffer,
        data.filename,
        data.mimetype
      );

      return { success: true, data: result };
    } catch (error: any) {
      if (error.message.includes('must be a JPG, PNG') || error.message.includes('must be less than 2MB')) {
        return reply.status(400).send({ error: error.message });
      }
      app.log.error(error, 'Failed to upload logo');
      return reply.status(500).send({ error: 'Failed to upload logo' });
    }
  });

  // Setup custom domain
  app.post('/branding/:organizationId/custom-domain', {
    preHandler: app.authenticate
  }, async (request, reply) => {
    const params = z.object({ organizationId: z.string().uuid() }).safeParse(request.params);
    const body = z.object({
      domain: z.string().min(1),
    }).safeParse(request.body);

    if (!params.success || !body.success) {
      return reply.status(400).send({ error: 'Invalid request' });
    }

    const userId = (request.user as any).userId;
    const canManage = await PermissionService.checkOrganizationPermission(
      userId,
      params.data.organizationId,
      'manage'
    );

    if (!canManage) {
      return reply.status(403).send({ error: 'Not authorized to setup custom domain' });
    }

    try {
      const result = await brandingService.setupCustomDomain(
        params.data.organizationId,
        userId,
        body.data.domain
      );
      return { success: true, data: result };
    } catch (error: any) {
      if (error.message.includes('Invalid domain format')) {
        return reply.status(400).send({ error: error.message });
      }
      app.log.error(error, 'Failed to setup custom domain');
      return reply.status(500).send({ error: 'Failed to setup custom domain' });
    }
  });

  // Verify custom domain
  app.post('/branding/:organizationId/custom-domain/verify', {
    preHandler: app.authenticate
  }, async (request, reply) => {
    const params = z.object({ organizationId: z.string().uuid() }).safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'Invalid organization ID' });
    }

    const userId = (request.user as any).userId;
    const canManage = await PermissionService.checkOrganizationPermission(
      userId,
      params.data.organizationId,
      'manage'
    );

    if (!canManage) {
      return reply.status(403).send({ error: 'Not authorized to verify custom domain' });
    }

    try {
      const result = await brandingService.verifyCustomDomain(
        params.data.organizationId,
        userId
      );
      return { success: true, data: result };
    } catch (error: any) {
      app.log.error(error, 'Failed to verify custom domain');
      return reply.status(500).send({ error: 'Failed to verify custom domain' });
    }
  });

  // Generate branding CSS
  app.get('/branding/:organizationId/css', { preHandler: app.authenticate }, async (request, reply) => {
    const params = z.object({ organizationId: z.string().uuid() }).safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'Invalid organization ID' });
    }

    const userId = (request.user as any).userId;
    const canView = await PermissionService.checkOrganizationPermission(
      userId,
      params.data.organizationId,
      'view'
    );

    if (!canView) {
      return reply.status(403).send({ error: 'Not authorized to view branding CSS' });
    }

    try {
      const css = await brandingService.generateBrandingCSS(params.data.organizationId);
      reply.type('text/css');
      return css;
    } catch (error: any) {
      app.log.error(error, 'Failed to generate branding CSS');
      return reply.status(500).send({ error: 'Failed to generate branding CSS' });
    }
  });

  // Get email template
  app.get('/branding/:organizationId/email-template/:type', {
    preHandler: app.authenticate
  }, async (request, reply) => {
    const params = z.object({
      organizationId: z.string().uuid(),
      type: z.enum(['welcome', 'reset_password', 'verification'])
    }).safeParse({ ...request.params });

    if (!params.success) {
      return reply.status(400).send({ error: 'Invalid request parameters' });
    }

    const userId = (request.user as any).userId;
    const canView = await PermissionService.checkOrganizationPermission(
      userId,
      params.data.organizationId,
      'view'
    );

    if (!canView) {
      return reply.status(403).send({ error: 'Not authorized to view email templates' });
    }

    try {
      const template = await brandingService.getEmailTemplate(
        params.data.organizationId,
        params.data.type
      );
      return { data: { template } };
    } catch (error: any) {
      app.log.error(error, 'Failed to get email template');
      return reply.status(500).send({ error: 'Failed to get email template' });
    }
  });

  // Preview email template
  app.post('/branding/:organizationId/email-template/:type/preview', {
    preHandler: app.authenticate
  }, async (request, reply) => {
    const params = z.object({
      organizationId: z.string().uuid(),
      type: z.enum(['welcome', 'reset_password', 'verification'])
    }).safeParse({ ...request.params });

    const body = z.object({
      variables: z.record(z.string()).optional(),
    }).safeParse(request.body);

    if (!params.success || !body.success) {
      return reply.status(400).send({ error: 'Invalid request' });
    }

    const userId = (request.user as any).userId;
    const canView = await PermissionService.checkOrganizationPermission(
      userId,
      params.data.organizationId,
      'view'
    );

    if (!canView) {
      return reply.status(403).send({ error: 'Not authorized to preview email templates' });
    }

    try {
      let template = await brandingService.getEmailTemplate(
        params.data.organizationId,
        params.data.type
      );

      // Replace template variables
      const defaultVariables = {
        subject: 'Email from TempMail Pro',
        loginUrl: 'https://app.tempmail.pro/login',
        resetUrl: 'https://app.tempmail.pro/reset-password',
        verificationUrl: 'https://app.tempmail.pro/verify-email',
        ...body.data.variables
      };

      for (const [key, value] of Object.entries(defaultVariables)) {
        template = template.replace(new RegExp(`{{${key}}}`, 'g'), value);
      }

      reply.type('text/html');
      return template;
    } catch (error: any) {
      app.log.error(error, 'Failed to preview email template');
      return reply.status(500).send({ error: 'Failed to preview email template' });
    }
  });
}