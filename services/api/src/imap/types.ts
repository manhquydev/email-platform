import { Socket } from "net";

export interface ImapConnection {
  socket: Socket;
  id: string;
  state: "NOT_AUTHENTICATED" | "AUTHENTICATED" | "SELECTED" | "LOGOUT";
  user?: {
    id: string;
    email: string;
    inboxId: string;
  };
  selectedMailbox?: {
    id: string;
    name: string;
    uidValidity: number;
    messageCount: number;
    readOnly: boolean;
  };
  secure: boolean;
}

export interface ImapCommand {
  tag: string;
  command: string;
  attributes: any[];
}

export interface ImapHandler {
  handle(connection: ImapConnection, command: ImapCommand): Promise<void>;
}
