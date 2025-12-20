import { Outlet } from "react-router-dom";
import { Navigation } from "../components/Navigation";
import { SiteFooter } from "../components/SiteFooter";

export function PublicLayout() {
    return (
        <div className="public-layout">
            <Navigation variant="landing" />
            <main className="public-main">
                <Outlet />
            </main>
            <SiteFooter variant="full" />
        </div>
    );
}
