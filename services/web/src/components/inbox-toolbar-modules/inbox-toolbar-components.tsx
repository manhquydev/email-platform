/**
 * UI components for InboxToolbar
 */
import toast from "react-hot-toast";
import type { Inbox } from "../../types";
import { Button } from "../ui/Button";
import { cn } from "../../utils/cn";
import { getEmailAddress } from "./inbox-toolbar-utils";

/** Empty state when no inbox is selected */
export function EmptyToolbarState({ onCreateInbox }: { onCreateInbox: () => void }) {
    return (
        <div className="flex items-center justify-center p-2 rounded-xl border border-dashed border-white/20 bg-white/5 h-[60px]">
            <Button
                variant="ghost"
                onClick={onCreateInbox}
                className="text-text-secondary hover:text-primary"
                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>}
            >
                Tạo email mới
            </Button>
        </div>
    );
}

/** Individual inbox item in dropdown */
interface InboxDropdownItemProps {
    inbox: Inbox;
    isActive: boolean;
    onSelect: () => void;
}

export function InboxDropdownItem({ inbox, isActive, onSelect }: InboxDropdownItemProps) {
    const email = getEmailAddress(inbox);
    return (
        <button
            className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left transition-colors group",
                isActive ? "bg-primary/10 text-white" : "text-text-secondary hover:bg-white/5 hover:text-white"
            )}
            onClick={onSelect}
        >
            <span className="truncate mr-2">{email}</span>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    className="p-1.5 hover:bg-white/10 rounded-md text-text-tertiary hover:text-primary transition-colors"
                    onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(email);
                        toast.success("Đã sao chép!");
                    }}
                    title="Sao chép"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                    </svg>
                </button>
            </div>
        </button>
    );
}

/** Inbox selector dropdown */
interface InboxSelectorDropdownProps {
    inboxes: Inbox[];
    currentInboxId: string;
    onSelectInbox: (inbox: Inbox) => void;
    onCreateInbox: () => void;
    onClose: () => void;
}

export function InboxSelectorDropdown({ inboxes, currentInboxId, onSelectInbox, onCreateInbox, onClose }: InboxSelectorDropdownProps) {
    return (
        <div className="absolute top-full left-0 mt-2 w-full min-w-[300px] max-h-[400px] overflow-y-auto bg-nebula-surface/95 backdrop-blur-xl border border-nebula-border rounded-xl shadow-2xl z-50 flex flex-col p-1 animate-fade-in-up">
            <div className="flex items-center justify-between px-3 py-2 mb-1 border-b border-white/5">
                <span className="text-xs font-semibold uppercase text-text-secondary tracking-wider">Hộp thư của bạn</span>
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/10 text-text-primary">{inboxes.length}</span>
            </div>
            <div className="space-y-0.5">
                {inboxes.map(inbox => (
                    <InboxDropdownItem
                        key={inbox.id}
                        inbox={inbox}
                        isActive={inbox.id === currentInboxId}
                        onSelect={() => {
                            onSelectInbox(inbox);
                            onClose();
                        }}
                    />
                ))}
            </div>
            <div className="border-t border-white/5 mt-1 pt-1">
                <button
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-primary hover:bg-primary/10 transition-colors font-medium"
                    onClick={() => {
                        onCreateInbox();
                        onClose();
                    }}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    <span>Tạo email mới</span>
                </button>
            </div>
        </div>
    );
}

/** TTL remaining indicator badge */
export function TTLIndicator({ ttlRemaining }: { ttlRemaining: string }) {
    return (
        <div className={cn(
            "hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-nebula-elevated border border-nebula-border ml-2",
            ttlRemaining.includes('hết hạn') ? "text-danger" : "text-text-secondary"
        )}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{ttlRemaining}</span>
        </div>
    );
}

/** Delete confirmation popup */
interface DeleteConfirmPopupProps {
    onConfirm: () => void;
    onCancel: () => void;
}

export function DeleteConfirmPopup({ onConfirm, onCancel }: DeleteConfirmPopupProps) {
    return (
        <div className="absolute right-0 top-full mt-2 w-64 bg-nebula-surface border border-nebula-border rounded-xl shadow-xl p-4 z-50 animate-fade-in-up">
            <p className="text-sm font-medium text-white mb-3">Xóa hộp thư này? Hành động không thể hoàn tác.</p>
            <div className="flex items-center justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={onCancel}>Hủy</Button>
                <Button size="sm" variant="danger" onClick={onConfirm}>Xóa</Button>
            </div>
        </div>
    );
}

/** Inbox selector trigger button */
interface InboxSelectorButtonProps {
    currentEmail: string;
    onClick: () => void;
}

export function InboxSelectorButton({ currentEmail, onClick }: InboxSelectorButtonProps) {
    return (
        <button
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left group"
            onClick={onClick}
            title="Chọn hộp thư khác"
        >
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
            </div>
            <span className="font-semibold text-white truncate text-base">{currentEmail}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-text-tertiary ml-auto">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
        </button>
    );
}
