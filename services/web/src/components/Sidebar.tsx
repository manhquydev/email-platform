import { useState } from "react";
import type { Domain, Inbox } from "../types";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

interface SidebarProps {
    domains: Domain[];
    inboxes: Inbox[];
    selectedDomainId: string;
    selectedInboxId: string;
    onSelectDomain: (id: string) => void;
    onSelectInbox: (id: string) => void;
    onCreateDomain: (name: string) => Promise<void>;
    onCreateInbox: (domainId: string, localPart: string, expiresAt?: number) => Promise<void>;
    isAdmin: boolean;
    busy: boolean;
}

export function Sidebar({
    domains,
    inboxes,
    selectedDomainId,
    selectedInboxId,
    onSelectDomain,
    onSelectInbox,
    onCreateDomain,
    onCreateInbox,
    isAdmin,
    busy
}: SidebarProps) {
    const [isCreatingDomain, setIsCreatingDomain] = useState(false);
    const [newDomainName, setNewDomainName] = useState("");

    const [isCreatingInbox, setIsCreatingInbox] = useState(false);
    const [newInboxName, setNewInboxName] = useState("");
    const [newInboxTTL, setNewInboxTTL] = useState<string>("");

    const activeDomain = domains.find(d => d.id === selectedDomainId);

    const handleCreateDomain = async () => {
        if (!newDomainName.trim()) return;
        await onCreateDomain(newDomainName);
        setNewDomainName("");
        setIsCreatingDomain(false);
    };

    const handleCreateInbox = async () => {
        if (!newInboxName.trim() || !activeDomain) return;
        const ttl = newInboxTTL ? parseInt(newInboxTTL) : undefined;
        await onCreateInbox(activeDomain.id, newInboxName, ttl);
        setNewInboxName("");
        setIsCreatingInbox(false);
    };

    return (
        <div className="flex flex-col h-full border-r border-border bg-surface">
            {/* 1. Domain Switcher Header */}
            <div className="p-3 border-b border-border">
                <label className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 block">
                    Tên Miền (Domains)
                </label>
                <select
                    className="w-full text-sm font-medium"
                    value={selectedDomainId}
                    onChange={(e) => onSelectDomain(e.target.value)}
                >
                    <option value="">-- Chọn tên miền --</option>
                    {domains.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                </select>

                {isAdmin && !isCreatingDomain && (
                    <button
                        onClick={() => setIsCreatingDomain(true)}
                        className="text-xs text-primary font-medium mt-2 hover:underline flex items-center gap-1"
                    >
                        + Thêm tên miền mới
                    </button>
                )}

                {isCreatingDomain && (
                    <div className="mt-2 space-y-2 p-2 bg-bg rounded border border-border">
                        <input
                            autoFocus
                            className="text-xs"
                            placeholder="Ví dụ: mycompany.com"
                            value={newDomainName}
                            onChange={e => setNewDomainName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleCreateDomain()}
                        />
                        <div className="flex gap-2 justify-end">
                            <button disabled={busy} onClick={() => setIsCreatingDomain(false)} className="btn-ghost text-xs px-2 py-1 h-auto">Hủy</button>
                            <button disabled={busy} onClick={handleCreateDomain} className="btn-primary text-xs px-2 py-1 h-auto">Thêm</button>
                        </div>
                    </div>
                )}
            </div>

            {/* 2. Inbox List */}
            <div className="flex-1 overflow-y-auto p-2">
                <div className="flex items-center justify-between px-2 py-1 mb-1">
                    <span className="text-xs font-semibold text-muted uppercase">Hộp Thư Đến</span>
                    {activeDomain && isAdmin && (
                        <button
                            onClick={() => setIsCreatingInbox(true)}
                            className="p-1 hover:bg-bg rounded text-primary"
                            title="Tạo hộp thư mới"
                        >
                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 5v14m-7-7h14" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </button>
                    )}
                </div>

                {isCreatingInbox && (
                    <div className="mb-3 p-3 bg-bg rounded border border-border shadow-sm">
                        <div className="text-xs font-medium mb-2">Tạo hộp thư mới:</div>
                        <div className="flex items-center gap-1 mb-2">
                            <input
                                autoFocus
                                className="text-sm flex-1 min-w-0"
                                placeholder="tên-hộp-thư"
                                value={newInboxName}
                                onChange={e => setNewInboxName(e.target.value)}
                            />
                            <span className="text-muted text-xs">@{activeDomain?.name}</span>
                        </div>
                        <select
                            className="text-xs mb-2"
                            value={newInboxTTL}
                            onChange={e => setNewInboxTTL(e.target.value)}
                        >
                            <option value="">Vĩnh viễn (Không xóa)</option>
                            <option value={3600000}>1 Giờ</option>
                            <option value={86400000}>1 Ngày</option>
                            <option value={604800000}>1 Tuần</option>
                        </select>
                        <div className="flex gap-2 justify-end">
                            <button disabled={busy} onClick={() => setIsCreatingInbox(false)} className="btn-ghost text-xs px-2 py-1 h-auto">Hủy</button>
                            <button disabled={busy} onClick={handleCreateInbox} className="btn-primary text-xs px-2 py-1 h-auto">Tạo</button>
                        </div>
                    </div>
                )}

                <div className="space-y-0.5">
                    {inboxes.map(inbox => (
                        <button
                            key={inbox.id}
                            onClick={() => onSelectInbox(inbox.id)}
                            className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${selectedInboxId === inbox.id
                                    ? 'bg-primary-light text-primary'
                                    : 'text-text-main hover:bg-bg'
                                }`}
                        >
                            <svg
                                className={`w-4 h-4 flex-shrink-0 ${selectedInboxId === inbox.id ? 'text-primary' : 'text-muted'}`}
                                fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                            >
                                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <div className="flex-1 min-w-0 overflow-hidden">
                                <div className="truncate font-medium text-sm">{inbox.localPart}</div>
                                {inbox.expiresAt && (
                                    <div className="text-[10px] text-muted truncate">
                                        Hết hạn {formatDistanceToNow(new Date(inbox.expiresAt), { addSuffix: true, locale: vi })}
                                    </div>
                                )}
                            </div>
                        </button>
                    ))}

                    {activeDomain && inboxes.length === 0 && !isCreatingInbox && (
                        <div className="text-center py-8 text-muted text-sm px-4">
                            Chưa có hộp thư nào.<br />Hãy tạo một hộp thư để bắt đầu.
                        </div>
                    )}

                    {!activeDomain && (
                        <div className="text-center py-8 text-muted text-sm">
                            Vui lòng chọn tên miền.
                        </div>
                    )}
                </div>
            </div>

            {/* 3. User Info Footer */}
            <div className="p-3 border-t border-border bg-bg">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs">
                        A
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <div className="text-xs font-semibold truncate">Admin User</div>
                        <div className="text-[10px] text-muted truncate">Quản trị viên</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
