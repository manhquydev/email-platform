/**
 * Landing Page - Main entry point
 * Sections extracted to landing-page-modules/
 */
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
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

    if (token) return <Navigate to="/app" replace />;

    return (
        <div className="landing neo-mesh-bg overflow-x-hidden">
            {/* Background Effects */}
            <div className="landing-bg fixed inset-0 z-0 pointer-events-none">
                <div className="landing-bg-gradient absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,0.15),transparent_60%)]" />
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px] animate-pulse"
                    style={{ background: 'rgba(139, 92, 246, 0.2)', opacity: 0.5 }}
                />
                <div
                    className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[150px] animate-pulse"
                    style={{ background: 'rgba(139, 92, 246, 0.15)', opacity: 0.5 }}
                />
                <div
                    className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] animate-pulse"
                    style={{ background: 'rgba(147, 51, 234, 0.12)', opacity: 0.4, animationDelay: '1s' }}
                />
            </div>

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
