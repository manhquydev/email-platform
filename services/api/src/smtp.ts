import { SMTPServer, SMTPServerSession } from "smtp-server";
import { promises as fs } from "fs";
import path from "path";
import { appConfig } from "./config";
import { emailQueue } from "./queue/emailQueue";
import { generateToken } from "./utils/token";
import { prisma } from "./lib/prisma";

type Logger = {
  info: (obj: Record<string, unknown> | string, msg?: string) => void;
  warn: (obj: Record<string, unknown> | string, msg?: string) => void;
  error: (obj: Record<string, unknown> | string, msg?: string) => void;
};

const ensureRawStorageDir = async () => {
  const dir = path.join(appConfig.storageDir, "raw");
  await fs.mkdir(dir, { recursive: true });
  return dir;
};

export const startSmtpServer = (logger: Logger, port = appConfig.smtpPort) => {
  const server = new SMTPServer({
    disabledCommands: ["AUTH"],
    logger: false,
    // Security: Connection limits and timeouts
    maxClients: 100, // Maximum concurrent connections
    socketTimeout: 60000, // 60 seconds socket timeout
    closeTimeout: 30000, // 30 seconds to close connection gracefully
    size: 25 * 1024 * 1024, // 25MB max message size
    // Prevent banner grabbing attacks
    banner: "ESMTP",
    async onRcptTo(address, _session, callback) {
      try {
        const recipient = address.address?.toLowerCase().trim();
        if (!recipient || !recipient.includes("@")) {
          const err = Object.assign(new Error("Invalid recipient"), { responseCode: 553 });
          callback(err);
          return;
        }

        if (!appConfig.allowAutoDomainCreation) {
          const [localPart, domainName] = recipient.split("@");
          if (!localPart || !domainName) {
            const err = Object.assign(new Error("Invalid recipient domain"), { responseCode: 553 });
            callback(err);
            return;
          }

          const domain = await prisma.domain.findUnique({ where: { name: domainName.toLowerCase() } });
          if (!domain) {
            const err = Object.assign(new Error(`Domain ${domainName} not registered`), { responseCode: 550 });
            callback(err);
            return;
          }
          if (domain.status !== "VERIFIED") {
            const err = Object.assign(new Error(`Domain ${domainName} not verified`), { responseCode: 550 });
            callback(err);
            return;
          }

          // Fail-closed in strict mode: recipient mailbox must already exist and be active.
          const inbox = await prisma.inbox.findUnique({
            where: { domainId_localPart: { domainId: domain.id, localPart } },
          });
          if (!inbox || inbox.deletedAt) {
            const err = Object.assign(new Error(`Recipient ${recipient} not provisioned`), { responseCode: 550 });
            callback(err);
            return;
          }
        }

        callback();
      } catch (err) {
        logger.error({ err }, "failed to validate recipient");
        const smtpError = Object.assign(new Error("Temporary validation failure"), { responseCode: 451 });
        callback(smtpError);
      }
    },
    async onData(stream, session, callback) {
      try {
        const rawDir = await ensureRawStorageDir();
        const filename = `${Date.now()}-${generateToken()}.eml`;
        const filePath = path.join(rawDir, filename);

        const writeStream = (await import("fs")).createWriteStream(filePath);

        stream.pipe(writeStream);

        stream.on("end", async () => {
          try {
            await new Promise((resolve, reject) => {
              writeStream.on("finish", resolve);
              writeStream.on("error", reject);
            });

            await emailQueue.add("inbound", {
              rawPath: filePath,
              envelope: {
                rcptTo: session.envelope.rcptTo,
                remoteAddress: session.remoteAddress,
              },
            });
            logger.info({ filePath }, "queued inbound email");
            callback();
          } catch (err) {
            logger.error({ err }, "failed to queue email");
            try {
              await fs.unlink(filePath);
            } catch {
              // best-effort cleanup for orphan raw files
            }
            callback(new Error("Internal Error"));
          }
        });
      } catch (err) {
        logger.error({ err }, "failed to start stream");
        callback(new Error("Internal Error"));
      }
    },
  });

  server.listen(port, () => {
    logger.info(`SMTP ingest listening on :${port}`);
  });

  return server;
};

