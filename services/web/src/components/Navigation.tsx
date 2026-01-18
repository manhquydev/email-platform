import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

interface NavigationProps {
    variant?: "landing" | "auth";
}

export function Navigation({ variant = "landing" }: NavigationProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const location = useLocation();

    const isAuthPage = location.pathname === "/login" || location.pathname === "/register";

    const isActive = (path: string) => location.pathname === path;

    const handleNavClick = () => {
        setIsMenuOpen(false);
        const container = document.getElementById("app-main-scroll") || document.querySelector(".public-layout") || window;
        container.scrollTo({ top: 0, behavior: "instant" });
        if (container instanceof HTMLElement) {
            container.scrollTop = 0;
        }
    };

    return (
        <nav className={`site-nav ${variant === "auth" ? "site-nav-auth" : ""}`}>
            <div className="site-nav-container">
                {/* Logo */}
                <Link to="/" className="site-nav-logo" onClick={handleNavClick}>
                    <div className="site-nav-logo-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            {/* Broken Infinity Logo */}
                            <path d="M12 12 C12 6, 3 6, 3 12 C3 18, 12 18, 12 12" strokeLinecap="round" />
                            <path d="M12 12 C12 6, 21 6, 21 12" strokeLinecap="round" opacity="0.6" />
                            <circle cx="21" cy="12" r="1" fill="currentColor" opacity="0.4" />
                        </svg>
                    </div>
                    <span className="site-nav-logo-text">Ephemera</span>
                </Link>

                {/* Desktop Links */}
                <div className="site-nav-links">
                    <Link
                        to="/features"
                        onClick={handleNavClick}
                        className={`site-nav-link ${isActive("/features") ? "text-primary font-semibold" : ""}`}
                    >
                        Tính năng
                    </Link>
                    <Link
                        to="/api"
                        onClick={handleNavClick}
                        className={`site-nav-link ${isActive("/api") ? "text-primary font-semibold" : ""}`}
                    >
                        API
                    </Link>
                    <Link
                        to="/pricing"
                        onClick={handleNavClick}
                        className={`site-nav-link ${isActive("/pricing") ? "text-primary font-semibold" : ""}`}
                    >
                        Bảng giá
                    </Link>
                    <Link
                        to="/inbox-viewer"
                        onClick={handleNavClick}
                        className={`site-nav-link ${isActive("/inbox-viewer") ? "text-primary font-semibold" : ""}`}
                    >
                        Xem hộp thư
                    </Link>
                    {!isAuthPage && (
                        <>
                            <Link to="/login" className="site-nav-link" onClick={handleNavClick}>Đăng nhập</Link>
                            <Link to="/register" className="btn-nav-primary" onClick={handleNavClick}>
                                Bắt đầu miễn phí
                            </Link>
                        </>
                    )}
                    {isAuthPage && (
                        <Link to={location.pathname === "/login" ? "/register" : "/login"} className="btn-nav-primary">
                            {location.pathname === "/login" ? "Đăng ký" : "Đăng nhập"}
                        </Link>
                    )}
                </div>

                {/* Mobile Hamburger */}
                <button
                    className="site-nav-hamburger"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    aria-label="Toggle menu"
                >
                    {isMenuOpen ? (
                        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    ) : (
                        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    )}
                </button>
            </div>

            {/* Mobile Menu */}
            <div className={`site-nav-mobile ${isMenuOpen ? "open" : ""}`}>
                <div className="site-nav-mobile-links">
                    <Link to="/features" className="site-nav-mobile-link" onClick={handleNavClick}>
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Tính năng
                    </Link>
                    <Link to="/api" className="site-nav-mobile-link" onClick={handleNavClick}>
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                        API
                    </Link>
                    <Link to="/pricing" className="site-nav-mobile-link" onClick={handleNavClick}>
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Bảng giá
                    </Link>
                    <Link to="/inbox-viewer" className="site-nav-mobile-link" onClick={handleNavClick}>
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Xem hộp thư
                    </Link>
                    <div className="site-nav-mobile-divider" />
                    <Link to="/login" className="site-nav-mobile-link" onClick={handleNavClick}>
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                        Đăng nhập
                    </Link>
                    <Link to="/register" className="site-nav-mobile-link site-nav-mobile-cta" onClick={handleNavClick}>
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                        Bắt đầu miễn phí
                    </Link>
                </div>
            </div>

            {/* Overlay */}
            {isMenuOpen && (
                <div className="site-nav-overlay" onClick={() => setIsMenuOpen(false)} />
            )}
        </nav>
    );
}
