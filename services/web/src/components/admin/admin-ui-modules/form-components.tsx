/**
 * Form and input components for Admin UI
 * PremiumButton, PremiumInput, PremiumSelect, PremiumToggle
 */
import React from "react";

// --- Premium Button Component ---
export interface PremiumButtonProps {
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
}

export function PremiumButton({
    children, onClick, variant = "primary", size = "md", disabled = false,
    className = "", title, isLoading, type = "button", icon
}: PremiumButtonProps) {
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

// --- Premium Input Component ---
export interface PremiumInputProps {
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
}

export function PremiumInput({
    value, onChange, placeholder, type = "text", className = "",
    icon, id, disabled, label, required
}: PremiumInputProps) {
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

// --- Premium Select Component ---
export interface PremiumSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    className?: string;
    disabled?: boolean;
}

export function PremiumSelect({ value, onChange, options, className = "", disabled = false }: PremiumSelectProps) {
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

// --- Premium Toggle Switch ---
export interface PremiumToggleProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    label?: string;
}

export function PremiumToggle({ checked, onChange, disabled = false, label }: PremiumToggleProps) {
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
