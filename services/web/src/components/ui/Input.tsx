import { type InputHTMLAttributes, forwardRef, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    icon?: ReactNode;
    rightIcon?: ReactNode;
    error?: string;
    label?: string;
    containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
    className,
    containerClassName,
    icon,
    rightIcon,
    error,
    label,
    type,
    ...props
}, ref) => {
    // Auto-add autocomplete for password fields to satisfy browser accessibility
    const autoComplete = props.autoComplete ?? (type === 'password' ? 'new-password' : undefined);

    return (
        <div className={cn("flex flex-col gap-1.5", containerClassName)}>
            {label && (
                <label className="text-sm font-medium text-semantic-text-secondary pl-1">
                    {label}
                </label>
            )}
            <div className="relative group">
                {icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-semantic-text-muted group-focus-within:text-semantic-accent transition-colors">
                        {icon}
                    </div>
                )}
                <input
                    ref={ref}
                    type={type}
                    autoComplete={autoComplete}
                    className={cn(
                        "flex h-10 w-full rounded-xl border border-semantic-border bg-semantic-bg-elevated/30 px-3 py-2 text-sm text-semantic-text-main shadow-sm",
                        "backdrop-blur-md transition-all duration-200",
                        "placeholder:text-semantic-text-muted/50",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-semantic-accent/50 focus-visible:border-semantic-accent/50",
                        "disabled:cursor-not-allowed disabled:opacity-50",
                        icon && "pl-10",
                        rightIcon && "pr-10",
                        error && "border-semantic-danger/50 focus-visible:ring-semantic-danger/20",
                        className
                    )}
                    {...props}
                />
                {rightIcon && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-semantic-text-muted">
                        {rightIcon}
                    </div>
                )}
            </div>
            {error && (
                <p className="text-xs text-semantic-danger pl-1">{error}</p>
            )}
        </div>
    );
});

Input.displayName = 'Input';
