import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { MobileNavigation } from "../components/MobileNavigation";

interface AppShellProps {
    children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
    const { user, logout } = useAuth();
    const { theme, setTheme } = useTheme();
    const location = useLocation();
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);

    const getTierBadge = (tier?: string) => {
        switch (tier) {
            case 'ENTERPRISE':
                return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200">Enterprise</span>;
            case 'PROFESSIONAL':
                return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">Pro</span>;
            case 'STARTER':
                return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-700 border border-green-200">Starter</span>;
            default:
                return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">Free</span>;
        }
    };

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    // Scroll effect for header
    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 10);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Close menus on route change
    useEffect(() => {
        setShowUserMenu(false);
    }, [location.pathname]);

    const navItems = [
        {
            label: "Hộp thư", path: "/app", icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
            )
        },
        {
            label: "Tên miền", path: "/my-domains", icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
            )
        },
        {
            label: "Chuyển tiếp", path: "/forwarding", icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
            )
        },
        {
            label: "Xác thực 2 bước", path: "/authenticator", icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                </svg>
            )
        },
    ];

    if (user?.role === "ADMIN") {
        navItems.push({
            label: "Quản trị", path: "/admin", icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            )
        });
    }

    const handleMobileTabChange = (tab: string) => {
        if (tab === 'inbox') navigate('/app');
        if (tab === 'domains') navigate('/my-domains');
        if (tab === 'settings') navigate('/settings');
    };

    const activeTab = location.pathname.includes('/my-domains') ? 'domains' :
        location.pathname.includes('/settings') ? 'settings' : 'inbox';

    return (
        <div className="app-shell flex flex-col h-screen bg-bg text-text-main">
            {/* Header */}
            <header className={`app-topnav fixed top-0 left-0 right-0 z-40 h-16 transition-all duration-300 ${scrolled ? 'bg-surface/80 backdrop-blur-md border-b border-border shadow-sm' : 'bg-transparent border-b border-transparent'}`}>
                <div className="container mx-auto px-4 h-full flex items-center justify-between">
                    {/* Logo */}
                    <Link to="/app" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-105 transition-transform duration-300">
                            <span className="text-white font-bold text-lg">E</span>
                        </div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-text-main to-text-muted">
                            Ephemera
                        </span>
                    </Link>

                    {/* Desktop Nav */}
                    <nav className="hidden md:flex items-center gap-1">
                        {navItems.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2
                                    ${location.pathname === item.path || location.pathname.startsWith(item.path + '/')
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-muted hover:text-text-main hover:bg-surface-elevated'
                                    }`}
                            >
                                {item.icon}
                                {item.label}
                            </Link>
                        ))}
                    </nav>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-lg text-muted hover:text-text-main hover:bg-surface-elevated transition-colors"
                            title={theme === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
                        >
                            {theme === 'dark' ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                            )}
                        </button>

                        <div className="relative">
                            <button
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full border border-border bg-surface hover:border-primary/50 transition-colors"
                            >
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-xs text-white font-bold">
                                    {user?.email?.[0].toUpperCase()}
                                </div>
                            </button>

                            {showUserMenu && (
                                <>
                                    <div className="fixed inset-0 z-30" onClick={() => setShowUserMenu(false)} />
                                    <div className="absolute right-0 mt-2 w-56 glass-card-elevated rounded-xl shadow-xl z-40 border border-border animate-scale-in origin-top-right overflow-hidden">
                                        <div className="px-4 py-3 bg-surface border-b border-border">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-medium text-text-main">{user?.email}</p>
                                                {getTierBadge(user?.tier)}
                                            </div>
                                            <p className="text-xs text-muted truncate">ID: {user?.id.slice(0, 8)}...</p>
                                        </div>
                                        <div className="py-1">
                                            <button
                                                onClick={() => { setShowUserMenu(false); navigate('/settings'); }}
                                                className="w-full text-left px-4 py-2 text-sm text-text-main hover:bg-surface-elevated flex items-center gap-2"
                                            >
                                                <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                Cài đặt
                                            </button>
                                            <div className="border-t border-border my-1" />
                                            <button
                                                onClick={() => { setShowUserMenu(false); logout(); }}
                                                className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                                Đăng xuất
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 pt-16 pb-20 md:pb-0 overflow-hidden">
                {children}
            </main>

            <MobileNavigation
                activeTab={activeTab}
                onTabChange={handleMobileTabChange}
                unreadCount={0}
                onCompose={() => navigate('/app')}
            />
        </div>
    );
}
