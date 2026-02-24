import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigation } from "./NavigationContext";
import { useNavItems, type NavItem } from "./nav-items";
import { useAuth } from "../../context/AuthContext";
import { ThemeToggle } from "../ThemeToggle";

interface HamburgerMenuProps {
    context?: "user" | "admin";
}

export function HamburgerMenu({ context = "user" }: HamburgerMenuProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const { isDrawerOpen, closeDrawer } = useNavigation();
    const { user, logout } = useAuth();
    const navItems = useNavItems(context);

    // Close drawer on route change
    useEffect(() => {
        closeDrawer();
    }, [location.pathname, closeDrawer]);

    // Prevent body scroll when drawer is open
    useEffect(() => {
        if (isDrawerOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isDrawerOpen]);

    const handleLogout = () => {
        logout('manual');
        navigate("/login");
        closeDrawer();
    };

    const handleNavClick = (item: NavItem) => {
        navigate(item.path);
        closeDrawer();
    };

    // Check if path is active
    const isActive = (item: NavItem) => {
        if (item.end) return location.pathname === item.path;
        return location.pathname.startsWith(item.path);
    };

    // Additional items for admin drawer (full menu)
    const adminFullNavItems: NavItem[] = context === "admin" ? [
        { id: "dashboard", label: "Tổng quan", path: "/admin", icon: "dashboard", end: true },
        { id: "users", label: "Người dùng", path: "/admin/users", icon: "group" },
        { id: "packages", label: "Gói cước", path: "/admin/packages", icon: "credit_card" },
        { id: "codes", label: "Mã đổi thưởng", path: "/admin/codes", icon: "confirmation_number" },
        { id: "orders", label: "Đơn hàng", path: "/admin/orders", icon: "receipt_long" },
        { id: "inboxes", label: "Hộp thư", path: "/admin/inboxes", icon: "inbox" },
        { id: "emails", label: "Email", path: "/admin/emails", icon: "mail" },
        { id: "rules", label: "Quy tắc bảo vệ", path: "/admin/rules", icon: "shield" },
        { id: "domains", label: "Tên miền", path: "/admin/domains", icon: "language" },
        { id: "reports", label: "Báo cáo", path: "/admin/reports", icon: "flag" },
        { id: "logs", label: "Nhật ký", path: "/admin/logs", icon: "schedule" },
        { id: "system", label: "Hệ thống", path: "/admin/system", icon: "dns" },
        { id: "notifications", label: "Thông báo", path: "/admin/notifications", icon: "notifications" },
        { id: "analytics", label: "Analytics", path: "/admin/analytics", icon: "analytics" },
        { id: "telegram", label: "Telegram", path: "/admin/telegram", icon: "send" },
        { id: "settings", label: "Cài đặt", path: "/admin/settings", icon: "settings" },
    ] : navItems;

    const displayItems = context === "admin" ? adminFullNavItems : navItems;

    return (
        <AnimatePresence>
            {isDrawerOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                        onClick={closeDrawer}
                    />

                    {/* Drawer Panel - Slides from right */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed top-0 right-0 bottom-0 z-50 w-[300px] max-w-[85vw] bg-nebula-surface shadow-2xl flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-nebula-border">
                            <div className="flex items-center gap-3">
                                <div className="size-10 text-nebula-violet">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full">
                                        <path d="M12 12 C12 6, 3 6, 3 12 C3 18, 12 18, 12 12" strokeLinecap="round" />
                                        <path d="M12 12 C12 6, 21 6, 21 12" strokeLinecap="round" opacity="0.6" />
                                        <circle cx="21" cy="12" r="1" fill="currentColor" opacity="0.4" />
                                    </svg>
                                </div>
                                <span className="text-lg font-bold text-nebula-text">
                                    {context === "admin" ? "Quản trị" : "Menu"}
                                </span>
                            </div>
                            <button
                                onClick={closeDrawer}
                                className="p-2 rounded-xl hover:bg-nebula-elevated transition-colors min-h-12 min-w-12 flex items-center justify-center"
                                aria-label="Đóng menu"
                            >
                                <span className="material-symbols-outlined text-nebula-text-muted">close</span>
                            </button>
                        </div>

                        {/* Navigation Items */}
                        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                            {displayItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => handleNavClick(item)}
                                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all min-h-12 ${
                                        isActive(item)
                                            ? "bg-nebula-violet/10 text-nebula-violet"
                                            : "text-nebula-text-secondary hover:bg-nebula-elevated"
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
                                    <span className="text-sm font-medium">{item.label}</span>
                                    {item.badge && item.badge > 0 && (
                                        <span className="ml-auto px-2 py-0.5 text-[10px] font-bold rounded-full bg-danger text-white">
                                            {item.badge > 99 ? "99+" : item.badge}
                                        </span>
                                    )}
                                </button>
                            ))}

                            {/* Back to app link for admin */}
                            {context === "admin" && (
                                <button
                                    onClick={() => { navigate("/app"); closeDrawer(); }}
                                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all min-h-12 text-nebula-text-secondary hover:bg-nebula-elevated mt-4 border-t border-nebula-border pt-6"
                                >
                                    <span className="material-symbols-outlined text-[22px]">arrow_back</span>
                                    <span className="text-sm font-medium">Quay lại ứng dụng</span>
                                </button>
                            )}
                        </nav>

                        {/* Footer */}
                        <div className="p-4 border-t border-nebula-border space-y-3">
                            {/* Theme Toggle */}
                            <div className="flex items-center justify-between px-2">
                                <span className="text-sm text-nebula-text-muted">Giao diện</span>
                                <ThemeToggle />
                            </div>

                            {/* User Info & Logout */}
                            <div className="flex items-center gap-3 px-2 py-2">
                                <div className="size-10 rounded-full bg-nebula-violet/10 flex items-center justify-center text-nebula-violet font-bold">
                                    {user?.email?.charAt(0).toUpperCase() || "U"}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-nebula-text truncate">
                                        {user?.email?.split("@")[0] || "Người dùng"}
                                    </div>
                                    <div className="text-xs text-nebula-text-muted truncate">
                                        {user?.email}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-danger/10 hover:bg-danger/20 text-danger transition-colors min-h-12"
                            >
                                <span className="material-symbols-outlined text-[20px]">logout</span>
                                <span className="text-sm font-medium">Đăng xuất</span>
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
