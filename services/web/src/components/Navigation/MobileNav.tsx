import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigation } from "./NavigationContext";
import { useNavItems, type NavItem } from "./nav-items";
import { useAuth } from "../../context/AuthContext";

interface MobileNavProps {
    context?: "user" | "admin";
    onCompose?: () => void;
    unreadCount?: number;
}

export function MobileNav({ context = "user", onCompose, unreadCount = 0 }: MobileNavProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const { openDrawer } = useNavigation();
    // Auth context available if needed for user-specific nav items
    useAuth();
    const navItems = useNavItems(context);

    const [isVisible, setIsVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);

    // Hide on scroll down, show on scroll up
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

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, [lastScrollY]);

    // Check if path is active
    const isActive = (item: NavItem) => {
        if (item.end) return location.pathname === item.path;
        return location.pathname.startsWith(item.path);
    };

    // Build nav items with compose button for user context
    const displayItems: (NavItem | { id: string; type: "compose" } | { id: string; type: "more" })[] = [];

    if (context === "user") {
        // User: Inbox, Domains, [Compose], Settings, (Admin if admin)
        const inbox = navItems.find((i) => i.id === "inbox");
        const domains = navItems.find((i) => i.id === "domains");
        const settings = navItems.find((i) => i.id === "settings");
        const admin = navItems.find((i) => i.id === "admin");

        if (inbox) displayItems.push(inbox);
        if (domains) displayItems.push(domains);
        displayItems.push({ id: "compose", type: "compose" });
        if (settings) displayItems.push(settings);
        if (admin) displayItems.push(admin);
    } else {
        // Admin: Dashboard, Users, Inboxes, Reports, More
        navItems.forEach((item) => displayItems.push(item));
        displayItems.push({ id: "more", type: "more" });
    }

    return (
        <motion.nav
            initial={false}
            animate={{
                y: isVisible ? 0 : "100%",
                opacity: isVisible ? 1 : 0,
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-white/10 safe-area-bottom"
        >
            <div className="flex justify-around items-center h-16 px-1">
                {displayItems.map((item) => {
                    // Compose button (FAB style)
                    if ("type" in item && item.type === "compose") {
                        return (
                            <motion.button
                                key="compose"
                                whileTap={{ scale: 0.9 }}
                                whileHover={{ scale: 1.05 }}
                                onClick={() => onCompose?.()}
                                className="relative -top-4 bg-gradient-to-tr from-primary to-purple-500 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-primary/30 border-4 border-white dark:border-slate-900"
                                aria-label="Soạn thư"
                            >
                                <span className="material-symbols-outlined text-[28px]">add</span>
                            </motion.button>
                        );
                    }

                    // More button (opens drawer)
                    if ("type" in item && item.type === "more") {
                        return (
                            <motion.button
                                key="more"
                                whileTap={{ scale: 0.95 }}
                                onClick={openDrawer}
                                className="flex flex-col items-center justify-center w-full h-full py-2 min-h-12 min-w-12 text-slate-400 dark:text-slate-500"
                                aria-label="Thêm"
                            >
                                <span className="material-symbols-outlined text-[24px]">more_horiz</span>
                                <span className="text-[10px] font-medium mt-0.5">Thêm</span>
                            </motion.button>
                        );
                    }

                    // Regular nav item
                    const navItem = item as NavItem;
                    const active = isActive(navItem);

                    return (
                        <motion.button
                            key={navItem.id}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => navigate(navItem.path)}
                            className={`flex flex-col items-center justify-center w-full h-full py-2 min-h-12 min-w-12 transition-colors ${
                                active ? "text-primary dark:text-primary" : "text-slate-400 dark:text-slate-500"
                            }`}
                            aria-label={navItem.label}
                        >
                            <div className="relative">
                                <span className="material-symbols-outlined text-[24px]">{navItem.icon}</span>
                                {/* Badge for inbox */}
                                <AnimatePresence>
                                    {navItem.id === "inbox" && unreadCount > 0 && (
                                        <motion.span
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0, opacity: 0 }}
                                            className="absolute -top-1 -right-1 min-w-[16px] h-[16px] flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full px-1"
                                        >
                                            {unreadCount > 9 ? "9+" : unreadCount}
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                                {/* Active indicator */}
                                {active && (
                                    <motion.div
                                        layoutId="mobileActiveTab"
                                        className="absolute -inset-1.5 bg-primary/10 rounded-full -z-10"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                                    />
                                )}
                            </div>
                            <span className="text-[10px] font-medium mt-0.5">{navItem.label}</span>
                        </motion.button>
                    );
                })}
            </div>
        </motion.nav>
    );
}
