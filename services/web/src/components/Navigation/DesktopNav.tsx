import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useNavigation } from "./NavigationContext";
import { useNavItems, NavLinkItem } from "./nav-items";
import { useAuth } from "../../context/AuthContext";
import { ThemeToggle } from "../ThemeToggle";
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
            <div className="p-4 flex flex-col gap-3 border-t border-nebula-border bg-nebula-elevated/50">
                {/* Theme Toggle */}
                <div className={cn("flex items-center", isCollapsed ? "justify-center" : "justify-start px-2")}>
                    <ThemeToggle />
                </div>

                {/* User Dropdown */}
                <Dropdown>
                    <DropdownTrigger>
                        <button
                            className={cn(
                                "flex items-center gap-3 px-2 py-2.5 rounded-xl transition-colors w-full text-left min-h-12",
                                "text-nebula-text-secondary hover:bg-nebula-elevated"
                            )}
                        >
                            <div className="flex items-center justify-center aspect-square rounded-full size-10 shrink-0 ring-2 ring-nebula-border bg-nebula-violet/10 text-nebula-violet font-bold text-sm">
                                {user?.email?.charAt(0).toUpperCase() || "U"}
                            </div>
                            {!isCollapsed && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex flex-col items-start overflow-hidden"
                                >
                                    <span className="text-sm font-medium text-nebula-text truncate w-full">
                                        {user?.email?.split("@")[0] || "Người dùng"}
                                    </span>
                                    <span className="text-xs text-nebula-text-muted truncate w-full uppercase tracking-wide">
                                        Gói{" "}
                                        {user?.tier === "FREE"
                                            ? "MIỄN PHÍ"
                                            : user?.tier === "STARTER"
                                            ? "KHỞI ĐẦU"
                                            : user?.tier === "PROFESSIONAL"
                                            ? "CHUYÊN NGHIỆP"
                                            : user?.tier === "ENTERPRISE"
                                            ? "DOANH NGHIỆP"
                                            : user?.tier || "MIỄN PHÍ"}
                                    </span>
                                </motion.div>
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
