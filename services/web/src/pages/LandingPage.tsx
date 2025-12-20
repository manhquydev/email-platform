import { Link, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

// Professional SVG icons
const MailIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
);

const GlobeIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 003 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
);

const ShieldIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
);

const BoltIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
);

const features = [
    {
        Icon: MailIcon,
        title: "Email tạm thời",
        description: "Tạo email tạm thời trong giây lát. Bảo vệ hộp thư chính khỏi spam."
    },
    {
        Icon: GlobeIcon,
        title: "Domain tùy chỉnh",
        description: "Sử dụng domain riêng của bạn. Tạo không giới hạn inbox."
    },
    {
        Icon: ShieldIcon,
        title: "Bảo mật tối đa",
        description: "Dữ liệu được mã hóa end-to-end. Tự động xóa khi hết hạn."
    },
    {
        Icon: BoltIcon,
        title: "API cho Developer",
        description: "Tích hợp dễ dàng với API RESTful đầy đủ. Webhook automation."
    }
];

const steps = [
    { step: "01", title: "Đăng ký tài khoản", description: "Chỉ cần email và mật khẩu" },
    { step: "02", title: "Thêm domain của bạn", description: "Cấu hình DNS đơn giản" },
    { step: "03", title: "Tạo inbox & nhận email", description: "Realtime trong dashboard" }
];

export function LandingPage() {
    const { token } = useAuth();
    const [emailPrefix, setEmailPrefix] = useState("user");
    const [copied, setCopied] = useState(false);
    const [typingIndex, setTypingIndex] = useState(0);

    const prefixes = ["user", "test", "signup", "verify", "demo"];

    useEffect(() => {
        const interval = setInterval(() => {
            setTypingIndex((i) => (i + 1) % prefixes.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        setEmailPrefix(prefixes[typingIndex]);
    }, [typingIndex]);

    if (token) return <Navigate to="/app" replace />;

    const handleCopy = () => {
        navigator.clipboard.writeText(`${emailPrefix}@yourdomain.com`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="landing neo-mesh-bg">
            {/* 2025 Enhanced Background Effects */}
            <div className="landing-bg">
                <div className="landing-bg-gradient" />
                <div className="landing-bg-grid" />
                {/* Animated Blob Orbs */}
                <div className="neo-blob-orb neo-blob-orb-violet" style={{ width: '400px', height: '400px', top: '10%', left: '5%' }} />
                <div className="neo-blob-orb neo-blob-orb-cyan" style={{ width: '350px', height: '350px', top: '60%', right: '10%' }} />
                <div className="neo-blob-orb neo-blob-orb-pink" style={{ width: '300px', height: '300px', bottom: '20%', left: '40%' }} />
            </div>



            {/* Navigation is now provided by PublicLayout */}

            {/* Hero Section */}
            <section className="landing-hero">
                <div className="landing-hero-content">
                    <div className="landing-hero-badge">
                        <span className="landing-badge-dot" />
                        <span>Nền tảng email thế hệ mới</span>
                    </div>

                    <h1 className="landing-hero-title neo-animate-fade-in-up">
                        Email tạm thời
                        <span className="landing-hero-gradient neo-text-gradient-animated"> không giới hạn</span>
                    </h1>

                    <p className="landing-hero-subtitle">
                        Bảo vệ quyền riêng tư với email tạm thời theo domain riêng.
                        Tạo inbox trong giây lát, nhận email realtime, tự động xóa khi hết hạn.
                    </p>

                    {/* Interactive Email Demo */}
                    <div className="landing-email-demo">
                        <div className="landing-email-widget">
                            <div className="landing-email-address">
                                <span className="landing-email-prefix">{emailPrefix}</span>
                                <span className="landing-email-domain">@yourdomain.com</span>
                            </div>
                            <button onClick={handleCopy} className="landing-email-copy">
                                {copied ? (
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                ) : (
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="landing-hero-actions neo-animate-fade-in-up neo-stagger-3">
                        <Link to="/register" className="landing-btn-primary neo-btn-magnetic neo-btn-shimmer">
                            Tạo tài khoản miễn phí
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </Link>
                        <Link to="/login" className="landing-btn-ghost neo-hover-scale">
                            Đăng nhập
                        </Link>
                    </div>

                    <div className="landing-hero-stats">
                        <div className="landing-stat">
                            <span className="landing-stat-value">10K+</span>
                            <span className="landing-stat-label">Người dùng</span>
                        </div>
                        <div className="landing-stat-divider" />
                        <div className="landing-stat">
                            <span className="landing-stat-value">1M+</span>
                            <span className="landing-stat-label">Email đã xử lý</span>
                        </div>
                        <div className="landing-stat-divider" />
                        <div className="landing-stat">
                            <span className="landing-stat-value">99.9%</span>
                            <span className="landing-stat-label">Uptime</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="landing-section">
                <div className="landing-section-inner">
                    <div className="landing-section-header">
                        <span className="landing-section-tag">Tính năng</span>
                        <h2>Mọi thứ bạn cần</h2>
                        <p>Công cụ mạnh mẽ để quản lý email tạm thời chuyên nghiệp</p>
                    </div>

                    <div className="landing-features-grid">
                        {features.map((feature, i) => (
                            <div
                                key={i}
                                className="landing-feature-card neo-card-float neo-card-glow-border neo-animate-fade-in-up"
                                style={{ animationDelay: `${i * 0.1}s` }}
                            >
                                <div className="landing-feature-icon neo-animate-float" style={{ animationDelay: `${i * 0.2}s` }}>
                                    <feature.Icon />
                                </div>
                                <h3>{feature.title}</h3>
                                <p>{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section id="how-it-works" className="landing-section landing-section-alt">
                <div className="landing-section-inner">
                    <div className="landing-section-header">
                        <span className="landing-section-tag">Cách hoạt động</span>
                        <h2>Bắt đầu trong 3 bước</h2>
                        <p>Đơn giản và nhanh chóng</p>
                    </div>

                    <div className="landing-steps">
                        {steps.map((step, i) => (
                            <div key={i} className="landing-step">
                                <div className="landing-step-number">{step.step}</div>
                                <div className="landing-step-content">
                                    <h3>{step.title}</h3>
                                    <p>{step.description}</p>
                                </div>
                                {i < steps.length - 1 && <div className="landing-step-line" />}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section id="pricing" className="landing-section">
                <div className="landing-section-inner">
                    <div className="landing-section-header">
                        <span className="landing-section-tag">Bảng giá</span>
                        <h2>Gói dịch vụ</h2>
                        <p>Lựa chọn phù hợp với nhu cầu của bạn</p>
                    </div>

                    <div className="landing-pricing-grid">
                        {/* Free */}
                        <div className="landing-pricing-card">
                            <div className="pricing-header">
                                <span className="pricing-name">Miễn phí</span>
                                <div className="pricing-price">
                                    <span className="pricing-amount">0₫</span>
                                    <span className="pricing-period">/tháng</span>
                                </div>
                            </div>
                            <ul className="pricing-features">
                                <li>✓ 1 Domain</li>
                                <li>✓ 5 Inbox</li>
                                <li>✓ Lưu trữ 7 ngày</li>
                                <li>✓ API cơ bản</li>
                            </ul>
                            <Link to="/register" className="pricing-btn">Bắt đầu miễn phí</Link>
                        </div>

                        {/* Pro */}
                        <div className="landing-pricing-card landing-pricing-featured">
                            <div className="pricing-featured-badge">Phổ biến nhất</div>
                            <div className="pricing-header">
                                <span className="pricing-name">Pro</span>
                                <div className="pricing-price">
                                    <span className="pricing-amount">199K</span>
                                    <span className="pricing-period">/tháng</span>
                                </div>
                            </div>
                            <ul className="pricing-features">
                                <li>✓ 5 Domains</li>
                                <li>✓ Inbox không giới hạn</li>
                                <li>✓ Lưu trữ 30 ngày</li>
                                <li>✓ API + Webhook</li>
                                <li>✓ Hỗ trợ ưu tiên</li>
                            </ul>
                            <Link to="/register" className="pricing-btn pricing-btn-primary">Nâng cấp Pro</Link>
                        </div>

                        {/* Enterprise */}
                        <div className="landing-pricing-card">
                            <div className="pricing-header">
                                <span className="pricing-name">Enterprise</span>
                                <div className="pricing-price">
                                    <span className="pricing-amount">Liên hệ</span>
                                </div>
                            </div>
                            <ul className="pricing-features">
                                <li>✓ Domain không giới hạn</li>
                                <li>✓ Lưu trữ vĩnh viễn</li>
                                <li>✓ SLA 99.99%</li>
                                <li>✓ On-premise deployment</li>
                            </ul>
                            <button className="pricing-btn">Liên hệ sales</button>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="landing-cta">
                <div className="landing-cta-inner">
                    <h2>Sẵn sàng bảo vệ quyền riêng tư?</h2>
                    <p>Tạo tài khoản miễn phí ngay hôm nay</p>
                    <Link to="/register" className="landing-btn-cta neo-btn-magnetic neo-btn-shimmer neo-animate-glow-pulse">
                        Bắt đầu ngay
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </Link>
                </div>
            </section>


            {/* Footer is now provided by PublicLayout */}
        </div>
    );
}
