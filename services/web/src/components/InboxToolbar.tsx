import { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import type { Inbox } from "../types";

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
            <div className="inbox-toolbar inbox-toolbar--empty">
                <button
                    className="inbox-toolbar-create"
                    onClick={onCreateInbox}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    <span>Tạo email mới</span>
                </button>
            </div>
        );
    }

    return (
        <div className="inbox-toolbar">
            {/* Inbox Selector Dropdown */}
            <div className="inbox-toolbar-selector" ref={dropdownRef}>
                <button
                    className="inbox-toolbar-current"
                    onClick={() => setShowDropdown(!showDropdown)}
                    title="Chọn hộp thư khác"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="inbox-toolbar-icon">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                    <span className="inbox-toolbar-email">{currentEmail}</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inbox-toolbar-chevron">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                </button>

                {showDropdown && (
                    <div className="inbox-toolbar-dropdown">
                        <div className="inbox-toolbar-dropdown-header">
                            <span>Chọn hộp thư</span>
                            <span className="inbox-toolbar-dropdown-count">{inboxes.length}</span>
                        </div>
                        <div className="inbox-toolbar-dropdown-list">
                            {inboxes.map(inbox => {
                                const email = `${inbox.localPart}@${inbox.domain?.name || 'domain'}`;
                                const isActive = inbox.id === currentInbox.id;
                                return (
                                    <button
                                        key={inbox.id}
                                        className={`inbox-toolbar-dropdown-item ${isActive ? 'active' : ''}`}
                                        onClick={() => {
                                            onSelectInbox(inbox);
                                            setShowDropdown(false);
                                        }}
                                    >
                                        <span className="inbox-toolbar-dropdown-email">{email}</span>
                                        {isActive && (
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16, color: 'var(--color-primary)' }}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                            </svg>
                                        )}
                                        <button
                                            className="inbox-toolbar-dropdown-copy"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigator.clipboard.writeText(email);
                                                toast.success("Đã sao chép!");
                                            }}
                                            title="Sao chép"
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                                            </svg>
                                        </button>
                                    </button>
                                );
                            })}
                        </div>
                        <button
                            className="inbox-toolbar-dropdown-create"
                            onClick={() => {
                                onCreateInbox();
                                setShowDropdown(false);
                            }}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                            <span>Tạo email mới</span>
                        </button>
                    </div>
                )}
            </div>

            {/* TTL Indicator */}
            {ttlRemaining && (
                <div className={`inbox-toolbar-ttl ${ttlRemaining.includes('hết hạn') ? 'expired' : ''}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 14, height: 14 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{ttlRemaining}</span>
                </div>
            )}

            {/* Action Buttons */}
            <div className="inbox-toolbar-actions">
                {/* Copy Button - Most Important */}
                <button
                    className="inbox-toolbar-btn inbox-toolbar-btn--copy"
                    onClick={handleCopyEmail}
                    title="Sao chép địa chỉ email (C)"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                    </svg>
                    <span>Copy</span>
                </button>

                {/* Delete Button */}
                {onDeleteInbox && (
                    <div className="inbox-toolbar-delete-container">
                        <button
                            className="inbox-toolbar-btn inbox-toolbar-btn--delete"
                            onClick={() => setShowDeleteConfirm(true)}
                            title="Xóa hộp thư này"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                        </button>

                        {/* Delete Confirmation Popup */}
                        {showDeleteConfirm && (
                            <div className="inbox-toolbar-confirm">
                                <p>Xóa hộp thư này?</p>
                                <div className="inbox-toolbar-confirm-actions">
                                    <button onClick={() => setShowDeleteConfirm(false)}>Hủy</button>
                                    <button className="danger" onClick={handleDeleteInbox}>Xóa</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Create New Button */}
                <button
                    className="inbox-toolbar-btn inbox-toolbar-btn--create"
                    onClick={onCreateInbox}
                    title="Tạo email mới (N)"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
