import { useRef, useCallback } from 'react';

interface SwipeHandlers {
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    threshold?: number;
}

interface TouchState {
    startX: number;
    startY: number;
    currentX: number;
    isSwiping: boolean;
}

export function useSwipeActions({ onSwipeLeft, onSwipeRight, threshold = 80 }: SwipeHandlers) {
    const touchState = useRef<TouchState>({
        startX: 0,
        startY: 0,
        currentX: 0,
        isSwiping: false,
    });
    const elementRef = useRef<HTMLDivElement>(null);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        const touch = e.touches[0];
        touchState.current = {
            startX: touch.clientX,
            startY: touch.clientY,
            currentX: touch.clientX,
            isSwiping: false,
        };
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        const touch = e.touches[0];
        const diffX = touch.clientX - touchState.current.startX;
        const diffY = Math.abs(touch.clientY - touchState.current.startY);

        // Only swipe if horizontal movement is greater than vertical
        if (Math.abs(diffX) > diffY && Math.abs(diffX) > 10) {
            touchState.current.isSwiping = true;
            touchState.current.currentX = touch.clientX;

            // Apply transform to element for visual feedback
            if (elementRef.current) {
                const translateX = Math.max(-threshold, Math.min(threshold, diffX));
                elementRef.current.style.transform = `translateX(${translateX}px)`;
                elementRef.current.style.transition = 'none';
            }
        }
    }, [threshold]);

    const handleTouchEnd = useCallback(() => {
        const diffX = touchState.current.currentX - touchState.current.startX;

        // Reset transform
        if (elementRef.current) {
            elementRef.current.style.transform = '';
            elementRef.current.style.transition = 'transform 0.2s ease';
        }

        if (touchState.current.isSwiping) {
            if (diffX > threshold && onSwipeRight) {
                onSwipeRight();
            } else if (diffX < -threshold && onSwipeLeft) {
                onSwipeLeft();
            }
        }

        touchState.current = {
            startX: 0,
            startY: 0,
            currentX: 0,
            isSwiping: false,
        };
    }, [threshold, onSwipeLeft, onSwipeRight]);

    return {
        ref: elementRef,
        handlers: {
            onTouchStart: handleTouchStart,
            onTouchMove: handleTouchMove,
            onTouchEnd: handleTouchEnd,
        },
    };
}
