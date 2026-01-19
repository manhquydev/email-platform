/**
 * UI components for AdminInboxes
 */
import {
    TableRow, TableCell, StatusBadge, PremiumButton
} from "../AdminUIComponents";
import type { Inbox } from "./admin-inboxes-hooks";

/** Single inbox row in the table */
interface InboxRowProps {
    inbox: Inbox;
    updating: string | null;
    onTransfer: (inbox: Inbox) => void;
    onDelete: (id: string) => void;
}

export function InboxRow({ inbox, updating, onTransfer, onDelete }: InboxRowProps) {
    const isExpired = inbox.expiresAt && new Date(inbox.expiresAt) < new Date();

    return (
        <TableRow>
            <TableCell>
                <div className="font-medium text-nebula-text">
                    {inbox.localPart}@{inbox.domain.name}
                </div>
                <div className="text-[10px] text-nebula-text-muted font-mono">{inbox.id}</div>
            </TableCell>
            <TableCell>
                <div className="text-xs">{inbox.owner?.email || "Unknown"}</div>
                <div className="text-[10px] text-nebula-text-muted font-mono">{inbox.ownerId || "—"}</div>
            </TableCell>
            <TableCell>
                <StatusBadge
                    status={`${inbox._count.messages} tin`}
                    variant={inbox._count.messages > 0 ? "info" : "default"}
                />
            </TableCell>
            <TableCell>{new Date(inbox.createdAt).toLocaleDateString("vi-VN")}</TableCell>
            <TableCell>
                {inbox.expiresAt ? (
                    <span className={isExpired ? "text-danger" : ""}>
                        {new Date(inbox.expiresAt).toLocaleDateString("vi-VN")}
                    </span>
                ) : (
                    <span className="text-nebula-text-muted italic">Vĩnh viễn</span>
                )}
            </TableCell>
            <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                    <PremiumButton
                        variant="ghost"
                        size="sm"
                        onClick={() => onTransfer(inbox)}
                        disabled={!!updating}
                        className="text-info hover:text-info hover:bg-info/10"
                        title="Chuyển quyền sở hữu"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                        </svg>
                    </PremiumButton>
                    <PremiumButton
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(inbox.id)}
                        disabled={updating === inbox.id}
                        className="text-danger hover:text-danger hover:bg-danger/10"
                        title="Xóa hộp thư"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                    </PremiumButton>
                </div>
            </TableCell>
        </TableRow>
    );
}

/** Search icon SVG */
export function SearchIcon() {
    return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
    );
}
