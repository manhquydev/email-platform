/**
 * Feature flag hook for mobile bottom navigation
 * Enables gradual rollout of new mobile UI
 */

import { useState, useEffect, useCallback } from 'react';

const FEATURE_KEY = 'feature_mobile_bottom_nav';

export type FeatureState = 'enabled' | 'disabled' | 'default';

/**
 * Check if mobile bottom navigation is enabled
 * Default: enabled for all users (can be disabled via localStorage)
 * Uses state + effect pattern to avoid SSR hydration mismatch
 */
export function useMobileBottomNav(): boolean {
    // Default to true for SSR, will sync with localStorage on mount
    const [isEnabled, setIsEnabled] = useState(true);

    useEffect(() => {
        const stored = localStorage.getItem(FEATURE_KEY);
        setIsEnabled(stored !== 'disabled');
    }, []);

    return isEnabled;
}

/**
 * Set mobile bottom navigation feature state
 */
export function setMobileBottomNav(enabled: boolean): void {
    if (typeof window === 'undefined') return;

    if (enabled) {
        localStorage.removeItem(FEATURE_KEY);
    } else {
        localStorage.setItem(FEATURE_KEY, 'disabled');
    }
}

/**
 * Toggle mobile bottom navigation feature
 * Note: This is a utility function, not a hook - reads localStorage directly
 */
export function toggleMobileBottomNav(): boolean {
    if (typeof window === 'undefined') return true;

    const stored = localStorage.getItem(FEATURE_KEY);
    const currentEnabled = stored !== 'disabled';
    setMobileBottomNav(!currentEnabled);
    return !currentEnabled;
}
