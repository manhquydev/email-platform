/**
 * Types and hooks for Login page
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import type { TelegramUser } from "../../components/TelegramLoginButton";
import toast from "react-hot-toast";

const API_BASE = import.meta.env.VITE_API_BASE || "";

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
    const [rememberMe, setRememberMe] = useState(() =>
        localStorage.getItem('rememberMePref') === 'true'
    );

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
            const res = await login(email, password, rememberMe);
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

    const handleRememberMeChange = (checked: boolean) => {
        setRememberMe(checked);
        localStorage.setItem('rememberMePref', String(checked));
    };

    // Telegram login handler - only for existing linked accounts
    const [telegramBusy, setTelegramBusy] = useState(false);

    const handleTelegramAuth = async (telegramUser: TelegramUser) => {
        setTelegramBusy(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/auth/telegram`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(telegramUser),
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Đăng nhập Telegram thất bại");
            }

            // If requiresEmail = true, account not linked yet
            if (data.requiresEmail) {
                setError("Tài khoản Telegram chưa được liên kết. Vui lòng đăng nhập bằng email/mật khẩu, sau đó liên kết Telegram trong Cài đặt.");
                return;
            }

            // Successful login
            if (data.token && data.user) {
                toast.success("Đăng nhập Telegram thành công!");
                handleLoginSuccess(data.token, data.user);
            }
        } catch (err) {
            const msg = (err as Error).message;
            if (msg.includes("disabled") || msg.includes("Account is disabled")) {
                setError("Tài khoản đã bị vô hiệu hóa. Liên hệ quản trị viên.");
            } else {
                setError(msg || "Đăng nhập Telegram thất bại");
            }
        } finally {
            setTelegramBusy(false);
        }
    };

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
        telegramBusy,
        rememberMe,
        handleSubmit,
        handleVerify2FA,
        handleLoginSuccess,
        handleTelegramAuth,
        handleBack,
        handleRememberMeChange
    };
}
