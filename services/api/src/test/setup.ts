import { beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { buildServer } from "../server";
import { FastifyInstance } from "fastify";

// Use port 5433 as defined in docker-compose.test.yml
const TEST_DB_URL = "postgresql://postgres:postgres@localhost:5434/email_service_test";
process.env.DATABASE_URL = TEST_DB_URL;
process.env.JWT_SECRET = "test-secret";

export const prisma = new PrismaClient({
    datasources: { db: { url: TEST_DB_URL } },
});

export let app: FastifyInstance;

beforeAll(async () => {
    // Override process env for the app
    process.env.DATABASE_URL = TEST_DB_URL;
    process.env.JWT_SECRET = "test-secret";

    app = buildServer();
    await app.ready();
});

afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
});

beforeEach(async () => {
    // Clear data between tests
    // We use $transaction to ensure order if foreign keys exist, or just delete from tables
    // Order matters: delete child "Message" before "Inbox", "Inbox" before "Domain"
    await prisma.$transaction([
        prisma.passkeyCredential.deleteMany(),
        prisma.magicLinkToken.deleteMany(),
        prisma.abuseReport.deleteMany(),
        prisma.message.deleteMany(),
        prisma.inbox.deleteMany(),
        prisma.domain.deleteMany(),
        prisma.rule.deleteMany(),
        prisma.telegramLinkToken.deleteMany(),
        prisma.codeRedemption.deleteMany(),
        prisma.redemptionCode.deleteMany(),
        prisma.servicePackage.deleteMany(),
        prisma.user.deleteMany(),
    ]);
});
