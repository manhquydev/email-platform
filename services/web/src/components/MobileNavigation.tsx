import { useState, useEffect } from "react";

interface MobileNavigationProps {
    activeTab: "inbox" | "compose" | "search" | "settings";
    onTabChange: (tab: "inbox" | "compose" | "search" | "settings") => void;
    unreadCount?: number;
    onCompose?: () => void;
}

export function MobileNavigation({
    activeTab,
    onTabChange,
    unreadCount = 0,
    onCompose,
}: MobileNavigationProps) {
    const [isVisible, setIsVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);

    // Hide on scroll down, show on scroll up
    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            if (currentScrollY > lastScrollY && currentScrollY > 100) {
                setIsVisible(false);
            } else {
                setIsVisible(true);
            }
            setLastScrollY(currentScrollY);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [lastScrollY]);

    const tabs = [
        {
            id: "inbox" as const,
            label: "Hộp thư",
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            ),
            badge: unreadCount,
        },
        {
            id: "search" as const,
            label: "Tìm kiếm",
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            ),
        },
        {
            id: "compose" as const,
            label: "Soạn",
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            ),
            primary: true,
        },
        {
            id: "settings" as const,
            label: "Cài đặt",
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            ),
        },
    ];

    return (
        <nav
            className={`
                md:hidden fixed bottom-0 left-0 right-0 z-50
                bg-surface border-t border-border
                transition-transform duration-300 safe-area-bottom
                ${isVisible ? 'translate-y-0' : 'translate-y-full'}
            `}
        >
            <div className="flex items-center justify-around h-16 px-2">
                {tabs.map(tab => {
                    const isActive = activeTab === tab.id;

                    if (tab.primary) {
                        return (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    onCompose?.();
                                    onTabChange(tab.id);
                                }}
                                className="relative -mt-6 w-14 h-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center hover-lift transition-all"
                            >
                                {tab.icon}
                            </button>
                        );
                    }

                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`
                                flex flex-col items-center justify-center h-full px-4 transition-colors relative
                                ${isActive ? 'text-primary' : 'text-muted'}
                            `}
                        >
                            <div className="relative">
                                {tab.icon}
                                {tab.badge && tab.badge > 0 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center">
                                        {tab.badge > 9 ? '9+' : tab.badge}
                                    </span>
                                )}
                            </div>
                            <span className="text-[10px] mt-1 font-medium">{tab.label}</span>
                            {isActive && (
                                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
                            )}
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}

// Pull to refresh hook
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

// Pull to refresh indicator component
interface PullToRefreshIndicatorProps {
    pullDistance: number;
    threshold: number;
    isRefreshing: boolean;
}

export function PullToRefreshIndicator({ pullDistance, threshold, isRefreshing }: PullToRefreshIndicatorProps) {
    if (pullDistance === 0 && !isRefreshing) return null;

    const progress = Math.min(pullDistance / threshold, 1);
    const rotation = progress * 360;

    return (
        <div
            className="fixed top-0 left-0 right-0 flex justify-center z-50 pointer-events-none"
            style={{ transform: `translateY(${Math.min(pullDistance, threshold)}px)` }}
        >
            <div className={`
                w-10 h-10 rounded-full bg-surface shadow-lg flex items-center justify-center
                transition-transform
                ${isRefreshing ? 'animate-spin' : ''}
            `}>
                <svg
                    className={`w-5 h-5 ${pullDistance >= threshold ? 'text-primary' : 'text-muted'}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    style={{ transform: `rotate(${rotation}deg)` }}
                >
                    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>
        </div>
    );
}

// Safe area CSS for iOS
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
