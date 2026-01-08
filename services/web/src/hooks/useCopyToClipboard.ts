import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

interface UseCopyToClipboardOptions {
    successMessage?: string;
    errorMessage?: string;
    duration?: number;
}

interface CopyState {
    copied: boolean;
    value: string | null;
}

/**
 * Enhanced copy to clipboard hook with toast notifications
 */
export function useCopyToClipboard(options: UseCopyToClipboardOptions = {}) {
    const {
        successMessage = 'Đã copy!',
        errorMessage = 'Không thể copy',
        duration = 2000,
    } = options;

    const [state, setState] = useState<CopyState>({
        copied: false,
        value: null,
    });

    const copy = useCallback(async (text: string, customMessage?: string) => {
        if (!navigator?.clipboard) {
            toast.error(errorMessage);
            return false;
        }

        try {
            await navigator.clipboard.writeText(text);

            setState({ copied: true, value: text });
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

            // Reset copied state after duration
            setTimeout(() => {
                setState(prev => ({ ...prev, copied: false }));
            }, duration);

            return true;
        } catch {
            toast.error(errorMessage);
            setState({ copied: false, value: null });
            return false;
        }
    }, [successMessage, errorMessage, duration]);

    const reset = useCallback(() => {
        setState({ copied: false, value: null });
    }, []);

    return {
        copied: state.copied,
        value: state.value,
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
