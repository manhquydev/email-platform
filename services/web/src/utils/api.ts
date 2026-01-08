import { getFriendlyErrorMessage } from "./errorMapping";

export const API_BASE = (window.env?.API_BASE || import.meta.env.VITE_API_BASE || "http://localhost:3001").replace(/\/$/, "");
export const PAGE_SIZE = { domains: 20, inboxes: 20, messages: 20 };

export * from "./format";

type ApiOptions = {
    method?: string;
    body?: unknown;
    token?: string;
    headers?: Record<string, string>;
};

export async function api<T>(path: string, opts: ApiOptions = {}): Promise<T> {
    const headers: Record<string, string> = { ...opts.headers };
    let body = opts.body as BodyInit | undefined;

    if (opts.body && !(opts.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(opts.body);
    } else {
        // If FormData, let browser set Content-Type with boundary
        body = opts.body as BodyInit;
    }

    if (opts.token) headers.Authorization = `Bearer ${opts.token}`;

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 15000); // 15s timeout

    try {
        const res = await fetch(`${API_BASE}${path}`, {
            method: opts.method ?? "GET",
            headers,
            body,
            signal: controller.signal,
        });
        clearTimeout(id);

        const data: unknown = await res.json().catch(() => ({}));
        if (!res.ok) {
            const payload = (data as { error?: string; message?: string; details?: string }) ?? {};
            // Prioritize 'message', then 'error', then default
            const rawMsg = payload.message ?? payload.error ?? "Request failed";
            const msg = getFriendlyErrorMessage(rawMsg);

            const details = payload.details;

            if (res.status === 401) {
                window.dispatchEvent(new Event("auth:unauthorized"));
            }

            throw new Error(details ? `${msg}: ${details}` : msg);
        }

        return data as T;
    } catch {
        clearTimeout(id);
        if ((error as Error).name === 'AbortError') {
            throw new Error("Yêu cầu quá hạn. Vui lòng kiểm tra kết nối mạng.");
        }
        throw error;
    }
}
