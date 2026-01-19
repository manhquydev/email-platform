/**
 * Card and layout components for Admin UI
 * GlassCard, SectionHeader
 */
import React from "react";

// --- Glassmorphism Card Component ---
export interface GlassCardProps {
    children: React.ReactNode;
    className?: string;
    hover?: boolean;
    padding?: string;
    onClick?: (e: React.MouseEvent) => void;
}

export function GlassCard({ children, className = "", hover = true, padding = "p-6", onClick }: GlassCardProps) {
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

// --- Section Header Component ---
export interface SectionHeaderProps {
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
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
