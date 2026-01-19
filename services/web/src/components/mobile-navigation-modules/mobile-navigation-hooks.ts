/**
 * Custom hooks for MobileNavigation
 */
import { useState, useEffect } from "react";

/** Hook to handle scroll visibility - hide on scroll down, show on scroll up */
export function useScrollVisibility() {
    const [isVisible, setIsVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            if (currentScrollY > lastScrollY && currentScrollY > 100) {
                const windowHeight = window.innerHeight;
                const documentHeight = document.documentElement.scrollHeight;
                if (windowHeight + currentScrollY < documentHeight - 100) {
                    setIsVisible(false);
                }
            } else {
                setIsVisible(true);
            }
            setLastScrollY(currentScrollY);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [lastScrollY]);

    return isVisible;
}

/** Pull to refresh hook for mobile touch interactions */
export function usePullToRefresh(onRefresh: () => Promise<void>) {
    const [isPulling, setIsPulling] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const threshold = 80;

    useEffect(() => {
        let startY = 0;
        let currentY = 0;

        const handleTouchStart = (e: TouchEvent) => {
            if (window.scrollY === 0) {
                startY = e.touches[0].clientY;
                setIsPulling(true);
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!isPulling) return;
            currentY = e.touches[0].clientY;
            const distance = Math.max(0, currentY - startY);
            setPullDistance(Math.min(distance, threshold * 1.5));
        };

        const handleTouchEnd = async () => {
            if (pullDistance >= threshold && !isRefreshing) {
                setIsRefreshing(true);
                await onRefresh();
                setIsRefreshing(false);
            }
            setIsPulling(false);
            setPullDistance(0);
        };

        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('touchmove', handleTouchMove, { passive: true });
        document.addEventListener('touchend', handleTouchEnd);

        return () => {
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, [isPulling, pullDistance, isRefreshing, onRefresh]);

    return { isPulling, pullDistance, isRefreshing, threshold };
}
