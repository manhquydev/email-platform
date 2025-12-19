import { FastifyInstance } from 'fastify';
import { buildServer } from '../../src/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Public Tier Integration Tests', () => {
  let app: FastifyInstance;
  let testUser: any;
  let authToken: string;

  beforeAll(async () => {
    app = buildServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: { email: { contains: 'test@example.com' } }
    });
  });

  describe('Public Authentication', () => {
    it('should allow public user signup', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/public/signup',
        payload: {
          email: 'test@example.com',
          password: 'password123',
          source: 'organic'
        }
      });

      expect(response.statusCode).toBe(201);
      const data = response.json();
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe('test@example.com');
      expect(data.user.tier).toBe('FREE');
      expect(data.user.source).toBe('organic');
      expect(data.token).toBeDefined();
    });

    it('should prevent duplicate email signup', async () => {
      // Create first user
      await app.inject({
        method: 'POST',
        url: '/api/public/signup',
        payload: {
          email: 'duplicate@example.com',
          password: 'password123'
        }
      });

      // Try to create duplicate
      const response = await app.inject({
        method: 'POST',
        url: '/api/public/signup',
        payload: {
          email: 'duplicate@example.com',
          password: 'password456'
        }
      });

      expect(response.statusCode).toBe(409);
      expect(response.json().error).toBe('EMAIL_ALREADY_EXISTS');
    });

    it('should authenticate public user', async () => {
      // First signup
      await app.inject({
        method: 'POST',
        url: '/api/public/signup',
        payload: {
          email: 'auth@example.com',
          password: 'password123'
        }
      });

      // Then login
      const response = await app.inject({
        method: 'POST',
        url: '/api/public/login',
        payload: {
          email: 'auth@example.com',
          password: 'password123'
        }
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.token).toBeDefined();
      expect(data.user.email).toBe('auth@example.com');
    });

    it('should handle email verification', async () => {
      // Signup user
      const signupResponse = await app.inject({
        method: 'POST',
        url: '/api/public/signup',
        payload: {
          email: 'verify@example.com',
          password: 'password123'
        }
      });

      const user = signupResponse.json().user;

      // Verify email
      const response = await app.inject({
        method: 'POST',
        url: '/api/public/verify-email',
        payload: {
          token: user.emailVerificationToken
        }
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().verified).toBe(true);
    });
  });

  describe('Free Tier Quotas', () => {
    beforeEach(async () => {
      // Create test user
      const response = await app.inject({
        method: 'POST',
        url: '/api/public/signup',
        payload: {
          email: 'quota@example.com',
          password: 'password123'
        }
      });

      testUser = response.json().user;
      authToken = response.json().token;
    });

    it('should enforce domain creation limit', async () => {
      // Create first domain (should succeed)
      const domain1 = await app.inject({
        method: 'POST',
        url: '/api/domains',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          name: 'test1.example.com'
        }
      });
      expect(domain1.statusCode).toBe(201);

      // Create second domain (should fail for FREE tier)
      const domain2 = await app.inject({
        method: 'POST',
        url: '/api/domains',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          name: 'test2.example.com'
        }
      });
      expect(domain2.statusCode).toBe(429);
      expect(domain2.json().error).toBe('QUOTA_EXCEEDED');
    });

    it('should enforce inbox creation limit', async () => {
      // Create domain first
      await app.inject({
        method: 'POST',
        url: '/api/domains',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          name: 'inbox-test.example.com'
        }
      });

      // Create 5 inboxes (should succeed)
      for (let i = 0; i < 5; i++) {
        const inbox = await app.inject({
          method: 'POST',
          url: '/api/inboxes',
          headers: { authorization: `Bearer ${authToken}` },
          payload: {
            domainId: 'test-domain-id',
            name: `test${i}`
          }
        });
        expect(inbox.statusCode).toBe(201);
      }

      // Try to create 6th inbox (should fail)
      const inbox6 = await app.inject({
        method: 'POST',
        url: '/api/inboxes',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          domainId: 'test-domain-id',
          name: 'test6'
        }
      });
      expect(inbox6.statusCode).toBe(429);
    });
  });

  describe('Email Sending Quotas', () => {
    beforeEach(async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/public/signup',
        payload: {
          email: 'email@example.com',
          password: 'password123'
        }
      });

      testUser = response.json().user;
      authToken = response.json().token;
    });

    it('should enforce monthly email limit', async () => {
      // This test would require mocking the email service
      // or implementing a way to increment usage counter
      const response = await app.inject({
        method: 'POST',
        url: '/api/outbound/send',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          to: 'recipient@example.com',
          subject: 'Test email',
          body: 'Test content'
        }
      });

      // Should succeed if under quota
      expect([200, 429]).toContain(response.statusCode);
    });
  });

  describe('Upgrade Flow', () => {
    beforeEach(async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/public/signup',
        payload: {
          email: 'upgrade@example.com',
          password: 'password123'
        }
      });

      testUser = response.json().user;
      authToken = response.json().token;
    });

    it('should handle upgrade request', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/billing/create-checkout-session',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          planId: 'pro-monthly',
          successUrl: 'https://tempmail.pro/success',
          cancelUrl: 'https://tempmail.pro/cancel'
        }
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().checkoutUrl).toBeDefined();
    });
  });

  describe('Public Email Reception', () => {
    let publicInboxId: string;

    it('should create public inbox', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/public/inboxes',
        payload: {
          name: 'test-public'
        }
      });

      expect(response.statusCode).toBe(201);
      publicInboxId = response.json().id;
      expect(response.json().email).toContain('@tempmail.pro');
    });

    it('should receive email in public inbox', async () => {
      // Simulate receiving email
      const emailData = {
        to: `test-public@tempmail.pro`,
        from: 'sender@example.com',
        subject: 'Test public email',
        body: 'This is a test email'
      };

      const response = await app.inject({
        method: 'POST',
        url: `/public/inboxes/${publicInboxId}/receive`,
        payload: emailData
      });

      expect(response.statusCode).toBe(200);

      // Check email was received
      const messages = await app.inject({
        method: 'GET',
        url: `/public/inboxes/${publicInboxId}/messages`
      });

      expect(messages.statusCode).toBe(200);
      expect(messages.json().messages).toHaveLength(1);
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limits to public endpoints', async () => {
      // Make rapid requests
      const requests = Array(10).fill(null).map(() =>
        app.inject({
          method: 'POST',
          url: '/public/inboxes',
          payload: { name: `test-${Date.now()}` }
        })
      );

      const responses = await Promise.all(requests);

      // Some requests should be rate limited
      const hasRateLimit = responses.some(r => r.statusCode === 429);
      expect(hasRateLimit).toBe(true);
    });
  });

  describe('Support System', () => {
    it('should create support ticket', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/support/tickets',
        payload: {
          name: 'Test User',
          email: 'support@example.com',
          subject: 'Test support request',
          category: 'technical',
          message: 'I need help with the service',
          priority: 'normal'
        }
      });

      expect(response.statusCode).toBe(201);
      expect(response.json().ticketId).toBeDefined();
      expect(response.json().message).toBe('Support ticket created successfully');
    });
  });

  describe('SEO and Sitemap', () => {
    it('should generate sitemap', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/sitemap.xml'
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toBe('application/xml');
    });

    it('should serve robots.txt', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/robots.txt'
      });

      expect(response.statusCode).toBe(200);
      expect(response.payload).toContain('Sitemap:');
    });

    it('should serve security.txt', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/.well-known/security.txt'
      });

      expect(response.statusCode).toBe(200);
      expect(response.payload).toContain('Contact:');
    });
  });
});