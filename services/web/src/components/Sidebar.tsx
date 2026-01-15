import { useState } from "react";
import toast from "react-hot-toast";
import type { Domain, Inbox } from "../types";
import { CountdownTimer } from "./CountdownTimer";
import { generateRandomName } from "../utils/random";
import { TrustBadge } from "./trust-badge";

interface SidebarProps {
    domains: Domain[];
    inboxes: Inbox[];
    selectedDomainId: string;
    selectedInboxId: string;
    currentUserId?: string;
    onSelectDomain: (id: string) => void;
    onSelectInbox: (id: string) => void;
    onCreateDomain: (name: string) => Promise<void>;
    onCreateInbox: (domainId: string, localPart: string, expiresAt?: number) => Promise<void>;
    onVerifyDomain: (domainId: string, token: string) => Promise<void>;
    onDeleteDomain: (domain: Domain) => void;
    onDeleteInbox: (inbox: Inbox) => void;
    onExtendInbox: (inboxId: string) => Promise<void>;
    isAdmin: boolean;
    busy: boolean;
}

export function Sidebar({
    domains,
    inboxes,
    selectedDomainId,
    selectedInboxId,
    currentUserId,
    onSelectDomain,
    onSelectInbox,
    onCreateInbox,
    onDeleteInbox,
    onExtendInbox,
    isAdmin,
    busy
}: SidebarProps) {
    const [isCreatingInbox, setIsCreatingInbox] = useState(false);
    const [newInboxName, setNewInboxName] = useState("");

    const activeDomain = domains.find(d => d.id === selectedDomainId);
    const isOwnerOrAdmin = activeDomain && (isAdmin || activeDomain.ownerId === currentUserId);
    const canCreateInbox = activeDomain && activeDomain.status === 'VERIFIED' && (
        isAdmin ||
        activeDomain.ownerId === currentUserId ||
        activeDomain.isPublic
    );

    const handleCreateInbox = async () => {
        if (!newInboxName.trim() || !activeDomain) return;
        await onCreateInbox(activeDomain.id, newInboxName);
        setNewInboxName("");
        setIsCreatingInbox(false);
    };

    const handleQuickCreate = async () => {
        if (!activeDomain) return;
        const randomName = generateRandomName();
        await onCreateInbox(activeDomain.id, randomName);
    };

    const myDomains = currentUserId ? domains.filter(d => d.ownerId === currentUserId) : [];
    const sharedDomains = currentUserId ? domains.filter(d => d.ownerId !== currentUserId) : domains;

    return (
        <div className="flex flex-col h-full bg-nebula-surface rounded-xl border border-nebula-border overflow-hidden">
            {/* Header: Domain selector + Quick create */}
            <div className="p-3 border-b border-nebula-border space-y-3">
                {/* Domain Dropdown - Compact */}
                <div className="relative">
                    <select
                        className="w-full px-3 py-2 text-sm font-medium bg-nebula-elevated rounded-lg border border-nebula-border text-nebula-text focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all appearance-none cursor-pointer"
                        value={selectedDomainId}
                        onChange={(e) => onSelectDomain(e.target.value)}
                    >
                        <option value="">Chọn tên miền</option>
                        {myDomains.length > 0 && (
                            <optgroup label="Của tôi">
                                {myDomains.map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </optgroup>
                        )}
                        {sharedDomains.length > 0 && (
                            <optgroup label="Công khai">
                                {sharedDomains.map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </optgroup>
                        )}
                    </select>
                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nebula-text-muted pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>

                {/* Quick Create Button - Primary Action */}
                {canCreateInbox && (
                    <button
                        onClick={handleQuickCreate}
                        disabled={busy}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 shadow-sm"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Tạo email mới
                    </button>
                )}
            </div>

            {/* Inbox List */}
            <div className="flex-1 overflow-y-auto">
                {/* Section Header */}
                <div className="sticky top-0 px-3 py-2 bg-nebula-elevated/80 backdrop-blur-sm border-b border-nebula-border flex items-center justify-between">
                    <span className="text-xs font-semibold text-nebula-text-muted uppercase tracking-wide">
                        Hộp thư ({inboxes.length})
                    </span>
                    {canCreateInbox && (
                        <button
                            onClick={() => setIsCreatingInbox(true)}
                            className="p-1 hover:bg-nebula-elevated rounded text-nebula-text-muted hover:text-primary transition-colors"
                            title="Tạo với tên tùy chọn"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Create Inbox Form */}
                {isCreatingInbox && (
                    <div className="p-3 bg-nebula-elevated border-b border-nebula-border">
                        <div className="flex items-center gap-2 mb-2">
                            <input
                                autoFocus
                                className="flex-1 px-2 py-1.5 text-sm bg-nebula-surface border border-nebula-border rounded text-nebula-text"
                                placeholder="tên email"
                                value={newInboxName}
                                onChange={e => setNewInboxName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleCreateInbox()}
                            />
                            <span className="text-xs text-nebula-text-muted">@{activeDomain?.name}</span>
                        </div>
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => setIsCreatingInbox(false)} className="px-2 py-1 text-xs text-nebula-text-secondary hover:bg-nebula-elevated rounded">Hủy</button>
                            <button onClick={handleCreateInbox} disabled={busy} className="px-2 py-1 text-xs bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50">Tạo</button>
                        </div>
                    </div>
                )}

                {/* Inbox Items */}
                <div className="p-2 space-y-0.5">
                    {inboxes.map(inbox => {
                        const fullEmail = `${inbox.localPart}@${inbox.domain?.name || activeDomain?.name || ''}`;
                        const isSelected = selectedInboxId === inbox.id;
                        const isShared = inbox.ownerId !== currentUserId;

                        return (
                            <div
                                key={inbox.id}
                                className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                                    isSelected
                                        ? 'bg-primary/10 text-primary border-l-2 border-primary'
                                        : 'hover:bg-nebula-elevated text-nebula-text-secondary'
                                }`}
                                onClick={() => onSelectInbox(inbox.id)}
                            >
                                <div className="relative">
                                    <svg className={`w-4 h-4 shrink-0 ${isSelected ? 'text-primary' : 'text-nebula-text-muted'}`} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                        <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    {isShared && (
                                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-nebula-violet rounded-full border border-nebula-surface" title="Hộp thư chung" />
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <div className="text-sm font-medium truncate">{fullEmail}</div>
                                        {isShared && <span className="text-[9px] px-1 bg-nebula-violet/10 text-nebula-violet rounded border border-nebula-violet/20 font-bold uppercase">Team</span>}
                                    </div>
                                    {inbox.expiresAt && <CountdownTimer expiresAt={inbox.expiresAt} className="text-[10px]" />}
                                </div>

                                {/* Action buttons - visible on hover */}
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigator.clipboard.writeText(fullEmail);
                                            toast.success('Đã sao chép');
                                        }}
                                        className="p-1 hover:bg-nebula-elevated rounded text-nebula-text-muted hover:text-nebula-text"
                                        title="Sao chép"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                    </button>

                                    {inbox.expiresAt && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onExtendInbox(inbox.id); }}
                                            disabled={busy}
                                            className="p-1 hover:bg-success/10 rounded text-nebula-text-muted hover:text-success"
                                            title="Gia hạn"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </button>
                                    )}

                                    {isOwnerOrAdmin && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onDeleteInbox(inbox); }}
                                            disabled={busy}
                                            className="p-1 hover:bg-danger/10 rounded text-nebula-text-muted hover:text-danger"
                                            title="Xóa"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {inboxes.length === 0 && activeDomain && (
                        <div className="py-8 text-center text-nebula-text-muted text-sm">
                            <svg className="w-12 h-12 mx-auto mb-3 text-nebula-text-muted" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            Chưa có hộp thư nào
                        </div>
                    )}

                    {!activeDomain && (
                        <div className="py-8 text-center text-nebula-text-muted text-sm">
                            Chọn tên miền để xem hộp thư
                        </div>
                    )}
                </div>
            </div>

            {/* Trust Badge Footer */}
            <div className="p-3 border-t border-nebula-border">
                <TrustBadge variant="compact" className="w-full justify-center" />
            </div>
        </div>
    );
}
