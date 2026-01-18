import { Outlet } from "react-router-dom";
import { Navigation } from "../components/Navigation";
import { SiteFooter } from "../components/SiteFooter";
import { BackgroundEffects } from "../components/BackgroundEffects";

export function AuthLayout() {
    return (
        // Root Scroll Container: Overrides body fixed position
        <div className="auth-layout fixed inset-0 overflow-x-hidden bg-slate-950 text-white font-sans selection:bg-purple-500/30 scroll-smooth" style={{ overflowY: 'auto', zIndex: 50 }}>
            {/* Full viewport animated background */}
            <BackgroundEffects variant="intense" showGrid />

            {/* Content Wrapper: min-h-full to support footer pushing */}
            <div className="relative z-10 min-h-full flex flex-col">
                <Navigation variant="auth" />

                <main id="main-content" className="flex-1 flex flex-col pt-20 md:pt-24">
                    <Outlet />
                </main>

                {/* Full Footer requested by user */}
                <SiteFooter variant="full" />
            </div>
        </div>
    );
}
