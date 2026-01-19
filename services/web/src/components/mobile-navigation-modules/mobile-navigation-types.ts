/**
 * Types and constants for MobileNavigation
 */

export interface MobileNavigationProps {
    activeTab: "inbox" | "search" | "domains" | "settings";
    onTabChange: (tab: "inbox" | "search" | "domains" | "settings") => void;
    unreadCount?: number;
    onCompose?: () => void;
}

export interface TabConfig {
    id: "inbox" | "domains" | "compose" | "settings";
    label: string;
    icon: React.ReactNode;
    badge?: number;
    primary?: boolean;
}

export interface PullToRefreshIndicatorProps {
    pullDistance: number;
    threshold: number;
    isRefreshing: boolean;
}

/** Safe area CSS for iOS */
export const mobileStyles = `
/* Safe area for iOS */
.safe-area-bottom {
    padding-bottom: env(safe-area-inset-bottom, 0);
}

.safe-area-top {
    padding-top: env(safe-area-inset-top, 0);
}

/* Hide scrollbar on mobile */
.scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
}

.scrollbar-hide::-webkit-scrollbar {
    display: none;
}

/* Touch feedback */
.touch-feedback:active {
    opacity: 0.7;
    transform: scale(0.98);
}
`;
