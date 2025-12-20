import { Outlet } from "react-router-dom";
import { Navigation } from "../components/Navigation";
import { SiteFooter } from "../components/SiteFooter";

export function AuthLayout() {
    return (
        <div className="auth-layout">
            {/* Full viewport animated background */}
            <div className="auth-bg">
                <div className="auth-bg-gradient" />
                <div className="auth-bg-grid" />
                <div className="auth-bg-glow auth-bg-glow-1" />
                <div className="auth-bg-glow auth-bg-glow-2" />
            </div>

            <Navigation variant="auth" />
            <main className="auth-main">
                <Outlet />
            </main>
            <SiteFooter variant="minimal" />
        </div>
    );
}
