/**
 * Landing Page - Main entry point
 * Sections extracted to landing-page-modules/
 */
import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { SEOHead } from "../components/seo/SEOHead";
import { LazyLanding3DScene } from "../components/three-d";
import {
    HeroSection,
    FeaturesSection,
    APISection,
    PricingSection,
    FAQSection,
    CTASection
} from "./landing-page-modules";

export function LandingPage() {
    const { token } = useAuth();
    const { t } = useTranslation();

    if (token) return <Navigate to="/app" replace />;

    return (
        <div className="landing neo-mesh-bg overflow-x-hidden">
            <SEOHead
                title={t('seo.landing.title', 'Ephemera - Email Tạm Thời Chuyên Nghiệp')}
                description={t('seo.landing.description', 'Tạo email tạm thời cao cấp với giao diện Nebula Glass. Bảo vệ quyền riêng tư, nhận email realtime, API mạnh mẽ cho nhà phát triển.')}
                path="/"
                noSuffix
            />

            {/* 3D Background Scene - Auto-fallback to CSS on mobile */}
            <LazyLanding3DScene />

            {/* Page Sections */}
            <HeroSection />
            <FeaturesSection />
            <APISection />
            <PricingSection />
            <FAQSection />
            <CTASection />
        </div>
    );
}
