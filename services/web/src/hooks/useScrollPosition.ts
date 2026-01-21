/**
 * useScrollPosition - Persist and restore scroll position across navigation
 * Uses sessionStorage for tab-based persistence
 */

import { useEffect, useCallback, useRef } from 'react';

const SCROLL_KEY_PREFIX = 'scroll_position_';

interface UseScrollPositionOptions {
    /** Unique key for this scroll container */
    key: string;
    /** Debounce delay for scroll save (ms) */
    debounceMs?: number;
    /** Whether to restore on mount */
    restoreOnMount?: boolean;
}

interface ScrollPositionReturn {
    /** Ref to attach to scroll container */
    scrollRef: React.RefObject<HTMLDivElement | null>;
    /** Manually save current position */
    savePosition: () => void;
    /** Manually restore saved position */
    restorePosition: () => void;
    /** Clear saved position */
    clearPosition: () => void;
}

/**
 * Hook to persist scroll position across navigation
 * Attach scrollRef to your scrollable container
 */
export function useScrollPosition({
    key,
    debounceMs = 100,
    restoreOnMount = true,
}: UseScrollPositionOptions): ScrollPositionReturn {
    const scrollRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<number | null>(null);
    const storageKey = `${SCROLL_KEY_PREFIX}${key}`;

    const savePosition = useCallback(() => {
        if (!scrollRef.current) return;
        const position = scrollRef.current.scrollTop;
        try {
            sessionStorage.setItem(storageKey, String(position));
        } catch {
            // sessionStorage may be unavailable
        }
    }, [storageKey]);

    const restorePosition = useCallback(() => {
        if (!scrollRef.current) return;
        try {
            const saved = sessionStorage.getItem(storageKey);
            if (saved) {
                const position = parseInt(saved, 10);
                if (!isNaN(position)) {
                    scrollRef.current.scrollTop = position;
                }
            }
        } catch {
            // sessionStorage may be unavailable
        }
    }, [storageKey]);

    const clearPosition = useCallback(() => {
        try {
            sessionStorage.removeItem(storageKey);
        } catch {
            // sessionStorage may be unavailable
        }
    }, [storageKey]);

    // Debounced scroll handler
    const handleScroll = useCallback(() => {
        if (timeoutRef.current) {
            window.clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = window.setTimeout(savePosition, debounceMs);
    }, [savePosition, debounceMs]);

    // Attach scroll listener and restore on mount
    useEffect(() => {
        const element = scrollRef.current;
        if (!element) return;

        // Restore position on mount
        if (restoreOnMount) {
            // Use requestAnimationFrame to ensure DOM is ready
            requestAnimationFrame(() => {
                restorePosition();
            });
        }

        // Listen for scroll
        element.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            element.removeEventListener('scroll', handleScroll);
            if (timeoutRef.current) {
                window.clearTimeout(timeoutRef.current);
            }
        };
    }, [handleScroll, restoreOnMount, restorePosition]);

    return {
        scrollRef,
        savePosition,
        restorePosition,
        clearPosition,
    };
}
