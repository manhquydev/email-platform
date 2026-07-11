import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils/cn';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
    size?: 'sm' | 'md' | 'lg' | 'icon';
    isLoading?: boolean;
    /** Shows success checkmark with green styling */
    isSuccess?: boolean;
    icon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
    className,
    variant = 'primary',
    size = 'md',
    isLoading,
    isSuccess,
    children,
    disabled,
    icon,
    ...props
}, ref) => {
    // Phase 1 retoken: uses semantic-* tokens (src/styles/semantic-tokens.css) instead of legacy nebula-*/top-level tokens
    const variants = {
        primary: 'bg-gradient-to-r from-semantic-accent to-semantic-accent-active text-white shadow-lg hover:shadow-xl hover:scale-[1.02] border-none',
        secondary: 'bg-semantic-bg-elevated/50 backdrop-blur-md border border-semantic-border text-semantic-text-main hover:bg-semantic-bg-elevated/80 hover:border-semantic-border-hover shadow-sm',
        ghost: 'bg-transparent text-semantic-text-main hover:bg-semantic-bg-hover data-[state=open]:bg-semantic-bg-hover',
        danger: 'bg-semantic-danger-subtle text-semantic-danger border border-semantic-danger/20 hover:bg-semantic-danger/20',
        outline: 'border border-semantic-border bg-transparent hover:bg-semantic-bg-hover text-semantic-text-main',
    };

    // Touch target sizes - WCAG 2.5.5 requires minimum 44x44px for touch targets
    const sizes = {
        sm: 'h-9 min-h-[44px] px-3 text-xs rounded-lg',
        md: 'h-11 min-h-[44px] px-4 py-2 text-sm rounded-xl',
        lg: 'h-12 min-h-[44px] px-6 text-base rounded-2xl',
        icon: 'h-11 w-11 min-h-[44px] min-w-[44px] p-0 flex items-center justify-center rounded-xl',
    };

    // Success state overrides variant styling
    const successStyles = isSuccess
        ? 'bg-semantic-success-subtle border-semantic-success/30 text-semantic-success hover:bg-semantic-success/20'
        : '';

    return (
        <button
            ref={ref}
            aria-busy={isLoading}
            aria-disabled={disabled || isLoading}
            className={cn(
                'relative inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-semantic-accent/50 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]',
                variants[variant],
                sizes[size],
                (isLoading || isSuccess) && 'text-transparent cursor-wait',
                successStyles,
                className
            )}
            disabled={disabled || isLoading}
            {...props}
        >
            {/* Loading spinner */}
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
            )}

            {/* Success checkmark with scale animation */}
            {isSuccess && !isLoading && (
                <div className="absolute inset-0 flex items-center justify-center animate-[scale_0.2s_ease-out]">
                    <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
            )}

            {/* Button content */}
            <span className={cn(
                (isLoading || isSuccess) ? 'opacity-0' : 'opacity-100',
                'flex items-center gap-2 transition-opacity duration-150'
            )}>
                {icon}
                {children}
            </span>
        </button>
    );
});

Button.displayName = 'Button';
