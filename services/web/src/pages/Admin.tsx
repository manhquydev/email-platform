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
        <div className="min-h-screen" style={{ background: 'var(--nebula-void)' }}>
            <AdminPanel token={token} />
        </div>
    );
}

