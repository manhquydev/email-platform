import { describe, it, expect, beforeEach } from 'vitest';
import { app, prisma } from './setup';
import { hashPassword } from '../utils/password';

describe('Domain Endpoints', () => {
    let userToken: string;
    let userId: string;
    let adminToken: string;
    let adminId: string;

    beforeEach(async () => {
        // Create a regular test user
        const passwordHash = await hashPassword('password123');
        const user = await prisma.user.create({
            data: {
                email: `test-${Math.random()}@example.com`,
                passwordHash,
                emailVerified: new Date(),
                role: 'USER',
            }
        });
        userId = user.id;

        const loginRes = await app.inject({
            method: 'POST',
            url: '/auth/login',
            payload: { email: user.email, password: 'password123' }
        });
        userToken = loginRes.json().token;

        // Create an admin user
        const adminPasswordHash = await hashPassword('admin123');
        const admin = await prisma.user.create({
            data: {
                email: `admin-${Math.random()}@example.com`,
                passwordHash: adminPasswordHash,
                emailVerified: new Date(),
                role: 'ADMIN',
            }
        });
        adminId = admin.id;

        const adminLoginRes = await app.inject({
            method: 'POST',
            url: '/auth/login',
            payload: { email: admin.email, password: 'admin123' }
        });
        adminToken = adminLoginRes.json().token;
    });

    describe('GET /domains/:id', () => {
        it('should get own domain by ID', async () => {
            // Create a domain
            const createRes = await app.inject({
                method: 'POST',
                url: '/domains',
                headers: { Authorization: `Bearer ${userToken}` },
                payload: { name: `test-${Math.random()}.example.com` }
            });
            expect(createRes.statusCode).toBe(201);
            const { domain } = createRes.json();

            // Get domain by ID
            const getRes = await app.inject({
                method: 'GET',
                url: `/domains/${domain.id}`,
                headers: { Authorization: `Bearer ${userToken}` }
            });
            expect(getRes.statusCode).toBe(200);
            expect(getRes.json().domain.id).toBe(domain.id);
            expect(getRes.json().domain.name).toBe(domain.name);
        });

        it('should return 404 for non-existent domain', async () => {
            const getRes = await app.inject({
                method: 'GET',
                url: '/domains/00000000-0000-0000-0000-000000000000',
                headers: { Authorization: `Bearer ${userToken}` }
            });
            expect(getRes.statusCode).toBe(404);
            expect(getRes.json().error).toBe('Domain not found');
        });

        it('should return 400 for invalid UUID', async () => {
            const getRes = await app.inject({
                method: 'GET',
                url: '/domains/invalid-uuid',
                headers: { Authorization: `Bearer ${userToken}` }
            });
            expect(getRes.statusCode).toBe(400);
            expect(getRes.json().error).toBe('Invalid ID');
        });

        it('should allow access to public domain', async () => {
            // Admin creates a public domain
            const createRes = await app.inject({
                method: 'POST',
                url: '/domains',
                headers: { Authorization: `Bearer ${adminToken}` },
                payload: { name: `public-${Math.random()}.example.com` }
            });
            expect(createRes.statusCode).toBe(201);
            const { domain } = createRes.json();

            // Regular user can access public domain
            const getRes = await app.inject({
                method: 'GET',
                url: `/domains/${domain.id}`,
                headers: { Authorization: `Bearer ${userToken}` }
            });
            expect(getRes.statusCode).toBe(200);
            expect(getRes.json().domain.isPublic).toBe(true);
        });

        it('should deny access to private domain of another user', async () => {
            // Create another user
            const otherPasswordHash = await hashPassword('other123');
            const otherUser = await prisma.user.create({
                data: {
                    email: `other-${Math.random()}@example.com`,
                    passwordHash: otherPasswordHash,
                    emailVerified: new Date(),
                    role: 'USER',
                }
            });

            const otherLoginRes = await app.inject({
                method: 'POST',
                url: '/auth/login',
                payload: { email: otherUser.email, password: 'other123' }
            });
            const otherToken = otherLoginRes.json().token;

            // Other user creates a domain
            const createRes = await app.inject({
                method: 'POST',
                url: '/domains',
                headers: { Authorization: `Bearer ${otherToken}` },
                payload: { name: `private-${Math.random()}.example.com` }
            });
            expect(createRes.statusCode).toBe(201);
            const { domain } = createRes.json();

            // Regular user cannot access private domain of another user
            const getRes = await app.inject({
                method: 'GET',
                url: `/domains/${domain.id}`,
                headers: { Authorization: `Bearer ${userToken}` }
            });
            expect(getRes.statusCode).toBe(403);
            expect(getRes.json().error).toBe('Not authorized to view this domain');
        });

        it('should allow admin to access any domain', async () => {
            // Create a private domain
            const createRes = await app.inject({
                method: 'POST',
                url: '/domains',
                headers: { Authorization: `Bearer ${userToken}` },
                payload: { name: `user-private-${Math.random()}.example.com` }
            });
            expect(createRes.statusCode).toBe(201);
            const { domain } = createRes.json();

            // Admin can access private domain
            const getRes = await app.inject({
                method: 'GET',
                url: `/domains/${domain.id}`,
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            expect(getRes.statusCode).toBe(200);
            expect(getRes.json().domain.id).toBe(domain.id);
        });
    });

    describe('GET /domains/:id/dns-check', () => {
        it('should check DNS for own domain', async () => {
            // Create a domain
            const createRes = await app.inject({
                method: 'POST',
                url: '/domains',
                headers: { Authorization: `Bearer ${userToken}` },
                payload: { name: `dns-test-${Math.random()}.example.com` }
            });
            expect(createRes.statusCode).toBe(201);
            const { domain } = createRes.json();

            // Check DNS
            const dnsRes = await app.inject({
                method: 'GET',
                url: `/domains/${domain.id}/dns-check`,
                headers: { Authorization: `Bearer ${userToken}` }
            });
            expect(dnsRes.statusCode).toBe(200);
            const result = dnsRes.json();
            expect(result.domain).toBe(domain.name);
            expect(result.verificationToken).toBe(domain.verificationToken);
            expect(result.dns).toBeDefined();
            expect(result.dns.txt).toBeDefined();
            expect(result.dns.mx).toBeDefined();
            expect(result.dns.hasVerificationRecord).toBe(false); // Not verified yet
            expect(result.dns.expectedRecord).toContain(domain.verificationToken);
        });

        it('should return 404 for non-existent domain', async () => {
            const dnsRes = await app.inject({
                method: 'GET',
                url: '/domains/00000000-0000-0000-0000-000000000000/dns-check',
                headers: { Authorization: `Bearer ${userToken}` }
            });
            expect(dnsRes.statusCode).toBe(404);
        });

        it('should deny DNS check for domain of another user', async () => {
            // Create another user
            const otherPasswordHash = await hashPassword('other123');
            const otherUser = await prisma.user.create({
                data: {
                    email: `other2-${Math.random()}@example.com`,
                    passwordHash: otherPasswordHash,
                    emailVerified: new Date(),
                    role: 'USER',
                }
            });

            const otherLoginRes = await app.inject({
                method: 'POST',
                url: '/auth/login',
                payload: { email: otherUser.email, password: 'other123' }
            });
            const otherToken = otherLoginRes.json().token;

            // Other user creates a domain
            const createRes = await app.inject({
                method: 'POST',
                url: '/domains',
                headers: { Authorization: `Bearer ${otherToken}` },
                payload: { name: `other-dns-${Math.random()}.example.com` }
            });
            const { domain } = createRes.json();

            // Regular user cannot check DNS of another user's domain
            const dnsRes = await app.inject({
                method: 'GET',
                url: `/domains/${domain.id}/dns-check`,
                headers: { Authorization: `Bearer ${userToken}` }
            });
            expect(dnsRes.statusCode).toBe(403);
        });

        it('should allow admin to check DNS for any domain', async () => {
            // Create a domain
            const createRes = await app.inject({
                method: 'POST',
                url: '/domains',
                headers: { Authorization: `Bearer ${userToken}` },
                payload: { name: `admin-dns-${Math.random()}.example.com` }
            });
            const { domain } = createRes.json();

            // Admin can check DNS
            const dnsRes = await app.inject({
                method: 'GET',
                url: `/domains/${domain.id}/dns-check`,
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            expect(dnsRes.statusCode).toBe(200);
        });
    });
});
