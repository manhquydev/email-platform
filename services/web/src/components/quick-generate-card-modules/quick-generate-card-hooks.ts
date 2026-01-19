/**
 * Custom hook for QuickGenerateCard logic
 * Following Vercel React Best Practices: rerender-functional-setstate, client-swr-dedup
 */
import { useState, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../utils/api';
import { useCopyEmail } from '../../hooks/useCopyToClipboard';
import { generateRandomName } from '../../utils/random';
import type { Domain } from '../../types';
import { type TtlValue, DEFAULT_TTL } from './quick-generate-card-utils';

interface UseQuickGenerateOptions {
    domains: Domain[];
    token: string | null;
    onInboxCreated?: (inboxId: string, email: string) => void;
}

export function useQuickGenerate({ domains, token, onInboxCreated }: UseQuickGenerateOptions) {
    const [loading, setLoading] = useState(false);
    const [generatedEmail, setGeneratedEmail] = useState<string | null>(null);
    const [selectedDomainId, setSelectedDomainId] = useState<string>('');
    const [ttlMs, setTtlMs] = useState<TtlValue>(DEFAULT_TTL);
    const { copy, copied } = useCopyEmail();

    // Memoize verified domains to prevent re-computation
    const verifiedDomains = useMemo(
        () => domains.filter(d => d.status === 'VERIFIED'),
        [domains]
    );

    // Auto-select first verified domain if none selected
    const activeDomainId = selectedDomainId || (verifiedDomains.length > 0 ? verifiedDomains[0].id : '');
    const activeDomain = useMemo(
        () => domains.find(d => d.id === activeDomainId),
        [domains, activeDomainId]
    );

    const handleGenerate = useCallback(async () => {
        if (!token || !activeDomain) {
            toast.error('Vui lòng chọn domain');
            return;
        }

        setLoading(true);
        try {
            const localPart = generateRandomName();
            const response = await api<{ id: string }>('/inboxes', {
                method: 'POST',
                token,
                body: {
                    domainId: activeDomain.id,
                    localPart,
                    expiresAt: ttlMs ? new Date(Date.now() + ttlMs).toISOString() : null,
                },
            });

            const email = `${localPart}@${activeDomain.name}`;
            setGeneratedEmail(email);

            // Auto-copy to clipboard
            await copy(email, `Đã tạo và copy: ${email}`);

            // Callback to parent
            onInboxCreated?.(response.id, email);
        } catch (error) {
            toast.error('Không thể tạo email: ' + (error as Error).message);
        } finally {
            setLoading(false);
        }
    }, [token, activeDomain, copy, onInboxCreated, ttlMs]);

    const handleCopy = useCallback(() => {
        if (generatedEmail) {
            copy(generatedEmail);
        }
    }, [generatedEmail, copy]);

    return {
        loading,
        generatedEmail,
        selectedDomainId,
        setSelectedDomainId,
        ttlMs,
        setTtlMs,
        copied,
        verifiedDomains,
        activeDomainId,
        activeDomain,
        handleGenerate,
        handleCopy,
    };
}
