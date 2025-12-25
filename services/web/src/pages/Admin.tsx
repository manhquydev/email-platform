import { useAuth } from "../context/AuthContext";
import { AdminPanel } from "../components/AdminPanel";
import { Navigate, Route, Routes } from "react-router-dom";

// New Pages
import { UsersPage } from "./admin/UsersPage";
import { PackagesPage } from "./admin/PackagesPage";
import { CodesPage } from "./admin/CodesPage";
import { AdminRulesPage } from "./admin/AdminRulesPage";
import { AdminSettingsPage } from "./admin/AdminSettingsPage";

// Legacy Components
import { AdminDashboard } from "../components/admin/AdminDashboard";
import { AdminReports } from "../components/admin/AdminReports";
import { AdminLogs } from "../components/admin/AdminLogs";
import { AdminEmails } from "../components/admin/AdminEmails";
import { AdminSystem } from "../components/admin/AdminSystem";
import { AdminInboxes } from "../components/admin/AdminInboxes";
import { AdminOrders } from "../components/admin/AdminOrders";
import { AdminDomains } from "../components/admin/AdminDomains";

export function Admin() {
    const { user, token } = useAuth();

    if (!user || user.role !== "ADMIN") {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="min-h-screen neo-mesh-bg relative">
            {/* Ephemera Background Effects for Admin */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="neo-blob-orb neo-blob-orb-violet" style={{ width: '400px', height: '400px', top: '10%', right: '10%', opacity: 0.2 }} />
                <div className="neo-blob-orb neo-blob-orb-cyan" style={{ width: '300px', height: '300px', bottom: '20%', left: '5%', opacity: 0.15 }} />
            </div>
            <div className="relative z-10">
                <Routes>
                    <Route element={<AdminPanel token={token} />}>
                        <Route index element={<AdminDashboard token={token} />} />
                        <Route path="users" element={<UsersPage />} />
                        <Route path="packages" element={<PackagesPage />} />
                        <Route path="codes" element={<CodesPage />} />
                        <Route path="orders" element={<AdminOrders token={token} />} />
                        <Route path="inboxes" element={<AdminInboxes token={token} />} />
                        <Route path="emails" element={<AdminEmails token={token} />} />
                        <Route path="rules" element={<AdminRulesPage />} />
                        <Route path="domains" element={<AdminDomains token={token} />} />
                        <Route path="reports" element={<AdminReports token={token} />} />
                        <Route path="logs" element={<AdminLogs token={token} />} />
                        <Route path="system" element={<AdminSystem token={token} />} />
                        <Route path="settings" element={<AdminSettingsPage />} />
                    </Route>
                </Routes>
            </div>
        </div>
    );
}
