import { promises as fs } from "fs";
import { startHttpServer } from "./server";
import { startSmtpServer } from "./smtp";
import { setupEmailWorker } from "./worker";
import { setupWebhookWorker } from "./webhookWorker";
import { prisma } from "./lib/prisma";
import { appConfig } from "./config";
import { hashPassword } from "./utils/password";
import { runRetentionSweep } from "./retention";
import cron from "node-cron";
import { runAutomatedCleanup } from "./utils/cleanup";
import { syncPostfixRelayDomains } from "./utils/postfix-sync";

const ensureStorageDir = async () => {
  await fs.mkdir(appConfig.storageDir, { recursive: true });
};

const ensureAdminUser = async (log: any) => {
  const adminEmail = appConfig.defaultAdminEmail;

  try {
    // Check if admin user already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (existingAdmin) {
      // Admin exists - update password if needed (useful when password is reset via env)
      const passwordHash = await hashPassword(appConfig.defaultAdminPassword);
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: {
          passwordHash,
          role: "ADMIN",
          emailVerified: existingAdmin.emailVerified ?? new Date(),
        },
      });
      log.info({ email: adminEmail }, "admin user password updated from env");
      return;
    }

    // Create new admin user
    const passwordHash = await hashPassword(appConfig.defaultAdminPassword);
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        role: "ADMIN",
        emailVerified: new Date(), // Admin is auto-verified
      },
    });
    log.info(
      {
        email: adminEmail,
      },
      "created default admin user",
    );
  } catch (err: any) {
    log.error({ err, adminEmail }, "failed to ensure admin user");
    throw err;
  }
};

const main = async () => {
  await ensureStorageDir();
  const app = await startHttpServer();
  await ensureAdminUser(app.log);
  const smtp = startSmtpServer(app.log);
  const worker = setupEmailWorker(app.log);
  const webhookWorker = setupWebhookWorker(app.log);

  // Verify outbound email connection on startup
  const { outboundService } = await import("./services/outbound");
  outboundService.verifyConnection().catch(err => {
    app.log.error({ err }, "Initial SMTP verification failed");
  });

  // Sync verified domains to Postfix on startup
  syncPostfixRelayDomains()
    .then(result => {
      if (result.success && result.domains.length > 0) {
        app.log.info({ domains: result.domains.length, method: result.method }, "Postfix relay domains synced on startup");
      }
    })
    .catch(err => {
      app.log.error({ err }, "Postfix sync failed on startup");
    });

  // periodic retention sweep
  const retentionInterval = setInterval(() => {
    runRetentionSweep(app.log);
  }, appConfig.retentionSweepMinutes * 60 * 1000);

  // Daily deep cleanup at 3:00 AM
  const cleanupJob = cron.schedule("0 3 * * *", () => {
    runAutomatedCleanup().catch(err => app.log.error({ err }, "Daily cleanup failed"));
  });

  const close = async () => {
    app.log.info("shutting down...");
    clearInterval(retentionInterval);
    await app.close();
    smtp.close();
    cleanupJob.stop();
    await worker.close();
    await webhookWorker.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGINT", close);
  process.on("SIGTERM", close);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
