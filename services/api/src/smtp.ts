import { SMTPServer, SMTPServerSession } from "smtp-server";
import { promises as fs } from "fs";
import path from "path";
import { appConfig } from "./config";
import { emailQueue } from "./queue/emailQueue";
import { generateToken } from "./utils/token";

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
            logger.info({ filePath }, "queued outbound email");
            callback();
          } catch (err) {
            logger.error({ err }, "failed to queue email");
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

