import { useAuth } from "../context/AuthContext";
import { AdminPanel } from "../components/AdminPanel";
import { Navigate } from "react-router-dom";

export function Admin() {
    const { user, token } = useAuth();

    if (!user || user.role !== "ADMIN") {
        return <Navigate to="/" replace />;
    }

    // AdminPanel has its own sidebar, no need for AppShell wrapper
    return (
        <div className="min-h-screen neo-mesh-bg relative">
            {/* Ephemera Background Effects for Admin */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="neo-blob-orb neo-blob-orb-violet" style={{ width: '400px', height: '400px', top: '10%', right: '10%', opacity: 0.2 }} />
                <div className="neo-blob-orb neo-blob-orb-cyan" style={{ width: '300px', height: '300px', bottom: '20%', left: '5%', opacity: 0.15 }} />
            </div>
            <div className="relative z-10">
                <AdminPanel token={token} />
            </div>
        </div>
    );
}


