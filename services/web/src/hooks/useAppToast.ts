/**
 * useAppToast - Custom toast hook for consistent notifications
 * Wraps react-hot-toast with app-specific defaults and patterns
 * Includes ARIA live region announcements for screen readers
 */

import toast, { type ToastOptions } from "react-hot-toast";

/**
 * Announces message to screen readers via ARIA live region
 * @param message - Text to announce
 * @param priority - "polite" for non-urgent, "assertive" for errors/important
 */
function announceToScreenReader(message: string, priority: "polite" | "assertive" = "polite"): void {
    const announcerId = "aria-live-announcer";
    let announcer = document.getElementById(announcerId);

    // Create announcer element if it doesn't exist
    if (!announcer) {
        announcer = document.createElement("div");
        announcer.id = announcerId;
        announcer.setAttribute("role", "status");
        announcer.setAttribute("aria-live", priority);
        announcer.setAttribute("aria-atomic", "true");
        // Visually hidden but accessible to screen readers
        announcer.style.cssText = "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0";
        document.body.appendChild(announcer);
    }

    // Update priority if different
    announcer.setAttribute("aria-live", priority);

    // Clear and re-announce (required for some screen readers)
    announcer.textContent = "";
    setTimeout(() => {
        if (announcer) announcer.textContent = message;
    }, 50);
}

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
        success: (message: string, options?: ToastOptions) => {
            announceToScreenReader(message, "polite");
            return toast.success(message, { ...defaultOptions, ...options });
        },

        error: (message: string, options?: ToastOptions) => {
            announceToScreenReader(message, "assertive");
            return toast.error(message, { ...defaultOptions, duration: 5000, ...options });
        },

        loading: (message: string, options?: ToastOptions) =>
            toast.loading(message, { ...defaultOptions, ...options }),

        info: (message: string, options?: ToastOptions) => {
            announceToScreenReader(message, "polite");
            return toast(message, {
                ...defaultOptions,
                icon: "ℹ️",
                ...options,
            });
        },

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
    success: (message: string, options?: ToastOptions) => {
        announceToScreenReader(message, "polite");
        return toast.success(message, { ...defaultOptions, ...options });
    },
    error: (message: string, options?: ToastOptions) => {
        announceToScreenReader(message, "assertive");
        return toast.error(message, { ...defaultOptions, duration: 5000, ...options });
    },
    loading: (message: string, options?: ToastOptions) =>
        toast.loading(message, { ...defaultOptions, ...options }),
    info: (message: string, options?: ToastOptions) => {
        announceToScreenReader(message, "polite");
        return toast(message, { ...defaultOptions, icon: "ℹ️", ...options });
    },
    dismiss: (toastId?: string) => toast.dismiss(toastId),
};
