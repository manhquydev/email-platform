import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { app, prisma } from "./setup";
import { HostingProviderService } from "../services/hosting-provider.service";
import { ProviderWebhookService } from "../services/provider-webhook.service";
import crypto from "crypto";

vi.mock("../utils/dns", () => ({
    verifyDomainOwnership: vi.fn(async () => true),
}));

// Helper to clean up provider tables
async function cleanupProviderData() {
    // Delete in order of dependencies
    await prisma.providerWebhookEvent.deleteMany();
    await prisma.providerTenantDomain.deleteMany();
    // Inboxes and Domains are deleted by setup.ts, but we might need to delete them explicitly if we run logic that depends on them being gone
    // or if setup.ts runs before/after differently.

    await prisma.providerTenant.deleteMany();
    await prisma.hostingProvider.deleteMany();

    // Clean organizations created by tests (names starting with 'Test Customer')
    await prisma.organization.deleteMany({
        where: { slug: { startsWith: 'provider-' } }
    });
}

describe("Hosting Provider Service & API", () => {

    beforeEach(async () => {
        await cleanupProviderData();
    });

    afterAll(async () => {
        await cleanupProviderData();
    });

    describe("Service: HostingProviderService", () => {
        it("should register a new provider and generate API key", async () => {
            const result = await HostingProviderService.registerProvider({
                name: "Test Provider",
                contactEmail: "contact@test.com",
                tier: "STARTER"
            });

            expect(result.provider).toBeDefined();
            expect(result.provider.name).toBe("Test Provider");
            expect(result.apiKey).toBeDefined();
            expect(result.apiKey).toMatch(/^eph_provider_[a-f0-9]+$/);

            // Verify hashing
            const provider = await prisma.hostingProvider.findUnique({ where: { id: result.provider.id } });
            expect(provider).toBeDefined();
            expect(provider?.apiKeyHash).not.toBe(result.apiKey);
        });

        it("should regenerate API key", async () => {
            const { provider } = await HostingProviderService.registerProvider({
                name: "Test Provider 2",
                contactEmail: "contact2@test.com"
            });

            const newKeyResult = await HostingProviderService.regenerateApiKey(provider.id);
            expect(newKeyResult.apiKey).toBeDefined();
            expect(newKeyResult.apiKey).toMatch(/^eph_provider_/);

            const updatedProvider = await prisma.hostingProvider.findUnique({ where: { id: provider.id } });
            expect(updatedProvider?.apiKeyHash).toBeDefined();
        });

        it("should create a tenant", async () => {
            const { provider } = await HostingProviderService.registerProvider({
                name: "Test Provider 3",
                contactEmail: "contact3@test.com"
            });

            const tenant = await HostingProviderService.createTenant(provider.id, {
                externalId: "ext-123",
                customerEmail: "customer@example.com",
                customerName: "Test Customer",
                plan: "LITE"
            });

            expect(tenant).toBeDefined();
            expect(tenant.providerId).toBe(provider.id);
            expect(tenant.externalId).toBe("ext-123");
            expect(tenant.organizationId).toBeDefined();

            // Verify limits applied from plan
            expect(tenant.maxMailboxes).toBe(5); // LITE plan
        });
    });

    describe("Integration: Provider API Routes", () => {
        let providerId: string;
        let apiKey: string;

        beforeEach(async () => {
            // Create a fresh provider for each test to ensure clean state
            const result = await HostingProviderService.registerProvider({
                name: "API Test Provider",
                contactEmail: "api@test.com",
                webhookUrl: "https://example.com/webhook"
            });
            providerId = result.provider.id;
            apiKey = result.apiKey;
        });

        it("should authenticate with valid X-Provider-Key", async () => {
            const res = await app.inject({
                method: "GET",
                url: "/v1/provider/me",
                headers: { "X-Provider-Key": apiKey }
            });

            expect(res.statusCode).toBe(200);
            const body = res.json();
            expect(body.provider.id).toBe(providerId);
        });

        it("should reject invalid X-Provider-Key", async () => {
            const res = await app.inject({
                method: "GET",
                url: "/v1/provider/me",
                headers: { "X-Provider-Key": "invalid_key" }
            });

            expect(res.statusCode).toBe(401);
        });

        it("should create and list tenants", async () => {
            // Create Tenant
            const createRes = await app.inject({
                method: "POST",
                url: "/v1/provider/tenants",
                headers: { "X-Provider-Key": apiKey },
                payload: {
                    externalId: "client-1",
                    customerEmail: "client1@example.com",
                    plan: "PRO"
                }
            });

            expect(createRes.statusCode).toBe(201);
            const tenant = createRes.json().tenant;
            expect(tenant.externalId).toBe("client-1");

            // List Tenants
            const listRes = await app.inject({
                method: "GET",
                url: "/v1/provider/tenants",
                headers: { "X-Provider-Key": apiKey }
            });

            expect(listRes.statusCode).toBe(200);
            const list = listRes.json();
            expect(list.tenants).toHaveLength(1);
            expect(list.tenants[0].id).toBe(tenant.id);
        });

        it("should manage domains for a tenant", async () => {
            // Create Tenant
            const tenantRes = await app.inject({
                method: "POST",
                url: "/v1/provider/tenants",
                headers: { "X-Provider-Key": apiKey },
                payload: {
                    externalId: "client-domain",
                    customerEmail: "domain@example.com",
                    plan: "LITE"
                }
            });
            const tenantId = tenantRes.json().tenant.id;

            // Add Domain
            const domainName = "test-domain.com";
            const addDomainRes = await app.inject({
                method: "POST",
                url: `/v1/provider/tenants/${tenantId}/domains`,
                headers: { "X-Provider-Key": apiKey },
                payload: { domain: domainName }
            });

            expect(addDomainRes.statusCode).toBe(201);
            expect(addDomainRes.json().dnsRecords).toBeDefined();

            // Verify Domain (Simulate)
            const verifyRes = await app.inject({
                method: "POST",
                url: `/v1/provider/tenants/${tenantId}/domains/${domainName}/verify`,
                headers: { "X-Provider-Key": apiKey }
            });

            expect(verifyRes.statusCode).toBe(200);
            expect(verifyRes.json().verified).toBe(true);
        });

        it("should manage mailboxes", async () => {
            // Setup Tenant & Domain
            const tenantRes = await app.inject({
                method: "POST",
                url: "/v1/provider/tenants",
                headers: { "X-Provider-Key": apiKey },
                payload: { externalId: "mb-client", customerEmail: "mb@test.com", plan: "PRO" }
            });
            const tenantId = tenantRes.json().tenant.id;

            const domainName = "mailbox-test.com";
            await app.inject({
                method: "POST",
                url: `/v1/provider/tenants/${tenantId}/domains`,
                headers: { "X-Provider-Key": apiKey },
                payload: { domain: domainName }
            });
            // Force verify
            await HostingProviderService.verifyDomain(providerId, tenantId, domainName);

            // Create Mailbox
            const mbRes = await app.inject({
                method: "POST",
                url: `/v1/provider/tenants/${tenantId}/mailboxes`,
                headers: { "X-Provider-Key": apiKey },
                payload: {
                    localPart: "user",
                    domain: domainName,
                    password: "securePassword123!",
                    displayName: "Test User"
                }
            });

            expect(mbRes.statusCode).toBe(201);
            expect(mbRes.json().mailbox.email).toBe(`user@${domainName}`);

            // List Mailboxes
            const listRes = await app.inject({
                method: "GET",
                url: `/v1/provider/tenants/${tenantId}/mailboxes`,
                headers: { "X-Provider-Key": apiKey }
            });

            expect(listRes.statusCode).toBe(200);
            const listed = listRes.json().mailboxes as Array<{ email: string }>;
            expect(listed.length).toBeGreaterThanOrEqual(1);
            expect(listed.some((m) => m.email === `user@${domainName}`)).toBe(true);
        });

        it("should handle webhook testing", async () => {
             const testRes = await app.inject({
                method: "POST",
                url: "/v1/provider/webhooks/test",
                headers: { "X-Provider-Key": apiKey }
            });

            expect(testRes.statusCode).toBe(200);
            expect(testRes.json().sent).toBe(true);

            // Check events list
            const eventsRes = await app.inject({
                method: "GET",
                url: "/v1/provider/webhooks/events",
                headers: { "X-Provider-Key": apiKey }
            });

            expect(eventsRes.statusCode).toBe(200);
            expect(eventsRes.json().events.length).toBeGreaterThan(0);
        });
    });
});
