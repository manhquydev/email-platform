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
    login: (email: string, pass: string) => Promise<void>;
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
            const res = await api<{ token: string, user: User }>("/auth/login", {
                method: "POST",
                body: { email, password: pass },
            });
            setToken(res.token);
            setUser(res.user);
            toast.success("Đăng nhập thành công");
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
                        setUser({ id: decoded.id, email: decoded.email, role: decoded.role });
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
    }, [token]);

    if (initializing) {
        return <Loading fullScreen message="Đang tải dữ liệu..." />;
    }

    return (
        <AuthContext.Provider value={{ token, user, login, logout, busy }}>
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
