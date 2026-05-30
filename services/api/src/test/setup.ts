// Use CI DATABASE_URL if set, otherwise fallback to local dev port (5434 as defined in docker-compose.test.yml)
const TEST_DB_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5434/email_service_test";
process.env.DATABASE_URL = TEST_DB_URL;
process.env.JWT_SECRET = "test-secret";
process.env.OUTBOUND_ENABLED = "true";
process.env.TELEGRAM_BOT_TOKEN = "test-bot-token";
process.env.TELEGRAM_BOT_USERNAME = "TestBot";
process.env.STORAGE_DIR = "./storage_test";
process.env.DEFAULT_ADMIN_EMAIL = "admin@example.com";
process.env.DEFAULT_ADMIN_PASSWORD = "changeme";
// Add dummy Stripe keys for tests
process.env.STRIPE_API_KEY = process.env.STRIPE_API_KEY || "sk_test_dummy_key_for_testing_only";
process.env.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "whsec_test_dummy_secret";

import { beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { buildServer } from "../server";
import { FastifyInstance } from "fastify";
import { execSync } from "node:child_process";
import path from "node:path";

export const prisma = new PrismaClient({
    datasources: { db: { url: TEST_DB_URL } },
});

export let app: FastifyInstance;
let migrationsApplied = false;

function applyTestDbMigrationsOnce() {
    if (migrationsApplied) return;
    if (process.env.SKIP_TEST_MIGRATIONS === "true") return;

    const apiRoot = path.resolve(__dirname, "../..");

    try {
        execSync("npx prisma migrate deploy", {
            cwd: apiRoot,
            env: { ...process.env, DATABASE_URL: TEST_DB_URL },
            stdio: "pipe",
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const stderr = typeof error === "object" && error && "stderr" in error
            ? String((error as { stderr?: Buffer | string }).stderr ?? "")
            : "";
        const fullMessage = `${message}\n${stderr}`;

        if (!fullMessage.includes("P3005") && !fullMessage.includes("P3015")) {
            throw error;
        }

        // Existing test DB is not suitable for migrate deploy (baselined or broken migration files):
        // sync schema directly for test environment.
        execSync("npx prisma db push --force-reset --accept-data-loss --skip-generate", {
            cwd: apiRoot,
            env: { ...process.env, DATABASE_URL: TEST_DB_URL },
            stdio: "pipe",
        });
    }

    migrationsApplied = true;
}

beforeAll(async () => {
    applyTestDbMigrationsOnce();

    // Override process env for the app
    process.env.DATABASE_URL = TEST_DB_URL;
    process.env.JWT_SECRET = "test-secret";

    app = buildServer();
    await app.ready();
});

afterAll(async () => {
    await prisma.$disconnect();
    if (app) {
        await app.close();
    }
});

beforeEach(async () => {
    // Clear data between tests
    // We use $transaction to ensure order if foreign keys exist, or just delete from tables
    // Order matters: delete child "Message" before "Inbox", "Inbox" before "Domain"
    await prisma.$transaction([
        prisma.passkeyCredential.deleteMany(),
        prisma.magicLinkToken.deleteMany(),
        prisma.abuseReport.deleteMany(),
        prisma.webhookLog.deleteMany(),
        prisma.webhook.deleteMany(),
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
