/**
 * Custom hooks for TelegramLinkModal
 */
import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { API_URL, type TokenData, type ModalState } from "./telegram-link-modal-types";

/** Hook to manage telegram link modal state and API interactions */
export function useTelegramLinkModal(inboxEmail: string, onClose: () => void) {
    const [state, setState] = useState<ModalState>("loading");
    const [tokenData, setTokenData] = useState<TokenData | null>(null);
    const [timeLeft, setTimeLeft] = useState<string>("");
    const [error, setError] = useState<string>("");

    // Generate token on mount
    useEffect(() => {
        const generateToken = async () => {
            try {
                const res = await fetch(`${API_URL}/api/public/telegram/generate-token`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ inboxEmail }),
                });

                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || "Failed to generate token");
                }

                const data: TokenData = await res.json();
                setTokenData(data);
                setState("ready");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (err: any) {
                setError(err.message);
                setState("error");
            }
        };

        generateToken();
    }, [inboxEmail]);

    // Countdown timer
    useEffect(() => {
        if (!tokenData?.expiresAt || state !== "ready") return;

        const updateTimer = () => {
            const now = new Date().getTime();
            const expiry = new Date(tokenData.expiresAt).getTime();
            const diff = expiry - now;

            if (diff <= 0) {
                setState("expired");
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeLeft(
                `${hours.toString().padStart(2, "0")}:${minutes
                    .toString()
                    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
            );
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);

        return () => clearInterval(interval);
    }, [tokenData?.expiresAt, state]);

    // Poll for success
    useEffect(() => {
        if (!tokenData?.token || state !== "ready") return;

        const pollStatus = async () => {
            try {
                const res = await fetch(
                    `${API_URL}/api/public/telegram/status/${tokenData.token}`
                );

                if (!res.ok) return;

                const data = await res.json();

                if (data.used) {
                    setState("success");
                    toast.success("Telegram linked successfully!");
                } else if (data.expired) {
                    setState("expired");
                }
            } catch {
                // Ignore polling errors
            }
        };

        const interval = setInterval(pollStatus, 3000);

        return () => clearInterval(interval);
    }, [tokenData?.token, state]);

    // Close on Escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };

        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [onClose]);

    return { state, tokenData, timeLeft, error };
}
