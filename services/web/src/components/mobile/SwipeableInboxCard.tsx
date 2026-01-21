/**
 * SwipeableInboxCard - Inbox card with swipe gestures for mobile
 * Swipe left: Delete
 * Swipe right: Copy email address
 */

import { useCallback, type ReactNode } from 'react';
import {
    SwipeableList,
    SwipeableListItem,
    SwipeAction,
    TrailingActions,
    LeadingActions,
    Type as ListType,
} from 'react-swipeable-list';
import 'react-swipeable-list/dist/styles.css';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';
import { haptic } from '../../hooks/useHaptic';

interface SwipeableInboxCardProps {
    /** The inbox card content */
    children: ReactNode;
    /** Email address to copy */
    email: string;
    /** Called when delete action is triggered */
    onDelete: () => void;
    /** Called when copy action is triggered */
    onCopy?: () => void;
    /** Disable swipe actions */
    disabled?: boolean;
    /** Additional class names */
    className?: string;
}

export function SwipeableInboxCard({
    children,
    email,
    onDelete,
    onCopy,
    disabled = false,
    className,
}: SwipeableInboxCardProps) {
    const handleCopy = useCallback(() => {
        haptic('success');
        navigator.clipboard.writeText(email);
        toast.success(`Đã sao chép: ${email}`);
        onCopy?.();
    }, [email, onCopy]);

    const handleDelete = useCallback(() => {
        haptic('warning');
        onDelete();
    }, [onDelete]);

    const leadingActions = () => (
        <LeadingActions>
            <SwipeAction onClick={handleCopy}>
                <div className="flex items-center justify-center h-full px-6 bg-green-500 text-white">
                    <div className="flex flex-col items-center gap-1">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                        </svg>
                        <span className="text-xs font-medium">Copy</span>
                    </div>
                </div>
            </SwipeAction>
        </LeadingActions>
    );

    const trailingActions = () => (
        <TrailingActions>
            <SwipeAction destructive={true} onClick={handleDelete}>
                <div className="flex items-center justify-center h-full px-6 bg-red-500 text-white">
                    <div className="flex flex-col items-center gap-1">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span className="text-xs font-medium">Xóa</span>
                    </div>
                </div>
            </SwipeAction>
        </TrailingActions>
    );

    if (disabled) {
        return <div className={className}>{children}</div>;
    }

    return (
        <div className={cn('swipeable-inbox-card', className)}>
            <SwipeableList type={ListType.IOS} threshold={0.25}>
                <SwipeableListItem
                    leadingActions={leadingActions()}
                    trailingActions={trailingActions()}
                >
                    {children}
                </SwipeableListItem>
            </SwipeableList>
        </div>
    );
}

export default SwipeableInboxCard;
