import { Link, useLocation } from "react-router-dom";
import { cn } from "../utils/cn";
import { useAuth } from "../context/AuthContext";

interface NavigationSidebarProps {
    isExpanded: boolean;
    onNavToggle: () => void;
}

export function NavigationSidebar({ isExpanded, onNavToggle }: NavigationSidebarProps) {
    const location = useLocation();
    const { user } = useAuth();

    return (
        <aside
            className={cn(
                "hidden md:flex flex-col h-full shrink-0 transition-all duration-300",
                "glass-panel border-r-0 border-r-glass-border",
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
                    <div className="size-8 text-primary shrink-0 relative">
                        {/* Wireframe Logo SVG */}
                        <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                            <path d="M24 4L6 14V34L24 44L42 34V14L24 4Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="4"></path>
                            <path d="M24 14L24 34" stroke="currentColor" strokeLinecap="round" strokeWidth="4"></path>
                            <path d="M15 24L33 24" stroke="currentColor" strokeLinecap="round" strokeWidth="4"></path>
                        </svg>
                    </div>
                    {isExpanded && (
                        <span className="text-xl font-bold tracking-tight text-white animate-in fade-in duration-300 whitespace-nowrap overflow-hidden">
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
                            location.pathname === "/app" || location.search
                                ? "bg-primary/20 text-white border border-primary/30 shadow-[0_0_15px_rgba(37,37,244,0.3)]"
                                : "text-gray-400 hover:text-white hover:bg-glass-bg-hover"
                        )}
                    >
                        <span className="material-symbols-outlined text-[24px] shrink-0">inbox</span>
                        {isExpanded && (
                            <>
                                <span className="text-sm font-medium animate-in fade-in slide-in-from-left-2 duration-300">Hộp thư</span>
                                {(location.pathname === "/app" || location.search) && (
                                    <div className="ml-auto size-2 rounded-full bg-primary animate-pulse"></div>
                                )}
                            </>
                        )}
                    </Link>

                    <Link to="/my-domains" title="Tên miền" className="flex items-center gap-3 px-3 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-glass-bg-hover transition-colors group w-full text-left whitespace-nowrap overflow-hidden">
                        <span className="material-symbols-outlined text-[24px] shrink-0">globe</span>
                        {isExpanded && <span className="text-sm font-medium animate-in fade-in slide-in-from-left-2 duration-300">Tên miền</span>}
                    </Link>

                    <Link to="/settings?tab=developer" title="Khóa API" className="flex items-center gap-3 px-3 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-glass-bg-hover transition-colors group w-full text-left whitespace-nowrap overflow-hidden">
                        <span className="material-symbols-outlined text-[24px] shrink-0">key</span>
                        {isExpanded && <span className="text-sm font-medium animate-in fade-in slide-in-from-left-2 duration-300">Khóa API</span>}
                    </Link>

                    <Link to="/settings?tab=security" title="Bảo mật" className="flex items-center gap-3 px-3 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-glass-bg-hover transition-colors group w-full text-left whitespace-nowrap overflow-hidden">
                        <span className="material-symbols-outlined text-[24px] shrink-0">shield</span>
                        {isExpanded && <span className="text-sm font-medium animate-in fade-in slide-in-from-left-2 duration-300">Bảo mật</span>}
                    </Link>

                    <Link to="/settings" title="Cài đặt" className="flex items-center gap-3 px-3 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-glass-bg-hover transition-colors group w-full text-left whitespace-nowrap overflow-hidden mt-auto">
                        <span className="material-symbols-outlined text-[24px] shrink-0">settings</span>
                        {isExpanded && <span className="text-sm font-medium animate-in fade-in slide-in-from-left-2 duration-300">Cài đặt</span>}
                    </Link>
                </nav>
            </div>

            {/* Bottom Actions - User Profile */}
            <div className="p-4 flex flex-col gap-4 border-t border-glass-border bg-black/20 overflow-hidden">
                <button className="flex items-center gap-3 px-2 py-2 rounded-lg text-gray-400 hover:text-white transition-colors w-full text-left overflow-hidden">
                    <div className="flex items-center justify-center aspect-square rounded-full size-8 shrink-0 ring-2 ring-white/10 bg-primary/20 text-primary font-bold text-sm">
                        {user?.email?.charAt(0).toUpperCase() || "U"}
                    </div>
                    {isExpanded && (
                        <div className="flex flex-col items-start animate-in fade-in duration-300 overflow-hidden">
                            <span className="text-sm font-medium text-white truncate w-full">{user?.email?.split('@')[0] || "Người dùng"}</span>
                            <span className="text-xs text-gray-500 truncate w-full uppercase">Gói {
                                user?.tier === 'FREE' ? 'MIỄN PHÍ' :
                                    user?.tier === 'STARTER' ? 'KHỞI ĐẦU' :
                                        user?.tier === 'PROFESSIONAL' ? 'CHUYÊN NGHIỆP' :
                                            user?.tier === 'ENTERPRISE' ? 'DOANH NGHIỆP' : (user?.tier || "MIỄN PHÍ")
                            }</span>
                        </div>
                    )}
                </button>
            </div>
        </aside>
    );
}
