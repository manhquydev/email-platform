import { Outlet } from "react-router-dom";
import { Navigation } from "../components/Navigation";
import { SiteFooter } from "../components/SiteFooter";

export function AuthLayout() {
    return (
        // Root Scroll Container: Overrides body fixed position
        <div className="auth-layout fixed inset-0 overflow-x-hidden bg-bg-primary text-text-main font-sans selection:bg-primary/30 scroll-smooth" style={{ overflowY: 'auto', zIndex: 50 }}>
            {/* Full viewport animated background - Fixed to viewfinder, doesn't scroll */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-primary" />
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary/20 blur-[120px] animate-pulse-slow" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/20 blur-[100px] animate-pulse-slow delay-1000" />
                <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] rounded-full bg-blue-500/10 blur-[80px]" />
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03]" />
            </div>

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
