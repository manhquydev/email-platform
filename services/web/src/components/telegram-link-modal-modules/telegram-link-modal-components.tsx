/**
 * UI components for TelegramLinkModal
 */
import type { TokenData } from "./telegram-link-modal-types";

/** SVG Icons */
export const Icons = {
    close: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
    ),
    error: (
        <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    success: (
        <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    expired: (
        <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    telegram: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.46-1.9-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.015-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.242-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.324-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.015 3.333-1.386 4.025-1.627 4.477-1.635.099-.002.321.023.465.141.121.099.154.232.17.325.015.093.034.306.019.472z"/>
        </svg>
    )
};

/** Modal header with close button */
export function ModalHeader({ onClose }: { onClose: () => void }) {
    return (
        <div className="flex items-center justify-between p-4 border-b border-nebula-border">
            <h2 className="text-lg font-bold text-nebula-text">Link to Telegram</h2>
            <button onClick={onClose} className="text-nebula-text-muted hover:text-nebula-text">
                {Icons.close}
            </button>
        </div>
    );
}

/** Loading state */
export function LoadingState() {
    return (
        <div className="flex flex-col items-center py-8">
            <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mb-4" />
            <p className="text-nebula-text-secondary">Generating link token...</p>
        </div>
    );
}

/** Error state */
export function ErrorState({ error, onClose }: { error: string; onClose: () => void }) {
    return (
        <div className="text-center py-8">
            <div className="text-danger mb-4">{Icons.error}</div>
            <p className="text-danger mb-4">{error}</p>
            <button onClick={onClose} className="px-4 py-2 bg-nebula-elevated rounded-lg text-nebula-text-secondary">
                Close
            </button>
        </div>
    );
}

/** Ready state with QR code and link */
export function ReadyState({
    tokenData,
    timeLeft,
    inboxEmail
}: {
    tokenData: TokenData;
    timeLeft: string;
    inboxEmail: string;
}) {
    return (
        <div className="flex flex-col items-center">
            <p className="text-sm text-nebula-text-secondary mb-4 text-center">
                Scan QR code or click the button to link <strong>{inboxEmail}</strong> to Telegram
            </p>

            {/* QR Code */}
            <div className="bg-white p-4 rounded-lg mb-4">
                <img src={tokenData.qrCodeDataUrl} alt="Telegram QR Code" className="w-48 h-48" />
            </div>

            {/* Token display */}
            <div className="text-center mb-4">
                <p className="text-xs text-nebula-text-muted mb-1">Your linking code:</p>
                <code className="text-lg font-mono font-bold text-primary">{tokenData.token}</code>
            </div>

            {/* Timer */}
            <div className="text-sm text-nebula-text-muted mb-4">
                Expires in: <span className="font-mono">{timeLeft}</span>
            </div>

            {/* Telegram button */}
            <a
                href={tokenData.telegramLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full px-6 py-3 bg-[#0088cc] text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-[#0077b5] transition-colors"
            >
                {Icons.telegram}
                Open in Telegram
            </a>

            <p className="text-xs text-nebula-text-muted mt-4 text-center">
                After clicking, send the start command to the bot
            </p>
        </div>
    );
}

/** Success state */
export function SuccessState({ inboxEmail, onClose }: { inboxEmail: string; onClose: () => void }) {
    return (
        <div className="text-center py-8">
            <div className="text-success mb-4">{Icons.success}</div>
            <h3 className="text-lg font-bold text-nebula-text mb-2">Successfully Linked!</h3>
            <p className="text-nebula-text-secondary mb-4">
                You will now receive Telegram notifications for new emails to{" "}
                <strong>{inboxEmail}</strong>
            </p>
            <button onClick={onClose} className="px-6 py-2 bg-success text-white rounded-lg hover:bg-success/90">
                Done
            </button>
        </div>
    );
}

/** Expired state */
export function ExpiredState({ onClose }: { onClose: () => void }) {
    return (
        <div className="text-center py-8">
            <div className="text-warning mb-4">{Icons.expired}</div>
            <p className="text-nebula-text-secondary mb-4">
                The linking token has expired. Please try again.
            </p>
            <button onClick={onClose} className="px-4 py-2 bg-nebula-elevated rounded-lg text-nebula-text-secondary">
                Close
            </button>
        </div>
    );
}
