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
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
                {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>}
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
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10">
            <table className={`w-full border-collapse ${className}`}>
                {children}
            </table>
        </div>
    );
}

export function TableHeader({ children }: { children: React.ReactNode }) {
    return (
        <thead className="bg-gray-50 dark:bg-white/5">
            {children}
        </thead>
    );
}

export function TableHeaderCell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <th className={`text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider px-4 py-3 ${className}`}>
            {children}
        </th>
    );
}

export function TableBody({ children }: { children: React.ReactNode }) {
    return <tbody className="divide-y divide-gray-200 dark:divide-white/10">{children}</tbody>;
}

export function TableRow({ children, className = "", onClick }: {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
}) {
    return (
        <tr
            className={`bg-white dark:bg-[#18181B] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${onClick ? "cursor-pointer" : ""} ${className}`}
            onClick={onClick}
        >
            {children}
        </tr>
    );
}

export function TableCell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <td className={`px-4 py-3 text-sm text-gray-700 dark:text-gray-300 ${className}`}>
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
        success: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
        warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
        danger: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
        info: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
        default: "bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300",
    };

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
            {status}
        </span>
    );
}

// Premium Button Component
export function PremiumButton({ children, onClick, variant = "primary", size = "md", disabled = false, className = "", title }: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: "primary" | "secondary" | "danger" | "ghost";
    size?: "sm" | "md" | "lg";
    disabled?: boolean;
    className?: string;
    title?: string;
}) {
    const variants = {
        primary: "bg-primary text-white hover:bg-primary-hover shadow-lg shadow-primary/25",
        secondary: "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-white/20",
        danger: "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/25",
        ghost: "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10",
    };

    const sizes = {
        sm: "px-3 py-1.5 text-xs",
        md: "px-4 py-2 text-sm",
        lg: "px-6 py-3 text-base",
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled}
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
            {children}
        </button>
    );
}

// Premium Input Component
export function PremiumInput({ value, onChange, placeholder, type = "text", className = "", icon, id, disabled }: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    type?: string;
    className?: string;
    icon?: React.ReactNode;
    id?: string;
    disabled?: boolean;
}) {
    return (
        <div className={`relative ${className} `}>
            {icon && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
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
                className={`
    w-full rounded-xl border border-gray-200 dark:border-white/10
    bg-white dark:bg-white/5
    text-gray-900 dark:text-white
    placeholder:text-gray-400 dark:placeholder:text-gray-500
    focus:border-primary focus:ring-2 focus:ring-primary/20
    transition-all duration-200
    disabled:opacity-50 disabled:cursor-not-allowed
                    ${icon ? "pl-10 pr-4 py-2.5" : "px-4 py-2.5"}
    `}
            />
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
    rounded-xl border border-gray-200 dark:border-white/10
    bg-white dark:bg-[#18181B]
    text-gray-900 dark:text-white
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
            {icon && <div className="text-gray-300 dark:text-gray-600 mb-4">{icon}</div>}
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">{title}</h3>
            {description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>}
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
            <span className="text-sm text-gray-600 dark:text-gray-400 px-4">
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
                <div className={`w-10 h-6 rounded-full transition-colors duration-200 ease-in-out ${checked ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"}`} />
                <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ${checked ? "translate-x-4" : "translate-x-0"}`} />
            </div>
            {label && <span className="text-sm font-medium text-slate-700 dark:text-slate-300 select-none">{label}</span>}
        </label>
    );
}
