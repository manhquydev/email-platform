/**
 * Custom hooks for InboxToolbar
 */
import { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import type { Inbox } from "../../types";

interface UseInboxToolbarOptions {
    currentInbox: Inbox | null;
    currentEmail: string | null;
    onDeleteInbox?: (inbox: Inbox) => void;
}

/** Hook to manage inbox toolbar state and actions */
export function useInboxToolbar({ currentInbox, currentEmail, onDeleteInbox }: UseInboxToolbarOptions) {
    const [showDropdown, setShowDropdown] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

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

    return {
        showDropdown,
        setShowDropdown,
        showDeleteConfirm,
        setShowDeleteConfirm,
        dropdownRef,
        handleCopyEmail,
        handleDeleteInbox
    };
}
