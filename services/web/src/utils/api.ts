export const API_BASE = (window.env?.API_BASE || import.meta.env.VITE_API_BASE || "http://localhost:3001").replace(/\/$/, "");
export const PAGE_SIZE = { domains: 20, inboxes: 20, messages: 20 };

type ApiOptions = {
    method?: string;
    body?: unknown;
    token?: string;
};

export async function api<T>(path: string, opts: ApiOptions = {}): Promise<T> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (opts.token) headers.Authorization = `Bearer ${opts.token}`;

    const res = await fetch(`${API_BASE}${path}`, {
        method: opts.method ?? "GET",
        headers,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
    });

    const data: unknown = await res.json().catch(() => ({}));
    if (!res.ok) {
        const payload = (data as { error?: string; message?: string }) ?? {};
        const msg = payload.error ?? payload.message ?? "Request failed";
        throw new Error(msg);
    }

    return data as T;
}
