/**
 * MobileNavigation - Bottom tab navigation for mobile devices
 * Modules extracted to mobile-navigation-modules/
 */
import { motion } from "framer-motion";
import {
    type MobileNavigationProps,
    useScrollVisibility,
    buildTabs,
    PrimaryTabButton,
    RegularTabButton
} from "./mobile-navigation-modules";

export function MobileNavigation({
    activeTab,
    onTabChange,
    unreadCount = 0,
    onCompose,
}: MobileNavigationProps) {
    const isVisible = useScrollVisibility();
    const tabs = buildTabs(unreadCount);

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
                    if (tab.primary) {
                        return <PrimaryTabButton key={tab.id} tab={tab} onCompose={onCompose} />;
                    }
                    return (
                        <RegularTabButton
                            key={tab.id}
                            tab={tab}
                            isActive={activeTab === tab.id}
                            onTabChange={onTabChange}
                        />
                    );
                })}
            </div>
        </motion.nav>
    );
}

// Re-export for backward compatibility
export { usePullToRefresh, PullToRefreshIndicator, mobileStyles } from "./mobile-navigation-modules";
