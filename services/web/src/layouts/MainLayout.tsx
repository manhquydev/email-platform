import { useEffect, useState } from "react";
import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../utils/api";
import { AppShell } from "./AppShell";

export function MainLayout() {
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
        // eslint-disable-next-line react-hooks/set-state-in-effect
        checkHealth();

    }, []);

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    return (
        <AppShell>
            <Outlet />
        </AppShell>
    );
}
