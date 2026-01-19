/**
 * UI components for AdminPanel
 */
import { Link, NavLink } from "react-router-dom";
import { adminIcons, type NavItem, type SidebarCounts } from "./types.tsx";

// Badge Component
export function Badge({ count, color = "red" }: { count: number; color?: "red" | "blue" | "green" }) {
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

// Mobile Header
interface MobileHeaderProps {
    userEmail?: string;
    openDrawer: () => void;
}

export function MobileHeader({ userEmail, openDrawer }: MobileHeaderProps) {
    return (
        <header className="md:hidden h-14 border-b border-nebula-border bg-nebula-surface/95 backdrop-blur-lg flex items-center justify-between px-4 z-20 shrink-0">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-nebula-violet">
                    {adminIcons.adminLogo}
                </div>
                <span className="font-semibold text-nebula-text">Quản trị</span>
            </div>
            <button
                onClick={openDrawer}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-nebula-violet to-nebula-violet-dark flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-nebula-violet/20 active:scale-95 transition-transform"
                aria-label="Mở menu"
            >
                {userEmail?.charAt(0).toUpperCase() || "A"}
            </button>
        </header>
    );
}

// Desktop Sidebar
interface DesktopSidebarProps {
    navItems: NavItem[];
    counts: SidebarCounts;
    sidebarCollapsed: boolean;
    setSidebarCollapsed: (val: boolean) => void;
    searchQuery: string;
    setSearchQuery: (val: string) => void;
    toggleTheme: () => void;
}

export function DesktopSidebar({
    navItems,
    counts,
    sidebarCollapsed,
    setSidebarCollapsed,
    searchQuery,
    setSearchQuery,
    toggleTheme
}: DesktopSidebarProps) {
    return (
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
                        {adminIcons.adminLogo}
                    </div>
                    {!sidebarCollapsed && <span className="font-semibold text-sm" style={{ color: 'var(--nebula-text)' }}>Quản trị</span>}
                </div>
                <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="p-1 rounded transition-colors hover:opacity-80"
                    style={{ color: 'var(--nebula-text-muted)' }}
                    title={sidebarCollapsed ? "Mở rộng" : "Thu gọn"}
                >
                    <span className={`transition-transform inline-block ${sidebarCollapsed ? "rotate-180" : ""}`}>
                        {adminIcons.collapse}
                    </span>
                </button>
            </div>

            {/* Search Bar */}
            {!sidebarCollapsed && (
                <div className="px-3 py-3" style={{ borderBottom: '1px solid var(--nebula-border)' }}>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--nebula-text-muted)' }}>{adminIcons.search}</span>
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
                            className={({ isActive }) => `w-full flex items-center px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${isActive ? "shadow-lg" : "hover:opacity-80"}`}
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
                <button
                    onClick={toggleTheme}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors hover:opacity-80 ${sidebarCollapsed ? "justify-center" : ""}`}
                    style={{ color: 'var(--nebula-text-secondary)' }}
                    title={sidebarCollapsed ? "Chế độ tối/sáng" : undefined}
                >
                    {adminIcons.moon}
                    {!sidebarCollapsed && <span>Chế độ tối/sáng</span>}
                </button>
                <Link
                    to="/"
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors hover:opacity-80 ${sidebarCollapsed ? "justify-center" : ""}`}
                    style={{ color: 'var(--nebula-text-secondary)' }}
                    title={sidebarCollapsed ? "Quay lại" : undefined}
                >
                    {adminIcons.back}
                    {!sidebarCollapsed && <span>Quay lại</span>}
                </Link>
            </div>
        </div>
    );
}
