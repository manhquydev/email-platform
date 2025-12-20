import { Link, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

// Feature data
const features = [
    {
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
        ),
        title: "Email tạm thời",
        description: "Tạo email tạm thời trong giây lát. Bảo vệ hộp thư chính khỏi spam và quảng cáo không mong muốn."
    },
    {
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
            </svg>
        ),
        title: "Domain tùy chỉnh",
        description: "Sử dụng domain riêng của bạn. Tạo không giới hạn inbox với địa chỉ chuyên nghiệp."
    },
    {
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
        ),
        title: "Bảo mật tối đa",
        description: "Dữ liệu được mã hóa end-to-end. Tự động xóa email sau thời gian định sẵn."
    },
    {
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
            </svg>
        ),
        title: "API cho Developer",
        description: "Tích hợp dễ dàng với API RESTful đầy đủ. Webhook hỗ trợ automation testing."
    }
];

const steps = [
    {
        step: "01",
        title: "Đăng ký tài khoản",
        description: "Chỉ cần email và mật khẩu. Không cần xác minh phức tạp."
    },
    {
        step: "02",
        title: "Thêm domain của bạn",
        description: "Cấu hình DNS đơn giản với hướng dẫn chi tiết từng bước."
    },
    {
        step: "03",
        title: "Tạo inbox & nhận email",
        description: "Tạo inbox không giới hạn, nhận email realtime trong dashboard."
    }
];

export function LandingPage() {
    const { token } = useAuth();
    const [emailDemo, setEmailDemo] = useState("user");
    const [copied, setCopied] = useState(false);

    // ✅ useEffect MUST be called before any conditional returns (React Rules of Hooks)
    // Animated email demo
    useEffect(() => {
        const emails = ["user", "test", "signup", "verify", "demo"];
        let index = 0;
        const interval = setInterval(() => {
            index = (index + 1) % emails.length;
            setEmailDemo(emails[index]);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    // Redirect authenticated users to app
    if (token) {
        return <Navigate to="/app" replace />;
    }

    const handleCopy = () => {
        navigator.clipboard.writeText(`${emailDemo}@yourdomain.com`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="landing-page">
            {/* Navigation */}
            <nav className="landing-nav">
                <div className="landing-nav-container">
                    <Link to="/" className="landing-logo">
                        <div className="landing-logo-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <span className="landing-logo-text">TempMail Pro</span>
                    </Link>
                    <div className="landing-nav-links">
                        <a href="#features" className="landing-nav-link">Tính năng</a>
                        <a href="#how-it-works" className="landing-nav-link">Cách hoạt động</a>
                        <Link to="/login" className="landing-nav-link">Đăng nhập</Link>
                        <Link to="/register" className="btn-landing-primary">
                            Bắt đầu miễn phí
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="landing-hero">
                <div className="landing-hero-bg"></div>
                <div className="landing-hero-content">
                    <div className="landing-hero-badge">
                        <span className="landing-badge-dot"></span>
                        Nền tảng email thế hệ mới
                    </div>
                    <h1 className="landing-hero-title">
                        Email tạm thời<br />
                        <span className="landing-hero-gradient">không giới hạn</span>
                    </h1>
                    <p className="landing-hero-subtitle">
                        Bảo vệ quyền riêng tư với email tạm thời theo domain riêng.
                        Tạo inbox trong giây lát, nhận email realtime, tự động xóa khi hết hạn.
                    </p>

                    {/* Email Demo Widget */}
                    <div className="landing-email-demo">
                        <div className="landing-email-widget">
                            <div className="landing-email-input">
                                <span className="landing-email-prefix">{emailDemo}</span>
                                <span className="landing-email-domain">@yourdomain.com</span>
                            </div>
                            <button
                                onClick={handleCopy}
                                className="landing-email-copy"
                            >
                                {copied ? (
                                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                        <p className="landing-email-hint">
                            ↑ Click để copy địa chỉ email mẫu
                        </p>
                    </div>

                    <div className="landing-hero-actions">
                        <Link to="/register" className="btn-landing-primary btn-landing-lg">
                            Tạo tài khoản miễn phí
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </Link>
                        <Link to="/login" className="btn-landing-secondary btn-landing-lg">
                            Đăng nhập
                        </Link>
                    </div>

                    <div className="landing-hero-stats">
                        <div className="landing-stat">
                            <span className="landing-stat-value">10K+</span>
                            <span className="landing-stat-label">Người dùng</span>
                        </div>
                        <div className="landing-stat-divider"></div>
                        <div className="landing-stat">
                            <span className="landing-stat-value">1M+</span>
                            <span className="landing-stat-label">Email đã xử lý</span>
                        </div>
                        <div className="landing-stat-divider"></div>
                        <div className="landing-stat">
                            <span className="landing-stat-value">99.9%</span>
                            <span className="landing-stat-label">Uptime</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="landing-features">
                <div className="landing-section-container">
                    <div className="landing-section-header">
                        <h2 className="landing-section-title">Tính năng nổi bật</h2>
                        <p className="landing-section-subtitle">
                            Mọi thứ bạn cần để quản lý email tạm thời một cách chuyên nghiệp
                        </p>
                    </div>
                    <div className="landing-features-grid">
                        {features.map((feature, index) => (
                            <div key={index} className="landing-feature-card">
                                <div className="landing-feature-icon">
                                    {feature.icon}
                                </div>
                                <h3 className="landing-feature-title">{feature.title}</h3>
                                <p className="landing-feature-desc">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section id="how-it-works" className="landing-how-it-works">
                <div className="landing-section-container">
                    <div className="landing-section-header">
                        <h2 className="landing-section-title">Cách hoạt động</h2>
                        <p className="landing-section-subtitle">
                            Bắt đầu trong vài phút với 3 bước đơn giản
                        </p>
                    </div>
                    <div className="landing-steps">
                        {steps.map((step, index) => (
                            <div key={index} className="landing-step">
                                <div className="landing-step-number">{step.step}</div>
                                <div className="landing-step-content">
                                    <h3 className="landing-step-title">{step.title}</h3>
                                    <p className="landing-step-desc">{step.description}</p>
                                </div>
                                {index < steps.length - 1 && (
                                    <div className="landing-step-connector"></div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="landing-pricing">
                <div className="landing-section-container">
                    <div className="landing-section-header">
                        <h2 className="landing-section-title">Gói dịch vụ</h2>
                        <p className="landing-section-subtitle">
                            Lựa chọn gói phù hợp với nhu cầu của bạn
                        </p>
                    </div>
                    <div className="landing-pricing-grid">
                        {/* Free Plan */}
                        <div className="landing-pricing-card">
                            <div className="pricing-header">
                                <h3 className="pricing-name">Miễn phí</h3>
                                <div className="pricing-price">
                                    <span className="pricing-amount">0₫</span>
                                    <span className="pricing-period">/tháng</span>
                                </div>
                            </div>
                            <ul className="pricing-features">
                                <li>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    1 Domain
                                </li>
                                <li>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    5 Inbox
                                </li>
                                <li>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    Lưu trữ 7 ngày
                                </li>
                                <li>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    API cơ bản
                                </li>
                            </ul>
                            <Link to="/register" className="btn-landing-secondary btn-landing-lg w-full justify-center">
                                Bắt đầu miễn phí
                            </Link>
                        </div>

                        {/* Pro Plan */}
                        <div className="landing-pricing-card featured">
                            <div className="pricing-badge">Phổ biến nhất</div>
                            <div className="pricing-header">
                                <h3 className="pricing-name">Pro</h3>
                                <div className="pricing-price">
                                    <span className="pricing-amount">199K</span>
                                    <span className="pricing-period">/tháng</span>
                                </div>
                            </div>
                            <ul className="pricing-features">
                                <li>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    5 Domains
                                </li>
                                <li>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    Inbox không giới hạn
                                </li>
                                <li>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    Lưu trữ 30 ngày
                                </li>
                                <li>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    API đầy đủ + Webhook
                                </li>
                                <li>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    Hỗ trợ ưu tiên
                                </li>
                            </ul>
                            <Link to="/register" className="btn-landing-primary btn-landing-lg w-full justify-center">
                                Nâng cấp Pro
                            </Link>
                        </div>

                        {/* Enterprise Plan */}
                        <div className="landing-pricing-card">
                            <div className="pricing-header">
                                <h3 className="pricing-name">Enterprise</h3>
                                <div className="pricing-price">
                                    <span className="pricing-amount">Liên hệ</span>
                                </div>
                            </div>
                            <ul className="pricing-features">
                                <li>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    Domain không giới hạn
                                </li>
                                <li>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    Lưu trữ vĩnh viễn
                                </li>
                                <li>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    SLA 99.99%
                                </li>
                                <li>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    On-premise deployment
                                </li>
                            </ul>
                            <a href="#" className="btn-landing-secondary btn-landing-lg w-full justify-center">
                                Liên hệ sales
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* Testimonials/Trust Section */}
            <section className="landing-testimonials">
                <div className="landing-section-container">
                    <div className="landing-section-header">
                        <h2 className="landing-section-title">Được tin dùng bởi</h2>
                        <p className="landing-section-subtitle">
                            Hơn 10,000 developer và doanh nghiệp đang sử dụng TempMail Pro
                        </p>
                    </div>
                    <div className="landing-testimonials-grid">
                        <div className="testimonial-card">
                            <div className="testimonial-content">
                                <p>"Giải pháp hoàn hảo cho testing automation. Setup nhanh, API rõ ràng, support rất nhanh."</p>
                            </div>
                            <div className="testimonial-author">
                                <div className="testimonial-avatar">HN</div>
                                <div className="testimonial-info">
                                    <span className="testimonial-name">Hùng Nguyễn</span>
                                    <span className="testimonial-role">QA Lead, Tech Corp</span>
                                </div>
                            </div>
                        </div>
                        <div className="testimonial-card">
                            <div className="testimonial-content">
                                <p>"Không còn phải dùng personal email cho testing nữa. Inbox tạm thời giúp team dev làm việc hiệu quả hơn nhiều."</p>
                            </div>
                            <div className="testimonial-author">
                                <div className="testimonial-avatar">MT</div>
                                <div className="testimonial-info">
                                    <span className="testimonial-name">Minh Trần</span>
                                    <span className="testimonial-role">Senior Developer, StartupXYZ</span>
                                </div>
                            </div>
                        </div>
                        <div className="testimonial-card">
                            <div className="testimonial-content">
                                <p>"Domain custom của TempMail Pro giúp chúng tôi có giải pháp email testing chuyên nghiệp với brand riêng."</p>
                            </div>
                            <div className="testimonial-author">
                                <div className="testimonial-avatar">LP</div>
                                <div className="testimonial-info">
                                    <span className="testimonial-name">Linh Phạm</span>
                                    <span className="testimonial-role">CTO, DigitalAgency</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="landing-cta">
                <div className="landing-cta-container">
                    <div className="landing-cta-content">
                        <h2 className="landing-cta-title">
                            Sẵn sàng bảo vệ quyền riêng tư?
                        </h2>
                        <p className="landing-cta-subtitle">
                            Tạo tài khoản miễn phí ngay hôm nay và trải nghiệm sự khác biệt
                        </p>
                        <div className="landing-cta-actions">
                            <Link to="/register" className="btn-landing-cta">
                                Bắt đầu miễn phí
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <div className="landing-footer-container">
                    <div className="landing-footer-brand">
                        <div className="landing-logo">
                            <div className="landing-logo-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <span className="landing-logo-text">TempMail Pro</span>
                        </div>
                        <p className="landing-footer-tagline">
                            Nền tảng email tạm thời chuyên nghiệp
                        </p>
                    </div>
                    <div className="landing-footer-links">
                        <div className="landing-footer-group">
                            <h4>Sản phẩm</h4>
                            <a href="#features">Tính năng</a>
                            <a href="#how-it-works">Cách hoạt động</a>
                            <Link to="/login">Đăng nhập</Link>
                        </div>
                        <div className="landing-footer-group">
                            <h4>Hỗ trợ</h4>
                            <a href="#">Tài liệu API</a>
                            <a href="#">Hướng dẫn DNS</a>
                            <a href="#">Liên hệ</a>
                        </div>
                    </div>
                </div>
                <div className="landing-footer-bottom">
                    <p>© 2024 TempMail Pro. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
