/**
 * PullToRefresh - Pull-to-refresh component for lists
 * Provides native-like pull-to-refresh experience
 */

import { useState, useRef, useCallback, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface PullToRefreshProps {
    /** Content to render */
    children: ReactNode;
    /** Called when refresh is triggered */
    onRefresh: () => Promise<void>;
    /** Whether currently refreshing */
    isRefreshing?: boolean;
    /** Pull threshold in pixels */
    threshold?: number;
    /** Maximum pull distance in pixels */
    maxPull?: number;
    /** Disable pull-to-refresh */
    disabled?: boolean;
    /** Additional class names */
    className?: string;
}

export function PullToRefresh({
    children,
    onRefresh,
    isRefreshing = false,
    threshold = 80,
    maxPull = 120,
    disabled = false,
    className,
}: PullToRefreshProps) {
    const [pullDistance, setPullDistance] = useState(0);
    const [isPulling, setIsPulling] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const startY = useRef(0);
    const canPull = useRef(false);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (disabled || isRefreshing) return;

        const container = containerRef.current;
        // Only allow pull when at top of scrollable area
        if (container && container.scrollTop <= 0) {
            startY.current = e.touches[0].clientY;
            canPull.current = true;
        } else {
            canPull.current = false;
        }
    }, [disabled, isRefreshing]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!canPull.current || disabled || isRefreshing) return;

        const currentY = e.touches[0].clientY;
        const deltaY = currentY - startY.current;

        // Only pull down, not up
        if (deltaY > 0) {
            // Apply resistance to make it feel natural
            const resistance = 0.5;
            const newPullDistance = Math.min(deltaY * resistance, maxPull);
            setPullDistance(newPullDistance);
            setIsPulling(true);

            // Prevent scroll if pulling
            if (newPullDistance > 10) {
                e.preventDefault();
            }
        }
    }, [disabled, isRefreshing, maxPull]);

    const handleTouchEnd = useCallback(async () => {
        if (!canPull.current || disabled || isRefreshing) return;

        if (pullDistance >= threshold) {
            // Trigger refresh
            try {
                await onRefresh();
            } catch {
                // Ignore refresh errors
            }
        }

        setPullDistance(0);
        setIsPulling(false);
        canPull.current = false;
    }, [disabled, isRefreshing, pullDistance, threshold, onRefresh]);

    const progress = Math.min(pullDistance / threshold, 1);
    const shouldRefresh = pullDistance >= threshold;

    return (
        <div
            ref={containerRef}
            className={cn('relative overflow-auto', className)}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Pull indicator */}
            <div
                className={cn(
                    'absolute top-0 left-0 right-0 flex items-center justify-center z-10',
                    'transition-transform duration-200',
                    !isPulling && !isRefreshing && 'transition-none'
                )}
                style={{
                    height: `${pullDistance}px`,
                    transform: isRefreshing ? `translateY(${threshold}px)` : undefined,
                }}
            >
                <div
                    className={cn(
                        'flex items-center justify-center w-10 h-10 rounded-full bg-primary/10',
                        'transition-all duration-200'
                    )}
                    style={{
                        opacity: progress,
                        transform: `scale(${0.5 + progress * 0.5}) rotate(${progress * 360}deg)`,
                    }}
                >
                    {isRefreshing ? (
                        <svg className="w-5 h-5 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                    ) : (
                        <svg
                            className={cn(
                                'w-5 h-5 transition-transform duration-200',
                                shouldRefresh ? 'text-primary' : 'text-text-secondary'
                            )}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                            style={{
                                transform: shouldRefresh ? 'rotate(180deg)' : undefined,
                            }}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                    )}
                </div>
            </div>

            {/* Content */}
            <div
                className={cn(
                    'transition-transform duration-200',
                    !isPulling && !isRefreshing && 'transition-none'
                )}
                style={{
                    transform: pullDistance > 0 || isRefreshing
                        ? `translateY(${isRefreshing ? threshold : pullDistance}px)`
                        : undefined,
                }}
            >
                {children}
            </div>
        </div>
    );
}

export default PullToRefresh;
