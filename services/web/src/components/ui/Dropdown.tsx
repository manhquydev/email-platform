import { useState, useRef, useEffect, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface DropdownProps {
    children: ReactNode;
}

interface DropdownTriggerProps {
    children: ReactNode;
}

interface DropdownMenuProps {
    children: ReactNode;
    align?: 'left' | 'right' | 'center';
}

interface DropdownItemProps {
    children: ReactNode;
    onClick?: () => void;
    variant?: 'default' | 'danger';
    disabled?: boolean;
}

export function Dropdown({ children }: DropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const trigger = Array.isArray(children) ? children.find(child => child.type === DropdownTrigger) : null;
    const menu = Array.isArray(children) ? children.find(child => child.type === DropdownMenu) : null;

    return (
        <div ref={dropdownRef} className="relative">
            <div onClick={() => setIsOpen(!isOpen)}>
                {trigger}
            </div>
            {isOpen && menu}
        </div>
    );
}

export function DropdownTrigger({ children }: DropdownTriggerProps) {
    return <>{children}</>;
}

export function DropdownMenu({ children, align = 'left' }: DropdownMenuProps) {
    const alignmentClasses = {
        left: 'left-0',
        right: 'right-0',
        center: 'left-1/2 -translate-x-1/2'
    };

    return (
        <div
            className={cn(
                "absolute bottom-full mb-2 min-w-[200px] z-50",
                "bg-white dark:bg-[#0a0a14] border border-slate-200 dark:border-white/10",
                "rounded-xl shadow-xl dark:shadow-[0_0_30px_rgba(0,0,0,0.5)]",
                "py-2 animate-in fade-in slide-in-from-bottom-2 duration-200",
                alignmentClasses[align]
            )}
        >
            {children}
        </div>
    );
}

export function DropdownItem({ children, onClick, variant = 'default', disabled = false }: DropdownItemProps) {
    const variantClasses = {
        default: 'text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5',
        danger: 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10'
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "w-full px-4 py-2.5 text-left text-sm font-medium transition-colors",
                "flex items-center gap-3",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                variantClasses[variant]
            )}
        >
            {children}
        </button>
    );
}
