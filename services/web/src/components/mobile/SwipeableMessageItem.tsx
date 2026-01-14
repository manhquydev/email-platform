/**
 * SwipeableMessageItem - Message item with swipe gestures for mobile
 * Swipe left: Delete
 * Swipe right: Toggle read/unread
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

interface SwipeableMessageItemProps {
    /** The message item content */
    children: ReactNode;
    /** Whether the message is read */
    isRead: boolean;
    /** Called when delete action is triggered */
    onDelete: () => void;
    /** Called when toggle read action is triggered */
    onToggleRead: () => void;
    /** Disable swipe actions */
    disabled?: boolean;
    /** Additional class names */
    className?: string;
}

export function SwipeableMessageItem({
    children,
    isRead,
    onDelete,
    onToggleRead,
    disabled = false,
    className,
}: SwipeableMessageItemProps) {
    const handleToggleRead = useCallback(() => {
        onToggleRead();
    }, [onToggleRead]);

    const handleDelete = useCallback(() => {
        onDelete();
    }, [onDelete]);

    const leadingActions = () => (
        <LeadingActions>
            <SwipeAction onClick={handleToggleRead}>
                <div className={cn(
                    'flex items-center justify-center h-full px-6 text-white',
                    isRead ? 'bg-blue-500' : 'bg-gray-500'
                )}>
                    <div className="flex flex-col items-center gap-1">
                        {isRead ? (
                            <>
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <span className="text-xs font-medium">Chưa đọc</span>
                            </>
                        ) : (
                            <>
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                                </svg>
                                <span className="text-xs font-medium">Đã đọc</span>
                            </>
                        )}
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
        <div className={cn('swipeable-message-item', className)}>
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

export default SwipeableMessageItem;
