/**
 * useApiError Hook
 * Centralized API error handling with automatic redirects and tracking
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClarity } from './useClarity';

/** Error redirect configuration */
const ERROR_REDIRECTS: Record<number, string> = {
    403: '/403',
    503: '/503',
};

/**
 * Hook for handling API errors with automatic redirects and analytics
 */
export function useApiError() {
    const navigate = useNavigate();
    const { track, setTag } = useClarity();

    /**
     * Handle API error with optional redirect
     * @param status HTTP status code
     * @param path API path that failed
     * @param skipRedirect Skip automatic redirect
     */
    const handleError = useCallback((status: number, path: string, skipRedirect = false) => {
        // Track error in analytics
        track(`api_error_${status}`);
        setTag('api_error_path', path);

        if (skipRedirect) return;

        const currentPath = window.location.pathname;

        // 401 Unauthorized - dispatch event for auth context
        if (status === 401) {
            window.dispatchEvent(new Event("auth:unauthorized"));
            return;
        }

        // Redirect to error page if configured
        const redirectPath = ERROR_REDIRECTS[status];
        if (redirectPath && currentPath !== redirectPath) {
            console.error(`[API] ${status} Error: ${path}`);
            navigate(redirectPath, { replace: true });
        }
    }, [navigate, track, setTag]);

    /**
     * Check if error should trigger redirect
     */
    const shouldRedirect = useCallback((status: number): boolean => {
        return status in ERROR_REDIRECTS || status === 401;
    }, []);

    return { handleError, shouldRedirect, ERROR_REDIRECTS };
}

/**
 * Standalone error handler (for use outside React components)
 * Does not include analytics - use within components for full tracking
 */
export function handleCriticalError(status: number, path: string): void {
    const currentPath = window.location.pathname;

    if (status === 401) {
        window.dispatchEvent(new Event("auth:unauthorized"));
        return;
    }

    const redirectPath = ERROR_REDIRECTS[status];
    if (redirectPath && currentPath !== redirectPath) {
        console.error(`[API] ${status} Error: ${path}`);
        window.location.href = redirectPath;
    }
}
