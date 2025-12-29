import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

export function ScrollToTop() {
    const { pathname, hash } = useLocation();
    const timeoutRef = useRef<any>(null);

    useEffect(() => {
        // Clear any pending timeouts
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Determine the scroll container
        // We need to find the element that actually has overflow-y: auto/scroll
        // 1. App Shell Main Scroll
        // 2. Public Layout Scroll (if applicable)
        // 3. Auth Layout Scroll
        // 4. Fallback to Window/Body
        const getScrollContainer = () => {
            const appScroll = document.getElementById("app-main-scroll");
            if (appScroll) return appScroll;

            const publicLayout = document.querySelector(".public-layout");
            if (publicLayout && window.getComputedStyle(publicLayout).overflowY !== 'hidden') {
                return publicLayout;
            }

            const authLayout = document.querySelector(".auth-layout");
            if (authLayout && window.getComputedStyle(authLayout).overflowY !== 'hidden') {
                return authLayout;
            }

            return window;
        };

        const performScroll = (smooth = false) => {
            const container = getScrollContainer();

            // Use standard scrollTo
            container.scrollTo({
                top: 0,
                left: 0,
                behavior: smooth ? "smooth" : "instant",
            });

            // Force scrollTop assignment for fallback (HTML elements only)
            if (container instanceof HTMLElement) {
                container.scrollTop = 0;
            }

            // Also force window scroll just in case
            if (container !== window) {
                window.scrollTo(0, 0);
            }
        };

        const scrollToHash = (elementId: string) => {
            const element = document.getElementById(elementId);
            if (element) {
                element.scrollIntoView({ behavior: "smooth", block: "start" });
                return true;
            }
            return false;
        };

        if (hash) {
            const start = Date.now();
            const id = hash.replace("#", "");

            // Immediate attempt
            if (!scrollToHash(id)) {
                // Retry mechanism for lazy loaded content
                const interval = setInterval(() => {
                    if (scrollToHash(id) || Date.now() - start > 1000) {
                        clearInterval(interval);
                    }
                }, 100);
            }
        } else {
            // Standard scroll to top
            // 1. Immediate
            performScroll(false);

            // 2. Delayed (to handle Suspense/Layout shifts)
            // Check frame + timeout for robustness
            requestAnimationFrame(() => {
                performScroll(false);
            });

            timeoutRef.current = setTimeout(() => {
                performScroll(false);
            }, 100);
        }
    }, [pathname, hash]);

    return null;
}
