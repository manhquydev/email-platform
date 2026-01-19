/**
 * Custom hooks for SecuritySettings
 */
import { useState, useCallback } from "react";
import type { FormEvent } from "react";
import { api } from "../../../utils/api";
import { useAuth } from "../../../context/AuthContext";
import toast from "react-hot-toast";
import { getFriendlyErrorMessage } from "../../../utils/errorMapping";
import type { TwoFAStep } from "./security-types";

/**
 * Hook for password change functionality
 */
export function usePasswordChange() {
    const { token } = useAuth();
    const [password, setPassword] = useState("");
    const [passwordMsg, setPasswordMsg] = useState("");
    const [passwordErr, setPasswordErr] = useState("");
    const [passwordBusy, setPasswordBusy] = useState(false);

    const handlePasswordChange = useCallback(async (e: FormEvent) => {
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
            setPasswordMsg("Cập nhật mật khẩu thành công!");
            setPassword("");
            toast.success("Đã đổi mật khẩu");
        } catch (error) {
            setPasswordErr(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setPasswordBusy(false);
        }
    }, [password, token]);

    return {
        password, setPassword,
        passwordMsg, passwordErr, passwordBusy,
        handlePasswordChange
    };
}

/**
 * Hook for 2FA management
 */
export function useTwoFactorAuth(loadProfile: () => void) {
    const { token } = useAuth();
    const [twoFAStep, setTwoFAStep] = useState<TwoFAStep>("idle");
    const [qrCode, setQrCode] = useState("");
    const [totpSecret, setTotpSecret] = useState("");
    const [verifyCode, setVerifyCode] = useState("");
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [twoFABusy, setTwoFABusy] = useState(false);
    const [twoFAError, setTwoFAError] = useState("");
    const [showDisable2FAConfirm, setShowDisable2FAConfirm] = useState(false);
    const [twoFAPassword, setTwoFAPassword] = useState("");

    const setup2FA = useCallback(async () => {
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
    }, [token]);

    const enable2FA = useCallback(async () => {
        if (verifyCode.length !== 6) {
            setTwoFAError("Vui lòng nhập mã 6 chữ số");
            return;
        }
        setTwoFABusy(true);
        setTwoFAError("");
        try {
            const res = await api<{ ok: boolean; backupCodes: string[] }>("/auth/2fa/enable", {
                method: "POST", token, body: { code: verifyCode }
            });
            setBackupCodes(res.backupCodes);
            setTwoFAStep("backup");
            toast.success("Đã bật 2FA!");
            loadProfile();
        } catch (error) {
            setTwoFAError(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setTwoFABusy(false);
        }
    }, [verifyCode, token, loadProfile]);

    const confirmDisable2FA = useCallback(async () => {
        if (!twoFAPassword) {
            setTwoFAError("Vui lòng nhập mật khẩu");
            return;
        }
        setTwoFABusy(true);
        setTwoFAError("");
        try {
            await api("/auth/2fa/disable", { method: "POST", token, body: { password: twoFAPassword } });
            toast.success("Đã tắt 2FA");
            setTwoFAStep("idle");
            setShowDisable2FAConfirm(false);
            setTwoFAPassword("");
            loadProfile();
        } catch (error) {
            setTwoFAError(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setTwoFABusy(false);
        }
    }, [twoFAPassword, token, loadProfile]);

    return {
        twoFAStep, setTwoFAStep,
        qrCode, totpSecret,
        verifyCode, setVerifyCode,
        backupCodes,
        twoFABusy, twoFAError,
        showDisable2FAConfirm, setShowDisable2FAConfirm,
        twoFAPassword, setTwoFAPassword,
        setup2FA, enable2FA, confirmDisable2FA
    };
}
