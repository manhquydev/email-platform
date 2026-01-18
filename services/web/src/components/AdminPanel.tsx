import { useState, useEffect } from "react";
import { api } from "../utils/api";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { NavigationProvider, useNavigation, MobileNav, HamburgerMenu } from "./Navigation/index";
import { useAuth } from "../context/AuthContext";
import { BackgroundEffects } from "./BackgroundEffects";

// Define NavItem type
interface NavItem {
    id: string;
    label: string;
    path: string;
    icon: React.ReactNode;
    badge?: number;
    end?: boolean; // Exact match for router
}

interface SidebarCounts {
    openReports: number;
    totalUsers: number;
    totalDomains: number;
}

// SVG Icons - Simple and Consistent (Heroicons Outline style)
const icons = {
    dashboard: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h7v7H3V3zm11 0h7v7h-7V3zm-11 11h7v7H3v-7zm11 0h7v7h-7v-7z" />
        </svg>
    ),
    users: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2m8-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm12 10v-2a4 4 0 0 0-3-3.87m-4-12a4 4 0 0 1 0 7.75" />
        </svg>
    ),
    shield: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
    ),
    globe: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
    ),
    flag: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1v12zm0 0v6" />
        </svg>
    ),
    clock: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
        </svg>
    ),
    cog: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
    ),
    back: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m7-7l-7 7 7 7" />
        </svg>
    ),
    search: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
    ),
    email: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
    ),
    creditCard: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
        </svg>
    ),
    server: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3V7.5a3 3 0 013-3h13.5a3 3 0 013 3v3.75a3 3 0 01-3 3m-13.5 0h13.5m-13.5 0a3 3 0 00-3 3v3.75a3 3 0 003 3h13.5a3 3 0 003-3v-3.75a3 3 0 00-3-3m-13.5 0h13.5" />
        </svg>
    ),
    inbox: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
    ),
    receipt: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
    ),
    ticket: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
        </svg>
    )
};

// Badge Component
function Badge({ count, color = "red" }: { count: number; color?: "red" | "blue" | "green" }) {
    if (!count || count === 0) return null;

    const colorClasses = {
        red: "bg-danger text-white",
        blue: "bg-info text-white",
        green: "bg-success text-white",
    };

    return (
        <span className={`ml-auto px-1.5 py-0.5 text-[10px] font-bold rounded-full ${colorClasses[color]}`}>
            {count > 99 ? "99+" : count}
        </span>
    );
}

export function AdminPanel({ token }: { token: string }) {
    return (
        <NavigationProvider>
            <AdminPanelInner token={token} />
        </NavigationProvider>
    );
}

// Inner component that uses navigation context
function AdminPanelInner({ token }: { token: string }) {
    const { setTheme, resolvedTheme } = useTheme();
    const { openDrawer } = useNavigation();
    const { user } = useAuth();
    const [counts, setCounts] = useState<SidebarCounts>({ openReports: 0, totalUsers: 0, totalDomains: 0 });
    const [searchQuery, setSearchQuery] = useState("");
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    // const location = useLocation(); // Unused

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
        // Refresh every 60 seconds
        const interval = setInterval(fetchCounts, 60000);
        return () => clearInterval(interval);
    }, [token]);


    const navItems: NavItem[] = [
        { id: "dashboard", label: "Tổng quan", path: "/admin", icon: icons.dashboard, end: true },
        { id: "users", label: "Người dùng", path: "/admin/users", icon: icons.users, badge: counts.totalUsers },
        { id: "packages", label: "Gói cước", path: "/admin/packages", icon: icons.creditCard },
        { id: "codes", label: "Mã đổi thưởng", path: "/admin/codes", icon: icons.ticket },
        { id: "orders", label: "Đơn hàng", path: "/admin/orders", icon: icons.receipt },
        { id: "inboxes", label: "Hộp thư", path: "/admin/inboxes", icon: icons.inbox },
        { id: "emails", label: "Email", path: "/admin/emails", icon: icons.email },
        { id: "rules", label: "Quy tắc bảo vệ", path: "/admin/rules", icon: icons.shield },
        { id: "domains", label: "Tên miền", path: "/admin/domains", icon: icons.globe, badge: counts.totalDomains },
        { id: "reports", label: "Báo cáo", path: "/admin/reports", icon: icons.flag, badge: counts.openReports },
        { id: "logs", label: "Nhật ký", path: "/admin/logs", icon: icons.clock },
        { id: "system", label: "Hệ thống", path: "/admin/system", icon: icons.server },
        { id: "notifications", label: "Thông báo", path: "/admin/notifications", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg> },
        { id: "analytics", label: "Analytics", path: "/admin/analytics", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg> },
        { id: "telegram", label: "Telegram", path: "/admin/telegram", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg> },
        { id: "settings", label: "Cài đặt", path: "/admin/settings", icon: icons.cog },
        { id: "backup", label: "Backup", path: "/admin/backup", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" /></svg> },
    ];

    return (
        <div className="h-screen flex flex-col md:flex-row relative bg-white dark:bg-slate-950">
            {/* Background Effects - consistent with other pages */}
            <BackgroundEffects variant="subtle" />

            {/* Mobile Header */}
            <header className="md:hidden h-14 border-b border-nebula-border bg-nebula-surface/95 backdrop-blur-lg flex items-center justify-between px-4 z-20 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-nebula-violet">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                    <span className="font-semibold text-nebula-text">Quản trị</span>
                </div>
                <button
                    onClick={openDrawer}
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-nebula-violet to-nebula-violet-dark flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-nebula-violet/20 active:scale-95 transition-transform"
                    aria-label="Mở menu"
                >
                    {user?.email?.charAt(0).toUpperCase() || "A"}
                </button>
            </header>

            {/* Desktop Sidebar - Hidden on mobile */}
            <div
                className={`hidden md:flex ${sidebarCollapsed ? "w-16" : "w-64"} flex-col admin-sidebar transition-all duration-200 backdrop-blur-xl`}
                style={{
                    background: 'var(--neo-glass-bg-medium)',
                    borderRight: '1px solid var(--neo-glass-border)',
                    boxShadow: 'var(--neo-shadow-float)'
                }}
            >
                {/* Header */}
                <div className="h-16 px-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--nebula-border)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--nebula-violet)' }}>
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        {!sidebarCollapsed && <span className="font-semibold text-sm" style={{ color: 'var(--nebula-text)' }}>Quản trị</span>}
                    </div>
                    <button
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        className="p-1 rounded transition-colors hover:opacity-80"
                        style={{ color: 'var(--nebula-text-muted)' }}
                        title={sidebarCollapsed ? "Mở rộng" : "Thu gọn"}
                    >
                        <svg className={`w-4 h-4 transition-transform ${sidebarCollapsed ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                </div>

                {/* Search Bar - Hidden when collapsed? */}
                {!sidebarCollapsed && (
                    <div className="px-3 py-3" style={{ borderBottom: '1px solid var(--nebula-border)' }}>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--nebula-text-muted)' }}>{icons.search}</span>
                            <input
                                type="text"
                                placeholder="Tìm kiếm..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="input-nebula pl-9"
                            />
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <nav className="flex-1 py-4 px-3 overflow-y-auto">
                    <div className="space-y-1">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.id}
                                to={item.path}
                                end={item.end}
                                className={({ isActive }) => `w-full flex items-center px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${isActive ? "shadow-lg" : "hover:opacity-80"
                                    }`}
                                style={({ isActive }) => isActive ? {
                                    background: 'linear-gradient(135deg, var(--nebula-violet), var(--nebula-violet-dark))',
                                    color: 'var(--nebula-text-inverse)',
                                    boxShadow: 'var(--nebula-shadow-glow)'
                                } : {
                                    color: 'var(--nebula-text-secondary)',
                                    background: 'transparent'
                                }}
                                title={sidebarCollapsed ? item.label : undefined}
                            >
                                <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                                    {item.icon}
                                </span>
                                {!sidebarCollapsed && (
                                    <>
                                        <span className="ml-3 flex-1 text-left">{item.label}</span>
                                        {item.id === "reports" && item.badge ? (
                                            <Badge count={item.badge} color="red" />
                                        ) : null}
                                    </>
                                )}
                                {sidebarCollapsed && item.id === "reports" && counts.openReports > 0 && (
                                    <span className="absolute right-2 w-2 h-2 rounded-full" style={{ background: 'var(--nebula-error)' }}></span>
                                )}
                            </NavLink>
                        ))}
                    </div>
                </nav>

                {/* Footer */}
                <div className="p-3 space-y-2" style={{ borderTop: '1px solid var(--nebula-border)' }}>
                    {/* Dark Mode Toggle */}
                    <button
                        onClick={() => {                            if (resolvedTheme === "dark") {                                setTheme("light");                            } else {                                setTheme("dark");                            }                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors hover:opacity-80 ${sidebarCollapsed ? "justify-center" : ""}`}
                        style={{ color: 'var(--nebula-text-secondary)' }}
                        title={sidebarCollapsed ? "Chế độ tối/sáng" : undefined}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                        </svg>
                        {!sidebarCollapsed && <span>Chế độ tối/sáng</span>}
                    </button>
                    <Link
                        to="/"
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors hover:opacity-80 ${sidebarCollapsed ? "justify-center" : ""}`}
                        style={{ color: 'var(--nebula-text-secondary)' }}
                        title={sidebarCollapsed ? "Quay lại" : undefined}
                    >
                        {icons.back}
                        {!sidebarCollapsed && <span>Quay lại</span>}
                    </Link>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
                {/* Outlet renders the matched child route */}
                <Outlet />
            </div>

            {/* Mobile Bottom Navigation */}
            <MobileNav context="admin" />

            {/* Mobile Hamburger Drawer */}
            <HamburgerMenu context="admin" />
        </div>
    );
}
