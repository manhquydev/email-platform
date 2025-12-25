import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface IconRailProps {
    onSearchClick: () => void;
    onQuickActionsClick: () => void;
    onFocusModeClick?: () => void;
    onNavToggle?: () => void;
    onUserClick?: () => void;
    isFocusMode?: boolean;
    isExpanded?: boolean;
    unreadCount?: number;
}

export function IconRail({
    onSearchClick,
    onQuickActionsClick,
    onFocusModeClick,
    onNavToggle,
    onUserClick,
    isFocusMode = false,
    isExpanded = false,
    unreadCount = 0
}: IconRailProps) {
    const location = useLocation();
    const { user } = useAuth();
    const isAdmin = user?.role === "ADMIN";

    const getTierBadge = (tier?: string) => {
        switch (tier) {
            case 'ENTERPRISE':
                return <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200 ml-1">Enterprise</span>;
            case 'PROFESSIONAL':
                return <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200 ml-1">Pro</span>;
            case 'STARTER':
                return <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-green-100 text-green-700 border border-green-200 ml-1">Starter</span>;
            default:
                return <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200 ml-1">Free</span>;
        }
    };

    return (
        <nav className={`icon-rail ${isExpanded ? 'expanded' : ''} hidden md:flex`}>
            {/* Header: Logo + Expand Toggle */}
            <div className="icon-rail-header">
                <Link to="/" className="icon-rail-logo" title="Ephemera">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 12 C12 6, 3 6, 3 12 C3 18, 12 18, 12 12" strokeLinecap="round" />
                        <path d="M12 12 C12 6, 21 6, 21 12" strokeLinecap="round" opacity="0.6" />
                        <circle cx="21" cy="12" r="1" fill="currentColor" opacity="0.4" />
                    </svg>
                    {isExpanded && <span className="icon-rail-brand">Ephemera</span>}
                </Link>

                <button
                    className="icon-rail-toggle"
                    onClick={onNavToggle}
                    title={isExpanded ? "Thu gọn ([)" : "Mở rộng ([)"}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        {isExpanded ? (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
                        ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5" />
                        )}
                    </svg>
                </button>
            </div>

            {/* Main Navigation */}
            <div className="icon-rail-main">
                {/* Inbox - Primary */}
                <Link
                    to="/app"
                    className={`icon-rail-item ${location.pathname === '/app' ? 'active' : ''}`}
                    title="Hộp thư"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-17.5 0a.75.75 0 00-.75.75v3.75c0 .414.336.75.75.75h18a.75.75 0 00.75-.75v-3.75a.75.75 0 00-.75-.75m-17.5 0V6.75A2.25 2.25 0 014.5 4.5h15a2.25 2.25 0 012.25 2.25v6.75" />
                    </svg>
                    {isExpanded && <span className="icon-rail-label">Hộp thư</span>}
                    {unreadCount > 0 && (
                        <span className="icon-rail-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                    )}
                </Link>

                {/* Search */}
                <button
                    className="icon-rail-item"
                    onClick={onSearchClick}
                    title="Tìm kiếm email (⌘/)"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                    {isExpanded && <span className="icon-rail-label">Tìm kiếm</span>}
                </button>

                {/* Quick Actions */}
                <button
                    className="icon-rail-item"
                    onClick={onQuickActionsClick}
                    title="Lệnh nhanh (⌘K)"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                    </svg>
                    {isExpanded && <span className="icon-rail-label">Lệnh nhanh</span>}
                </button>

                <div className="icon-rail-separator" />

                {/* Domains */}
                <Link
                    to="/my-domains"
                    className={`icon-rail-item ${location.pathname === '/my-domains' ? 'active' : ''}`}
                    title="Domain của tôi"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {isExpanded && <span className="icon-rail-label">Domains</span>}
                </Link>

                {/* Forwarding */}
                <Link
                    to="/forwarding"
                    className={`icon-rail-item ${location.pathname === '/forwarding' ? 'active' : ''}`}
                    title="Chuyển tiếp email"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                    </svg>
                    {isExpanded && <span className="icon-rail-label">Chuyển tiếp</span>}
                </Link>

                {/* Plans */}
                <Link
                    to="/plans"
                    className={`icon-rail-item ${location.pathname === '/plans' ? 'active' : ''}`}
                    title="Gói dịch vụ"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                    </svg>
                    {isExpanded && <span className="icon-rail-label">Gói dịch vụ</span>}
                </Link>

                {/* 2FA Authenticator */}
                <Link
                    to="/authenticator"
                    className={`icon-rail-item ${location.pathname === '/authenticator' ? 'active' : ''}`}
                    title="Xác thực 2FA"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                    {isExpanded && <span className="icon-rail-label">2FA</span>}
                </Link>

                {/* Focus Mode */}
                <button
                    className={`icon-rail-item icon-rail-item--mode ${isFocusMode ? 'active' : ''}`}
                    onClick={onFocusModeClick}
                    title="Chế độ tập trung (F)"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9m11.25-5.25v4.5m0-4.5h-4.5m4.5 0L15 9m-11.25 11.25v-4.5m0 4.5h4.5m-4.5 0L9 15m11.25 5.25v-4.5m0 4.5h-4.5m4.5 0L15 15" />
                    </svg>
                    {isExpanded && <span className="icon-rail-label">Tập trung</span>}
                </button>
            </div>

            {/* Bottom Actions */}
            <div className="icon-rail-bottom">
                {/* Admin */}
                {isAdmin && (
                    <Link
                        to="/admin"
                        className={`icon-rail-item ${location.pathname.startsWith('/admin') ? 'active' : ''}`}
                        title="Quản trị"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {isExpanded && <span className="icon-rail-label">Quản trị</span>}
                    </Link>
                )}

                {/* Settings */}
                <Link
                    to="/settings"
                    className={`icon-rail-item ${location.pathname === '/settings' ? 'active' : ''}`}
                    title="Cài đặt"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {isExpanded && <span className="icon-rail-label">Cài đặt</span>}
                </Link>

                {/* User Avatar */}
                <button
                    className="icon-rail-avatar"
                    onClick={(e) => {
                        e.stopPropagation();
                        onUserClick?.();
                    }}
                    title={user?.email || 'Tài khoản'}
                    type="button"
                >
                    <div className="icon-rail-avatar-circle">
                        {user?.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    {isExpanded && (
                        <span className="icon-rail-user-info">
                            <span className="icon-rail-user-name">{user?.email?.split('@')[0] || 'Guest'}</span>
                            <span className="icon-rail-user-role">
                                {user?.role === 'ADMIN' ? 'Admin' : 'User'}
                                {getTierBadge(user?.tier)}
                            </span>
                        </span>
                    )}
                </button>
            </div>
        </nav>
    );
}
