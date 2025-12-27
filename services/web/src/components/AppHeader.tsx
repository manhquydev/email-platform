import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { NotificationCenter } from "./NotificationCenter";

interface AppHeaderProps {
    title?: string;
    showBackButton?: boolean;
    onBack?: () => void;
}

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

export function AppHeader({ title, showBackButton, onBack }: AppHeaderProps) {
    const { user, logout } = useAuth();
    const isAdmin = user?.role === "ADMIN";
    const navigate = useNavigate();
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    return (
        <header className="app-header">
            <div className="app-header-left">
                {showBackButton && onBack ? (
                    <button className="app-header-back" onClick={onBack}>
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                ) : (
                    <Link to="/" className="app-header-brand">
                        <div className="app-header-logo">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                {/* Broken Infinity */}
                                <path d="M12 12 C12 6, 3 6, 3 12 C3 18, 12 18, 12 12" strokeLinecap="round" />
                                <path d="M12 12 C12 6, 21 6, 21 12" strokeLinecap="round" opacity="0.6" />
                                <circle cx="21" cy="12" r="1" fill="currentColor" opacity="0.4" />
                            </svg>
                        </div>
                        <span className="app-header-title">Ephemera</span>
                    </Link>
                )}
                {title && <span className="app-header-page-title">{title}</span>}
            </div>

            <div className="app-header-right">
                <NotificationCenter />

                {/* Admin Link */}
                {isAdmin && (
                    <Link to="/admin" className="app-header-admin-link" title="Admin Panel">
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>Quản trị</span>
                    </Link>
                )}

                {/* User Dropdown */}
                <div className="app-header-user" ref={dropdownRef}>
                    <button
                        className="app-header-user-btn"
                        onClick={() => setShowDropdown(!showDropdown)}
                    >
                        <div className="app-header-avatar">
                            {user?.email?.charAt(0).toUpperCase() || "U"}
                        </div>
                        <span className="app-header-username">{user?.email?.split("@")[0] || "User"}</span>
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {showDropdown && (
                        <div className="app-header-dropdown">
                            <div className="app-header-dropdown-user">
                                <div className="app-header-dropdown-avatar">
                                    {user?.email?.charAt(0).toUpperCase() || "U"}
                                </div>
                                <div className="app-header-dropdown-info">
                                    <div className="flex items-center gap-2">
                                        <span className="app-header-dropdown-name">{user?.email?.split("@")[0]}</span>
                                        {getTierBadge(user?.tier)}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5 mb-0.5">
                                        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-yellow-600">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className="font-medium text-yellow-700">{user?.credits?.toLocaleString() || 0} credits</span>
                                    </div>
                                    <span className="app-header-dropdown-email">{user?.email}</span>
                                </div>
                            </div>
                            <div className="app-header-dropdown-divider" />
                            <Link to="/app" className="app-header-dropdown-item" onClick={() => setShowDropdown(false)}>
                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                Hộp thư
                            </Link>
                            <Link to="/my-domains" className="app-header-dropdown-item" onClick={() => setShowDropdown(false)}>
                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="10" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                                </svg>
                                Tên miền của tôi
                            </Link>
                            <Link to="/settings" className="app-header-dropdown-item" onClick={() => setShowDropdown(false)}>
                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Cài đặt
                            </Link>
                            {isAdmin && (
                                <Link to="/admin" className="app-header-dropdown-item" onClick={() => setShowDropdown(false)}>
                                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                                    </svg>
                                    Quản trị viên
                                </Link>
                            )}
                            <div className="app-header-dropdown-divider" />
                            <button className="app-header-dropdown-item app-header-dropdown-logout" onClick={handleLogout}>
                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                Đăng xuất
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
