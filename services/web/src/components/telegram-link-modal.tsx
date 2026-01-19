/**
 * TelegramLinkModal - Modal for linking inbox to Telegram notifications
 * Modules extracted to telegram-link-modal-modules/
 */
import {
    type TelegramLinkModalProps,
    useTelegramLinkModal,
    ModalHeader,
    LoadingState,
    ErrorState,
    ReadyState,
    SuccessState,
    ExpiredState
} from "./telegram-link-modal-modules";

export function TelegramLinkModal({ inboxEmail, onClose }: TelegramLinkModalProps) {
    const { state, tokenData, timeLeft, error } = useTelegramLinkModal(inboxEmail, onClose);

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) onClose();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={handleBackdropClick}
        >
            <div className="bg-nebula-surface rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
                <ModalHeader onClose={onClose} />

                <div className="p-6">
                    {state === "loading" && <LoadingState />}
                    {state === "error" && <ErrorState error={error} onClose={onClose} />}
                    {state === "ready" && tokenData && (
                        <ReadyState tokenData={tokenData} timeLeft={timeLeft} inboxEmail={inboxEmail} />
                    )}
                    {state === "success" && <SuccessState inboxEmail={inboxEmail} onClose={onClose} />}
                    {state === "expired" && <ExpiredState onClose={onClose} />}
                </div>
            </div>
        </div>
    );
}
