import { useState, useRef, useEffect, createContext, useContext, type ReactNode } from 'react';
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
    icon?: string;  // Material icon name
    shortcut?: string;  // Keyboard shortcut display
}

// Context for managing dropdown state
interface DropdownContextValue {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    focusedIndex: number;
    setFocusedIndex: (index: number) => void;
    registerItem: () => number;
    unregisterItem: (index: number) => void;
    itemCount: number;
}

const DropdownContext = createContext<DropdownContextValue | undefined>(undefined);

function useDropdownContext() {
    const context = useContext(DropdownContext);
    if (!context) {
        throw new Error('Dropdown components must be used within Dropdown');
    }
    return context;
}

export function Dropdown({ children }: DropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const [itemCount, setItemCount] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLDivElement>(null);

    // Register/unregister items for keyboard navigation
    const registerItem = () => {
        const index = itemCount;
        setItemCount(prev => prev + 1);
        return index;
    };

    const unregisterItem = (index: number) => {
        setItemCount(prev => prev - 1);
    };

    // Click outside to close
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

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) {
            setFocusedIndex(-1);
            return;
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'Escape':
                    e.preventDefault();
                    setIsOpen(false);
                    triggerRef.current?.querySelector('button')?.focus();
                    break;

                case 'ArrowDown':
                    e.preventDefault();
                    setFocusedIndex(prev => {
                        const next = prev + 1;
                        return next >= itemCount ? 0 : next;
                    });
                    break;

                case 'ArrowUp':
                    e.preventDefault();
                    setFocusedIndex(prev => {
                        const next = prev - 1;
                        return next < 0 ? itemCount - 1 : next;
                    });
                    break;

                case 'Home':
                    e.preventDefault();
                    setFocusedIndex(0);
                    break;

                case 'End':
                    e.preventDefault();
                    setFocusedIndex(itemCount - 1);
                    break;

                case 'Tab':
                    setIsOpen(false);
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, focusedIndex, itemCount]);

    const trigger = Array.isArray(children) ? children.find(child => child.type === DropdownTrigger) : null;
    const menu = Array.isArray(children) ? children.find(child => child.type === DropdownMenu) : null;

    const contextValue: DropdownContextValue = {
        isOpen,
        setIsOpen,
        focusedIndex,
        setFocusedIndex,
        registerItem,
        unregisterItem,
        itemCount
    };

    return (
        <DropdownContext.Provider value={contextValue}>
            <div ref={dropdownRef} className="relative">
                <div ref={triggerRef} onClick={() => setIsOpen(!isOpen)}>
                    {trigger}
                </div>
                {isOpen && menu}
            </div>
        </DropdownContext.Provider>
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

export function DropdownItem({ children, onClick, variant = 'default', disabled = false, icon, shortcut }: DropdownItemProps) {
    const { focusedIndex, registerItem, unregisterItem, setIsOpen } = useDropdownContext();
    const [itemIndex, setItemIndex] = useState(-1);
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Register this item on mount
    useEffect(() => {
        const index = registerItem();
        setItemIndex(index);
        return () => unregisterItem(index);
    }, []);

    // Scroll focused item into view
    useEffect(() => {
        if (itemIndex === focusedIndex && buttonRef.current) {
            buttonRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }, [focusedIndex, itemIndex]);

    const isFocused = itemIndex === focusedIndex;

    const variantClasses = {
        default: 'text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5',
        danger: 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10'
    };

    const handleClick = () => {
        if (!disabled && onClick) {
            onClick();
            setIsOpen(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
        }
    };

    return (
        <button
            ref={buttonRef}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className={cn(
                "w-full px-4 py-2.5 text-left text-sm font-medium transition-colors",
                "flex items-center gap-3",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                variantClasses[variant],
                isFocused && "bg-slate-100 dark:bg-white/10 ring-2 ring-primary/50 ring-inset"
            )}
        >
            {icon && (
                <span className="material-symbols-outlined text-[20px]">
                    {icon}
                </span>
            )}
            {typeof children === 'string' ? <span className="flex-1">{children}</span> : children}
            {shortcut && (
                <span className="text-xs text-slate-400 dark:text-gray-500 font-mono">
                    {shortcut}
                </span>
            )}
        </button>
    );
}

// Divider component for visual grouping
export function DropdownDivider() {
    return (
        <div className="h-px bg-slate-200 dark:bg-white/10 my-1" />
    );
}
