import React from 'react';
import { cn } from '../../utils/cn';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'elevated' | 'interactive' | 'flat';
    children: React.ReactNode;
}

export function GlassCard({
    variant = 'default',
    className,
    children,
    ...props
}: GlassCardProps) {
    // Phase 1 retoken: previously referenced legacy `.glass-card*` classes from
    // nebula-glass.css (out of scope to edit). `interactive` pointed at a
    // `.glass-card-interactive` class that was never defined anywhere — dead
    // reference, fixed here as a byproduct of moving to semantic tokens.
    const variants = {
        default: 'bg-semantic-bg-elevated border border-semantic-border rounded-xl shadow-semantic-sm transition-shadow duration-200 hover:shadow-semantic-md',
        elevated: 'bg-semantic-bg-elevated border border-semantic-border rounded-xl shadow-semantic-md',
        interactive: 'bg-semantic-bg-elevated border border-semantic-border rounded-xl shadow-semantic-sm transition-all duration-200 hover:shadow-semantic-md hover:border-semantic-border-hover cursor-pointer',
        flat: 'bg-semantic-bg-secondary border border-semantic-border rounded-xl'
    };

    return (
        <div
            className={cn(variants[variant], className)}
            {...props}
        >
            {children}
        </div>
    );
}
