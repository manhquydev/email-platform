import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getUserUsage } from '../middleware/quotaCheck';

export default async function publicQuotaRoutes(fastify: FastifyInstance) {
  // Get current user quota and usage
  fastify.get('/public/quota', {
    preHandler: [fastify.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.userId;
      const quotaInfo = await getUserUsage(userId);

      reply.send({
        tier: quotaInfo.tier,
        limits: quotaInfo.limits,
        usage: quotaInfo.usage,
        canUpgrade: quotaInfo.tier !== 'enterprise',
        percentageUsed: {
          domains: quotaInfo.limits.maxDomains === -1 ? 0 : Math.round((quotaInfo.usage.domains / quotaInfo.limits.maxDomains) * 100),
          inboxes: quotaInfo.limits.maxInboxes === -1 ? 0 : Math.round((quotaInfo.usage.inboxes / quotaInfo.limits.maxInboxes) * 100),
          emails: quotaInfo.limits.maxEmailsPerMonth === -1 ? 0 : Math.round((quotaInfo.usage.emailsReceived / quotaInfo.limits.maxEmailsPerMonth) * 100)
        }
      });
    } catch (error: any) {
      fastify.log.error(error);
      reply.status(500).send({
        error: 'FETCH_QUOTA_FAILED',
        message: 'Failed to fetch quota information'
      });
    }
  });

  // Get tier comparison
  fastify.get('/public/quota/comparison', async () => {
    return {
      tiers: {
        free: {
          name: 'Free',
          price: 0,
          currency: 'USD',
          features: {
            domains: 1,
            inboxes: 10,
            emailsPerMonth: 100,
            emailRetention: '24 hours',
            apiAccess: false,
            customBranding: false,
            prioritySupport: false
          }
        },
        premium: {
          name: 'Premium',
          price: 9.99,
          currency: 'USD',
          features: {
            domains: 10,
            inboxes: 100,
            emailsPerMonth: 10000,
            emailRetention: '1 week',
            apiAccess: true,
            customBranding: true,
            prioritySupport: false
          }
        },
        business: {
          name: 'Business',
          price: 49.99,
          currency: 'USD',
          features: {
            domains: 100,
            inboxes: 1000,
            emailsPerMonth: 100000,
            emailRetention: '30 days',
            apiAccess: true,
            customBranding: true,
            prioritySupport: true
          }
        },
        enterprise: {
          name: 'Enterprise',
          price: null,
          currency: 'USD',
          features: {
            domains: 'Unlimited',
            inboxes: 'Unlimited',
            emailsPerMonth: 'Unlimited',
            emailRetention: 'Unlimited',
            apiAccess: true,
            customBranding: true,
            prioritySupport: true
          }
        }
      }
    };
  });

  // Check if action is allowed based on quota
  fastify.post('/public/quota/check', {
    preHandler: [fastify.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.userId;
      const body = request.body as any;

      const quotaInfo = await getUserUsage(userId);
      const { resource, action } = body;

      let canProceed = true;
      let reason: string | null = null;

      switch (resource) {
        case 'domain':
          if (action === 'create' && quotaInfo.limits.maxDomains !== -1) {
            if (quotaInfo.usage.domains >= quotaInfo.limits.maxDomains) {
              canProceed = false;
              reason = `Domain limit (${quotaInfo.limits.maxDomains}) reached`;
            }
          }
          break;

        case 'inbox':
          if (action === 'create' && quotaInfo.limits.maxInboxes !== -1) {
            if (quotaInfo.usage.inboxes >= quotaInfo.limits.maxInboxes) {
              canProceed = false;
              reason = `Inbox limit (${quotaInfo.limits.maxInboxes}) reached`;
            }
          }
          break;

        case 'email':
          if (action === 'receive' && quotaInfo.limits.maxEmailsPerMonth !== -1) {
            if (quotaInfo.usage.emailsReceived >= quotaInfo.limits.maxEmailsPerMonth) {
              canProceed = false;
              reason = `Monthly email limit (${quotaInfo.limits.maxEmailsPerMonth}) reached`;
            }
          }
          break;
      }

      reply.send({
        canProceed,
        reason,
        currentUsage: quotaInfo.usage,
        limits: quotaInfo.limits,
        tier: quotaInfo.tier,
        upgradeUrl: !canProceed ? '/pricing' : null
      });
    } catch (error: any) {
      fastify.log.error(error);
      reply.status(500).send({
        error: 'QUOTA_CHECK_FAILED',
        message: 'Failed to check quota'
      });
    }
  });
}