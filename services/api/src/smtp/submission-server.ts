import { SMTPServer, SMTPServerAuthentication, SMTPServerAuthenticationResponse, SMTPServerSession } from "smtp-server";
import { simpleParser, ParsedMail } from "mailparser";
import { appConfig } from "../config";
import { emailQueue } from "../queue/emailQueue";
import { SmtpAuthHandler } from "./auth-handler";
import { DkimService } from "../services/dkim.service";
import { FolderService } from "../services/folder-service";
import { prisma } from "../lib/prisma";
import { Readable } from "stream";
import path from "path";
import fs from "fs/promises";
import { createWriteStream } from "fs";
import { generateToken } from "../utils/token";

type Logger = {
  info: (obj: Record<string, unknown> | string, msg?: string) => void;
  warn: (obj: Record<string, unknown> | string, msg?: string) => void;
  error: (obj: Record<string, unknown> | string, msg?: string) => void;
};

// Extend session to include authenticated user info
interface SecureSession extends Omit<SMTPServerSession, 'user'> {
  user?: {
    id: string;
    email: string;
  };
}

const ensureRawStorageDir = async () => {
  const dir = path.join(appConfig.storageDir, "raw", "outbound");
  await fs.mkdir(dir, { recursive: true });
  return dir;
};

export const startSubmissionServer = (logger: Logger, port = 587) => {
  const server = new SMTPServer({
    secure: port === 465, // Implicit TLS for 465, STARTTLS for 587
    name: "smtp.ephemera.com", // TODO: Configurable hostname
    authOptional: false, // Require AUTH
    maxClients: 100,
    size: 25 * 1024 * 1024, // 25MB limit

    // Authentication Handler
    onAuth(auth: SMTPServerAuthentication, session: SMTPServerSession, callback: (err: Error | null, response?: SMTPServerAuthenticationResponse) => void) {
      if (auth.method !== 'PLAIN' && auth.method !== 'LOGIN') {
        return callback(new Error('Invalid authentication method'));
      }

      SmtpAuthHandler.validateCredentials(auth.username, auth.password)
        .then((result) => {
          if (result.success && result.user) {
            (session as SecureSession).user = { id: result.user.id, email: result.user.email };
            callback(null, { user: result.user.id });
          } else {
            callback(new Error(result.error || 'Authentication failed'));
          }
        })
        .catch((err) => {
          logger.error({ err }, "SMTP Auth Error");
          callback(new Error('Internal Authentication Error'));
        });
    },

    // Sender Validation
    onMailFrom(address, session, callback) {
      const user = (session as SecureSession).user;
      if (!user) {
        return callback(new Error('Authentication required'));
      }

      // Check if user is allowed to send from this address
      SmtpAuthHandler.canSendAs(user.id, address.address)
        .then((allowed) => {
          if (allowed) {
            callback();
          } else {
            callback(new Error(`Sender address ${address.address} not owned by user ${user.email}`));
          }
        })
        .catch((err) => {
          logger.error({ err }, "SMTP MailFrom Error");
          callback(new Error('Internal Error'));
        });
    },

    // Message Data Handler
    async onData(stream, session, callback) {
      const user = (session as SecureSession).user;
      if (!user) {
        return callback(new Error('Authentication required'));
      }

      try {
        const rawDir = await ensureRawStorageDir();
        const filename = `${Date.now()}-${generateToken()}-out.eml`;
        const filePath = path.join(rawDir, filename);

        // 1. Save raw message to disk
        const writeStream = createWriteStream(filePath);
        stream.pipe(writeStream);

        await new Promise((resolve, reject) => {
          writeStream.on("finish", resolve);
          writeStream.on("error", reject);
        });

        // 2. Queue for delivery (DKIM signing happens in worker)
        // We pass the file path and user context
        await emailQueue.add("outbound", {
          rawPath: filePath,
          userId: user.id,
          envelope: {
            mailFrom: session.envelope.mailFrom,
            rcptTo: session.envelope.rcptTo,
          },
        });

        logger.info({ userId: user.id, filePath }, "Queued outbound email");
        callback();

      } catch (err) {
        logger.error({ err }, "Failed to process outbound email");
        callback(new Error("Internal Error"));
      }
    },
  });

  server.on("error", (err) => {
    logger.error({ err }, "SMTP Submission Server Error");
  });

  server.listen(port, () => {
    logger.info(`SMTP Submission listening on :${port}`);
  });

  return server;
};
