// Shared Admin UI Components - Premium Glassmorphism Design

import React from "react";

// Glassmorphism Card Component
export function GlassCard({ children, className = "", hover = true, padding = "p-6", onClick }: {
    children: React.ReactNode;
    className?: string;
    hover?: boolean;
    padding?: string;
    onClick?: (e: React.MouseEvent) => void;
}) {
    return (
        <div className={`
            relative overflow-hidden rounded-2xl
            bg-gradient-to-br from-white/90 to-white/70
            dark:from-[#18181B]/90 dark:to-[#18181B]/70
            backdrop-blur-xl border border-white/30 dark:border-white/10
            shadow-lg shadow-black/5 dark:shadow-black/30
            ${hover ? "transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:scale-[1.01] hover:border-primary/30" : ""}
            ${padding}
            ${className}
        `} onClick={onClick}>
            {children}
        </div>
    );
}

// Section Header Component
export function SectionHeader({ title, subtitle, action }: {
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="flex items-center justify-between mb-6">
            <div>
                <h2 className="text-xl font-bold text-nebula-text">{title}</h2>
                {subtitle && <p className="text-sm text-nebula-text-muted mt-1">{subtitle}</p>}
            </div>
            {action}
        </div>
    );
}

// Premium Table Component
export function PremiumTable({ children, className = "" }: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className="overflow-x-auto rounded-xl border border-nebula-border">
            <table className={`w-full border-collapse ${className}`}>
                {children}
            </table>
        </div>
    );
}

export function TableHeader({ children }: { children: React.ReactNode }) {
    return (
        <thead className="bg-nebula-elevated">
            {children}
        </thead>
    );
}

export function TableHeaderCell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <th className={`text-left text-xs font-semibold text-nebula-text-muted uppercase tracking-wider px-4 py-3 ${className}`}>
            {children}
        </th>
    );
}

export function TableBody({ children }: { children: React.ReactNode }) {
    return <tbody className="divide-y divide-nebula-border">{children}</tbody>;
}

export function TableRow({ children, className = "", onClick }: {
    children: React.ReactNode;
    className?: string;
    onClick?: (e: React.MouseEvent) => void;
}) {
    return (
        <tr
            className={`bg-nebula-surface hover:bg-nebula-elevated transition-colors ${onClick ? "cursor-pointer" : ""} ${className}`}
            onClick={onClick}
        >
            {children}
        </tr>
    );
}

export function TableCell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <td className={`px-4 py-3 text-sm text-nebula-text-secondary ${className}`}>
            {children}
        </td>
    );
}

// Status Badge Component
export function StatusBadge({ status, variant = "default" }: {
    status: string;
    variant?: "success" | "warning" | "danger" | "info" | "default";
}) {
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

// Premium Button Component
export function PremiumButton({ children, onClick, variant = "primary", size = "md", disabled = false, className = "", title, isLoading, type = "button", icon }: {
    children: React.ReactNode;
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    variant?: "primary" | "secondary" | "danger" | "ghost";
    size?: "sm" | "md" | "lg";
    disabled?: boolean;
    className?: string;
    title?: string;
    isLoading?: boolean;
    type?: "button" | "submit" | "reset";
    icon?: React.ReactNode;
}) {
    const variants = {
        primary: "bg-primary text-white hover:bg-primary-hover shadow-lg shadow-primary/25",
        secondary: "bg-nebula-elevated text-nebula-text hover:bg-nebula-surface",
        danger: "bg-danger text-white hover:bg-danger/80 shadow-lg shadow-danger/25",
        ghost: "text-nebula-text-secondary hover:bg-nebula-elevated",
    };

    const sizes = {
        sm: "px-3 py-1.5 text-xs",
        md: "px-4 py-2 text-sm",
        lg: "px-6 py-3 text-base",
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled || isLoading}
            title={title}
            className={`
    inline-flex items-center justify-center gap-2 font-medium rounded-xl
    transition-all duration-200
    disabled:opacity-50 disabled:cursor-not-allowed
                ${variants[variant]}
                ${sizes[size]}
                ${className}
    `}
        >
            {isLoading ? (
                <svg className="animate-spin h-4 w-4 mr-1" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
            ) : icon ? (
                <span className="mr-1">{icon}</span>
            ) : null}
            {children}
        </button>
    );
}

// Premium Input Component
export function PremiumInput({ value, onChange, placeholder, type = "text", className = "", icon, id, disabled, label, required }: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    type?: string;
    className?: string;
    icon?: React.ReactNode;
    id?: string;
    disabled?: boolean;
    label?: string;
    required?: boolean;
}) {
    return (
        <div className={className}>
            {label && <label className="block text-sm font-medium text-nebula-text-muted mb-1.5">{label}</label>}
            <div className="relative">
                {icon && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-nebula-text-muted">
                        {icon}
                    </span>
                )}
                <input
                    id={id}
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    disabled={disabled}
                    required={required}
                    className={`
        w-full rounded-xl border border-nebula-border
        bg-nebula-elevated
        text-nebula-text
        placeholder:text-nebula-text-muted
        focus:border-primary focus:ring-2 focus:ring-primary/20
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
                        ${icon ? "pl-10 pr-4 py-2.5" : "px-4 py-2.5"}
        `}
                />
            </div>
        </div>
    );
}

// Premium Select Component
export function PremiumSelect({ value, onChange, options, className = "", disabled = false }: {
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    className?: string;
    disabled?: boolean;
}) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className={`
    rounded-xl border border-nebula-border
    bg-nebula-elevated
    text-nebula-text
    px-4 py-2.5
    focus:border-primary focus:ring-2 focus:ring-primary/20
    transition-all duration-200
    disabled:opacity-50 disabled:cursor-not-allowed
                ${className}
    `}
        >
            {options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </select>
    );
}

// Empty State Component
export function EmptyState({ icon, title, description }: {
    icon?: React.ReactNode;
    title: string;
    description?: string;
}) {
    return (
        <div className="text-center py-12">
            {icon && <div className="text-nebula-text-muted mb-4">{icon}</div>}
            <h3 className="text-lg font-medium text-nebula-text-secondary">{title}</h3>
            {description && <p className="text-sm text-nebula-text-muted mt-1">{description}</p>}
        </div>
    );
}

// Loading Spinner
export function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
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

// Pagination Component
export function Pagination({ currentPage, totalPages, onPageChange }: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}) {
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

// Bulk Actions Bar
export function BulkActionsBar({ selectedCount, onClear, children }: {
    selectedCount: number;
    onClear: () => void;
    children: React.ReactNode;
}) {
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

// Premium Toggle Switch
export function PremiumToggle({ checked, onChange, disabled = false, label }: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    label?: string;
}) {
    return (
        <label className={`flex items-center gap-2 cursor-pointer ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}>
            <div className="relative">
                <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={(e) => !disabled && onChange(e.target.checked)}
                    disabled={disabled}
                />
                <div className={`w-10 h-6 rounded-full transition-colors duration-200 ease-in-out ${checked ? "bg-primary" : "bg-nebula-elevated"}`} />
                <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ${checked ? "translate-x-4" : "translate-x-0"}`} />
            </div>
            {label && <span className="text-sm font-medium text-nebula-text-secondary select-none">{label}</span>}
        </label>
    );
}

// Premium Confirm Modal Component
export function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Xác nhận",
    cancelText = "Hủy",
    variant = "primary",
    isLoading = false
}: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "primary" | "danger";
    isLoading?: boolean;
}) {
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
