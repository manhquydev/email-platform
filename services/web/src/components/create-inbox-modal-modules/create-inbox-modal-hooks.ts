/**
 * Types, constants and hooks for CreateInboxModal
 */
import { useState } from 'react';
import toast from 'react-hot-toast';
import type { Domain, Inbox } from '../../types';
import { api } from '../../utils/api';
import { useModalAccessibility } from '../../hooks/useModalAccessibility';
import { clarityTrack } from '../../hooks/useClarity';

export interface CreateInboxModalProps {
    domains: Domain[];
    token: string | null;
    onClose: () => void;
    onInboxCreated?: (inbox: Inbox) => void;
}

/** Generate random email name */
export const generateRandomName = () => {
    const adjectives = ['swift', 'silent', 'bright', 'cool', 'blue', 'dark', 'light', 'neon', 'epic', 'pure'];
    const nouns = ['user', 'ghost', 'fox', 'wolf', 'soul', 'wave', 'storm', 'mist', 'star', 'void'];
    const rand = Math.floor(Math.random() * 10000);
    return `${adjectives[Math.floor(Math.random() * adjectives.length)]}-${nouns[Math.floor(Math.random() * nouns.length)]}-${rand}`;
};

/** TTL options in milliseconds (null = permanent) */
export const TTL_OPTIONS = [
    { label: '5 phút', value: 5 * 60 * 1000 },
    { label: '10 phút', value: 10 * 60 * 1000 },
    { label: '30 phút', value: 30 * 60 * 1000 },
    { label: '1 giờ', value: 60 * 60 * 1000 },
    { label: '24 giờ', value: 24 * 60 * 60 * 1000 },
    { label: 'Vĩnh viễn', value: null },
] as const;

/** Hook to manage create inbox form state and submission */
export function useCreateInboxForm(props: CreateInboxModalProps) {
    const { domains, token, onClose, onInboxCreated } = props;
    const [loading, setLoading] = useState(false);
    // Lazy state initialization to avoid calling generateRandomName() on every render
    const [localPart, setLocalPart] = useState(() => generateRandomName());
    const [selectedDomainId, setSelectedDomainId] = useState<string>(domains.find(d => d.isPublic)?.id || domains[0]?.id || '');
    const [ttlMs, setTtlMs] = useState<number | null>(10 * 60 * 1000);

    const { modalRef, modalProps } = useModalAccessibility({
        isOpen: true,
        onClose,
        closeOnEsc: !loading,
    });

    const verifiedDomains = domains.filter(d => d.status === 'VERIFIED');
    const activeDomain = verifiedDomains.find(d => d.id === selectedDomainId) || verifiedDomains[0];
    const previewEmail = activeDomain ? `${localPart}@${activeDomain.name}` : '';

    const handleRandomize = () => setLocalPart(generateRandomName());

    const handleCreate = async () => {
        if (!activeDomain || !localPart.trim() || !token) return;
        setLoading(true);
        try {
            const res = await api<{ inbox: Inbox }>('/inboxes', {
                method: 'POST',
                token,
                body: {
                    domainId: activeDomain.id,
                    localPart: localPart.trim(),
                    expiresAt: ttlMs ? new Date(Date.now() + ttlMs).toISOString() : null
                }
            });

            const newInbox = { ...res.inbox, domain: activeDomain };
            clarityTrack("inbox_created");
            toast.success('Đã tạo hộp thư mới!');
            onInboxCreated?.(newInbox);
            onClose();
        } catch (e) {
            toast.error('Lỗi: ' + (e as Error).message);
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        localPart, setLocalPart,
        selectedDomainId, setSelectedDomainId,
        ttlMs, setTtlMs,
        modalRef, modalProps,
        verifiedDomains,
        activeDomain,
        previewEmail,
        handleRandomize,
        handleCreate,
        onClose
    };
}
