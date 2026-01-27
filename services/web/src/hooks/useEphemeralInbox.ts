/**
 * useEphemeralInbox - Reusable hook for ephemeral inbox management
 * Extracted from EphemeralInbox page for use in homepage widget and standalone page
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { ephemeralService, type EphemeralInbox, type EphemeralMessage, type CreateEphemeralOptions } from '../services/ephemeralService';

const POLL_INTERVAL = 10000; // 10 seconds
const STORAGE_KEY = 'ephemeral_inbox_token';

/**
 * Validate token format - must be non-empty string with reasonable length
 * Prevents API calls with 'undefined' or invalid tokens
 */
const isValidToken = (token: string | null | undefined): token is string => {
    return typeof token === 'string' && token.length > 10 && token !== 'undefined' && token !== 'null';
};

export interface UseEphemeralInboxOptions {
    autoCreate?: boolean;
    initialToken?: string;
    enablePolling?: boolean;
    onCreated?: (inbox: EphemeralInbox) => void;
}

export interface UseEphemeralInboxReturn {
    inbox: EphemeralInbox | null;
    messages: EphemeralMessage[];
    token: string | null;
    isLoading: boolean;
    isCreating: boolean;
    isExtending: boolean;
    error: string | null;
    lastRefresh: Date | null;
    createInbox: (options?: CreateEphemeralOptions) => Promise<EphemeralInbox | null>;
    extendInbox: () => Promise<boolean>;
    refreshMessages: () => Promise<void>;
    clearInbox: () => void;
}

/**
 * Get initial token synchronously to prevent race condition
 * Priority: initialToken (URL param) > localStorage > null
 */
const getInitialToken = (initialToken?: string): string | null => {
    if (isValidToken(initialToken)) return initialToken;
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (isValidToken(stored)) return stored;
        if (stored) localStorage.removeItem(STORAGE_KEY);
    }
    return null;
};

export function useEphemeralInbox(options: UseEphemeralInboxOptions = {}): UseEphemeralInboxReturn {
    const { autoCreate = false, initialToken, enablePolling = true, onCreated } = options;

    const [token, setToken] = useState<string | null>(() => getInitialToken(initialToken));
    const [inbox, setInbox] = useState<EphemeralInbox | null>(null);
    const [messages, setMessages] = useState<EphemeralMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isExtending, setIsExtending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const initialLoadDoneRef = useRef(false);

    const fetchInbox = useCallback(async (inboxToken: string): Promise<boolean> => {
        if (!isValidToken(inboxToken)) return false;
        try {
            const data = await ephemeralService.get(inboxToken);
            if (!data) {
                setError('Inbox không tồn tại hoặc đã hết hạn.');
                setInbox(null);
                localStorage.removeItem(STORAGE_KEY);
                return false;
            }
            setInbox(data);
            setToken(inboxToken);
            setError(null);
            return true;
        } catch {
            setError('Không thể tải inbox.');
            return false;
        }
    }, []);

    const fetchMessages = useCallback(async (inboxToken: string): Promise<void> => {
        if (!isValidToken(inboxToken)) return;
        try {
            const response = await ephemeralService.getMessages(inboxToken);
            setMessages(response.data);
            setLastRefresh(new Date());
        } catch {}
    }, []);

    const createInbox = useCallback(async (opts: CreateEphemeralOptions = {}): Promise<EphemeralInbox | null> => {
        setIsCreating(true);
        setError(null);
        try {
            const newInbox = await ephemeralService.create(opts);
            setInbox(newInbox);
            setToken(newInbox.token);
            setMessages([]);
            localStorage.setItem(STORAGE_KEY, newInbox.token);
            onCreated?.(newInbox);
            return newInbox;
        } catch (err: any) {
            if (err?.status === 429) {
                setError('Bạn đã tạo quá nhiều inbox. Vui lòng thử lại sau 1 giờ.');
            } else if (err?.message?.includes('alias')) {
                setError(err.message);
            } else {
                setError('Không thể tạo inbox. Vui lòng thử lại.');
            }
            return null;
        } finally {
            setIsCreating(false);
        }
    }, [onCreated]);

    const extendInbox = useCallback(async (): Promise<boolean> => {
        if (!isValidToken(token)) return false;
        setIsExtending(true);
        try {
            const extended = await ephemeralService.extend(token);
            if (extended) { setInbox(extended); return true; }
            return false;
        } catch { return false; }
        finally { setIsExtending(false); }
    }, [token]);

    const refreshMessages = useCallback(async (): Promise<void> => {
        if (isValidToken(token)) await fetchMessages(token);
    }, [token, fetchMessages]);

    const clearInbox = useCallback(() => {
        setInbox(null); setToken(null); setMessages([]); setError(null);
        localStorage.removeItem(STORAGE_KEY);
    }, []);

    useEffect(() => {
        if (initialLoadDoneRef.current) return;
        if (!isValidToken(token) && autoCreate) {
            initialLoadDoneRef.current = true;
            createInbox();
            return;
        }
        if (isValidToken(token)) {
            initialLoadDoneRef.current = true;
            setIsLoading(true);
            Promise.all([fetchInbox(token), fetchMessages(token)]).finally(() => setIsLoading(false));
        }
    }, [token, autoCreate, createInbox, fetchInbox, fetchMessages]);

    useEffect(() => {
        if (!isValidToken(token) || !inbox || !enablePolling) return;
        pollIntervalRef.current = setInterval(() => fetchMessages(token), POLL_INTERVAL);
        const handleVisibility = () => {
            if (document.hidden && pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            } else if (!document.hidden && !pollIntervalRef.current && isValidToken(token)) {
                pollIntervalRef.current = setInterval(() => fetchMessages(token), POLL_INTERVAL);
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [token, inbox, enablePolling, fetchMessages]);

    return { inbox, messages, token, isLoading, isCreating, isExtending, error, lastRefresh, createInbox, extendInbox, refreshMessages, clearInbox };
}

export default useEphemeralInbox;
