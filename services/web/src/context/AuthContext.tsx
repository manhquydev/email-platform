import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { jwtDecode } from "jwt-decode";
import toast from "react-hot-toast";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { api } from "../utils/api";
import type { User } from "../types";
import { Loading } from "../components/Loading";

interface AuthContextType {
    token: string;
    user: User | null;
    login: (email: string, pass: string) => Promise<{ token?: string, user?: User, requires2FA?: boolean, tempToken?: string }>;
    verify2FA: (tempToken: string, code: string) => Promise<void>;
    logout: () => void;
    busy: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useLocalStorage("token", "");
    const [user, setUser] = useState<User | null>(null);
    const [busy, setBusy] = useState(false);
    const [initializing, setInitializing] = useState(true);

    const logout = () => {
        setToken("");
        setUser(null);
        toast.success("Đã đăng xuất");
    };

    const login = async (email: string, pass: string) => {
        setBusy(true);
        try {
            const res = await api<{ token?: string, user?: User, requires2FA?: boolean, tempToken?: string }>("/auth/login", {
                method: "POST",
                body: { email, password: pass },
            });
            if (res.token && res.user) {
                setToken(res.token);
                setUser(res.user);
                toast.success("Đăng nhập thành công");
            }
            return res;
        } catch (e) {
            const msg = (e as Error).toString();
            toast.error(msg.replace("Error: ", ""));
            throw e;
        } finally {
            setBusy(false);
        }
    };

    const verify2FA = async (tempToken: string, code: string) => {
        setBusy(true);
        try {
            const res = await api<{ token: string, user: User }>("/auth/2fa/verify", {
                method: "POST",
                body: { tempToken, code },
            });
            setToken(res.token);
            setUser(res.user);
            toast.success("Xác thực thành công");
        } catch (e) {
            const msg = (e as Error).toString();
            toast.error(msg.replace("Error: ", ""));
            throw e;
        } finally {
            setBusy(false);
        }
    };

    useEffect(() => {
        const initAuth = async () => {
            if (token) {
                try {
                    const decoded = jwtDecode<User & { exp: number }>(token);
                    if (decoded.exp * 1000 < Date.now()) {
                        setToken("");
                        setUser(null);
                    } else {
                        // Initially set from token to avoid flicker
                        setUser({ id: decoded.id, email: decoded.email, role: decoded.role, tier: (decoded as any).tier });

                        // Fetch fresh user data (for credits, etc.)
                        try {
                            const res = await api<{ user: User }>("/auth/me", { token });
                            setUser(res.user);
                        } catch (err) {
                            console.error("Failed to refresh user profile", err);
                            // If user not found (404) or unauthorized (401), clear invalid token
                            const msg = (err as Error).toString();
                            if (msg.includes("404") || msg.includes("401") || msg.includes("User not found")) {
                                setToken("");
                                setUser(null);
                                toast.error("Phiên đăng nhập không hợp lệ, vui lòng đăng nhập lại");
                            }
                        }
                    }
                } catch {
                    setToken("");
                    setUser(null);
                }
            } else {
                setUser(null);
            }
            setInitializing(false);
        };
        initAuth();

        const handleUnauthorized = () => {
            // Only clear if we actually have a user/token to avoid loops or unnecessary toasts
            if (token || user) {
                setToken("");
                setUser(null);
                toast.error("Phiên đăng nhập hết hạn, vui lòng đăng nhập lại");
            }
        };

        window.addEventListener("auth:unauthorized", handleUnauthorized);
        return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
    }, [token]);

    if (initializing) {
        return <Loading fullScreen message="Đang tải dữ liệu..." />;
    }

    return (
        <AuthContext.Provider value={{ token, user, login, verify2FA, logout, busy }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
