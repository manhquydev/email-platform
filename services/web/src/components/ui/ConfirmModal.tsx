/**
 * ConfirmModal - Reusable confirmation dialog to replace native confirm()
 */
import { useEffect, useRef } from 'react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmModal({
    isOpen,
    title,
    message,
    confirmText = 'Xác nhận',
    cancelText = 'Hủy',
    variant = 'danger',
    onConfirm,
    onCancel,
}: ConfirmModalProps) {
    const confirmRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (isOpen && confirmRef.current) {
            confirmRef.current.focus();
        }
    }, [isOpen]);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onCancel();
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onCancel]);

    if (!isOpen) return null;

    const variantStyles = {
        danger: 'bg-red-500 hover:bg-red-600',
        warning: 'bg-yellow-500 hover:bg-yellow-600',
        info: 'bg-[var(--nebula-violet)] hover:bg-[var(--nebula-violet-dark)]',
    };

    const variantIcons = {
        danger: 'warning',
        warning: 'help',
        info: 'info',
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={onCancel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
        >
            <div
                className="w-full max-w-md bg-[var(--nebula-surface)] rounded-xl border border-white/10 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 text-center">
                    <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-4 ${
                        variant === 'danger' ? 'bg-red-500/20' :
                        variant === 'warning' ? 'bg-yellow-500/20' : 'bg-[var(--nebula-violet)]/20'
                    }`}>
                        <span className={`material-symbols-outlined text-[24px] ${
                            variant === 'danger' ? 'text-red-400' :
                            variant === 'warning' ? 'text-yellow-400' : 'text-[var(--nebula-violet)]'
                        }`}>
                            {variantIcons[variant]}
                        </span>
                    </div>
                    <h3 id="confirm-title" className="text-lg font-semibold text-white mb-2">{title}</h3>
                    <p className="text-sm text-[var(--nebula-text-secondary)] mb-6">{message}</p>
                    <div className="flex gap-3">
                        <button
                            onClick={onCancel}
                            className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg font-medium transition-all"
                        >
                            {cancelText}
                        </button>
                        <button
                            ref={confirmRef}
                            onClick={onConfirm}
                            className={`flex-1 px-4 py-3 text-white rounded-lg font-medium transition-all ${variantStyles[variant]}`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ConfirmModal;
