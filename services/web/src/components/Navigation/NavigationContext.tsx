/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

// Storage key for persistence
const STORAGE_KEY = "ephemera_sidebar_collapsed";

interface NavigationContextValue {
    // Sidebar state
    isCollapsed: boolean;
    setIsCollapsed: (collapsed: boolean) => void;
    toggleCollapsed: () => void;

    // Mobile drawer state
    isDrawerOpen: boolean;
    openDrawer: () => void;
    closeDrawer: () => void;

    // Responsive helpers
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

// Custom hook for media queries
function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(() => {
        if (typeof window === "undefined") return false;
        return window.matchMedia(query).matches;
    });

    useEffect(() => {
        const mediaQuery = window.matchMedia(query);
        const handler = (e: MediaQueryListEvent) => setMatches(e.matches);

        mediaQuery.addEventListener("change", handler);
        return () => mediaQuery.removeEventListener("change", handler);
    }, [query]);

    return matches;
}

export function NavigationProvider({ children }: { children: ReactNode }) {
    // Initialize from localStorage
    const [isCollapsed, setIsCollapsedState] = useState(() => {
        if (typeof window === "undefined") return false;
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored === "true";
    });

    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    // Responsive breakpoints
    const isMobile = useMediaQuery("(max-width: 767px)");
    const isTablet = useMediaQuery("(min-width: 768px) and (max-width: 1023px)");
    const isDesktop = useMediaQuery("(min-width: 1024px)");

    // Auto-collapse on tablet
    useEffect(() => {
        if (isTablet && !isCollapsed) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIsCollapsedState(true);
        }
    }, [isTablet, isCollapsed]);

    // Persist sidebar state
    const setIsCollapsed = useCallback((collapsed: boolean) => {
        setIsCollapsedState(collapsed);
        localStorage.setItem(STORAGE_KEY, String(collapsed));
    }, []);

    const toggleCollapsed = useCallback(() => {
        setIsCollapsed(!isCollapsed);
    }, [isCollapsed, setIsCollapsed]);

    // Drawer controls
    const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
    const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

    // Close drawer on route change (handled by consumers)
    // Close drawer when switching to desktop
    useEffect(() => {
        if (isDesktop && isDrawerOpen) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            closeDrawer();
        }
    }, [isDesktop, isDrawerOpen, closeDrawer]);

    return (
        <NavigationContext.Provider
            value={{
                isCollapsed,
                setIsCollapsed,
                toggleCollapsed,
                isDrawerOpen,
                openDrawer,
                closeDrawer,
                isMobile,
                isTablet,
                isDesktop,
            }}
        >
            {children}
        </NavigationContext.Provider>
    );
}

export function useNavigation() {
    const context = useContext(NavigationContext);
    if (!context) {
        throw new Error("useNavigation must be used within NavigationProvider");
    }
    return context;
}
