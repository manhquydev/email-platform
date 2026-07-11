import { type HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

type BadgeVariant = 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
    default: 'bg-semantic-bg-hover text-semantic-text-secondary',
    accent: 'bg-semantic-accent-subtle text-semantic-accent-text',
    success: 'bg-semantic-success-subtle text-semantic-success',
    warning: 'bg-semantic-warning-subtle text-semantic-warning',
    danger: 'bg-semantic-danger-subtle text-semantic-danger',
    info: 'bg-semantic-info-subtle text-semantic-info',
};

export function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium leading-none',
                variantClasses[variant],
                className
            )}
            {...props}
        >
            {children}
        </span>
    );
}
