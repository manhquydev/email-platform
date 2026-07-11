/**
 * Tabs - ARIA tablist/tab/tabpanel primitive (Phase 6)
 *
 * Controlled component: the caller owns `activeId` (Settings.tsx needs this
 * for its `?tab=` URL sync). Compound-component API mirrors the existing
 * Dropdown.tsx convention (context + subcomponents) already used in this repo.
 */
import { createContext, useContext, useRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { useTabsKeyboardNav } from '../../hooks/use-tabs-keyboard-nav';

interface TabsContextValue {
    activeId: string;
    onChange: (id: string) => void;
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined);

function useTabsContext() {
    const context = useContext(TabsContext);
    if (!context) {
        throw new Error('Tabs subcomponents must be used within <Tabs>');
    }
    return context;
}

interface TabsProps {
    activeId: string;
    onChange: (id: string) => void;
    children: ReactNode;
    className?: string;
}

export function Tabs({ activeId, onChange, children, className }: TabsProps) {
    return (
        <TabsContext.Provider value={{ activeId, onChange }}>
            <div className={className}>{children}</div>
        </TabsContext.Provider>
    );
}

interface TabsListProps extends HTMLAttributes<HTMLDivElement> {
    'aria-label': string;
}

export function TabsList({ className, children, ...props }: TabsListProps) {
    const { onChange } = useTabsContext();
    const { handleKeyDown } = useTabsKeyboardNav({ onChange });
    const listRef = useRef<HTMLDivElement>(null);

    return (
        <div
            ref={listRef}
            role="tablist"
            onKeyDown={handleKeyDown}
            className={cn('flex items-center gap-1', className)}
            {...props}
        >
            {children}
        </div>
    );
}

interface TabsTriggerProps {
    id: string;
    children: ReactNode;
    icon?: ReactNode;
    className?: string;
    disabled?: boolean;
}

export function TabsTrigger({ id, children, icon, className, disabled }: TabsTriggerProps) {
    const { activeId, onChange } = useTabsContext();
    const isActive = activeId === id;

    return (
        <button
            type="button"
            role="tab"
            id={`tab-${id}`}
            aria-selected={isActive}
            aria-controls={`tabpanel-${id}`}
            data-tab-id={id}
            tabIndex={isActive ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(id)}
            className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all whitespace-nowrap text-sm font-medium min-h-[44px]',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-semantic-accent focus-visible:ring-offset-2',
                isActive
                    ? 'bg-semantic-accent-subtle text-semantic-accent-text border border-semantic-accent/20 shadow-semantic-sm'
                    : 'text-semantic-text-secondary hover:text-semantic-text-main hover:bg-semantic-bg-hover',
                disabled && 'opacity-50 pointer-events-none',
                className
            )}
        >
            {icon}
            {children}
        </button>
    );
}

interface TabsPanelProps {
    id: string;
    children: ReactNode;
    className?: string;
}

/** Only renders its content while active — matches the existing "one active tab mounted" pattern in Settings.tsx. */
export function TabsPanel({ id, children, className }: TabsPanelProps) {
    const { activeId } = useTabsContext();
    if (activeId !== id) return null;

    return (
        <div id={`tabpanel-${id}`} role="tabpanel" aria-labelledby={`tab-${id}`} tabIndex={0} className={className}>
            {children}
        </div>
    );
}
