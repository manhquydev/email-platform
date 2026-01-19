import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils/cn';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
    size?: 'sm' | 'md' | 'lg' | 'icon';
    isLoading?: boolean;
    icon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
    className,
    variant = 'primary',
    size = 'md',
    isLoading,
    children,
    disabled,
    icon,
    ...props
}, ref) => {
    // Nebula Variants - Using design tokens for consistency
    const variants = {
        primary: 'bg-gradient-to-r from-nebula-violet to-nebula-violet-dark text-white shadow-lg hover:shadow-xl hover:scale-[1.02] border-none',
        secondary: 'bg-nebula-surface/50 backdrop-blur-md border border-nebula-border text-nebula-text hover:bg-nebula-surface/80 hover:border-nebula-border shadow-sm',
        ghost: 'bg-transparent text-nebula-text hover:bg-nebula-elevated/50 data-[state=open]:bg-nebula-elevated/50',
        danger: 'bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20',
        outline: 'border border-nebula-border bg-transparent hover:bg-nebula-surface/50 text-nebula-text',
    };

    // Touch target sizes - WCAG 2.5.5 requires minimum 44x44px for touch targets
    // Using min-h/min-w ensures touch accessibility on mobile devices
    const sizes = {
        sm: 'h-9 min-h-[44px] px-3 text-xs rounded-lg',
        md: 'h-11 min-h-[44px] px-4 py-2 text-sm rounded-xl',
        lg: 'h-12 min-h-[44px] px-6 text-base rounded-2xl',
        icon: 'h-11 w-11 min-h-[44px] min-w-[44px] p-0 flex items-center justify-center rounded-xl',
    };

    return (
        <button
            ref={ref}
            className={cn(
                'relative inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-nebula-violet/50 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]',
                variants[variant],
                sizes[size],
                isLoading && 'text-transparent cursor-wait',
                className
            )}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
            )}
            <span className={cn(isLoading ? 'opacity-0' : 'opacity-100', 'flex items-center gap-2')}>
                {icon}
                {children}
            </span>
        </button>
    );
});

Button.displayName = 'Button';
