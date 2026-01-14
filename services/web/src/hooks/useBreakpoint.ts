/**
 * useBreakpoint - Hook to detect responsive breakpoints
 * Returns current breakpoint based on window width
 */

import { useState, useEffect } from 'react';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

const BREAKPOINTS = {
    mobile: 0,
    tablet: 768,
    desktop: 1024,
} as const;

function getBreakpoint(width: number): Breakpoint {
    if (width >= BREAKPOINTS.desktop) return 'desktop';
    if (width >= BREAKPOINTS.tablet) return 'tablet';
    return 'mobile';
}

export function useBreakpoint(): Breakpoint {
    const [breakpoint, setBreakpoint] = useState<Breakpoint>(() => {
        if (typeof window === 'undefined') return 'desktop';
        return getBreakpoint(window.innerWidth);
    });

    useEffect(() => {
        const handleResize = () => {
            setBreakpoint(getBreakpoint(window.innerWidth));
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return breakpoint;
}

export function useIsMobile(): boolean {
    return useBreakpoint() === 'mobile';
}

export function useIsDesktop(): boolean {
    return useBreakpoint() === 'desktop';
}
