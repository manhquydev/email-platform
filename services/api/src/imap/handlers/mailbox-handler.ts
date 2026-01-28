import { ImapConnection, ImapCommand, ImapHandler } from "../types";
import { MessageAdapter } from "../../storage/message-adapter";

export class MailboxHandler implements ImapHandler {
  async handle(connection: ImapConnection, command: ImapCommand): Promise<void> {
    if (!connection.user) {
        connection.socket.write(`${command.tag} NO Not authenticated\r\n`);
        return;
    }

    if (command.command === "SELECT" || command.command === "EXAMINE") {
      const mailboxName = command.attributes[0]?.value;
      if (!mailboxName) {
        connection.socket.write(`${command.tag} NO Invalid mailbox\r\n`);
        return;
      }

      try {
        const folder = await MessageAdapter.getMailbox(connection.user.inboxId, mailboxName);
        if (!folder) {
          connection.socket.write(`${command.tag} NO Mailbox doesn't exist\r\n`);
          return;
        }

        const stats = await MessageAdapter.getMailboxStats(folder.id);

        connection.selectedMailbox = {
          id: folder.id,
          name: folder.name,
          uidValidity: folder.uidValidity,
          messageCount: stats.count,
          readOnly: command.command === "EXAMINE"
        };
        connection.state = "SELECTED";

        connection.socket.write(`* ${stats.count} EXISTS\r\n`);
        connection.socket.write(`* 0 RECENT\r\n`);
        connection.socket.write(`* OK [UIDVALIDITY ${folder.uidValidity}] UIDs valid\r\n`);
        connection.socket.write(`* OK [UIDNEXT ${folder.uidNext}] Predicted next UID\r\n`);
        connection.socket.write(`* FLAGS (\\Answered \\Flagged \\Deleted \\Seen \\Draft)\r\n`);
        connection.socket.write(`* OK [PERMANENTFLAGS (\\Answered \\Flagged \\Deleted \\Seen \\Draft)] Limited\r\n`);

        const code = command.command === "EXAMINE" ? "READ-ONLY" : "READ-WRITE";
        connection.socket.write(`${command.tag} OK [${code}] ${command.command} completed\r\n`);
      } catch (error) {
        console.error("Select error:", error);
        connection.socket.write(`${command.tag} NO Select failed\r\n`);
      }
    } else if (command.command === "LIST") {
        // Simple list implementation
        // LIST "" "*"
        const refName = command.attributes[0]?.value || "";
        const mboxName = command.attributes[1]?.value || "";

        connection.socket.write(`* LIST (\\HasNoChildren) "/" "INBOX"\r\n`);
        // We should query folders from DB
        connection.socket.write(`${command.tag} OK LIST completed\r\n`);
    } else {
        // Fallback or next handler
    }
  }
}
