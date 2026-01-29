import { Suspense, lazy } from "react";
import { useAuth } from "../context/AuthContext";
import { AdminPanel } from "../components/AdminPanel";
import { Navigate, Route, Routes } from "react-router-dom";
import { Loading } from "../components/Loading";

// Lazy load admin pages for code splitting
const UsersPage = lazy(() => import("./admin/UsersPage").then(m => ({ default: m.UsersPage })));
const PackagesPage = lazy(() => import("./admin/PackagesPage").then(m => ({ default: m.PackagesPage })));
const CodesPage = lazy(() => import("./admin/CodesPage").then(m => ({ default: m.CodesPage })));
const AdminRulesPage = lazy(() => import("./admin/AdminRulesPage").then(m => ({ default: m.AdminRulesPage })));
const AdminSettingsPage = lazy(() => import("./admin/AdminSettingsPage").then(m => ({ default: m.AdminSettingsPage })));
const AdminNotificationPage = lazy(() => import("./admin/AdminNotificationPage").then(m => ({ default: m.AdminNotificationPage })));
const AnalyticsPage = lazy(() => import("./admin/AnalyticsPage").then(m => ({ default: m.AnalyticsPage })));
const TelegramManagementPage = lazy(() => import("./admin/TelegramManagementPage").then(m => ({ default: m.TelegramManagementPage })));
const ProvidersPage = lazy(() => import("./admin/ProvidersPage").then(m => ({ default: m.ProvidersPage })));
const AdminSupportPage = lazy(() => import("./admin/admin-support-modules").then(m => ({ default: m.AdminSupportPage })));
const AdminSupportDetail = lazy(() => import("./admin/admin-support-modules").then(m => ({ default: m.AdminSupportDetail })));

// Lazy load legacy admin components
const AdminDashboard = lazy(() => import("../components/admin/AdminDashboard").then(m => ({ default: m.AdminDashboard })));
const AdminReports = lazy(() => import("../components/admin/AdminReports").then(m => ({ default: m.AdminReports })));
const AdminLogs = lazy(() => import("../components/admin/AdminLogs").then(m => ({ default: m.AdminLogs })));
const AdminEmails = lazy(() => import("../components/admin/AdminEmails").then(m => ({ default: m.AdminEmails })));
const AdminSystem = lazy(() => import("../components/admin/AdminSystem").then(m => ({ default: m.AdminSystem })));
const AdminInboxes = lazy(() => import("../components/admin/AdminInboxes").then(m => ({ default: m.AdminInboxes })));
const AdminOrders = lazy(() => import("../components/admin/AdminOrders").then(m => ({ default: m.AdminOrders })));
const AdminDomains = lazy(() => import("../components/admin/AdminDomains").then(m => ({ default: m.AdminDomains })));
const AdminBackup = lazy(() => import("../components/admin/AdminBackup").then(m => ({ default: m.AdminBackup })));

/** Admin loading fallback */
function AdminLoading() {
    return (
        <div className="flex items-center justify-center h-64">
            <Loading />
        </div>
    );
}

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
                        <Route index element={<Suspense fallback={<AdminLoading />}><AdminDashboard token={token} /></Suspense>} />
                        <Route path="users" element={<Suspense fallback={<AdminLoading />}><UsersPage /></Suspense>} />
                        <Route path="packages" element={<Suspense fallback={<AdminLoading />}><PackagesPage /></Suspense>} />
                        <Route path="codes" element={<Suspense fallback={<AdminLoading />}><CodesPage /></Suspense>} />
                        <Route path="orders" element={<Suspense fallback={<AdminLoading />}><AdminOrders token={token} /></Suspense>} />
                        <Route path="inboxes" element={<Suspense fallback={<AdminLoading />}><AdminInboxes token={token} /></Suspense>} />
                        <Route path="emails" element={<Suspense fallback={<AdminLoading />}><AdminEmails token={token} /></Suspense>} />
                        <Route path="rules" element={<Suspense fallback={<AdminLoading />}><AdminRulesPage /></Suspense>} />
                        <Route path="domains" element={<Suspense fallback={<AdminLoading />}><AdminDomains token={token} /></Suspense>} />
                        <Route path="reports" element={<Suspense fallback={<AdminLoading />}><AdminReports token={token} /></Suspense>} />
                        <Route path="support" element={<Suspense fallback={<AdminLoading />}><AdminSupportPage /></Suspense>} />
                        <Route path="support/:id" element={<Suspense fallback={<AdminLoading />}><AdminSupportDetail /></Suspense>} />
                        <Route path="logs" element={<Suspense fallback={<AdminLoading />}><AdminLogs token={token} /></Suspense>} />
                        <Route path="system" element={<Suspense fallback={<AdminLoading />}><AdminSystem token={token} /></Suspense>} />
                        <Route path="notifications" element={<Suspense fallback={<AdminLoading />}><AdminNotificationPage /></Suspense>} />
                        <Route path="analytics" element={<Suspense fallback={<AdminLoading />}><AnalyticsPage /></Suspense>} />
                        <Route path="telegram" element={<Suspense fallback={<AdminLoading />}><TelegramManagementPage /></Suspense>} />
                        <Route path="providers" element={<Suspense fallback={<AdminLoading />}><ProvidersPage /></Suspense>} />
                        <Route path="settings" element={<Suspense fallback={<AdminLoading />}><AdminSettingsPage /></Suspense>} />
                        <Route path="backup" element={<Suspense fallback={<AdminLoading />}><AdminBackup token={token} /></Suspense>} />
                    </Route>
                </Routes>
            </div>
        </div>
    );
}
