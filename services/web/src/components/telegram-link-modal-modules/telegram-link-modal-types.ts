/**
 * Types and constants for TelegramLinkModal
 */

export const API_URL = import.meta.env.VITE_API_URL || "";

export interface TelegramLinkModalProps {
    inboxEmail: string;
    onClose: () => void;
}

export interface TokenData {
    token: string;
    qrCodeDataUrl: string;
    telegramLink: string;
    expiresAt: string;
}

export type ModalState = "loading" | "ready" | "success" | "error" | "expired";
