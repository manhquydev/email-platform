import { ImapConnection, ImapCommand, ImapHandler } from "../types";
import { MessageAdapter } from "../../storage/message-adapter";
import { AuthAttemptLimiter } from "../../utils/auth-attempt-limiter";

// Throttles repeated failed IMAP LOGIN attempts per client IP (credential-stuffing guard).
const imapAuthLimiter = new AuthAttemptLimiter("imap");

export class AuthHandler implements ImapHandler {
  async handle(connection: ImapConnection, command: ImapCommand): Promise<void> {
    if (command.command === "LOGIN") {
      const username = command.attributes[0]?.value;
      const password = command.attributes[1]?.value;

      if (!username || !password) {
        connection.socket.write(`${command.tag} NO Invalid arguments\r\n`);
        return;
      }

      const clientIp = connection.socket.remoteAddress || "unknown";
      if (await imapAuthLimiter.isBlocked(clientIp)) {
        connection.socket.write(`${command.tag} NO Too many failed attempts, try again later\r\n`);
        return;
      }

      try {
        const result = await MessageAdapter.authenticate(username, password);
        if (result) {
          void imapAuthLimiter.recordSuccess(clientIp);
          connection.user = { ...result.user, inboxId: result.inboxId };
          connection.state = "AUTHENTICATED";
          connection.socket.write(`${command.tag} OK LOGIN completed\r\n`);
        } else {
          void imapAuthLimiter.recordFailure(clientIp);
          connection.socket.write(`${command.tag} NO Authentication failed\r\n`);
        }
      } catch (error) {
        console.error("Auth error:", error);
        connection.socket.write(`${command.tag} NO Authentication error\r\n`);
      }
    } else if (command.command === "CAPABILITY") {
       // STARTTLS is intentionally not advertised: it is not implemented (no STARTTLS command
       // handler), so advertising it invited a downgrade/strip. Use the implicit-TLS port instead.
       connection.socket.write(`* CAPABILITY IMAP4rev1 AUTH=PLAIN LITERAL+ IDLE\r\n`);
       connection.socket.write(`${command.tag} OK CAPABILITY completed\r\n`);
    } else if (command.command === "LOGOUT") {
       connection.socket.write(`* BYE IMAP4rev1 Server logging out\r\n`);
       connection.socket.write(`${command.tag} OK LOGOUT completed\r\n`);
       connection.state = "LOGOUT";
       connection.socket.end();
    } else {
        connection.socket.write(`${command.tag} NO Unknown command in NOT_AUTHENTICATED state\r\n`);
    }
  }
}
