import { useEffect, useState } from "react";
import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../utils/api";
import { useVersionCheck } from "../hooks/useVersionCheck";

export function MainLayout() {
    useVersionCheck();
    const { token } = useAuth();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_, setHealth] = useState("checking...");

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

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="h-full w-full bg-bg text-text-main">
            <Outlet />
        </div>
    );
}
