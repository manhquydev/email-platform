/* eslint-disable react-refresh/only-export-components */
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// Navigation items configuration
export interface NavItem {
    id: string;
    label: string;
    path: string;
    icon: string; // Material Symbols icon name
    badge?: number;
    adminOnly?: boolean;
    end?: boolean; // Exact match
}

// User navigation items
export const userNavItems: NavItem[] = [
    { id: "dashboard", label: "Tổng quan", path: "/app", icon: "dashboard", end: true },
    { id: "inbox", label: "Hộp thư", path: "/app/inbox", icon: "inbox" },
    { id: "manager", label: "Quản lý", path: "/app/manager", icon: "folder_managed" },
    { id: "domains", label: "Tên miền", path: "/my-domains", icon: "language" },
    { id: "settings", label: "Cài đặt", path: "/settings", icon: "settings" },
    { id: "admin", label: "Quản trị", path: "/admin", icon: "admin_panel_settings", adminOnly: true },
];

// Admin navigation items for bottom nav
export const adminBottomNavItems: NavItem[] = [
    { id: "dashboard", label: "Tổng quan", path: "/admin", icon: "dashboard", end: true },
    { id: "users", label: "Người dùng", path: "/admin/users", icon: "group" },
    { id: "inboxes", label: "Hộp thư", path: "/admin/inboxes", icon: "inbox" },
    { id: "reports", label: "Báo cáo", path: "/admin/reports", icon: "flag" },
];

// Get filtered nav items based on user role
export function useNavItems(context: "user" | "admin" = "user"): NavItem[] {
    const { user } = useAuth();
    const isAdmin = user?.role === "ADMIN";

    if (context === "admin") {
        return adminBottomNavItems;
    }

    return userNavItems.filter((item) => !item.adminOnly || isAdmin);
}

// Check if path is active
export function useIsActive(path: string, end?: boolean): boolean {
    const location = useLocation();
    if (end) {
        return location.pathname === path;
    }
    return location.pathname.startsWith(path);
}

// NavLink component with consistent styling
interface NavLinkItemProps {
    item: NavItem;
    showLabel?: boolean;
    variant?: "sidebar" | "bottom" | "drawer";
    onClick?: () => void;
}

export function NavLinkItem({ item, showLabel = true, variant = "sidebar", onClick }: NavLinkItemProps) {
    const baseClasses = "flex items-center gap-3 transition-all duration-200";

    const variantClasses = {
        sidebar: "px-3 py-3 rounded-xl whitespace-nowrap overflow-hidden min-h-12",
        bottom: "flex-col justify-center items-center w-full h-full py-2 min-h-12 min-w-12",
        drawer: "px-4 py-4 rounded-xl min-h-12",
    };

    const activeClasses = {
        sidebar: "bg-nebula-violet/10 text-nebula-violet border border-nebula-violet/20 shadow-sm",
        bottom: "text-nebula-violet",
        drawer: "bg-nebula-violet/10 text-nebula-violet",
    };

    const inactiveClasses = {
        sidebar: "text-nebula-text-muted hover:text-nebula-text hover:bg-nebula-elevated",
        bottom: "text-nebula-text-muted",
        drawer: "text-nebula-text-secondary hover:bg-nebula-elevated",
    };

    return (
        <NavLink
            to={item.path}
            end={item.end}
            onClick={onClick}
            className={({ isActive }) =>
                `${baseClasses} ${variantClasses[variant]} ${isActive ? activeClasses[variant] : inactiveClasses[variant]}`
            }
        >
            <span className={`material-symbols-outlined ${variant === "bottom" ? "text-[24px]" : "text-[24px]"} shrink-0`}>
                {item.icon}
            </span>
            {showLabel && (
                <span className={`font-medium ${variant === "bottom" ? "text-[10px]" : "text-sm"}`}>
                    {item.label}
                </span>
            )}
            {item.badge && item.badge > 0 && (
                <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-danger text-white">
                    {item.badge > 99 ? "99+" : item.badge}
                </span>
            )}
        </NavLink>
    );
}
