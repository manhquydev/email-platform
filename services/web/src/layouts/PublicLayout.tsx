import { Outlet } from "react-router-dom";
import { Navigation } from "../components/Navigation";
import { SiteFooter } from "../components/SiteFooter";

export function PublicLayout() {
    return (
        <div className="public-layout min-h-screen bg-[var(--color-bg)] text-[var(--color-text-main)]" data-theme="dark">
            <Navigation variant="landing" />
            <main className="public-main relative z-10">
                <Outlet />
            </main>
            <SiteFooter variant="full" />
        </div>
    );
}
