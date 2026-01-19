/**
 * Custom hook for AdminSettingsPage data management
 * Handles profile, system info, 2FA, password change, email verification
 */
import { useState, useEffect, useCallback, type FormEvent } from "react";
import { api } from "../../../utils/api";
import { getFriendlyErrorMessage } from "../../../utils/errorMapping";
import toast from "react-hot-toast";
import { useAuth } from "../../../context/AuthContext";
import type { AdminProfile, SystemInfo, SystemSetting, TwoFAStep } from "./types";

export interface UseAdminSettingsDataReturn {
    // Profile & System
    profile: AdminProfile | null;
    systemInfo: SystemInfo | null;
    // Password
    password: string;
    setPassword: (v: string) => void;
    passwordMsg: string;
    passwordErr: string;
    passwordBusy: boolean;
    submitPassword: (e: FormEvent) => Promise<void>;
    // 2FA
    twoFAStep: TwoFAStep;
    qrCode: string;
    totpSecret: string;
    verifyCode: string;
    setVerifyCode: (v: string) => void;
    backupCodes: string[];
    twoFABusy: boolean;
    twoFAError: string;
    setup2FA: () => Promise<void>;
    enable2FA: () => Promise<void>;
    disable2FA: () => Promise<void>;
    setTwoFAStep: (step: TwoFAStep) => void;
    // Email Verification
    emailVerificationRequired: boolean;
    emailVerificationLoading: boolean;
    toggleEmailVerification: () => Promise<void>;
}

export function useAdminSettingsData(): UseAdminSettingsDataReturn {
    const { token } = useAuth();

    // Profile & System
    const [profile, setProfile] = useState<AdminProfile | null>(null);
    const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);

    // Password change
    const [password, setPassword] = useState("");
    const [passwordMsg, setPasswordMsg] = useState("");
    const [passwordErr, setPasswordErr] = useState("");
    const [passwordBusy, setPasswordBusy] = useState(false);

    // 2FA states
    const [twoFAStep, setTwoFAStep] = useState<TwoFAStep>("idle");
    const [qrCode, setQrCode] = useState("");
    const [totpSecret, setTotpSecret] = useState("");
    const [verifyCode, setVerifyCode] = useState("");
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [twoFABusy, setTwoFABusy] = useState(false);
    const [twoFAError, setTwoFAError] = useState("");

    // Email verification setting
    const [emailVerificationRequired, setEmailVerificationRequired] = useState(true);
    const [emailVerificationLoading, setEmailVerificationLoading] = useState(false);

    // Load profile (used for refresh after 2FA changes)
    const loadProfile = useCallback(async () => {
        try {
            const profileRes = await api<{ user: AdminProfile }>("/admin/profile", { token });
            setProfile(profileRes.user);
        } catch {
            // Silent fail
        }
    }, [token]);

    // Initial data load
    useEffect(() => {
        const loadData = async () => {
            try {
                const [profileRes, systemRes, settingsRes] = await Promise.all([
                    api<{ user: AdminProfile }>("/admin/profile", { token }),
                    api<{ system: SystemInfo }>("/admin/system-info", { token }),
                    api<{ settings: SystemSetting[] }>("/admin/system/settings", { token })
                ]);
                setProfile(profileRes.user);
                setSystemInfo(systemRes.system);

                // Load email verification setting
                const emailVerifSetting = settingsRes.settings.find(s => s.key === "REQUIRE_EMAIL_VERIFICATION");
                setEmailVerificationRequired(emailVerifSetting?.value !== "false");
            } catch {
                // Silent fail
            }
        };
        loadData();
    }, [token]);

    // Password change handler
    const submitPassword = async (e: FormEvent) => {
        e.preventDefault();
        if (!password || password.length < 6) {
            setPasswordErr("Mật khẩu phải có ít nhất 6 ký tự");
            return;
        }
        setPasswordBusy(true);
        setPasswordMsg("");
        setPasswordErr("");
        try {
            await api("/auth/change-password", { method: "POST", token, body: { newPassword: password } });
            setPasswordMsg("Đã cập nhật mật khẩu");
            setPassword("");
        } catch (error) {
            setPasswordErr(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setPasswordBusy(false);
        }
    };

    // 2FA: Setup
    const setup2FA = async () => {
        setTwoFABusy(true);
        setTwoFAError("");
        try {
            const res = await api<{ qrCode: string; secret: string }>("/auth/2fa/setup", { method: "POST", token });
            setQrCode(res.qrCode);
            setTotpSecret(res.secret);
            setTwoFAStep("setup");
        } catch (error) {
            setTwoFAError(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setTwoFABusy(false);
        }
    };

    // 2FA: Enable
    const enable2FA = async () => {
        if (verifyCode.length !== 6) {
            setTwoFAError("Vui lòng nhập mã 6 chữ số");
            return;
        }
        setTwoFABusy(true);
        setTwoFAError("");
        try {
            const res = await api<{ ok: boolean; backupCodes: string[] }>("/auth/2fa/enable", {
                method: "POST",
                token,
                body: { code: verifyCode }
            });
            setBackupCodes(res.backupCodes);
            setTwoFAStep("backup");
            toast.success("2FA đã được kích hoạt!");
            loadProfile();
        } catch (error) {
            setTwoFAError(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setTwoFABusy(false);
        }
    };

    // 2FA: Disable
    const disable2FA = async () => {
        const pwd = prompt("Nhập mật khẩu để tắt 2FA:");
        if (!pwd) return;

        setTwoFABusy(true);
        setTwoFAError("");
        try {
            await api("/auth/2fa/disable", { method: "POST", token, body: { password: pwd } });
            toast.success("2FA đã được tắt");
            setTwoFAStep("idle");
            loadProfile();
        } catch (error) {
            setTwoFAError(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setTwoFABusy(false);
        }
    };

    // Email verification toggle
    const toggleEmailVerification = async () => {
        setEmailVerificationLoading(true);
        try {
            const newValue = !emailVerificationRequired;
            await api("/admin/system/settings", {
                method: "POST",
                token,
                body: {
                    key: "REQUIRE_EMAIL_VERIFICATION",
                    value: String(newValue)
                }
            });
            setEmailVerificationRequired(newValue);
            toast.success(newValue
                ? "Đã bật xác minh email cho người dùng mới"
                : "Đã tắt xác minh email - người dùng mới không cần verify"
            );
        } catch (error) {
            toast.error(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setEmailVerificationLoading(false);
        }
    };

    return {
        profile,
        systemInfo,
        password,
        setPassword,
        passwordMsg,
        passwordErr,
        passwordBusy,
        submitPassword,
        twoFAStep,
        qrCode,
        totpSecret,
        verifyCode,
        setVerifyCode,
        backupCodes,
        twoFABusy,
        twoFAError,
        setup2FA,
        enable2FA,
        disable2FA,
        setTwoFAStep,
        emailVerificationRequired,
        emailVerificationLoading,
        toggleEmailVerification,
    };
}
