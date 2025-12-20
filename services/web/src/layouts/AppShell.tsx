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
        { path: '/app', label: 'Inbox', icon: InboxIcon },
        { path: '/my-domains', label: 'Domains', icon: GlobeIcon },
        { path: '/forwarding', label: 'Forwarding', icon: ForwardIcon },
        { path: '/authenticator', label: '2FA', icon: ShieldIcon },
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
        <div className="app-shell">
            {/* Top Navigation */}
            <header className="app-topnav">
                {/* Logo */}
                <Link to="/app" className="app-topnav-logo">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        {/* Broken Infinity Logo */}
                        <path d="M12 12 C12 6, 3 6, 3 12 C3 18, 12 18, 12 12" strokeLinecap="round" />
                        <path d="M12 12 C12 6, 21 6, 21 12" strokeLinecap="round" opacity="0.6" />
                        <circle cx="21" cy="12" r="1" fill="currentColor" opacity="0.4" />
                    </svg>
                    <span className="hidden sm:inline">Ephemera</span>
                </Link>

                {/* Mobile Menu Button */}
                <button
                    className="btn-nebula btn-nebula-ghost btn-nebula-icon md:hidden"
                    onClick={() => setShowMobileNav(!showMobileNav)}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>

                {/* Desktop Navigation */}
                <nav className="app-topnav-nav">
                    {navItems.map(item => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`app-topnav-link ${location.pathname === item.path ? 'active' : ''}`}
                        >
                            <item.icon />
                            <span>{item.label}</span>
                        </Link>
                    ))}
                    {isAdmin && (
                        <Link
                            to="/admin"
                            className={`app-topnav-link ${location.pathname === '/admin' ? 'active' : ''}`}
                        >
                            <AdminIcon />
                            <span>Admin</span>
                        </Link>
                    )}
                </nav>

                {/* Actions */}
                <div className="app-topnav-actions">
                    {showSearch && (
                        <div className="app-topnav-search hidden sm:block">
                            <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Tìm kiếm..."
                                onChange={(e) => onSearch?.(e.target.value)}
                            />
                        </div>
                    )}

                    <ThemeToggle />

                    {/* User Menu */}
                    <div className="relative" ref={menuRef}>
                        <button
                            className="app-topnav-avatar"
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            title={user?.email}
                        >
                            {getInitials(user?.email || '')}
                        </button>

                        {showUserMenu && (
                            <div className="absolute right-0 top-full mt-2 w-56 glass-card-elevated animate-nebula-scale-in z-50">
                                <div className="p-3 border-b border-[var(--nebula-border)]">
                                    <div className="text-sm font-medium text-[var(--nebula-text)]">{user?.email}</div>
                                    <div className="text-xs text-[var(--nebula-text-muted)]">{user?.role}</div>
                                </div>
                                <div className="p-1">
                                    <Link
                                        to="/settings"
                                        className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-[var(--nebula-elevated)] text-[var(--nebula-text-secondary)]"
                                        onClick={() => setShowUserMenu(false)}
                                    >
                                        <SettingsIcon />
                                        Cài đặt
                                    </Link>
                                    <button
                                        onClick={() => { logout(); setShowUserMenu(false); }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-[var(--nebula-elevated)] text-[var(--nebula-error)]"
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
                <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setShowMobileNav(false)}>
                    <nav className="absolute top-16 left-0 right-0 bg-[var(--nebula-surface)] border-b border-[var(--nebula-border)] p-2 animate-nebula-slide-in">
                        {navItems.map(item => (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm ${location.pathname === item.path ? 'bg-[var(--nebula-glow-violet)] text-[var(--nebula-violet)]' : 'text-[var(--nebula-text-secondary)]'}`}
                                onClick={() => setShowMobileNav(false)}
                            >
                                <item.icon />
                                <span>{item.label}</span>
                            </Link>
                        ))}
                        {isAdmin && (
                            <Link
                                to="/admin"
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm ${location.pathname === '/admin' ? 'bg-[var(--nebula-glow-violet)] text-[var(--nebula-violet)]' : 'text-[var(--nebula-text-secondary)]'}`}
                                onClick={() => setShowMobileNav(false)}
                            >
                                <AdminIcon />
                                <span>Admin</span>
                            </Link>
                        )}
                    </nav>
                </div>
            )}

            {/* Main Content */}
            <main className="app-content">
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
