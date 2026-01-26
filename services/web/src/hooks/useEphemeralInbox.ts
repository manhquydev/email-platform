/**
 * useEphemeralInbox - Reusable hook for ephemeral inbox management
 * Extracted from EphemeralInbox page for use in homepage widget and standalone page
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { ephemeralService, type EphemeralInbox, type EphemeralMessage } from '../services/ephemeralService';

const POLL_INTERVAL = 10000; // 10 seconds
const STORAGE_KEY = 'ephemeral_inbox_token';

export interface UseEphemeralInboxOptions {
    /** Auto-create inbox on mount if no token provided */
    autoCreate?: boolean;
    /** Initial token (from URL param or localStorage) */
    initialToken?: string;
    /** Enable message polling */
    enablePolling?: boolean;
    /** Callback when inbox is created */
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
    createInbox: () => Promise<EphemeralInbox | null>;
    extendInbox: () => Promise<boolean>;
    refreshMessages: () => Promise<void>;
    clearInbox: () => void;
}

/**
 * Hook for managing ephemeral inbox state and operations
 */
export function useEphemeralInbox(options: UseEphemeralInboxOptions = {}): UseEphemeralInboxReturn {
    const { autoCreate = false, initialToken, enablePolling = true, onCreated } = options;

    const [inbox, setInbox] = useState<EphemeralInbox | null>(null);
    const [messages, setMessages] = useState<EphemeralMessage[]>([]);
    const [token, setToken] = useState<string | null>(initialToken || null);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isExtending, setIsExtending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Load token from localStorage on mount
    useEffect(() => {
        if (!initialToken) {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) setToken(stored);
        }
    }, [initialToken]);

    // Fetch inbox data
    const fetchInbox = useCallback(async (inboxToken: string): Promise<boolean> => {
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

    // Fetch messages
    const fetchMessages = useCallback(async (inboxToken: string): Promise<void> => {
        try {
            const response = await ephemeralService.getMessages(inboxToken);
            setMessages(response.data);
            setLastRefresh(new Date());
        } catch {
            // Silent fail for polling
        }
    }, []);

    // Create new inbox
    const createInbox = useCallback(async (): Promise<EphemeralInbox | null> => {
        setIsCreating(true);
        setError(null);

        try {
            const newInbox = await ephemeralService.create();
            setInbox(newInbox);
            setToken(newInbox.token);
            setMessages([]);
            localStorage.setItem(STORAGE_KEY, newInbox.token);
            onCreated?.(newInbox);
            return newInbox;
        } catch (err: any) {
            if (err?.status === 429) {
                setError('Bạn đã tạo quá nhiều inbox. Vui lòng thử lại sau 1 giờ.');
            } else {
                setError('Không thể tạo inbox. Vui lòng thử lại.');
            }
            return null;
        } finally {
            setIsCreating(false);
        }
    }, [onCreated]);

    // Extend inbox expiry
    const extendInbox = useCallback(async (): Promise<boolean> => {
        if (!token) return false;

        setIsExtending(true);
        try {
            const extended = await ephemeralService.extend(token);
            if (extended) {
                setInbox(extended);
                return true;
            }
            return false;
        } catch {
            return false;
        } finally {
            setIsExtending(false);
        }
    }, [token]);

    // Refresh messages manually
    const refreshMessages = useCallback(async (): Promise<void> => {
        if (token) await fetchMessages(token);
    }, [token, fetchMessages]);

    // Clear inbox (for generating new one)
    const clearInbox = useCallback(() => {
        setInbox(null);
        setToken(null);
        setMessages([]);
        setError(null);
        localStorage.removeItem(STORAGE_KEY);
    }, []);

    // Initial load - fetch existing inbox or auto-create
    useEffect(() => {
        if (!token && autoCreate) {
            createInbox();
            return;
        }

        if (token) {
            setIsLoading(true);
            Promise.all([fetchInbox(token), fetchMessages(token)]).finally(() => {
                setIsLoading(false);
            });
        }
    }, [token, autoCreate, createInbox, fetchInbox, fetchMessages]);

    // Polling for messages
    useEffect(() => {
        if (!token || !inbox || !enablePolling) return;

        pollIntervalRef.current = setInterval(() => {
            fetchMessages(token);
        }, POLL_INTERVAL);

        // Pause polling when tab is hidden
        const handleVisibility = () => {
            if (document.hidden && pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            } else if (!document.hidden && !pollIntervalRef.current) {
                pollIntervalRef.current = setInterval(() => {
                    fetchMessages(token);
                }, POLL_INTERVAL);
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [token, inbox, enablePolling, fetchMessages]);

    return {
        inbox,
        messages,
        token,
        isLoading,
        isCreating,
        isExtending,
        error,
        lastRefresh,
        createInbox,
        extendInbox,
        refreshMessages,
        clearInbox,
    };
}

export default useEphemeralInbox;
