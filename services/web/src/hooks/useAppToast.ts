/**
 * useAppToast - Custom toast hook for consistent notifications
 * Wraps react-hot-toast with app-specific defaults and patterns
 */

import toast, { type ToastOptions } from "react-hot-toast";

interface ToastActions {
    success: (message: string, options?: ToastOptions) => string;
    error: (message: string, options?: ToastOptions) => string;
    loading: (message: string, options?: ToastOptions) => string;
    info: (message: string, options?: ToastOptions) => string;
    dismiss: (toastId?: string) => void;
    promise: <T>(
        promise: Promise<T>,
        messages: { loading: string; success: string; error: string },
        options?: ToastOptions
    ) => Promise<T>;
}

const defaultOptions: ToastOptions = {
    position: "top-right",
    duration: 4000,
};

export function useAppToast(): ToastActions {
    return {
        success: (message: string, options?: ToastOptions) =>
            toast.success(message, { ...defaultOptions, ...options }),

        error: (message: string, options?: ToastOptions) =>
            toast.error(message, { ...defaultOptions, duration: 5000, ...options }),

        loading: (message: string, options?: ToastOptions) =>
            toast.loading(message, { ...defaultOptions, ...options }),

        info: (message: string, options?: ToastOptions) =>
            toast(message, {
                ...defaultOptions,
                icon: "ℹ️",
                ...options,
            }),

        dismiss: (toastId?: string) => toast.dismiss(toastId),

        promise: <T>(
            promise: Promise<T>,
            messages: { loading: string; success: string; error: string },
            options?: ToastOptions
        ) =>
            toast.promise(promise, messages, { ...defaultOptions, ...options }),
    };
}

// Standalone functions for use outside React components
export const appToast = {
    success: (message: string, options?: ToastOptions) =>
        toast.success(message, { ...defaultOptions, ...options }),
    error: (message: string, options?: ToastOptions) =>
        toast.error(message, { ...defaultOptions, duration: 5000, ...options }),
    loading: (message: string, options?: ToastOptions) =>
        toast.loading(message, { ...defaultOptions, ...options }),
    info: (message: string, options?: ToastOptions) =>
        toast(message, { ...defaultOptions, icon: "ℹ️", ...options }),
    dismiss: (toastId?: string) => toast.dismiss(toastId),
};
