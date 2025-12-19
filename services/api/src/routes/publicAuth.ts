import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { PublicAuthService } from '../services/publicAuthService';
import { verifyRecaptcha } from '../utils/recaptcha';

const publicAuthService = new PublicAuthService();

export default async function publicAuthRoutes(fastify: FastifyInstance) {
  // Public signup endpoint
  fastify.post('/public/auth/signup', {
    schema: {
      body: z.object({
        email: z.string().email(),
        password: z.string().min(8),
        source: z.string().optional(),
        referralCode: z.string().optional(),
        recaptchaToken: z.string().optional()
      })
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as any;

      // Verify reCAPTCHA if enabled
      if (process.env.RECAPTCHA_SECRET_KEY && body.recaptchaToken) {
        const isValid = await verifyRecaptcha(body.recaptchaToken);
        if (!isValid) {
          return reply.status(400).send({
            error: 'INVALID_CAPTCHA',
            message: 'reCAPTCHA verification failed'
          });
        }
      }

      const result = await publicAuthService.signup({
        email: body.email,
        password: body.password,
        source: body.source,
        referralCode: body.referralCode
      });

      reply.send(result);
    } catch (error: any) {
      if (error.message === 'USER_ALREADY_EXISTS') {
        return reply.status(409).send({
          error: 'USER_ALREADY_EXISTS',
          message: 'An account with this email already exists'
        });
      }

      fastify.log.error(error);
      reply.status(500).send({
        error: 'SIGNUP_FAILED',
        message: 'Failed to create account'
      });
    }
  });

  // Public login endpoint
  fastify.post('/public/auth/login', {
    schema: {
      body: z.object({
        email: z.string().email(),
        password: z.string()
      })
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as any;
      const result = await publicAuthService.login(body.email, body.password);

      reply.send(result);
    } catch (error: any) {
      if (error.message === 'INVALID_CREDENTIALS') {
        return reply.status(401).send({
          error: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        });
      }

      if (error.message === 'ACCOUNT_DISABLED') {
        return reply.status(403).send({
          error: 'ACCOUNT_DISABLED',
          message: 'Account has been disabled'
        });
      }

      fastify.log.error(error);
      reply.status(500).send({
        error: 'LOGIN_FAILED',
        message: 'Failed to login'
      });
    }
  });

  // Email verification endpoint
  fastify.post('/public/auth/verify', {
    schema: {
      body: z.object({
        token: z.string()
      })
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as any;
      const result = await publicAuthService.verifyEmail(body.token);

      reply.send(result);
    } catch (error: any) {
      if (error.message === 'INVALID_VERIFICATION_TOKEN') {
        return reply.status(400).send({
          error: 'INVALID_VERIFICATION_TOKEN',
          message: 'Verification token is invalid or expired'
        });
      }

      fastify.log.error(error);
      reply.status(500).send({
        error: 'VERIFICATION_FAILED',
        message: 'Failed to verify email'
      });
    }
  });

  // Request password reset
  fastify.post('/public/auth/request-reset', {
    schema: {
      body: z.object({
        email: z.string().email()
      })
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as any;
      const result = await publicAuthService.requestPasswordReset(body.email);

      reply.send(result);
    } catch (error: any) {
      fastify.log.error(error);
      reply.status(500).send({
        error: 'RESET_REQUEST_FAILED',
        message: 'Failed to request password reset'
      });
    }
  });

  // Reset password
  fastify.post('/public/auth/reset-password', {
    schema: {
      body: z.object({
        token: z.string(),
        password: z.string().min(8)
      })
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as any;
      const result = await publicAuthService.resetPassword(body.token, body.password);

      reply.send(result);
    } catch (error: any) {
      if (error.message === 'INVALID_RESET_TOKEN') {
        return reply.status(400).send({
          error: 'INVALID_RESET_TOKEN',
          message: 'Reset token is invalid or expired'
        });
      }

      fastify.log.error(error);
      reply.status(500).send({
        error: 'RESET_FAILED',
        message: 'Failed to reset password'
      });
    }
  });

  // Generate referral code (protected)
  fastify.post('/public/auth/referral', {
    preHandler: [fastify.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.userId;
      const result = await publicAuthService.generateReferralCode(userId);

      reply.send(result);
    } catch (error: any) {
      if (error.message === 'USER_NOT_FOUND') {
        return reply.status(404).send({
          error: 'USER_NOT_FOUND',
          message: 'User not found'
        });
      }

      fastify.log.error(error);
      reply.status(500).send({
        error: 'REFERRAL_FAILED',
        message: 'Failed to generate referral code'
      });
    }
  });

  // Upgrade tier (protected)
  fastify.post('/public/auth/upgrade', {
    preHandler: [fastify.authenticate],
    schema: {
      body: z.object({
        tier: z.enum(['premium', 'business'])
      })
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.userId;
      const body = request.body as any;
      const result = await publicAuthService.upgradeTier(userId, body.tier);

      reply.send(result);
    } catch (error: any) {
      if (error.message === 'USER_NOT_FOUND') {
        return reply.status(404).send({
          error: 'USER_NOT_FOUND',
          message: 'User not found'
        });
      }

      fastify.log.error(error);
      reply.status(500).send({
        error: 'UPGRADE_FAILED',
        message: 'Failed to upgrade tier'
      });
    }
  });

  // Get current user info (protected)
  fastify.get('/public/auth/me', {
    preHandler: [fastify.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.userId;

      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
        include: {
          userQuota: true,
          usageTrackers: {
            where: {
              metric: 'emails_received',
              period: 'monthly'
            },
            orderBy: {
              periodStart: 'desc'
            },
            take: 1
          }
        },
        select: {
          id: true,
          email: true,
          tier: true,
          emailVerified: true,
          createdAt: true,
          userQuota: true,
          usageTrackers: true
        }
      });

      if (!user) {
        return reply.status(404).send({
          error: 'USER_NOT_FOUND',
          message: 'User not found'
        });
      }

      reply.send({
        user: {
          ...user,
          currentUsage: user.usageTrackers[0]?.value || 0
        }
      });
    } catch (error: any) {
      fastify.log.error(error);
      reply.status(500).send({
        error: 'FETCH_FAILED',
        message: 'Failed to fetch user info'
      });
    }
  });
}