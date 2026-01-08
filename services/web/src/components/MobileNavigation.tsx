import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface MobileNavigationProps {
    activeTab: "inbox" | "search" | "domains" | "settings";
    onTabChange: (tab: "inbox" | "search" | "domains" | "settings") => void;
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
                // Determine if we are at the bottom of the page
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
            id: "domains" as const,
            label: "Tên miền",
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            ),
        },
        {
            id: "compose" as const,
            label: "Soạn",
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path d="M12 4.5v15m7.5-7.5h-15" strokeLinecap="round" strokeLinejoin="round" />
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
        <motion.nav
            initial={false}
            animate={{
                y: isVisible ? 0 : "100%",
                opacity: isVisible ? 1 : 0
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--nebula-surface-elevated)] backdrop-blur-lg border-t border-[var(--nebula-border)] safe-area-bottom pb-[env(safe-area-inset-bottom)]"
        >
            <div className="flex justify-around items-center h-16 px-2">
                {tabs.map(tab => {
                    const isActive = activeTab === tab.id;

                    if (tab.primary) {
                        return (
                            <motion.button
                                key={tab.id}
                                whileTap={{ scale: 0.9 }}
                                whileHover={{ scale: 1.1 }}
                                onClick={() => onCompose?.()}
                                className="relative -top-5 bg-gradient-to-tr from-[var(--nebula-primary)] to-[var(--nebula-violet)] text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-[var(--nebula-primary)]/40 border-4 border-[var(--nebula-bg)]"
                                aria-label={tab.label}
                            >
                                {tab.icon}
                                <motion.div
                                    className="absolute inset-0 rounded-full bg-white/20 -z-10"
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                />
                            </motion.button>
                        );
                    }

                    return (
                        <motion.button
                            key={tab.id}
                            whileTap={{ scale: 0.95 }}
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            onClick={() => onTabChange(tab.id as any)}
                            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-[var(--nebula-primary)]' : 'text-[var(--nebula-text-muted)]'}`}
                            aria-label={tab.label}
                        >
                            <div className="relative">
                                {tab.icon}
                                <AnimatePresence>
                                    {tab.badge && tab.badge > 0 && (
                                        <motion.span
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0, opacity: 0 }}
                                            className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center bg-[var(--nebula-error)] text-white text-[10px] font-bold rounded-full border-2 border-[var(--nebula-bg)] px-1"
                                        >
                                            {tab.badge > 9 ? '9+' : tab.badge}
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute -inset-2 bg-[var(--nebula-primary)]/10 rounded-full -z-10"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                            </div>
                            <span className="text-[10px] font-medium">{tab.label}</span>
                        </motion.button>
                    );
                })}
            </div>
        </motion.nav>
    );
}

// Pull to refresh hook
// eslint-disable-next-line react-refresh/only-export-components
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
