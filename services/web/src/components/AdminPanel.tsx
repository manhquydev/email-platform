/**
 * AdminPanel - Admin layout with sidebar navigation and mobile support
 * Modules extracted to admin-panel-modules/
 */
import { useState, useEffect } from "react";
import { api } from "../utils/api";
import { Outlet } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { NavigationProvider, useNavigation, MobileNav, HamburgerMenu } from "./Navigation/index";
import { useAuth } from "../context/AuthContext";
import { BackgroundEffects } from "./BackgroundEffects";
import {
    type SidebarCounts,
    MobileHeader,
    DesktopSidebar,
    getNavItems
} from "./admin-panel-modules";

export function AdminPanel({ token }: { token: string }) {
    return (
        <NavigationProvider>
            <AdminPanelInner token={token} />
        </NavigationProvider>
    );
}

function AdminPanelInner({ token }: { token: string }) {
    const { setTheme, resolvedTheme } = useTheme();
    const { openDrawer } = useNavigation();
    const { user } = useAuth();
    const [counts, setCounts] = useState<SidebarCounts>({ openReports: 0, totalUsers: 0, totalDomains: 0 });
    const [searchQuery, setSearchQuery] = useState("");
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // Fetch counts for badges
    useEffect(() => {
        const fetchCounts = async () => {
            try {
                const res = await api<{ stats: { openReports: number; totalUsers: number; totalDomains: number } }>("/admin/stats", { token });
                setCounts({
                    openReports: res.stats.openReports,
                    totalUsers: res.stats.totalUsers,
                    totalDomains: res.stats.totalDomains,
                });
            } catch {
                // Silent fail for badge counts
            }
        };
        fetchCounts();
        const interval = setInterval(fetchCounts, 60000);
        return () => clearInterval(interval);
    }, [token]);

    const navItems = getNavItems(counts);

    const toggleTheme = () => {
        if (resolvedTheme === "dark") {
            setTheme("light");
        } else {
            setTheme("dark");
        }
    };

    return (
        <div className="h-screen flex flex-col md:flex-row relative bg-white dark:bg-slate-950">
            <BackgroundEffects variant="subtle" />

            {/* Mobile Header */}
            <MobileHeader userEmail={user?.email} openDrawer={openDrawer} />

            {/* Desktop Sidebar */}
            <DesktopSidebar
                navItems={navItems}
                counts={counts}
                sidebarCollapsed={sidebarCollapsed}
                setSidebarCollapsed={setSidebarCollapsed}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                toggleTheme={toggleTheme}
            />

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
                <Outlet />
            </div>

            {/* Mobile Navigation */}
            <MobileNav context="admin" />
            <HamburgerMenu context="admin" />
        </div>
    );
}
