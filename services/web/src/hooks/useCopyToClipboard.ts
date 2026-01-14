import { useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';

export type CopyStatus = 'idle' | 'copied' | 'error';

interface UseCopyToClipboardOptions {
    successMessage?: string;
    errorMessage?: string;
    duration?: number;
    showToast?: boolean;
}

interface CopyState {
    copied: boolean;
    value: string | null;
    status: CopyStatus;
}

/**
 * Enhanced copy to clipboard hook with toast notifications and status tracking
 */
export function useCopyToClipboard(options: UseCopyToClipboardOptions = {}) {
    const {
        successMessage = 'Đã copy!',
        errorMessage = 'Không thể copy',
        duration = 2000,
        showToast = true,
    } = options;

    const [state, setState] = useState<CopyState>({
        copied: false,
        value: null,
        status: 'idle',
    });
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const copy = useCallback(async (text: string, customMessage?: string, silent: boolean = false) => {
        // Clear existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Try modern Clipboard API first, fallback for older browsers
        try {
            if (navigator?.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                // Fallback for non-secure contexts
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                try {
                    const successful = document.execCommand('copy');
                    if (!successful) throw new Error('execCommand failed');
                } finally {
                    document.body.removeChild(textArea);
                }
            }

            setState({ copied: true, value: text, status: 'copied' });

            if (showToast && !silent) {
                toast.success(customMessage || successMessage, {
                    duration,
                    icon: '📋',
                    style: {
                        borderRadius: '8px',
                        background: 'var(--color-surface)',
                        color: 'var(--color-text)',
                        border: '1px solid var(--color-border)',
                    },
                });
            }

            // Reset copied state after duration
            timeoutRef.current = setTimeout(() => {
                setState(prev => ({ ...prev, copied: false, status: 'idle' }));
            }, duration);

            return true;
        } catch {
            setState({ copied: false, value: null, status: 'error' });
            if (showToast && !silent) {
                toast.error(errorMessage);
            }

            // Reset error state
            timeoutRef.current = setTimeout(() => {
                setState(prev => ({ ...prev, status: 'idle' }));
            }, duration);

            return false;
        }
    }, [successMessage, errorMessage, duration, showToast]);

    const reset = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setState({ copied: false, value: null, status: 'idle' });
    }, []);

    return {
        copied: state.copied,
        value: state.value,
        status: state.status,
        copy,
        reset,
    };
}

/**
 * Copy email address with formatted toast
 */
export function useCopyEmail() {
    return useCopyToClipboard({
        successMessage: 'Đã copy địa chỉ email',
        duration: 2000,
    });
}

/**
 * Copy OTP with special formatting
 */
export function useCopyOTP() {
    return useCopyToClipboard({
        successMessage: 'Đã copy mã OTP',
        duration: 3000,
    });
}
