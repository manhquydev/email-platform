/**
 * Types and hooks for Login page
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

export interface LoginState {
    email: string;
    password: string;
    requires2FA: boolean;
    tempToken: string;
    twoFactorCode: string;
    error: string | null;
}

/** Hook to manage login form state and authentication logic */
export function useLoginForm() {
    const { login, verify2FA, token, busy } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [requires2FA, setRequires2FA] = useState(false);
    const [tempToken, setTempToken] = useState("");
    const [twoFactorCode, setTwoFactorCode] = useState("");
    const [error, setError] = useState<string | null>(null);

    // Redirect if already logged in
    useEffect(() => {
        if (token) navigate("/app");
    }, [token, navigate]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleLoginSuccess = (token: string, user: any) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        window.location.href = user.role === 'ADMIN' ? '/admin' : '/app';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            const res = await login(email, password);
            if (res.requires2FA && res.tempToken) {
                setRequires2FA(true);
                setTempToken(res.tempToken);
                toast.success("Vui lòng nhập mã xác thực 2 lớp");
            }
        } catch (err) {
            const msg = (err as Error).toString().replace("Error: ", "");
            if (msg.includes("disabled") || msg.includes("khóa") || msg.includes("locked")) {
                setError("Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.");
            } else {
                setError("Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.");
            }
        }
    };

    const handleVerify2FA = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await verify2FA(tempToken, twoFactorCode);
        } catch { /* Error handled in AuthContext */ }
    };

    const handleBack = () => setRequires2FA(false);

    return {
        email,
        setEmail,
        password,
        setPassword,
        requires2FA,
        twoFactorCode,
        setTwoFactorCode,
        error,
        busy,
        handleSubmit,
        handleVerify2FA,
        handleLoginSuccess,
        handleBack
    };
}
