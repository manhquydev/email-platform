
import { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import type { Inbox } from "../types";
import { Button } from "./ui/Button";
import { cn } from "../utils/cn";

interface InboxToolbarProps {
    inboxes: Inbox[];
    currentInbox: Inbox | null;
    onSelectInbox: (inbox: Inbox) => void;
    onCreateInbox: () => void;
    onDeleteInbox?: (inbox: Inbox) => void;
}

export function InboxToolbar({
    inboxes,
    currentInbox,
    onSelectInbox,
    onCreateInbox,
    onDeleteInbox
}: InboxToolbarProps) {
    const [showDropdown, setShowDropdown] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const currentEmail = currentInbox
        ? `${currentInbox.localPart}@${currentInbox.domain?.name || 'domain'}`
        : null;

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        if (showDropdown) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showDropdown]);

    // Copy email to clipboard
    const handleCopyEmail = () => {
        if (currentEmail) {
            navigator.clipboard.writeText(currentEmail);
            toast.success("Đã sao chép địa chỉ email!", {
                icon: "📋",
                duration: 2000
            });
        }
    };

    // Delete inbox
    const handleDeleteInbox = () => {
        if (currentInbox && onDeleteInbox) {
            onDeleteInbox(currentInbox);
            setShowDeleteConfirm(false);
        }
    };

    // Calculate TTL remaining (if applicable)
    const getTTLRemaining = () => {
        if (!currentInbox?.expiresAt) return null;
        const expires = new Date(currentInbox.expiresAt);
        const now = new Date();
        const diffMs = expires.getTime() - now.getTime();
        if (diffMs <= 0) return "Đã hết hạn";
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        if (diffDays > 0) return `Còn ${diffDays} ngày`;
        if (diffHours > 0) return `Còn ${diffHours} giờ`;
        return "Sắp hết hạn";
    };

    const ttlRemaining = getTTLRemaining();

    if (!currentInbox) {
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

    return (
        <div className="flex items-center justify-between gap-3 p-2 rounded-xl bg-surface-glass border border-white/10 backdrop-blur-md h-[60px]">
            {/* Inbox Selector Dropdown */}
            <div className="relative flex-1 min-w-0" ref={dropdownRef}>
                <button
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left group"
                    onClick={() => setShowDropdown(!showDropdown)}
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

                {showDropdown && (
                    <div className="absolute top-full left-0 mt-2 w-full min-w-[300px] max-h-[400px] overflow-y-auto bg-nebula-surface/95 backdrop-blur-xl border border-nebula-border rounded-xl shadow-2xl z-50 flex flex-col p-1 animate-fade-in-up">
                        <div className="flex items-center justify-between px-3 py-2 mb-1 border-b border-white/5">
                            <span className="text-xs font-semibold uppercase text-text-secondary tracking-wider">Hộp thư của bạn</span>
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/10 text-text-primary">{inboxes.length}</span>
                        </div>
                        <div className="space-y-0.5">
                            {inboxes.map(inbox => {
                                const email = `${inbox.localPart}@${inbox.domain?.name || 'domain'}`;
                                const isActive = inbox.id === currentInbox.id;
                                return (
                                    <button
                                        key={inbox.id}
                                        className={cn(
                                            "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left transition-colors group",
                                            isActive ? "bg-primary/10 text-white" : "text-text-secondary hover:bg-white/5 hover:text-white"
                                        )}
                                        onClick={() => {
                                            onSelectInbox(inbox);
                                            setShowDropdown(false);
                                        }}
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
                            })}
                        </div>
                        <div className="border-t border-white/5 mt-1 pt-1">
                            <button
                                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-primary hover:bg-primary/10 transition-colors font-medium"
                                onClick={() => {
                                    onCreateInbox();
                                    setShowDropdown(false);
                                }}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                                <span>Tạo email mới</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* TTL Indicator */}
            {ttlRemaining && (
                <div className={cn(
                    "hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-nebula-elevated border border-nebula-border ml-2",
                    ttlRemaining.includes('hết hạn') ? "text-danger" : "text-text-secondary"
                )}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{ttlRemaining}</span>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-1">
                {/* Copy Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCopyEmail}
                    title="Sao chép địa chỉ email (C)"
                    className="hidden sm:flex"
                    icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>}
                />

                {/* Delete Button */}
                {onDeleteInbox && (
                    <div className="relative">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                            title="Xóa hộp thư này"
                            className="text-danger hover:text-danger hover:bg-danger/10"
                            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>}
                        />

                        {/* Delete Confirmation Popup */}
                        {showDeleteConfirm && (
                            <div className="absolute right-0 top-full mt-2 w-64 bg-nebula-surface border border-nebula-border rounded-xl shadow-xl p-4 z-50 animate-fade-in-up">
                                <p className="text-sm font-medium text-white mb-3">Xóa hộp thư này? Hành động không thể hoàn tác.</p>
                                <div className="flex items-center justify-end gap-2">
                                    <Button size="sm" variant="ghost" onClick={() => setShowDeleteConfirm(false)}>Hủy</Button>
                                    <Button size="sm" variant="danger" onClick={handleDeleteInbox}>Xóa</Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
