import { useEffect, useRef, useCallback } from 'react';

interface UseModalAccessibilityOptions {
    isOpen: boolean;
    onClose: () => void;
    /** Whether to close on ESC key. Default: true */
    closeOnEsc?: boolean;
    /** Whether to trap focus inside modal. Default: true */
    trapFocus?: boolean;
    /** Initial element to focus when modal opens */
    initialFocusRef?: React.RefObject<HTMLElement>;
}

/**
 * Hook for modal accessibility features:
 * - ESC key to close
 * - Focus trap
 * - Focus restoration on close
 * - aria attributes
 */
export function useModalAccessibility({
    isOpen,
    onClose,
    closeOnEsc = true,
    trapFocus = true,
    initialFocusRef,
}: UseModalAccessibilityOptions) {
    const modalRef = useRef<HTMLDivElement>(null);
    const previousActiveElement = useRef<HTMLElement | null>(null);

    // Handle ESC key
    useEffect(() => {
        if (!isOpen || !closeOnEsc) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, closeOnEsc, onClose]);

    // Focus management
    useEffect(() => {
        if (!isOpen) return;

        // Save currently focused element
        previousActiveElement.current = document.activeElement as HTMLElement;

        // Focus initial element or first focusable in modal
        const focusInitial = () => {
            if (initialFocusRef?.current) {
                initialFocusRef.current.focus();
            } else if (modalRef.current) {
                const focusable = modalRef.current.querySelector<HTMLElement>(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                focusable?.focus();
            }
        };

        // Small delay to ensure modal is rendered
        requestAnimationFrame(focusInitial);

        return () => {
            // Restore focus on close
            previousActiveElement.current?.focus();
        };
    }, [isOpen, initialFocusRef]);

    // Focus trap
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (!trapFocus || e.key !== 'Tab' || !modalRef.current) return;

        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
        );

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
            // Shift + Tab
            if (document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            }
        } else {
            // Tab
            if (document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    }, [trapFocus]);

    return {
        modalRef,
        modalProps: {
            role: 'dialog' as const,
            'aria-modal': true as const,
            onKeyDown: handleKeyDown,
        },
    };
}
