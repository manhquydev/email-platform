import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useNavigation } from "./NavigationContext";
import { useNavItems, NavLinkItem } from "./nav-items";
import { useAuth } from "../../context/AuthContext";
import { ThemeToggle } from "../ThemeToggle";
import { NotificationCenter } from "../NotificationCenter";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "../ui/Dropdown";
import { cn } from "../../utils/cn";

interface DesktopNavProps {
    context?: "user" | "admin";
}

// Brand logo component - defined outside render to avoid recreation
const BrandLogo = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full">
        <path d="M12 12 C12 6, 3 6, 3 12 C3 18, 12 18, 12 12" strokeLinecap="round" />
        <path d="M12 12 C12 6, 21 6, 21 12" strokeLinecap="round" opacity="0.6" />
        <circle cx="21" cy="12" r="1" fill="currentColor" opacity="0.4" />
    </svg>
);

export function DesktopNav({ context = "user" }: DesktopNavProps) {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { isCollapsed, toggleCollapsed } = useNavigation();
    const navItems = useNavItems(context);

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    return (
        <aside
            className={cn(
                "hidden md:flex flex-col h-full shrink-0 transition-all duration-300 ease-in-out",
                "bg-nebula-surface/80 backdrop-blur-xl",
                "border-l border-nebula-border",
                "order-last", // Right side positioning
                isCollapsed ? "w-20" : "w-64"
            )}
        >
            {/* Header - Brand */}
            <div className="flex flex-col gap-6 p-4">
                <motion.div
                    className="flex items-center gap-3 px-2 cursor-pointer min-h-12"
                    onClick={toggleCollapsed}
                    title={isCollapsed ? "Mở rộng" : "Thu gọn"}
                    whileTap={{ scale: 0.98 }}
                >
                    <div className="size-10 text-primary shrink-0 relative flex items-center justify-center">
                        <BrandLogo />
                    </div>
                    {!isCollapsed && (
                        <motion.span
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="text-xl font-bold tracking-tight text-nebula-text whitespace-nowrap"
                        >
                            Ephemera
                        </motion.span>
                    )}
                    {/* Collapse indicator */}
                    <motion.span
                        className={cn(
                            "material-symbols-outlined text-nebula-text-muted ml-auto transition-transform duration-300",
                            isCollapsed ? "rotate-180" : ""
                        )}
                        style={{ display: isCollapsed ? "none" : "block" }}
                    >
                        chevron_right
                    </motion.span>
                </motion.div>

                {/* Navigation Items */}
                <nav className="flex flex-col gap-1.5 mt-2">
                    {navItems.map((item) => (
                        <NavLinkItem
                            key={item.id}
                            item={item}
                            showLabel={!isCollapsed}
                            variant="sidebar"
                        />
                    ))}
                </nav>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Footer - Theme Toggle & User Profile */}
            <div className="p-3 flex flex-col gap-2 border-t border-nebula-border/50 bg-gradient-to-t from-nebula-void/30 to-transparent backdrop-blur-sm">
                {/* Notification Row */}
                <div className={cn(
                    "flex items-center rounded-lg transition-colors",
                    isCollapsed ? "justify-center py-2" : "justify-between px-3 py-2 hover:bg-nebula-elevated/50"
                )}>
                    {!isCollapsed && (
                        <span className="text-xs font-medium text-nebula-text-muted uppercase tracking-wider">
                            Thông báo
                        </span>
                    )}
                    <NotificationCenter />
                </div>

                {/* Theme Toggle Row */}
                <div className={cn(
                    "flex items-center rounded-lg transition-colors",
                    isCollapsed ? "justify-center py-2" : "justify-between px-3 py-2 hover:bg-nebula-elevated/50"
                )}>
                    {!isCollapsed && (
                        <span className="text-xs font-medium text-nebula-text-muted uppercase tracking-wider">
                            Giao diện
                        </span>
                    )}
                    <ThemeToggle />
                </div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-nebula-border/50 to-transparent" />

                {/* User Dropdown */}
                <Dropdown>
                    <DropdownTrigger>
                        <button
                            className={cn(
                                "flex items-center gap-3 px-2 py-2 rounded-xl transition-all w-full text-left group",
                                "hover:bg-nebula-violet/5 hover:shadow-[0_0_20px_rgba(139,92,246,0.1)]",
                                "border border-transparent hover:border-nebula-violet/20"
                            )}
                        >
                            {/* Avatar with glow effect */}
                            <div className="relative">
                                <div className="flex items-center justify-center size-10 rounded-full shrink-0 bg-gradient-to-br from-nebula-violet to-nebula-violet-dark text-white font-bold text-sm shadow-lg shadow-nebula-violet/20 group-hover:shadow-nebula-violet/40 transition-shadow">
                                    {user?.email?.charAt(0).toUpperCase() || "U"}
                                </div>
                                {/* Online indicator */}
                                <div className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-success border-2 border-nebula-surface" />
                            </div>
                            {!isCollapsed && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex-1 flex flex-col items-start overflow-hidden min-w-0"
                                >
                                    <span className="text-sm font-semibold text-nebula-text truncate w-full">
                                        {user?.email?.split("@")[0] || "Người dùng"}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <span className={cn(
                                            "text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide",
                                            user?.tier === "ENTERPRISE" ? "bg-nebula-pink/10 text-nebula-pink" :
                                            user?.tier === "PROFESSIONAL" ? "bg-nebula-cyan/10 text-nebula-cyan" :
                                            user?.tier === "STARTER" ? "bg-success/10 text-success" :
                                            "bg-nebula-text-muted/10 text-nebula-text-muted"
                                        )}>
                                            {user?.tier === "FREE" ? "Free" :
                                             user?.tier === "STARTER" ? "Starter" :
                                             user?.tier === "PROFESSIONAL" ? "Pro" :
                                             user?.tier === "ENTERPRISE" ? "Enterprise" :
                                             "Free"}
                                        </span>
                                    </div>
                                </motion.div>
                            )}
                            {!isCollapsed && (
                                <span className="material-symbols-outlined text-[18px] text-nebula-text-muted group-hover:text-nebula-violet transition-colors">
                                    expand_more
                                </span>
                            )}
                        </button>
                    </DropdownTrigger>

                    <DropdownMenu align="right">
                        <DropdownItem onClick={() => navigate("/settings")} icon="settings">
                            Cài đặt
                        </DropdownItem>
                        <DropdownItem onClick={handleLogout} variant="danger" icon="logout">
                            Đăng xuất
                        </DropdownItem>
                    </DropdownMenu>
                </Dropdown>
            </div>
        </aside>
    );
}
