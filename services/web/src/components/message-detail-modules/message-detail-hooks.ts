/**
 * Types and hooks for MessageDetail
 */
import { useState, useMemo, useEffect } from "react";
import type { Message } from "../../types";
import { extractOTP } from "../../utils/otpExtractor";
import { useCopyOTP } from "../../hooks/useCopyToClipboard";

export interface MessageDetailProps {
    message: Message | null;
    onComposeReply?: () => void;
    onForward?: () => void;
    onBack?: () => void;
}

/** Hook for countdown timer based on message received time */
export function useMessageTimer(message: Message | null) {
    const [timeLeft, setTimeLeft] = useState<string>("59:59");

    useEffect(() => {
        if (!message) return;
        const duration = 60 * 60 * 1000; // 1 hour
        const endTime = new Date(message.receivedAt).getTime() + duration;

        const timer = setInterval(() => {
            const now = Date.now();
            const diff = endTime - now;
            if (diff <= 0) {
                setTimeLeft("Expired");
                clearInterval(timer);
            } else {
                const m = Math.floor(diff / 60000);
                const s = Math.floor((diff % 60000) / 1000);
                setTimeLeft(`${m}:${s.toString().padStart(2, '0')}`);
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [message]);

    return timeLeft;
}

/** Hook for OTP detection and copy */
export function useOTPDetection(message: Message | null) {
    const { copy: copyOTP, copied: otpCopied } = useCopyOTP();

    const detectedOTP = useMemo(() => {
        if (!message) return null;
        const content = message.textBody || message.htmlBody?.replace(/<[^>]*>/g, '') || '';
        return extractOTP(content);
    }, [message]);

    return { detectedOTP, copyOTP, otpCopied };
}

/** Hook for view mode toggle */
export function useViewMode() {
    const [viewMode, setViewMode] = useState<"html" | "text">("html");
    return { viewMode, setViewMode };
}
