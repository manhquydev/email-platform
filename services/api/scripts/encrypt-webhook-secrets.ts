/**
 * One-time data migration: encrypt previously-plaintext webhook signing secrets at rest.
 *
 * Idempotent — encryptField() skips values already in encrypted form, so re-running is safe.
 * Run AFTER the encryption key (TOTP_ENCRYPTION_KEY) is finalized:
 *   tsx scripts/encrypt-webhook-secrets.ts
 *
 * Covers the three secret-bearing fields that were stored in plaintext:
 *   Webhook.secret, ForwardingRule.webhookSecret, HostingProvider.webhookSecret
 * (DomainDkim.privateKey, AuthenticatorAccount.secret and User.twoFactorSecret are already
 * encrypted via the shared util and are intentionally left alone.)
 */
import { PrismaClient } from "@prisma/client";
import { encryptField, isEncrypted } from "../src/utils/field-encryptor";

const prisma = new PrismaClient();

async function migrateWebhookSecrets(): Promise<void> {
  const rows = await prisma.webhook.findMany({ select: { id: true, secret: true } });
  let changed = 0;
  for (const row of rows) {
    if (row.secret && !isEncrypted(row.secret)) {
      await prisma.webhook.update({ where: { id: row.id }, data: { secret: encryptField(row.secret) } });
      changed++;
    }
  }
  console.log(`Webhook.secret: encrypted ${changed}/${rows.length}`);
}

async function migrateForwardingRuleSecrets(): Promise<void> {
  const rows = await prisma.forwardingRule.findMany({
    where: { webhookSecret: { not: null } },
    select: { id: true, webhookSecret: true },
  });
  let changed = 0;
  for (const row of rows) {
    if (row.webhookSecret && !isEncrypted(row.webhookSecret)) {
      await prisma.forwardingRule.update({ where: { id: row.id }, data: { webhookSecret: encryptField(row.webhookSecret) } });
      changed++;
    }
  }
  console.log(`ForwardingRule.webhookSecret: encrypted ${changed}/${rows.length}`);
}

async function migrateHostingProviderSecrets(): Promise<void> {
  const rows = await prisma.hostingProvider.findMany({
    where: { webhookSecret: { not: null } },
    select: { id: true, webhookSecret: true },
  });
  let changed = 0;
  for (const row of rows) {
    if (row.webhookSecret && !isEncrypted(row.webhookSecret)) {
      await prisma.hostingProvider.update({ where: { id: row.id }, data: { webhookSecret: encryptField(row.webhookSecret) } });
      changed++;
    }
  }
  console.log(`HostingProvider.webhookSecret: encrypted ${changed}/${rows.length}`);
}

async function main(): Promise<void> {
  if (!process.env.TOTP_ENCRYPTION_KEY) {
    throw new Error("TOTP_ENCRYPTION_KEY must be set before running this migration");
  }
  await migrateWebhookSecrets();
  await migrateForwardingRuleSecrets();
  await migrateHostingProviderSecrets();
  console.log("Webhook secret encryption migration complete.");
}

main()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
