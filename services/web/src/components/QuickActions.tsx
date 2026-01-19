/**
 * QuickActions - Message action bar with primary and secondary actions
 * Modules extracted to quick-actions-modules/
 */
import { useState } from "react";
import {
    type QuickActionsProps,
    type FloatingQuickActionsBarProps,
    getPrimaryActions,
    getMoreActions,
    ActionButton,
    MoreActionsToggle,
    MoreActionsDropdown
} from "./quick-actions-modules";

export function QuickActions({
    message,
    onReply,
    onForward,
    onDelete,
    onPin,
    onMarkUnread,
    onSnooze,
    onLabel,
    visible = true,
    position,
}: QuickActionsProps) {
    const [showMore, setShowMore] = useState(false);

    if (!visible) return null;

    const actions = getPrimaryActions(message, onReply, onForward, onPin, onSnooze);
    const moreActions = getMoreActions(message, onMarkUnread, onLabel, onDelete);

    const style = position ? {
        position: 'fixed' as const,
        left: position.x,
        top: position.y,
        zIndex: 50,
    } : {};

    return (
        <div
            className="glass rounded-xl shadow-lg p-1.5 animate-scale-in flex items-center gap-0.5"
            style={style}
        >
            {/* Primary Actions */}
            {actions.map((action, idx) => (
                <ActionButton key={idx} action={action} index={idx} />
            ))}

            {/* Divider */}
            <div className="w-px h-6 bg-border mx-1" />

            {/* More Actions Toggle */}
            <div className="relative">
                <MoreActionsToggle
                    isOpen={showMore}
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowMore(!showMore);
                    }}
                />
                {showMore && (
                    <MoreActionsDropdown
                        actions={moreActions}
                        onClose={() => setShowMore(false)}
                    />
                )}
            </div>
        </div>
    );
}

/** Floating Quick Actions Bar - shows when hovering a message */
export function FloatingQuickActionsBar({
    show,
    message,
    onReply,
    onForward,
    onDelete,
    onPin,
    onMarkUnread,
    onSnooze,
}: FloatingQuickActionsBarProps) {
    if (!show || !message) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
            <QuickActions
                message={message}
                onReply={onReply}
                onForward={onForward}
                onDelete={onDelete}
                onPin={(isPinned) => onPin?.(message.id, isPinned)}
                onMarkUnread={() => onMarkUnread?.(message.id)}
                onSnooze={() => onSnooze?.(message.id)}
            />
        </div>
    );
}
