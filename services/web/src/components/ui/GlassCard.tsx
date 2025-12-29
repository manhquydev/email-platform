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
    const variants = {
        default: 'glass-card',
        elevated: 'glass-card-elevated',
        interactive: 'glass-card-interactive',
        flat: 'glass-panel'
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
