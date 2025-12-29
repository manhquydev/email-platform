import { Link } from "react-router-dom";

interface SiteFooterProps {
    variant?: "full" | "minimal";
}

export function SiteFooter({ variant = "full" }: SiteFooterProps) {
    const currentYear = new Date().getFullYear();

    const handleNavClick = () => {
        const container = document.getElementById("app-main-scroll") || document.querySelector(".public-layout") || window;
        container.scrollTo({ top: 0, behavior: "instant" });
        if (container instanceof HTMLElement) {
            container.scrollTop = 0;
        }
    };

    if (variant === "minimal") {
        return (
            <footer className="site-footer-minimal neo-glass-light">
                <div className="site-footer-minimal-container">
                    <span className="site-footer-minimal-copyright">
                        © {currentYear} Ephemera
                    </span>
                    <div className="site-footer-minimal-links">
                        <Link to="/terms" className="neo-hover-lift" onClick={handleNavClick}>Điều khoản</Link>
                        <Link to="/privacy" className="neo-hover-lift" onClick={handleNavClick}>Bảo mật</Link>
                    </div>
                </div>
            </footer>
        );
    }

    return (
        <footer className="site-footer neo-mesh-bg">
            <div className="site-footer-container">
                {/* Brand Section */}
                <div className="site-footer-brand neo-animate-fade-in-up">
                    <Link to="/" className="site-footer-logo neo-hover-scale" onClick={handleNavClick}>
                        <div className="site-footer-logo-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M12 12 C12 6, 3 6, 3 12 C3 18, 12 18, 12 12" strokeLinecap="round" />
                                <path d="M12 12 C12 6, 21 6, 21 12" strokeLinecap="round" opacity="0.6" />
                                <circle cx="21" cy="12" r="1.5" fill="currentColor" />
                            </svg>
                        </div>
                        <span className="site-footer-logo-text neo-text-gradient-animated">Ephemera</span>
                    </Link>
                    <p className="site-footer-tagline">
                        Nền tảng email tạm thời chuyên nghiệp với domain riêng của bạn.
                        Bảo vệ quyền riêng tư số trong kỷ nguyên AI.
                    </p>

                    <div className="site-footer-social">
                        <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="neo-hover-lift" aria-label="GitHub">
                            <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                            </svg>
                        </a>
                        <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="neo-hover-lift" aria-label="Twitter">
                            <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.84 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                            </svg>
                        </a>
                    </div>
                </div>

                {/* Links Grid */}
                <div className="site-footer-links">
                    <div className="site-footer-group neo-animate-fade-in-up neo-stagger-1">
                        <h4>Sản phẩm</h4>
                        <Link to="/#features" className="neo-hover-lift" onClick={handleNavClick}>Tính năng</Link>
                        <Link to="/#pricing" className="neo-hover-lift" onClick={handleNavClick}>Bảng giá</Link>
                        <Link to="/#how-it-works" className="neo-hover-lift" onClick={handleNavClick}>Cách hoạt động</Link>
                        <Link to="/#api" className="neo-hover-lift" onClick={handleNavClick}>Tài liệu API</Link>
                    </div>
                    <div className="site-footer-group neo-animate-fade-in-up neo-stagger-2">
                        <h4>Tài khoản</h4>
                        <Link to="/login" className="neo-hover-lift" onClick={handleNavClick}>Đăng nhập</Link>
                        <Link to="/register" className="neo-hover-lift" onClick={handleNavClick}>Đăng ký</Link>
                        <Link to="/app" className="neo-hover-lift" onClick={handleNavClick}>Dashboard</Link>
                        <Link to="/support" className="neo-hover-lift" onClick={handleNavClick}>Hỗ trợ</Link>
                    </div>
                    <div className="site-footer-group neo-animate-fade-in-up neo-stagger-3">
                        <h4>Pháp lý</h4>
                        <Link to="/terms" className="neo-hover-lift" onClick={handleNavClick}>Điều khoản dịch vụ</Link>
                        <Link to="/privacy" className="neo-hover-lift" onClick={handleNavClick}>Chính sách bảo mật</Link>
                        <Link to="/acceptable-use" className="neo-hover-lift" onClick={handleNavClick}>Sử dụng chấp nhận</Link>
                        <Link to="/gdpr" className="neo-hover-lift" onClick={handleNavClick}>Tuân thủ GDPR</Link>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="site-footer-bottom">
                <div className="site-footer-bottom-container">
                    <p className="site-footer-copyright">
                        © {currentYear} Ephemera. All rights reserved. Built with ❤️ for privacy.
                    </p>
                    <div className="site-footer-status">
                        <span className="status-dot"></span>
                        <span>Mọi hệ thống hoạt động bình thường</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
