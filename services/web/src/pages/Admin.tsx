
import { useAuth } from "../context/AuthContext";
import { AdminPanel } from "../components/AdminPanel";
import { Navigate } from "react-router-dom";

export function Admin() {
    const { user, token } = useAuth();

    if (!user || user.role !== "ADMIN") {
        return <Navigate to="/" replace />;
    }

    return <AdminPanel token={token} />;
}
