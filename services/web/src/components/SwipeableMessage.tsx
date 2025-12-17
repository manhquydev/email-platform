import { type ReactNode } from 'react';
import { useSwipeActions } from '../hooks/useSwipeActions';

interface SwipeableMessageProps {
    children: ReactNode;
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    leftLabel?: string;
    rightLabel?: string;
    leftColor?: string;
    rightColor?: string;
}

export function SwipeableMessage({
    children,
    onSwipeLeft,
    onSwipeRight,
    leftLabel = "Xóa",
    rightLabel = "Ghim",
    leftColor = "bg-red-500",
    rightColor = "bg-yellow-500",
}: SwipeableMessageProps) {
    const { ref, handlers } = useSwipeActions({
        onSwipeLeft,
        onSwipeRight,
        threshold: 80,
    });

    return (
        <div className="relative overflow-hidden">
            {/* Background actions revealed on swipe */}
            <div className="absolute inset-0 flex">
                {/* Left action (revealed when swiping right) */}
                <div className={`flex-1 ${rightColor} flex items-center justify-start pl-4`}>
                    <span className="text-white text-sm font-medium">{rightLabel}</span>
                </div>
                {/* Right action (revealed when swiping left) */}
                <div className={`flex-1 ${leftColor} flex items-center justify-end pr-4`}>
                    <span className="text-white text-sm font-medium">{leftLabel}</span>
                </div>
            </div>

            {/* Swipeable content */}
            <div
                ref={ref}
                {...handlers}
                className="relative bg-surface"
            >
                {children}
            </div>
        </div>
    );
}
