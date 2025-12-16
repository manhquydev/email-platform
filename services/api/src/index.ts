import { promises as fs } from "fs";
import { startHttpServer } from "./server";
import { startSmtpServer } from "./smtp";
import { setupEmailWorker } from "./worker";
import { prisma } from "./lib/prisma";
import { appConfig } from "./config";
import { hashPassword } from "./utils/password";
import { runRetentionSweep } from "./retention";

const ensureStorageDir = async () => {
  await fs.mkdir(appConfig.storageDir, { recursive: true });
};

const ensureAdminUser = async (log: any) => {
  const count = await prisma.user.count();
  if (count > 0) return;

  const passwordHash = await hashPassword(appConfig.defaultAdminPassword);
  await prisma.user.create({
    data: {
      email: appConfig.defaultAdminEmail,
      passwordHash,
      role: "ADMIN",
      emailVerified: new Date(), // Admin is auto-verified
    },
  });
  log.info(
    {
      email: appConfig.defaultAdminEmail,
    },
    "created default admin user",
  );
};

const main = async () => {
  await ensureStorageDir();
  const app = await startHttpServer();
  await ensureAdminUser(app.log);
  const smtp = startSmtpServer(app.log);
  const worker = setupEmailWorker(app.log);

  // periodic retention sweep
  const retentionInterval = setInterval(() => {
    runRetentionSweep(app.log);
  }, appConfig.retentionSweepMinutes * 60 * 1000);

  const close = async () => {
    app.log.info("shutting down...");
    clearInterval(retentionInterval);
    await app.close();
    smtp.close();
    await worker.close();
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
