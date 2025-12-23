import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from '../components/ThemeToggle';
import { useState, useRef, useEffect } from 'react';

interface AppShellProps {
    children: React.ReactNode;
    showSearch?: boolean;
    onSearch?: (query: string) => void;
}

export function AppShell({ children, showSearch = false, onSearch }: AppShellProps) {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showMobileNav, setShowMobileNav] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const isAdmin = user?.role === 'ADMIN';

    const navItems = [
        { path: '/app', label: 'Hộp thư', icon: InboxIcon },
        { path: '/my-domains', label: 'Tên miền', icon: GlobeIcon },
        { path: '/forwarding', label: 'Chuyển tiếp', icon: ForwardIcon },
        { path: '/authenticator', label: 'Xác thực 2 bước', icon: ShieldIcon },
    ];

    // Close menu on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowUserMenu(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getInitials = (email: string) => {
        return email?.charAt(0).toUpperCase() || '?';
    };

    return (
        <div className="app-shell neo-mesh-bg min-h-screen flex flex-col text-[var(--nebula-text)] font-sans selection:bg-[var(--nebula-primary)] selection:text-white">
            {/* Ephemera Background Effects - subtle for app pages */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="neo-blob-orb neo-blob-orb-violet" style={{ width: '350px', height: '350px', top: '5%', right: '5%', opacity: 0.25 }} />
                <div className="neo-blob-orb neo-blob-orb-cyan" style={{ width: '280px', height: '280px', bottom: '15%', left: '8%', opacity: 0.2 }} />
                <div className="neo-blob-orb neo-blob-orb-pink" style={{ width: '200px', height: '200px', top: '50%', left: '50%', opacity: 0.15 }} />
            </div>

            {/* Top Navigation */}
            <header className="app-topnav h-16 glass-card-elevated border-b border-[var(--nebula-border)] sticky top-0 z-50 px-4 md:px-6 flex items-center justify-between transition-all duration-300">
                {/* Logo */}
                <Link to="/app" className="app-topnav-logo flex items-center gap-3 group">
                    <div className="relative w-8 h-8 flex items-center justify-center bg-[var(--nebula-surface-elevated)] rounded-xl border border-[var(--nebula-border)] shadow-sm group-hover:shadow-[var(--nebula-glow)] group-hover:border-[var(--nebula-primary)] transition-all duration-300">
                        <svg className="w-5 h-5 text-[var(--nebula-primary)] group-hover:scale-110 transition-transform duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            {/* Broken Infinity Logo */}
                            <path d="M12 12 C12 6, 3 6, 3 12 C3 18, 12 18, 12 12" strokeLinecap="round" />
                            <path d="M12 12 C12 6, 21 6, 21 12" strokeLinecap="round" opacity="0.6" />
                            <circle cx="21" cy="12" r="1" fill="currentColor" opacity="0.4" />
                        </svg>
                    </div>
                    <span className="hidden sm:inline text-lg font-bold tracking-tight bg-gradient-to-r from-[var(--nebula-text)] to-[var(--nebula-text-muted)] bg-clip-text text-transparent group-hover:to-[var(--nebula-primary)] transition-all duration-300">
                        Ephemera
                    </span>
                </Link>

                {/* Mobile Menu Button */}
                <button
                    className="btn-nebula btn-nebula-ghost btn-nebula-icon md:hidden text-[var(--nebula-text-secondary)] hover:bg-[var(--nebula-surface-elevated)]"
                    onClick={() => setShowMobileNav(!showMobileNav)}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>

                {/* Desktop Navigation */}
                <nav className="app-topnav-nav hidden md:flex items-center gap-1">
                    {navItems.map(item => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 group overflow-hidden ${location.pathname === item.path
                                ? 'text-[var(--nebula-primary)] bg-[var(--nebula-primary-light)] ring-1 ring-[var(--nebula-primary-border)] shadow-[var(--nebula-glow-sm)]'
                                : 'text-[var(--nebula-text-secondary)] hover:text-[var(--nebula-text)] hover:bg-[var(--nebula-surface-hover)]'
                                }`}
                        >
                            <item.icon />
                            <span>{item.label}</span>
                            {location.pathname === item.path && (
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--nebula-primary)]/5 to-transparent skew-x-12 translate-x-[-150%] animate-shimmer" />
                            )}
                        </Link>
                    ))}
                    {isAdmin && (
                        <Link
                            to="/admin"
                            className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${location.pathname === '/admin'
                                ? 'text-[var(--nebula-violet)] bg-[var(--nebula-violet)]/10 ring-1 ring-[var(--nebula-violet)]/30'
                                : 'text-[var(--nebula-text-secondary)] hover:text-[var(--nebula-violet)] hover:bg-[var(--nebula-surface-hover)]'
                                }`}
                        >
                            <AdminIcon />
                            <span>Quản trị</span>
                        </Link>
                    )}
                </nav>

                {/* Actions */}
                <div className="app-topnav-actions flex items-center gap-3">
                    {showSearch && (
                        <div className="app-topnav-search hidden sm:flex items-center bg-[var(--nebula-surface-elevated)] border border-[var(--nebula-border)] rounded-full px-3 py-1.5 focus-within:ring-2 focus-within:ring-[var(--nebula-primary)]/30 focus-within:border-[var(--nebula-primary)] transition-all duration-200">
                            <svg className="w-4 h-4 text-[var(--nebula-text-muted)]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Tìm kiếm..."
                                onChange={(e) => onSearch?.(e.target.value)}
                                className="bg-transparent border-none outline-none text-sm ml-2 w-48 text-[var(--nebula-text)] placeholder-[var(--nebula-text-muted)]"
                            />
                        </div>
                    )}

                    <ThemeToggle />

                    {/* User Menu */}
                    <div className="relative" ref={menuRef}>
                        <button
                            className="app-topnav-avatar w-9 h-9 rounded-full bg-gradient-to-br from-[var(--nebula-violet)] to-[var(--nebula-pink)] flex items-center justify-center text-white text-sm font-bold shadow-[var(--nebula-glow)] hover:shadow-[var(--nebula-glow-strong)] hover:scale-105 transition-all duration-200 border-2 border-[var(--nebula-void)]"
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            title={user?.email}
                        >
                            {getInitials(user?.email || '')}
                        </button>

                        {showUserMenu && (
                            <div className="absolute right-0 top-full mt-2 w-60 glass-card-elevated animate-nebula-scale-in z-50 rounded-xl overflow-hidden shadow-2xl ring-1 ring-[var(--nebula-border)]">
                                <div className="p-4 border-b border-[var(--nebula-border)] bg-[var(--nebula-surface-elevated)]/50">
                                    <div className="text-sm font-semibold text-[var(--nebula-text)] truncate">{user?.email}</div>
                                    <div className="text-xs font-medium text-[var(--nebula-primary)] bg-[var(--nebula-primary-light)] px-2 py-0.5 rounded-full inline-block mt-1 border border-[var(--nebula-primary-border)]">
                                        {user?.role === 'ADMIN' ? 'Quản trị viên' : 'Thành viên'}
                                    </div>
                                </div>
                                <div className="p-1.5 space-y-0.5">
                                    <Link
                                        to="/settings"
                                        className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg hover:bg-[var(--nebula-surface-hover)] text-[var(--nebula-text-secondary)] hover:text-[var(--nebula-text)] transition-colors"
                                        onClick={() => setShowUserMenu(false)}
                                    >
                                        <SettingsIcon />
                                        Cài đặt tài khoản
                                    </Link>
                                    <button
                                        onClick={() => { logout(); setShowUserMenu(false); }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg hover:bg-[var(--nebula-error-bg)]/10 text-[var(--nebula-error)] hover:text-[var(--nebula-error-hover)] transition-colors"
                                    >
                                        <LogoutIcon />
                                        Đăng xuất
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Mobile Navigation Overlay */}
            {showMobileNav && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-fade-in" onClick={() => setShowMobileNav(false)}>
                    <nav
                        className="absolute top-16 left-0 right-0 glass-card-elevated border-b border-[var(--nebula-border)] p-2 animate-nebula-slide-in shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        {navItems.map(item => (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium mb-1 transition-all ${location.pathname === item.path
                                    ? 'bg-[var(--nebula-primary-light)] text-[var(--nebula-primary)] shadow-[var(--nebula-glow-sm)]'
                                    : 'text-[var(--nebula-text-secondary)] hover:bg-[var(--nebula-surface-hover)] hover:text-[var(--nebula-text)]'
                                    }`}
                                onClick={() => setShowMobileNav(false)}
                            >
                                <item.icon />
                                <span>{item.label}</span>
                            </Link>
                        ))}
                        {isAdmin && (
                            <Link
                                to="/admin"
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium mb-1 transition-all ${location.pathname === '/admin'
                                    ? 'bg-[var(--nebula-violet)]/10 text-[var(--nebula-violet)]'
                                    : 'text-[var(--nebula-text-secondary)] hover:bg-[var(--nebula-surface-hover)] hover:text-[var(--nebula-violet)]'
                                    }`}
                                onClick={() => setShowMobileNav(false)}
                            >
                                <AdminIcon />
                                <span>Quản trị</span>
                            </Link>
                        )}
                    </nav>
                </div>
            )}

            {/* Main Content */}
            <main className="app-content flex-1 relative overflow-hidden flex flex-col">
                {children}
            </main>
        </div>
    );
}

// Icons
function InboxIcon() {
    return (
        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function GlobeIcon() {
    return (
        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function ForwardIcon() {
    return (
        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M13 7l5 5m0 0l-5 5m5-5H6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function ShieldIcon() {
    return (
        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function AdminIcon() {
    return (
        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function SettingsIcon() {
    return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function LogoutIcon() {
    return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}
