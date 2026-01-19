/**
 * Feedback and utility components for Admin UI
 * StatusBadge, EmptyState, LoadingSpinner, Pagination, BulkActionsBar, ConfirmModal
 */
import React from "react";
import { GlassCard } from "./card-components";
import { PremiumButton } from "./form-components";

// --- Status Badge Component ---
export interface StatusBadgeProps {
    status: string;
    variant?: "success" | "warning" | "danger" | "info" | "default";
}

export function StatusBadge({ status, variant = "default" }: StatusBadgeProps) {
    const variants = {
        success: "bg-success/10 text-success",
        warning: "bg-warning/10 text-warning",
        danger: "bg-danger/10 text-danger",
        info: "bg-info/10 text-info",
        default: "bg-nebula-elevated text-nebula-text-secondary",
    };

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
            {status}
        </span>
    );
}

// --- Empty State Component ---
export interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    description?: string;
}

export function EmptyState({ icon, title, description }: EmptyStateProps) {
    return (
        <div className="text-center py-12">
            {icon && <div className="text-nebula-text-muted mb-4">{icon}</div>}
            <h3 className="text-lg font-medium text-nebula-text-secondary">{title}</h3>
            {description && <p className="text-sm text-nebula-text-muted mt-1">{description}</p>}
        </div>
    );
}

// --- Loading Spinner ---
export interface LoadingSpinnerProps {
    size?: "sm" | "md" | "lg";
}

export function LoadingSpinner({ size = "md" }: LoadingSpinnerProps) {
    const sizes = {
        sm: "w-6 h-6 border-2",
        md: "w-10 h-10 border-3",
        lg: "w-14 h-14 border-4",
    };

    return (
        <div className="flex items-center justify-center py-12">
            <div className={`${sizes[size]} border-primary/30 rounded-full animate-spin border-t-primary`} />
        </div>
    );
}

// --- Pagination Component ---
export interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
    return (
        <div className="flex items-center justify-center gap-2 mt-6">
            <PremiumButton
                variant="ghost"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => onPageChange(currentPage - 1)}
            >
                ← Trước
            </PremiumButton>
            <span className="text-sm text-nebula-text-muted px-4">
                Trang {currentPage} / {totalPages}
            </span>
            <PremiumButton
                variant="ghost"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => onPageChange(currentPage + 1)}
            >
                Sau →
            </PremiumButton>
        </div>
    );
}

// --- Bulk Actions Bar ---
export interface BulkActionsBarProps {
    selectedCount: number;
    onClear: () => void;
    children: React.ReactNode;
}

export function BulkActionsBar({ selectedCount, onClear, children }: BulkActionsBarProps) {
    if (selectedCount === 0) return null;

    return (
        <div className="sticky top-0 z-10 mb-4 p-4 rounded-xl bg-primary/10 dark:bg-primary/20 border border-primary/30 flex items-center justify-between animate-fade-in">
            <span className="text-sm font-medium text-primary">
                Đã chọn {selectedCount} mục
            </span>
            <div className="flex items-center gap-2">
                {children}
                <PremiumButton variant="ghost" size="sm" onClick={onClear}>
                    Bỏ chọn
                </PremiumButton>
            </div>
        </div>
    );
}

// --- Premium Confirm Modal Component ---
export interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "primary" | "danger";
    isLoading?: boolean;
}

export function ConfirmModal({
    isOpen, onClose, onConfirm, title, message,
    confirmText = "Xác nhận", cancelText = "Hủy",
    variant = "primary", isLoading = false
}: ConfirmModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <GlassCard className="w-full max-w-sm overflow-hidden border border-white/20 shadow-2xl animate-in zoom-in-95 duration-200" padding="p-0">
                <div className="p-6">
                    <h3 className="text-xl font-bold text-nebula-text mb-2">{title}</h3>
                    <p className="text-sm text-nebula-text-muted leading-relaxed">{message}</p>
                </div>
                <div className="p-4 bg-nebula-elevated flex gap-3 justify-end items-center">
                    <PremiumButton variant="ghost" onClick={onClose} disabled={isLoading}>
                        {cancelText}
                    </PremiumButton>
                    <PremiumButton
                        variant={variant === "danger" ? "danger" : "primary"}
                        isLoading={isLoading}
                        onClick={onConfirm}
                    >
                        {confirmText}
                    </PremiumButton>
                </div>
            </GlassCard>
        </div>
    );
}
