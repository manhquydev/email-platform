import net from "net";
import tls from "tls";
import fs from "fs";
import imapHandler from "imap-handler";
import { ImapConnection, ImapCommand, ImapHandler } from "./types";
import { AuthHandler } from "./handlers/auth-handler";
import { MailboxHandler } from "./handlers/mailbox-handler";
import { FetchHandler } from "./handlers/fetch-handler";
import { StoreHandler } from "./handlers/store-handler";

const authHandler = new AuthHandler();
const mailboxHandler = new MailboxHandler();
const fetchHandler = new FetchHandler();
const storeHandler = new StoreHandler();

export class ImapServer {
  private server: net.Server;
  private tlsServer: tls.Server;

  constructor() {
    this.server = net.createServer(this.handleConnection.bind(this, false));

    // Load TLS certificates if available
    const tlsOptions: tls.TlsOptions = {};
    if (process.env.TLS_CERT_PATH && process.env.TLS_KEY_PATH) {
      try {
        tlsOptions.cert = fs.readFileSync(process.env.TLS_CERT_PATH);
        tlsOptions.key = fs.readFileSync(process.env.TLS_KEY_PATH);
      } catch (err) {
        console.warn("Failed to load TLS certificates for IMAP:", err);
      }
    }

    this.tlsServer = tls.createServer(tlsOptions, this.handleConnection.bind(this, true));
  }

  start(port: number, securePort: number) {
    this.server.listen(port, () => {
      console.log(`IMAP Server listening on port ${port}`);
    });

    // Start TLS server if certificates are available
    if (process.env.TLS_CERT_PATH && process.env.TLS_KEY_PATH) {
      this.tlsServer.listen(securePort, () => {
        console.log(`IMAP TLS Server listening on port ${securePort}`);
      });
    } else {
      console.log(`IMAP TLS Server skipped (TLS_CERT_PATH/TLS_KEY_PATH not configured)`);
    }
  }

  private handleConnection(secure: boolean, socket: net.Socket) {
    const connection: ImapConnection = {
      socket,
      id: Math.random().toString(36).substring(7),
      state: "NOT_AUTHENTICATED",
      secure
    };

    console.log(`New IMAP connection ${connection.id} from ${socket.remoteAddress}`);

    socket.write("* OK [CAPABILITY IMAP4rev1 STARTTLS AUTH=PLAIN] Email Platform IMAP Ready\r\n");

    let buffer = "";

    socket.on("data", async (data) => {
      buffer += data.toString();

      // Attempt to parse complete lines
      // imap-handler parser expects full command.

      if (buffer.includes("\r\n")) {
         const lines = buffer.split("\r\n");
         // Last part might be incomplete
         buffer = lines.pop() || "";

         for (const line of lines) {
             if (!line.trim()) continue;
             try {
                const command = imapHandler.parser(line);
                await this.dispatch(connection, {
                    tag: command.tag,
                    command: command.command,
                    attributes: command.attributes
                });
             } catch (e) {
                 console.error("IMAP Parse error:", e, line);
                 // Don't kill connection on bad command usually, just send BAD
                 socket.write(`BAD Invalid command\r\n`);
             }
         }
      }
    });

    socket.on("error", (err) => {
      console.error(`IMAP Error ${connection.id}:`, err);
    });

    socket.on("close", () => {
      console.log(`IMAP Connection closed ${connection.id}`);
    });
  }

  private async dispatch(connection: ImapConnection, command: ImapCommand) {
     console.log(`IMAP ${connection.id} CMD: ${command.command}`);

     const cmd = command.command.toUpperCase();

     if (cmd === "LOGIN" || cmd === "CAPABILITY" || cmd === "LOGOUT") {
         await authHandler.handle(connection, command);
     } else if (cmd === "SELECT" || cmd === "EXAMINE" || cmd === "LIST" || cmd === "STATUS") {
         await mailboxHandler.handle(connection, command);
     } else if (cmd === "FETCH" || cmd === "UID FETCH") {
         await fetchHandler.handle(connection, command);
     } else if (cmd === "STORE" || cmd === "UID STORE") {
         await storeHandler.handle(connection, command);
     } else if (cmd === "NOOP") {
         connection.socket.write(`${command.tag} OK NOOP completed\r\n`);
     } else {
         connection.socket.write(`${command.tag} BAD Unknown command\r\n`);
     }
  }
}
