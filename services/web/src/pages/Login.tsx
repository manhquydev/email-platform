import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LoginForm } from "../components/LoginForm";
import { API_BASE } from "../utils/api";

export function Login() {
    const { login, token, busy } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (token) {
            navigate("/");
        }
    }, [token, navigate]);

    const handleLogin = async (email: string, pass: string) => {
        try {
            await login(email, pass);
        } catch {
            // Error handled in context by toast
        }
    };

    return (
        <div className="shell">
            <div className="header">
                <div className="title">
                    <span>dY</span>
                    <div>Inbound Email Hub</div>
                </div>
                <span className="pill">Welcome</span>
            </div>
            <div className="content" style={{ gridTemplateColumns: "1fr" }}>
                <div className="panel">
                    <h2>Đăng nhập</h2>
                    <LoginForm onSubmit={handleLogin} busy={busy} />
                </div>
            </div>
            <div className="footer">
                <span>API base: {API_BASE}</span>
                <span className="pill">No token</span>
            </div>
        </div>
    );
}
