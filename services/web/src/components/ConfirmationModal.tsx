import { AnimatePresence, motion } from 'framer-motion';
import { useModalAccessibility } from '../hooks/useModalAccessibility';

interface ConfirmationModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDestructive?: boolean;
    isLoading?: boolean;
    children?: React.ReactNode;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmationModal({
    isOpen,
    title,
    message,
    confirmLabel = "Xác nhận",
    cancelLabel = "Hủy",
    isDestructive = false,
    isLoading = false,
    children,
    onConfirm,
    onCancel
}: ConfirmationModalProps) {
    const { modalRef, modalProps } = useModalAccessibility({
        isOpen,
        onClose: onCancel,
        closeOnEsc: !isLoading,
    });

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="modal-overlay"
                onClick={!isLoading ? onCancel : undefined}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            />
            <motion.div
                ref={modalRef}
                {...modalProps}
                aria-labelledby="confirmation-modal-title"
                className="create-inbox-modal"
                style={{ maxWidth: '400px' }}
                initial={{ opacity: 0, scale: 0.95, x: "-50%", y: "-50%" }}
                animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
                exit={{ opacity: 0, scale: 0.95, x: "-50%", y: "-50%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
                <div className="create-inbox-header">
                    <h2 id="confirmation-modal-title" className={`font-semibold text-lg ${isDestructive ? "text-danger" : "text-nebula-text"}`}>{title}</h2>
                    <button onClick={onCancel} className="modal-close" title="Đóng" disabled={isLoading}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 20, height: 20 }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6">
                    <p className="text-nebula-text-muted mb-6">{message}</p>

                    {children && (
                        <div className="mb-6">
                            {children}
                        </div>
                    )}

                    <div className="flex justify-end gap-3">
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 rounded-lg bg-nebula-elevated hover:bg-nebula-surface text-nebula-text transition-colors font-medium"
                            disabled={isLoading}
                        >
                            {cancelLabel}
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isLoading}
                            className={`px-4 py-2 rounded-lg font-medium text-white transition-colors flex items-center gap-2 ${isDestructive
                                ? 'bg-danger hover:bg-danger/80 disabled:bg-danger/50'
                                : 'bg-nebula-violet hover:bg-nebula-violet-dark disabled:bg-nebula-violet/50'
                                }`}
                        >
                            {isLoading && (
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                            )}
                            {confirmLabel}
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
