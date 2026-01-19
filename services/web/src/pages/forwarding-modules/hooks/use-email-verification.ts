/**
 * Hook for email verification workflow
 * Extracted from Forwarding.tsx for modularity
 */
import { useState, useCallback } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../../context/AuthContext";
import { api } from "../../../utils/api";
import { getFriendlyErrorMessage } from "../../../utils/errorMapping";

export type VerifyStep = "idle" | "pending" | "code";

export interface UseEmailVerificationReturn {
    // State
    verifyEmail: string;
    verifyCode: string;
    verifyStep: VerifyStep;
    verifyBusy: boolean;

    // Actions
    setVerifyEmail: (email: string) => void;
    setVerifyCode: (code: string) => void;
    sendVerification: () => Promise<void>;
    confirmVerification: (onSuccess: () => void) => Promise<void>;
    cancelVerification: () => void;
}

export function useEmailVerification(): UseEmailVerificationReturn {
    const { token } = useAuth();
    const [verifyEmail, setVerifyEmail] = useState("");
    const [verifyCode, setVerifyCode] = useState("");
    const [verifyStep, setVerifyStep] = useState<VerifyStep>("idle");
    const [verifyBusy, setVerifyBusy] = useState(false);

    const sendVerification = useCallback(async () => {
        if (!verifyEmail) return;
        setVerifyBusy(true);
        try {
            await api("/forwarding/verify-email", {
                method: "POST",
                token,
                body: { email: verifyEmail }
            });
            setVerifyStep("code");
            toast.success("Mã xác minh đã được gửi tới email của bạn");
        } catch (error) {
            toast.error(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setVerifyBusy(false);
        }
    }, [verifyEmail, token]);

    const confirmVerification = useCallback(async (onSuccess: () => void) => {
        if (!verifyCode || verifyCode.length !== 6) return;
        setVerifyBusy(true);
        try {
            await api("/forwarding/confirm-email", {
                method: "POST",
                token,
                body: { email: verifyEmail, code: verifyCode }
            });
            toast.success("Email đã được xác minh!");
            setVerifyStep("idle");
            setVerifyEmail("");
            setVerifyCode("");
            onSuccess();
        } catch (error) {
            toast.error(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setVerifyBusy(false);
        }
    }, [verifyEmail, verifyCode, token]);

    const cancelVerification = useCallback(() => {
        setVerifyStep("idle");
        setVerifyCode("");
    }, []);

    return {
        verifyEmail,
        verifyCode,
        verifyStep,
        verifyBusy,
        setVerifyEmail,
        setVerifyCode: (code: string) => setVerifyCode(code.replace(/\D/g, "").slice(0, 6)),
        sendVerification,
        confirmVerification,
        cancelVerification
    };
}
