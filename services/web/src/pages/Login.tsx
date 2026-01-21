/**
 * Login - Authentication page with email/password and 2FA support
 * Modules extracted to login-modules/
 */
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { GlassCard } from "../components/ui/GlassCard";
import { SEOHead } from "../components/seo/SEOHead";
import {
    useLoginForm,
    BrandLogo,
    SecurityBadge,
    LoginForm,
    TwoFactorForm,
    HeroSection,
    LoginFooter
} from "./login-modules";

export function Login() {
    const { t } = useTranslation();
    const {
        email,
        setEmail,
        password,
        setPassword,
        requires2FA,
        twoFactorCode,
        setTwoFactorCode,
        error,
        busy,
        handleSubmit,
        handleVerify2FA,
        handleLoginSuccess,
        handleBack
    } = useLoginForm();

    return (
        <div className="flex-1 w-full flex flex-col p-4 py-12 relative">
            <SEOHead
                title={t('seo.login.title', 'Đăng Nhập')}
                description={t('seo.login.description', 'Đăng nhập vào tài khoản Ephemera để quản lý email tạm thời của bạn.')}
                path="/login"
            />
            <SecurityBadge />

            <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 items-center mx-auto">
                <GlassCard className="p-8 md:p-12 rounded-3xl w-full max-w-md mx-auto md:mx-0 relative z-10 animate-fade-in-up">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>

                    <Link to="/" className="inline-flex items-center gap-2 mb-8 hover:opacity-80 transition-opacity">
                        <div className="p-2 rounded-xl bg-primary/10 shadow-glow">
                            <BrandLogo />
                        </div>
                        <span className="text-xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Ephemera</span>
                    </Link>

                    {!requires2FA ? (
                        <LoginForm
                            email={email}
                            password={password}
                            error={error}
                            busy={busy}
                            onEmailChange={setEmail}
                            onPasswordChange={setPassword}
                            onSubmit={handleSubmit}
                            onLoginSuccess={handleLoginSuccess}
                        />
                    ) : (
                        <TwoFactorForm
                            code={twoFactorCode}
                            busy={busy}
                            onCodeChange={setTwoFactorCode}
                            onSubmit={handleVerify2FA}
                            onBack={handleBack}
                        />
                    )}

                    <LoginFooter />
                </GlassCard>

                <HeroSection />
            </div>
        </div>
    );
}
