import { promises as fs } from "fs";
import { startHttpServer } from "./server";
import { startSmtpServer } from "./smtp";
import { startSubmissionServer } from "./smtp/submission-server";
import { setupEmailWorker } from "./worker";
import { setupWebhookWorker } from "./webhookWorker";
import { setupOutboundWorker } from "./services/outbound-delivery";
import { setupOutboundEmailWorker } from "./workers/outbound-email";
import { prisma } from "./lib/prisma";
import { appConfig } from "./config";
import { hashPassword } from "./utils/password";
import { runRetentionSweep } from "./retention";
import { runDomainVerificationSweep } from "./services/domain-verification.service";
import cron from "node-cron";
import { runAutomatedCleanup } from "./utils/cleanup";
import { syncPostfixRelayDomains } from "./utils/postfix-sync";
import { startNotificationScheduler } from "./jobs/notification-scheduler-cron";

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
  const submissionSmtp = startSubmissionServer(app.log, appConfig.smtpPort + 335); // Port 587 usually, defaulting to 2525+335=2860 if not set

  const worker = setupEmailWorker(app.log);
  const webhookWorker = setupWebhookWorker(app.log);
  const outboundWorker = setupOutboundWorker(); // Initialize outbound worker for graceful shutdown
  const outboundEmailWorker = setupOutboundEmailWorker(app.log); // Async outbound email queue worker

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

  // Periodic domain verification sweep (every 15 minutes)
  const domainVerificationInterval = setInterval(() => {
    runDomainVerificationSweep(app.log);
  }, 15 * 60 * 1000);

  // Daily deep cleanup at 3:00 AM
  const cleanupJob = cron.schedule("0 3 * * *", () => {
    runAutomatedCleanup().catch(err => app.log.error({ err }, "Daily cleanup failed"));
  });

  // Start notification scheduler for scheduled notifications
  startNotificationScheduler();
  app.log.info("Notification scheduler started");

  const close = async () => {
    app.log.info("Graceful shutdown initiated...");

    // 1. Stop accepting new requests
    app.log.info("Stopping HTTP server...");
    await app.close();

    // 2. Stop scheduled tasks
    app.log.info("Stopping scheduled tasks...");
    clearInterval(retentionInterval);
    clearInterval(domainVerificationInterval);
    cleanupJob.stop();

    // 3. Stop SMTP server
    app.log.info("Stopping SMTP server...");
    smtp.close();
    submissionSmtp.close();

    // 4. Wait for workers to finish active jobs
    app.log.info("Waiting for workers to complete...");
    await Promise.all([
      worker.close(),
      webhookWorker.close(),
      outboundWorker.close(),
      outboundEmailWorker.close(),
    ]);

    // 5. Disconnect database
    app.log.info("Disconnecting database...");
    await prisma.$disconnect();

    app.log.info("Graceful shutdown complete.");
    process.exit(0);
  };

  // Handle termination signals
  let isShuttingDown = false;
  const handleSignal = (signal: string) => {
    if (isShuttingDown) {
      app.log.warn(`Received ${signal} during shutdown, forcing exit...`);
      process.exit(1);
    }
    isShuttingDown = true;
    app.log.info(`Received ${signal}, starting graceful shutdown...`);
    close().catch(err => {
      app.log.error({ err }, "Error during shutdown");
      process.exit(1);
    });
  };

  process.on("SIGINT", () => handleSignal("SIGINT"));
  process.on("SIGTERM", () => handleSignal("SIGTERM"));
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
