import { useEffect, useState } from "react";
import { Outlet, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api, API_BASE } from "../utils/api";

export function MainLayout() {
    const { user, logout, token } = useAuth();
    const navigate = useNavigate();
    const [health, setHealth] = useState("checking...");

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    const isAdmin = user?.role === "ADMIN";

    const checkHealth = async () => {
        try {
            const res = await api<{ status?: string; ok?: boolean }>("/health");
            setHealth(res.status ?? (res.ok ? "ok" : "unknown"));
        } catch {
            setHealth("offline");
        }
    };

    useEffect(() => {
        checkHealth();
    }, []);

    return (
        <div className="shell">
            <div className="header">
                <div className="title">
                    <span>dY</span>
                    <div>
                        <div>Inbound Email Hub</div>
                        <div className="small">Domains • Inboxes • Messages</div>
                    </div>
                </div>
                <div className="row" style={{ gap: "0.6rem" }}>
                    <span className="pill">{health}</span>
                    <span className="badge">
                        {user?.email} ({user?.role ?? "user"})
                    </span>
                    {isAdmin && (
                        <button onClick={() => navigate("/admin")}>Admin</button>
                    )}
                    <button onClick={logout}>Đăng xuất</button>
                </div>
            </div>

            <div className="content">
                <Outlet />
            </div>

            <div className="footer">
                <span>API base: {API_BASE}</span>
                <span className="small">
                    Need help? Try `/health` or re-login if token expires.
                </span>
            </div>
        </div>
    );
}
