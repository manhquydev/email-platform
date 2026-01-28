import { ImapConnection, ImapCommand, ImapHandler } from "../types";
import { MessageAdapter } from "../../storage/message-adapter";

export class StoreHandler implements ImapHandler {
  async handle(connection: ImapConnection, command: ImapCommand): Promise<void> {
    if (command.command !== "STORE" && command.command !== "UID STORE") {
        return;
    }

    if (connection.state !== "SELECTED" || !connection.selectedMailbox) {
        connection.socket.write(`${command.tag} NO No mailbox selected\r\n`);
        return;
    }

    if (connection.selectedMailbox.readOnly) {
         connection.socket.write(`${command.tag} NO Mailbox is read-only\r\n`);
         return;
    }

    const isUid = command.command === "UID STORE";
    const sequenceSet = command.attributes[isUid ? 0 : 0]?.value;
    const item = command.attributes[isUid ? 1 : 1]?.value; // +FLAGS, -FLAGS, FLAGS
    const value = command.attributes[isUid ? 2 : 2]; // list of flags

    try {
        let operation: "ADD" | "REMOVE" | "SET" = "SET";
        if (item.toUpperCase().startsWith("+FLAGS")) operation = "ADD";
        else if (item.toUpperCase().startsWith("-FLAGS")) operation = "REMOVE";
        else operation = "SET";

        const flags = Array.isArray(value) ? value.map(v => v.value) : [value.value];

        // Parse sequence
        let min = 1, max = 2147483647;
        if (sequenceSet.includes(":")) {
             const parts = sequenceSet.split(":");
             min = parseInt(parts[0]) || 1;
             max = parts[1] === "*" ? 2147483647 : parseInt(parts[1]);
        } else {
             min = max = parseInt(sequenceSet);
        }

        const messages = await MessageAdapter.getMessages(connection.selectedMailbox.id, { min, max });

        for (const msg of messages) {
            await MessageAdapter.updateFlags(msg.id, flags, operation);

            // Send untagged response if not .SILENT
            if (!item.toUpperCase().includes("SILENT")) {
                // Get updated flags
                 const updatedMsg = await MessageAdapter.getMessages(connection.selectedMailbox.id, { min: msg.uid!, max: msg.uid! });
                 if (updatedMsg[0]) {
                     const currentFlags = updatedMsg[0].flags.map((f: any) => f.flag).join(" ");
                     connection.socket.write(`* ${msg.uid} FETCH (UID ${msg.uid} FLAGS (${currentFlags}))\r\n`);
                 }
            }
        }

        connection.socket.write(`${command.tag} OK STORE completed\r\n`);
    } catch (error) {
        console.error("Store error:", error);
        connection.socket.write(`${command.tag} NO STORE failed\r\n`);
    }
  }
}
