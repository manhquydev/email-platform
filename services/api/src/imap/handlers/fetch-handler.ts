import { ImapConnection, ImapCommand, ImapHandler } from "../types";
import { MessageAdapter } from "../../storage/message-adapter";

export class FetchHandler implements ImapHandler {
  async handle(connection: ImapConnection, command: ImapCommand): Promise<void> {
    if (command.command !== "FETCH" && command.command !== "UID FETCH") {
        return;
    }

    if (connection.state !== "SELECTED" || !connection.selectedMailbox) {
        connection.socket.write(`${command.tag} NO No mailbox selected\r\n`);
        return;
    }

    const isUid = command.command === "UID FETCH";
    const sequenceSet = command.attributes[isUid ? 0 : 0]?.value; // e.g. "1:*"
    // const dataItems = command.attributes[isUid ? 1 : 1]; // e.g. (FLAGS BODY.PEEK[])

    try {
        // Parse sequence set (Simplified)
        let min = 1, max = 2147483647;
        if (sequenceSet === "*") {
             // All
        } else if (sequenceSet.includes(":")) {
             const parts = sequenceSet.split(":");
             min = parseInt(parts[0]) || 1;
             max = parts[1] === "*" ? 2147483647 : parseInt(parts[1]);
        } else {
             min = max = parseInt(sequenceSet);
        }

        const messages = await MessageAdapter.getMessages(connection.selectedMailbox.id, { min, max });

        for (const msg of messages) {
            // Build FETCH response
            // This is complex. We need to respect requested data items.
            // For MVP, we handle: FLAGS, UID, RFC822.SIZE, BODY[], INTERNALDATE

            const flags = msg.flags.map((f: any) => f.flag).join(" ");
            const date = msg.receivedAt.toUTCString(); // Format needs to be IMAP date-time

            let response = `* ${msg.uid} FETCH (UID ${msg.uid} FLAGS (${flags}) INTERNALDATE "${date}" RFC822.SIZE ${msg.size || 0}`;

            // If BODY[] or RFC822 requested, load content
            // NOTE: "BODY[]" is represented as a complex object in imap-handler attributes usually
            // We'll simplisticly assume if we see "BODY" we return content for now,
            // but in reality we need to parse attributes deeply.

            const reqStr = JSON.stringify(command.attributes);
            if (reqStr.includes("BODY") || reqStr.includes("RFC822")) {
                 const content = await MessageAdapter.getMessageContent(msg.id);
                 if (content) {
                     response += ` BODY[] {${content.length}}\r\n${content.toString()}`;
                 }
            }

            response += ")";
            connection.socket.write(`${response}\r\n`);
        }

        connection.socket.write(`${command.tag} OK FETCH completed\r\n`);
    } catch (error) {
        console.error("Fetch error:", error);
        connection.socket.write(`${command.tag} NO FETCH failed\r\n`);
    }
  }
}
