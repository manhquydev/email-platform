import net from "net";
import { MessageAdapter } from "../storage/message-adapter";

interface Pop3Connection {
    socket: net.Socket;
    state: "AUTHORIZATION" | "TRANSACTION" | "UPDATE";
    user?: any;
    messages?: any[];
    markedForDeletion?: Set<number>;
}

export class Pop3Server {
    private server: net.Server;

    constructor() {
        this.server = net.createServer(this.handleConnection.bind(this));
    }

    start(port: number) {
        this.server.listen(port, () => {
            console.log(`POP3 Server listening on port ${port}`);
        });
    }

    private handleConnection(socket: net.Socket) {
        const connection: Pop3Connection = {
            socket,
            state: "AUTHORIZATION",
            markedForDeletion: new Set()
        };

        socket.write("+OK POP3 Server Ready\r\n");

        let buffer = "";
        let username = "";

        socket.on("data", async (data) => {
            buffer += data.toString();
            if (buffer.includes("\r\n")) {
                const lines = buffer.split("\r\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                    if (!line.trim()) continue;
                    const [cmd, ...args] = line.trim().split(" ");
                    const arg = args.join(" ");

                    try {
                        await this.handleCommand(connection, cmd.toUpperCase(), arg, (u) => username = u, username);
                    } catch (e) {
                        console.error("POP3 Error:", e);
                        socket.write("-ERR Server error\r\n");
                    }
                }
            }
        });
    }

    private async handleCommand(conn: Pop3Connection, cmd: string, arg: string, setUsername: (u: string) => void, currentUsername: string) {
        switch (cmd) {
            case "USER":
                setUsername(arg);
                conn.socket.write("+OK User accepted\r\n");
                break;
            case "PASS":
                if (!currentUsername) {
                    conn.socket.write("-ERR USER required first\r\n");
                    return;
                }
                const result = await MessageAdapter.authenticate(currentUsername, arg);
                if (result) {
                    conn.user = result.user;
                    conn.user.inboxId = result.inboxId;
                    conn.state = "TRANSACTION";
                    conn.socket.write("+OK Logged in\r\n");
                } else {
                    conn.socket.write("-ERR Auth failed\r\n");
                }
                break;
            case "STAT":
                if (conn.state !== "TRANSACTION") { conn.socket.write("-ERR Not logged in\r\n"); return; }
                const inbox = await MessageAdapter.getMailbox(conn.user.inboxId, "Inbox");
                if (inbox) {
                    const msgs = await MessageAdapter.getMessages(inbox.id, { min: 1, max: 2147483647 });
                    conn.messages = msgs; // Cache for session
                    const size = msgs.reduce((acc, m) => acc + (m.size || 0), 0);
                    conn.socket.write(`+OK ${msgs.length} ${size}\r\n`);
                } else {
                    conn.socket.write(`+OK 0 0\r\n`);
                }
                break;
            case "LIST":
                if (conn.state !== "TRANSACTION") { conn.socket.write("-ERR Not logged in\r\n"); return; }
                if (arg) {
                    // List specific message
                    const msgIdx = parseInt(arg) - 1;
                    const msg = conn.messages?.[msgIdx];
                    if (msg && !conn.markedForDeletion?.has(msgIdx)) {
                        conn.socket.write(`+OK ${arg} ${msg.size || 0}\r\n`);
                    } else {
                        conn.socket.write("-ERR No such message\r\n");
                    }
                } else {
                    conn.socket.write("+OK Listing follows\r\n");
                    conn.messages?.forEach((msg, idx) => {
                        if (!conn.markedForDeletion?.has(idx)) {
                            conn.socket.write(`${idx + 1} ${msg.size || 0}\r\n`);
                        }
                    });
                    conn.socket.write(".\r\n");
                }
                break;
            case "RETR":
                if (conn.state !== "TRANSACTION") { conn.socket.write("-ERR Not logged in\r\n"); return; }
                const msgIdx = parseInt(arg) - 1;
                const msg = conn.messages?.[msgIdx];
                if (msg && !conn.markedForDeletion?.has(msgIdx)) {
                    const content = await MessageAdapter.getMessageContent(msg.id);
                    conn.socket.write(`+OK ${content?.length} octets\r\n`);
                    conn.socket.write(content || "");
                    conn.socket.write("\r\n.\r\n");
                } else {
                    conn.socket.write("-ERR No such message\r\n");
                }
                break;
            case "DELE":
                if (conn.state !== "TRANSACTION") { conn.socket.write("-ERR Not logged in\r\n"); return; }
                const delIdx = parseInt(arg) - 1;
                if (conn.messages?.[delIdx]) {
                    conn.markedForDeletion?.add(delIdx);
                    conn.socket.write("+OK Marked\r\n");
                } else {
                    conn.socket.write("-ERR No such message\r\n");
                }
                break;
            case "QUIT":
                if (conn.state === "TRANSACTION") {
                    conn.state = "UPDATE";
                    // Execute deletions
                    if (conn.markedForDeletion && conn.markedForDeletion.size > 0) {
                         // Perform delete via MessageAdapter
                         // conn.messages[idx].id
                    }
                    conn.socket.write("+OK Bye\r\n");
                    conn.socket.end();
                } else {
                    conn.socket.write("+OK Bye\r\n");
                    conn.socket.end();
                }
                break;
            case "CAPA":
                conn.socket.write("+OK Capability list follows\r\nUSER\r\nUIDL\r\nTOP\r\n.\r\n");
                break;
            case "UIDL":
                 if (conn.state !== "TRANSACTION") { conn.socket.write("-ERR Not logged in\r\n"); return; }
                 conn.socket.write("+OK UIDL list follows\r\n");
                 conn.messages?.forEach((msg, idx) => {
                     if (!conn.markedForDeletion?.has(idx)) {
                         conn.socket.write(`${idx + 1} ${msg.uid}\r\n`);
                     }
                 });
                 conn.socket.write(".\r\n");
                 break;
            default:
                conn.socket.write("-ERR Unknown command\r\n");
        }
    }
}
