/**
 * useReducedMotion - Detects user preference for reduced motion
 * Returns true when user prefers reduced motion or device is low-power
 * Used to disable glassmorphism effects and animations for accessibility/performance
 */

import { useState, useEffect } from "react";

/**
 * Hook to detect if user prefers reduced motion
 * Respects OS-level accessibility settings (prefers-reduced-motion)
 */
export function useReducedMotion(): boolean {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
        // SSR-safe: check if window exists
        if (typeof window === "undefined") return false;
        const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
        return mediaQuery.matches;
    });

    useEffect(() => {
        const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

        const handleChange = (event: MediaQueryListEvent) => {
            setPrefersReducedMotion(event.matches);
        };

        // Modern browsers
        mediaQuery.addEventListener("change", handleChange);

        return () => {
            mediaQuery.removeEventListener("change", handleChange);
        };
    }, []);

    return prefersReducedMotion;
}

/**
 * Hook to detect if device should use simplified visuals
 * Combines reduced motion preference with low-power device detection
 */
export function useSimplifiedVisuals(): boolean {
    const prefersReducedMotion = useReducedMotion();
    const [isLowPowerDevice, setIsLowPowerDevice] = useState(false);

    useEffect(() => {
        // Detect low-power/mobile devices via various heuristics
        const checkLowPower = () => {
            // Check for low memory (< 4GB indicates low-end device)
            const lowMemory = "deviceMemory" in navigator && (navigator as Navigator & { deviceMemory?: number }).deviceMemory !== undefined
                ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory! < 4
                : false;

            // Check for battery saver mode
            const checkBatterySaver = async () => {
                if ("getBattery" in navigator) {
                    try {
                        const battery = await (navigator as Navigator & { getBattery: () => Promise<{ charging: boolean; level: number }> }).getBattery();
                        // Low power if not charging and battery < 20%
                        if (!battery.charging && battery.level < 0.2) {
                            setIsLowPowerDevice(true);
                        }
                    } catch {
                        // Battery API not available
                    }
                }
            };

            // Check for slow connection (save-data header or slow effective type)
            const slowConnection = "connection" in navigator && (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
                ? (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection?.saveData === true ||
                  (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection?.effectiveType === "slow-2g" ||
                  (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection?.effectiveType === "2g"
                : false;

            setIsLowPowerDevice(lowMemory || slowConnection);
            checkBatterySaver();
        };

        checkLowPower();
    }, []);

    return prefersReducedMotion || isLowPowerDevice;
}

/**
 * CSS class helper for conditional glassmorphism
 * Returns simplified styles when reduced motion/low-power is detected
 */
export function getGlassStyles(useSimplified: boolean): string {
    if (useSimplified) {
        // Simplified: solid background, no blur, no animations
        return "bg-slate-900/95 border-slate-700";
    }
    // Full glassmorphism
    return "bg-nebula-surface/50 backdrop-blur-md border-nebula-border";
}
