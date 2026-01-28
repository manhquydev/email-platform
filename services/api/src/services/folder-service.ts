import { prisma } from "../lib/prisma";
import { Folder } from "@prisma/client";

export class FolderService {
  static readonly SPECIAL_FOLDERS = ["Inbox", "Sent", "Drafts", "Trash", "Archive", "Spam"];

  static async ensureSpecialFolders(inboxId: string) {
    const folders = await prisma.folder.findMany({ where: { inboxId } });
    const existingNames = new Set(folders.map(f => f.name));

    const standardMap: Record<string, string> = {
      "Inbox": "\\Inbox",
      "Sent": "\\Sent",
      "Drafts": "\\Drafts",
      "Trash": "\\Trash",
      "Archive": "\\Archive",
      "Spam": "\\Junk",
    };

    const toCreate = FolderService.SPECIAL_FOLDERS.filter(name => !existingNames.has(name));

    for (const name of toCreate) {
      await prisma.folder.create({
        data: {
          inboxId,
          name,
          specialUse: standardMap[name] || null,
          sortOrder: this.getSortOrder(name)
        }
      });
    }
  }

  private static getSortOrder(name: string): number {
    switch (name) {
      case "Inbox": return 0;
      case "Drafts": return 1;
      case "Sent": return 2;
      case "Spam": return 3;
      case "Trash": return 4;
      case "Archive": return 5;
      default: return 10;
    }
  }

  static async getInboxFolder(inboxId: string) {
    let folder = await prisma.folder.findFirst({
      where: { inboxId, specialUse: "\\Inbox" }
    });

    if (!folder) {
      folder = await prisma.folder.findFirst({
        where: { inboxId, name: "Inbox" }
      });
    }

    if (!folder) {
       folder = await prisma.folder.create({
         data: {
           inboxId,
           name: "Inbox",
           specialUse: "\\Inbox",
           sortOrder: 0
         }
       });
    }
    return folder;
  }

  static async getNextUid(folderId: string): Promise<number> {
    const updated = await prisma.folder.update({
      where: { id: folderId },
      data: { uidNext: { increment: 1 } },
      select: { uidNext: true }
    });
    return updated.uidNext - 1;
  }
}
