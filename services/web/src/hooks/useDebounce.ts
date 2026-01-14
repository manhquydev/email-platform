/**
 * useDebounce - Debounce a value with configurable delay
 */

import { useState, useEffect } from 'react';

/**
 * Debounce a value - returns the value after it stops changing for `delay` ms
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(timer);
        };
    }, [value, delay]);

    return debouncedValue;
}

/**
 * Debounce a callback function
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
    callback: T,
    delay: number = 300
): T {
    const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

    const debouncedCallback = ((...args: Parameters<T>) => {
        if (timer) {
            clearTimeout(timer);
        }

        const newTimer = setTimeout(() => {
            callback(...args);
        }, delay);

        setTimer(newTimer);
    }) as T;

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timer) {
                clearTimeout(timer);
            }
        };
    }, [timer]);

    return debouncedCallback;
}
