import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import type { ReactNode } from "react";
import { jwtDecode } from "jwt-decode";
import toast from "react-hot-toast";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { api } from "../utils/api";
import { tokenManager } from "../utils/token-manager";
import type { User } from "../types";
import { Loading } from "../components/Loading";
import { clarityTrack, clarityIdentify, claritySetTag } from "../hooks/useClarity";

interface AuthContextType {
    token: string;
    user: User | null;
    login: (email: string, pass: string, rememberMe?: boolean) => Promise<{ token?: string, refreshToken?: string, user?: User, requires2FA?: boolean, tempToken?: string }>;
    verify2FA: (tempToken: string, code: string) => Promise<void>;
    logout: (reason?: 'manual' | 'expired') => void;
    busy: boolean;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Background refresh every 10 minutes
const REFRESH_INTERVAL = 10 * 60 * 1000;
// Trigger immediate refresh if hidden for > 15 minutes
const HIDDEN_REFRESH_THRESHOLD = 15 * 60 * 1000;

export function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useLocalStorage("token", "");
    const [user, setUser] = useState<User | null>(null);
    const [busy, setBusy] = useState(false);
    const [initializing, setInitializing] = useState(true);

    // Phase 3: Background refresh and multi-tab sync
    const refreshTimerRef = useRef<number | null>(null);
    const channelRef = useRef<BroadcastChannel | null>(null);
    const lastRefreshRef = useRef<number>(Date.now());
    // Prevents initAuth from re-running on every token change
    const hasInitialized = useRef(false);

    const logout = useCallback((reason?: 'manual' | 'expired') => {
        clarityTrack("logout");
        tokenManager.clearTokens();
        setToken("");
        setUser(null);

        // Clear background refresh timer
        if (refreshTimerRef.current) {
            clearInterval(refreshTimerRef.current);
            refreshTimerRef.current = null;
        }

        // Notify other tabs
        channelRef.current?.postMessage({ type: 'logout' });

        if (reason === 'expired') {
            // Redirect to login with reason so login page can show toast
            window.location.replace('/login?reason=expired');
        } else {
            toast.success("Đã đăng xuất");
        }
    }, [setToken]);

    const login = useCallback(async (email: string, pass: string, rememberMe?: boolean) => {
        setBusy(true);
        try {
            const res = await api<{ token?: string; csrfToken?: string; user?: User; requires2FA?: boolean; tempToken?: string }>("/auth/login", {
                method: "POST",
                body: { email, password: pass, rememberMe: !!rememberMe },
            });
            if (res.token && res.user) {
                // Phase 4: Refresh token is now httpOnly cookie, only store access token
                tokenManager.setTokens(res.token, "");
                setToken(res.token);
                setUser(res.user);
                lastRefreshRef.current = Date.now();

                // Notify other tabs about login
                channelRef.current?.postMessage({ type: 'login', token: res.token });

                // Track login in Clarity
                clarityIdentify(res.user.id, undefined, res.user.email);
                claritySetTag("user_role", res.user.role);
                if (res.user.tier) claritySetTag("tier", res.user.tier);
                clarityTrack("login");
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
    }, [setToken]);

    const verify2FA = useCallback(async (tempToken: string, code: string) => {
        setBusy(true);
        try {
            const res = await api<{ token: string; csrfToken: string; user: User }>("/auth/2fa/verify", {
                method: "POST",
                body: { tempToken, code },
            });
            // Phase 4: Refresh token is now httpOnly cookie, only store access token
            tokenManager.setTokens(res.token, "");
            setToken(res.token);
            setUser(res.user);
            lastRefreshRef.current = Date.now();

            // Notify other tabs about login via 2FA
            channelRef.current?.postMessage({ type: 'login', token: res.token });

            // Track 2FA verification in Clarity
            clarityIdentify(res.user.id, undefined, res.user.email);
            claritySetTag("user_role", res.user.role);
            if (res.user.tier) claritySetTag("tier", res.user.tier);
            clarityTrack("login_2fa");
            toast.success("Xác thực thành công");
        } catch (e) {
            const msg = (e as Error).toString();
            toast.error(msg.replace("Error: ", ""));
            throw e;
        } finally {
            setBusy(false);
        }
    }, [setToken]);

    // Phase 3: Background token refresh every 10 minutes
    useEffect(() => {
        if (!user) return;

        const startBackgroundRefresh = () => {
            if (refreshTimerRef.current) {
                clearInterval(refreshTimerRef.current);
            }

            refreshTimerRef.current = setInterval(async () => {
                const accessToken = tokenManager.getAccessToken();
                if (!accessToken) {
                    clearInterval(refreshTimerRef.current!);
                    return;
                }

                try {
                    const newToken = await tokenManager.refreshAccessToken();
                    const decoded = jwtDecode<User & { exp: number }>(newToken);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    setUser({ id: decoded.id, email: decoded.email, role: decoded.role, tier: (decoded as any).tier });
                    lastRefreshRef.current = Date.now();

                    // Notify other tabs
                    channelRef.current?.postMessage({ type: 'token_refresh', token: newToken });
                } catch (error) {
                    console.error('Background refresh failed:', (error as Error).message);
                    logout('expired');
                }
            }, REFRESH_INTERVAL);
        };

        startBackgroundRefresh();

        return () => {
            if (refreshTimerRef.current) {
                clearInterval(refreshTimerRef.current);
                refreshTimerRef.current = null;
            }
        };
    }, [user, logout]);

    // Phase 3: BroadcastChannel for multi-tab synchronization
    useEffect(() => {
        if (typeof BroadcastChannel === 'undefined') {
            return; // Graceful degradation for unsupported browsers
        }

        channelRef.current = new BroadcastChannel('auth_channel');

        channelRef.current.onmessage = (event) => {
            const { type, token: newToken } = event.data;

            if (type === 'logout') {
                tokenManager.clearTokens();
                setUser(null);
                setToken("");
                if (refreshTimerRef.current) {
                    clearInterval(refreshTimerRef.current);
                    refreshTimerRef.current = null;
                }
                // Redirect this tab to login when another tab logged out
                if (!window.location.pathname.startsWith('/login')) {
                    window.location.replace('/login?reason=expired');
                }
            } else if (type === 'token_refresh' || type === 'login') {
                try {
                    const decoded = jwtDecode<User & { exp: number }>(newToken);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    setUser({ id: decoded.id, email: decoded.email, role: decoded.role, tier: (decoded as any).tier });
                    setToken(newToken);

                    // CRITICAL FIX: Sync to tokenManager so API calls use updated token
                    const refreshToken = tokenManager.getRefreshToken();
                    if (refreshToken) {
                        tokenManager.setTokens(newToken, refreshToken);
                    }
                } catch (error) {
                    console.error('Failed to sync token from other tab:', (error as Error).message);
                }
            }
        };

        return () => {
            channelRef.current?.close();
            channelRef.current = null;
        };
    }, [setToken]);

    // Phase 3: Page Visibility API - pause refresh when tab hidden, trigger catch-up refresh when visible
    useEffect(() => {
        const handleVisibilityChange = async () => {
            if (document.hidden) {
                // Tab hidden - pause background refresh
                if (refreshTimerRef.current) {
                    clearInterval(refreshTimerRef.current);
                    refreshTimerRef.current = null;
                }
            } else {
                // Tab visible - trigger immediate refresh if away too long
                const timeSinceRefresh = Date.now() - lastRefreshRef.current;

                if (timeSinceRefresh > HIDDEN_REFRESH_THRESHOLD && user) {
                    try {
                        const newToken = await tokenManager.refreshAccessToken();
                        const decoded = jwtDecode<User & { exp: number }>(newToken);
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        setUser({ id: decoded.id, email: decoded.email, role: decoded.role, tier: (decoded as any).tier });
                        lastRefreshRef.current = Date.now();
                    } catch (error) {
                        console.error('Wake-up refresh failed:', (error as Error).message);
                        logout('expired');
                        return;
                    }
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [user, logout]);

    // Initialize auth state from localStorage — runs once on mount only
    useEffect(() => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;

        const initAuth = async () => {
            if (token) {
                try {
                    const decoded = jwtDecode<User & { exp: number }>(token);
                    if (decoded.exp * 1000 < Date.now()) {
                        setToken("");
                        setUser(null);
                    } else {
                        // Initially set from token to avoid flicker
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        setUser({ id: decoded.id, email: decoded.email, role: decoded.role, tier: (decoded as any).tier });

                        // Fetch fresh user data
                        try {
                            const res = await api<{ user: User }>("/auth/me", { token });
                            setUser(res.user);
                        } catch (err) {
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
            // Use tokenManager to avoid stale closure; redirect to login on expiry
            if (tokenManager.getAccessToken()) {
                logout('expired');
            }
        };

        window.addEventListener("auth:unauthorized", handleUnauthorized);
        return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
    }, []); // Empty deps — runs once on mount; token value captured from useLocalStorage initial read

    if (initializing) {
        return <Loading fullScreen message="Đang tải dữ liệu..." />;
    }

    return (
        <AuthContext.Provider value={{ token, user, login, verify2FA, logout, busy, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
