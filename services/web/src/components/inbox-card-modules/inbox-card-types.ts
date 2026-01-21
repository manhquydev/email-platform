/**
 * Types for InboxCard component
 */
import type { Inbox } from "../../types";

/** Layout variant for responsive design */
export type InboxCardVariant = 'default' | 'compact' | 'mobile';

export interface InboxCardProps {
    inbox: Inbox;
    isSelected: boolean;
    isActive: boolean;
    onSelect: () => void;
    onToggleSelect: () => void;
    onCopy: () => void;
    onDelete: () => void;
    onViewMessages: () => void;
    onTransfer?: () => void;
    onExtend?: () => void;
    onTogglePermanent?: () => void;
    onShareModeChange?: (shareMode: 'PUBLIC' | 'PRIVATE') => void;
    onVisibilityRules?: () => void;
    /** Layout variant */
    variant?: InboxCardVariant;
    /** Hide action buttons (useful when wrapped in swipeable container) */
    hideActions?: boolean;
    /** Hide checkbox (for simplified views) */
    hideCheckbox?: boolean;
    /** Additional class name */
    className?: string;
}
