import { Outlet } from "react-router-dom";
import { Navigation } from "../components/Navigation";
import { SiteFooter } from "../components/SiteFooter";
import { useTheme } from "../context/ThemeContext";
import { BackgroundEffects } from "../components/BackgroundEffects";

export function PublicLayout() {
    const { resolvedTheme } = useTheme();

    return (
        <div className="public-layout h-screen overflow-y-auto overflow-x-hidden bg-[var(--color-bg)] text-[var(--color-text-main)] scroll-smooth relative" data-theme={resolvedTheme}>
            {/* Background Effects - consistent with app pages */}
            <BackgroundEffects variant="default" />

            <Navigation variant="landing" />
            <main id="main-content" className="public-main relative z-10">
                <Outlet />
            </main>
            <SiteFooter variant="full" />
        </div>
    );
}
