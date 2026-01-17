import { getFriendlyErrorMessage } from "./errorMapping";
import { handleCriticalError } from "../hooks/useApiError";

export const API_BASE = (window.env?.API_BASE || import.meta.env.VITE_API_BASE || "http://localhost:3001").replace(/\/$/, "");
export const PAGE_SIZE = { domains: 20, inboxes: 20, messages: 20 };

export * from "./format";

/**
 * Custom API Error class with status code
 */
export class ApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

type ApiOptions = {
    method?: string;
    body?: unknown;
    token?: string;
    headers?: Record<string, string>;
    /** Skip automatic redirects for critical errors (403, 503) */
    skipErrorRedirect?: boolean;
};

/** Parse error response payload */
function parseErrorPayload(data: unknown): string {
    const payload = (data as { error?: string; message?: string; details?: string }) ?? {};
    const rawMsg = payload.message ?? payload.error ?? "Request failed";
    const msg = getFriendlyErrorMessage(rawMsg);
    const details = payload.details;
    return details ? `${msg}: ${details}` : msg;
}

export async function api<T>(path: string, opts: ApiOptions = {}): Promise<T> {
    const headers: Record<string, string> = { ...opts.headers };
    let body = opts.body as BodyInit | undefined;

    if (opts.body && !(opts.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(opts.body);
    } else {
        body = opts.body as BodyInit;
    }

    if (opts.token) headers.Authorization = `Bearer ${opts.token}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
        const res = await fetch(`${API_BASE}${path}`, {
            method: opts.method ?? "GET",
            headers,
            body,
            signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const data: unknown = await res.json().catch(() => ({}));

        if (!res.ok) {
            const errorMessage = parseErrorPayload(data);

            if (!opts.skipErrorRedirect) {
                handleCriticalError(res.status, path);
            }

            throw new ApiError(errorMessage, res.status);
        }

        return data as T;
    } catch (error) {
        clearTimeout(timeoutId);
        if ((error as Error).name === 'AbortError') {
            throw new ApiError("Yêu cầu quá hạn. Vui lòng kiểm tra kết nối mạng.", 408);
        }
        throw error;
    }
}
