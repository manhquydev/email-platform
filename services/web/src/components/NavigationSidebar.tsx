import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "../utils/cn";
import { useAuth } from "../context/AuthContext";
import { ThemeToggle } from "./ThemeToggle";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "./ui/Dropdown";

interface NavigationSidebarProps {
    isExpanded: boolean;
    onNavToggle: () => void;
}

export function NavigationSidebar({ isExpanded, onNavToggle }: NavigationSidebarProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    // Helper check active
    const isActive = (path: string) => {
        if (path === "/app") return location.pathname === "/app";
        return location.pathname.startsWith(path);
    };

    const handleLogout = () => {
        logout();
        navigate("/login");
    };


    return (
        <aside
            className={cn(
                "hidden md:flex flex-col h-full shrink-0 transition-all duration-300",
                "glass-panel border-r border-nebula-border", // Fixed border contrast
                isExpanded ? "w-64" : "w-20"
            )}
        >
            <div className="flex flex-col gap-6 p-4">
                {/* Brand */}
                <div
                    className="flex items-center gap-3 px-2 cursor-pointer"
                    onClick={onNavToggle}
                    title={isExpanded ? "Thu gọn" : "Mở rộng"}
                >
                    <div className="size-8 text-primary shrink-0 relative flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full">
                            {/* Broken Infinity Logo */}
                            <path d="M12 12 C12 6, 3 6, 3 12 C3 18, 12 18, 12 12" strokeLinecap="round" />
                            <path d="M12 12 C12 6, 21 6, 21 12" strokeLinecap="round" opacity="0.6" />
                            <circle cx="21" cy="12" r="1" fill="currentColor" opacity="0.4" />
                        </svg>
                    </div>
                    {isExpanded && (
                        <span className="text-xl font-bold tracking-tight text-nebula-text animate-in fade-in duration-300 whitespace-nowrap overflow-hidden">
                            Ephemera
                        </span>
                    )}
                </div>

                {/* Nav Items */}
                <nav className="flex flex-col gap-2 mt-4">
                    <Link
                        to="/app"
                        className={cn(
                            "flex items-center gap-3 px-3 py-3 rounded-lg transition-all group whitespace-nowrap overflow-hidden",
                            isActive("/app") && !location.search.includes("tab=")
                                ? "bg-nebula-violet/10 text-nebula-violet border border-nebula-violet/20 shadow-sm"
                                : "text-nebula-text-muted hover:text-nebula-text hover:bg-nebula-elevated"
                        )}
                    >
                        <span className="material-symbols-outlined text-[24px] shrink-0">inbox</span>
                        {isExpanded && (
                            <>
                                <span className="text-sm font-medium animate-in fade-in slide-in-from-left-2 duration-300">Hộp thư</span>
                                {(isActive("/app") && !location.search.includes("tab=")) && (
                                    <div className="ml-auto size-2 rounded-full bg-primary animate-pulse"></div>
                                )}
                            </>
                        )}
                    </Link>

                    <Link to="/my-domains"
                        className={cn(
                            "flex items-center gap-3 px-3 py-3 rounded-lg transition-all group whitespace-nowrap overflow-hidden",
                            isActive("/my-domains")
                                ? "bg-nebula-violet/10 text-nebula-violet border border-nebula-violet/20 shadow-sm"
                                : "text-nebula-text-muted hover:text-nebula-text hover:bg-nebula-elevated"
                        )}
                        title="Tên miền">
                        <span className="material-symbols-outlined text-[24px] shrink-0">globe</span>
                        {isExpanded && <span className="text-sm font-medium animate-in fade-in slide-in-from-left-2 duration-300">Tên miền</span>}
                    </Link>

                    {user?.role === 'ADMIN' && (
                        <Link to="/admin"
                            className={cn(
                                "flex items-center gap-3 px-3 py-3 rounded-lg transition-all group whitespace-nowrap overflow-hidden",
                                isActive("/admin")
                                    ? "bg-nebula-violet/10 text-nebula-violet border border-nebula-violet/20 shadow-sm"
                                    : "text-nebula-text-muted hover:text-nebula-text hover:bg-nebula-elevated"
                            )}
                            title="Quản trị">
                            <span className="material-symbols-outlined text-[24px] shrink-0">admin_panel_settings</span>
                            {isExpanded && <span className="text-sm font-medium animate-in fade-in slide-in-from-left-2 duration-300">Quản trị</span>}
                        </Link>
                    )}





                    <Link to="/settings"
                        className={cn(
                            "flex items-center gap-3 px-3 py-3 rounded-lg transition-all group whitespace-nowrap overflow-hidden mt-auto",
                            (isActive("/settings") && !location.search)
                                ? "bg-nebula-violet/10 text-nebula-violet border border-nebula-violet/20 shadow-sm"
                                : "text-nebula-text-muted hover:text-nebula-text hover:bg-nebula-elevated"
                        )}
                        title="Cài đặt">
                        <span className="material-symbols-outlined text-[24px] shrink-0">settings</span>
                        {isExpanded && <span className="text-sm font-medium animate-in fade-in slide-in-from-left-2 duration-300">Cài đặt</span>}
                    </Link>
                </nav>
            </div>

            {/* Bottom Actions - User Profile with Dropdown */}
            <div className="p-4 flex flex-col gap-4 border-t border-nebula-border bg-nebula-elevated/50 overflow-hidden mt-auto">
                {/* Theme Toggle */}
                <div className={cn("flex items-center justify-center", isExpanded ? "w-full" : "w-full")}>
                    <ThemeToggle />
                </div>

                {/* User Dropdown */}
                <Dropdown>
                    <DropdownTrigger>
                        <button className="flex items-center gap-3 px-2 py-2 rounded-lg text-nebula-text-muted hover:bg-nebula-elevated hover:text-nebula-text transition-colors w-full text-left overflow-hidden">
                            <div className="flex items-center justify-center aspect-square rounded-full size-8 shrink-0 ring-2 ring-nebula-border bg-nebula-violet/10 text-nebula-violet font-bold text-sm">
                                {user?.email?.charAt(0).toUpperCase() || "U"}
                            </div>
                            {isExpanded && (
                                <div className="flex flex-col items-start animate-in fade-in duration-300 overflow-hidden">
                                    <span className="text-sm font-medium text-nebula-text truncate w-full">{user?.email?.split('@')[0] || "Người dùng"}</span>
                                    <span className="text-xs font-semibold text-nebula-text-muted truncate w-full uppercase tracking-wide">Gói {
                                        user?.tier === 'FREE' ? 'MIỄN PHÍ' :
                                            user?.tier === 'STARTER' ? 'KHỞI ĐẦU' :
                                                user?.tier === 'PROFESSIONAL' ? 'CHUYÊN NGHIỆP' :
                                                    user?.tier === 'ENTERPRISE' ? 'DOANH NGHIỆP' : (user?.tier || "MIỄN PHÍ")
                                    }</span>
                                </div>
                            )}
                        </button>
                    </DropdownTrigger>

                    <DropdownMenu align="left">
                        <DropdownItem onClick={() => navigate('/settings')} icon="settings">
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
