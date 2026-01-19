/**
 * UI components for QuickActions
 */
import type { ActionItem } from "./quick-actions-types";

/** Primary action button */
interface ActionButtonProps {
    action: ActionItem;
    index: number;
}

export function ActionButton({ action, index }: ActionButtonProps) {
    return (
        <button
            key={index}
            onClick={(e) => {
                e.stopPropagation();
                action.onClick?.();
            }}
            className={`
                p-2 rounded-lg transition-all hover-lift
                ${action.primary ? 'bg-primary text-white hover:bg-primary-hover' : 'hover:bg-primary-light'}
                ${action.active ? action.color : 'text-muted hover:text-text-main'}
            `}
            title={action.label}
        >
            {action.icon}
        </button>
    );
}

/** More actions toggle button */
interface MoreActionsToggleProps {
    isOpen: boolean;
    onClick: (e: React.MouseEvent) => void;
}

export function MoreActionsToggle({ isOpen, onClick }: MoreActionsToggleProps) {
    return (
        <button
            onClick={onClick}
            className={`p-2 rounded-lg transition-all hover:bg-primary-light ${isOpen ? 'bg-primary-light text-primary' : 'text-muted hover:text-text-main'}`}
            title="Thêm thao tác"
        >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        </button>
    );
}

/** Dropdown menu for more actions */
interface MoreActionsDropdownProps {
    actions: ActionItem[];
    onClose: () => void;
}

export function MoreActionsDropdown({ actions, onClose }: MoreActionsDropdownProps) {
    return (
        <div className="absolute right-0 top-full mt-1 bg-surface border border-border rounded-lg shadow-lg py-1 min-w-[180px] animate-fade-in-up z-50">
            {actions.filter(a => !a.hidden).map((action, idx) => (
                <button
                    key={idx}
                    onClick={(e) => {
                        e.stopPropagation();
                        action.onClick?.();
                        onClose();
                    }}
                    className={`
                        w-full px-3 py-2 flex items-center gap-2 text-sm text-left
                        hover:bg-primary-light transition-colors
                        ${action.color || 'text-text-main'}
                    `}
                >
                    {action.icon}
                    <span>{action.label}</span>
                </button>
            ))}
        </div>
    );
}
