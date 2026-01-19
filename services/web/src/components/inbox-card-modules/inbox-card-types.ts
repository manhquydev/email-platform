/**
 * Types for InboxCard component
 */
import type { Inbox } from "../../types";

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
}
