import { Link } from "react-router-dom";

interface SiteFooterProps {
    variant?: "full" | "minimal";
}

export function SiteFooter({ variant = "full" }: SiteFooterProps) {
    const currentYear = new Date().getFullYear();

    if (variant === "minimal") {
        return (
            <footer className="site-footer-minimal">
                <div className="site-footer-minimal-container">
                    <span className="site-footer-minimal-copyright">
                        © {currentYear} Ephemera
                    </span>
                    <div className="site-footer-minimal-links">
                        <Link to="/terms">Điều khoản</Link>
                        <Link to="/privacy">Bảo mật</Link>
                    </div>
                </div>
            </footer>
        );
    }

    return (
        <footer className="site-footer">
            <div className="site-footer-container">
                {/* Brand Section */}
                <div className="site-footer-brand">
                    <Link to="/" className="site-footer-logo">
                        <div className="site-footer-logo-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                {/* Broken Infinity */}
                                <path d="M12 12 C12 6, 3 6, 3 12 C3 18, 12 18, 12 12" strokeLinecap="round" />
                                <path d="M12 12 C12 6, 21 6, 21 12" strokeLinecap="round" opacity="0.6" />
                                <circle cx="21" cy="12" r="1" fill="currentColor" opacity="0.4" />
                            </svg>
                        </div>
                        <span className="site-footer-logo-text">Ephemera</span>
                    </Link>
                    <p className="site-footer-tagline">
                        Nền tảng email tạm thời chuyên nghiệp với domain riêng của bạn.
                    </p>
                </div>

                {/* Links Grid */}
                <div className="site-footer-links">
                    <div className="site-footer-group">
                        <h4>Sản phẩm</h4>
                        <Link to="/#features">Tính năng</Link>
                        <Link to="/#pricing">Bảng giá</Link>
                        <Link to="/#how-it-works">Cách hoạt động</Link>
                    </div>
                    <div className="site-footer-group">
                        <h4>Tài khoản</h4>
                        <Link to="/login">Đăng nhập</Link>
                        <Link to="/register">Đăng ký</Link>
                        <Link to="/app">Dashboard</Link>
                    </div>
                    <div className="site-footer-group">
                        <h4>Pháp lý</h4>
                        <Link to="/terms">Điều khoản dịch vụ</Link>
                        <Link to="/privacy">Chính sách bảo mật</Link>
                        <Link to="/acceptable-use">Sử dụng chấp nhận</Link>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="site-footer-bottom">
                <div className="site-footer-bottom-container">
                    <p className="site-footer-copyright">
                        © {currentYear} Ephemera. All rights reserved.
                    </p>
                    <div className="site-footer-social">
                        <a href="https://github.com" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
                            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                            </svg>
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
