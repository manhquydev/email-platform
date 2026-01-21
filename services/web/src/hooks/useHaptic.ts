/**
 * useHaptic - Haptic feedback for mobile interactions
 * Uses Vibration API with graceful degradation
 */

type HapticStyle = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error';

/** Vibration patterns in milliseconds */
const HAPTIC_PATTERNS: Record<HapticStyle, number | number[]> = {
    light: 10,
    medium: 20,
    heavy: 30,
    selection: 5,
    success: [10, 50, 10],
    warning: [20, 50, 20],
    error: [30, 50, 30, 50, 30],
};

/**
 * Check if Vibration API is supported
 */
function isHapticSupported(): boolean {
    return typeof navigator !== 'undefined' && 'vibrate' in navigator;
}

/**
 * Trigger haptic feedback
 * Gracefully degrades on unsupported devices
 */
export function haptic(style: HapticStyle = 'light'): void {
    if (!isHapticSupported()) return;

    try {
        const pattern = HAPTIC_PATTERNS[style];
        navigator.vibrate(pattern);
    } catch {
        // Vibration may fail silently
    }
}

/**
 * Hook for haptic feedback with memoized handlers
 * Returns functions that can be called directly in event handlers
 */
export function useHaptic() {
    return {
        /** Light tap feedback */
        light: () => haptic('light'),
        /** Medium tap feedback */
        medium: () => haptic('medium'),
        /** Heavy tap feedback */
        heavy: () => haptic('heavy'),
        /** Selection change feedback */
        selection: () => haptic('selection'),
        /** Success action feedback */
        success: () => haptic('success'),
        /** Warning feedback */
        warning: () => haptic('warning'),
        /** Error feedback */
        error: () => haptic('error'),
        /** Check if haptic is supported */
        isSupported: isHapticSupported(),
    };
}
