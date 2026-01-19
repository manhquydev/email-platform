/**
 * Hook for loading and managing forwarding data
 * Extracted from Forwarding.tsx for modularity
 */
import { useState, useCallback, useEffect } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../../context/AuthContext";
import { api } from "../../../utils/api";
import { getFriendlyErrorMessage } from "../../../utils/errorMapping";
import type { ForwardingRule } from "../../../types";

export interface UseForwardingDataReturn {
    // Data
    verifiedEmails: string[];
    rules: ForwardingRule[];
    telegramLinked: boolean;
    loading: boolean;

    // Actions
    loadData: () => Promise<void>;
    setRules: React.Dispatch<React.SetStateAction<ForwardingRule[]>>;
    setVerifiedEmails: React.Dispatch<React.SetStateAction<string[]>>;
}

export function useForwardingData(): UseForwardingDataReturn {
    const { token } = useAuth();
    const [verifiedEmails, setVerifiedEmails] = useState<string[]>([]);
    const [rules, setRules] = useState<ForwardingRule[]>([]);
    const [telegramLinked, setTelegramLinked] = useState(false);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const [emailsRes, rulesRes, telegramRes] = await Promise.all([
                api<{ emails: string[] }>("/forwarding/emails", { token }),
                api<{ rules: ForwardingRule[] }>("/forwarding/rules", { token }),
                api<{ linked: boolean }>("/telegram/status", { token }).catch(() => ({ linked: false })),
            ]);
            setVerifiedEmails(emailsRes.emails);
            setRules(rulesRes.rules);
            setTelegramLinked(telegramRes.linked);
        } catch (error) {
            toast.error(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    return {
        verifiedEmails,
        rules,
        telegramLinked,
        loading,
        loadData,
        setRules,
        setVerifiedEmails
    };
}
