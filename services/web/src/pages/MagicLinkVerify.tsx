import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { api } from "../utils/api";
import { tokenManager } from "../utils/token-manager";
import { GlassCard } from "../components/ui/GlassCard";
import { Button } from "../components/ui/Button";

// Move BrandLogo outside component to prevent recreation on render
const BrandLogo = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8 text-primary">
        <path d="M12 12 C12 6, 3 6, 3 12 C3 18, 12 18, 12 12" strokeLinecap="round" />
        <path d="M12 12 C12 6, 21 6, 21 12" strokeLinecap="round" opacity="0.6" />
        <circle cx="21" cy="12" r="1" fill="currentColor" opacity="0.4" />
    </svg>
);

export function MagicLinkVerify() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
    const [errorMessage, setErrorMessage] = useState("");

    const verifyToken = async (token: string) => {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const res = await api<{ token: string; csrfToken?: string; user: any }>("/auth/magic-link/verify", {
                method: "POST",
                body: { token }
            });

            // Seed the in-memory access token + session flag (the server set the httpOnly refresh
            // cookie). The reload below re-hydrates the session via AuthContext.
            tokenManager.setTokens(res.token);
            if (res.csrfToken) tokenManager.setCsrfToken(res.csrfToken);
            localStorage.setItem("user", JSON.stringify(res.user));

            setStatus("success");

            // Redirect after short delay
            setTimeout(() => {
                window.location.href = res.user.role === "ADMIN" ? "/admin" : "/app";
            }, 1500);
        } catch (err) {
            setStatus("error");
            const errorMsg = (err as Error).message;
            if (errorMsg.includes("expired")) {
                setErrorMessage("Link đã hết hạn. Vui lòng yêu cầu link đăng nhập mới.");
            } else if (errorMsg.includes("used")) {
                setErrorMessage("Link đã được sử dụng. Vui lòng yêu cầu link đăng nhập mới.");
            } else {
                setErrorMessage("Không thể xác thực. Vui lòng thử lại.");
            }
        }
    };

    useEffect(() => {
        const token = searchParams.get("token");
        if (!token) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setStatus("error");
            setErrorMessage("Link không hợp lệ. Vui lòng yêu cầu link đăng nhập mới.");
            return;
        }

        verifyToken(token);

    }, [searchParams]);

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-bg via-surface to-surface-elevated">
            <GlassCard className="p-8 md:p-12 rounded-3xl w-full max-w-md text-center animate-fade-in-up">
                <Link to="/" className="inline-flex items-center gap-2 mb-8 hover:opacity-80 transition-opacity">
                    <div className="p-2 rounded-xl bg-primary/10 shadow-glow">
                        <BrandLogo />
                    </div>
                    <span className="text-xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Ephemera</span>
                </Link>

                {status === "verifying" && (
                    <div className="space-y-6">
                        <div className="w-20 h-20 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto border border-primary/20 animate-pulse">
                            <span className="material-symbols-outlined text-4xl">hourglass_empty</span>
                        </div>
                        <h1 className="text-2xl font-bold">Đang xác thực...</h1>
                        <p className="text-text-secondary">Vui lòng đợi trong giây lát</p>
                        <div className="flex justify-center">
                            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                        </div>
                    </div>
                )}

                {status === "success" && (
                    <div className="space-y-6">
                        <div className="w-20 h-20 rounded-2xl bg-green-500/10 text-green-400 flex items-center justify-center mx-auto border border-green-500/20">
                            <span className="material-symbols-outlined text-4xl">check_circle</span>
                        </div>
                        <h1 className="text-2xl font-bold text-green-400">Đăng nhập thành công!</h1>
                        <p className="text-text-secondary">Đang chuyển hướng...</p>
                    </div>
                )}

                {status === "error" && (
                    <div className="space-y-6">
                        <div className="w-20 h-20 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto border border-red-500/20">
                            <span className="material-symbols-outlined text-4xl">error</span>
                        </div>
                        <h1 className="text-2xl font-bold text-red-400">Xác thực thất bại</h1>
                        <p className="text-text-secondary">{errorMessage}</p>
                        <Button
                            onClick={() => navigate("/login")}
                            className="w-full bg-primary hover:bg-blue-600"
                        >
                            Quay lại đăng nhập
                        </Button>
                    </div>
                )}
            </GlassCard>
        </div>
    );
}
