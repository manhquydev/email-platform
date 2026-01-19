/**
 * SwipeableEmailItem - Email item with swipe-to-archive gesture for mobile
 * Wraps EmailItem with touch swipe detection using useSwipeActions hook
 */

import { useCallback } from "react";
import type { Message } from "../../types";
import { useSwipeActions } from "../../hooks/useSwipeActions";
import { EmailItem } from "./email-stream-components";
import { cn } from "../../utils/cn";

interface SwipeableEmailItemProps {
    message: Message;
    isSelected: boolean;
    onSelect: () => void;
    onCopyOTP: (otp: string, e: React.MouseEvent) => void;
    onArchive?: (messageId: string) => void;
    onMarkUnread?: (messageId: string) => void;
}

/**
 * Swipe actions:
 * - Swipe left: Archive/Delete message
 * - Swipe right: Mark as unread
 */
export function SwipeableEmailItem({
    message,
    isSelected,
    onSelect,
    onCopyOTP,
    onArchive,
    onMarkUnread,
}: SwipeableEmailItemProps) {
    const handleSwipeLeft = useCallback(() => {
        onArchive?.(message.id);
    }, [message.id, onArchive]);

    const handleSwipeRight = useCallback(() => {
        onMarkUnread?.(message.id);
    }, [message.id, onMarkUnread]);

    const { ref, handlers } = useSwipeActions({
        onSwipeLeft: handleSwipeLeft,
        onSwipeRight: handleSwipeRight,
        threshold: 80,
    });

    return (
        <div className="relative overflow-hidden">
            {/* Background action indicators (visible during swipe) */}
            <div className="absolute inset-0 flex">
                {/* Left side - Mark unread (blue) */}
                <div className="flex-1 bg-blue-500 flex items-center justify-start pl-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                </div>
                {/* Right side - Archive (red) */}
                <div className="flex-1 bg-red-500 flex items-center justify-end pr-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </div>
            </div>

            {/* Swipeable email item */}
            <div
                ref={ref}
                {...handlers}
                className={cn(
                    "relative bg-nebula-surface touch-pan-y",
                    "md:pointer-events-none md:touch-none" // Disable swipe on desktop
                )}
            >
                <div className="md:pointer-events-auto">
                    <EmailItem
                        message={message}
                        isSelected={isSelected}
                        onSelect={onSelect}
                        onCopyOTP={onCopyOTP}
                    />
                </div>
            </div>
        </div>
    );
}
