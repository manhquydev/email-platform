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
                        <Link to="/gdpr" className="neo-hover-lift" onClick={handleNavClick}>Bảo vệ dữ liệu (VN/EU)</Link>
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
