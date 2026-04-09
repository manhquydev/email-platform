/**
 * Types, constants and hooks for CreateInboxModal
 */
import { useEffect, useMemo, useState } from 'react';
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

const CREATE_INBOX_PREFERENCES_KEY = 'create_inbox_modal_preferences_v1';
const DEFAULT_TTL_MS = 10 * 60 * 1000;

/** Generate random email name */
export const generateRandomName = () => {
    const adjectives = [
        'swift', 'silent', 'bright', 'cool', 'neon', 'epic', 'pure', 'rapid', 'solar', 'lunar',
        'arctic', 'ember', 'nova', 'pixel', 'stellar', 'quantum', 'turbo', 'hyper', 'zen', 'vivid'
    ];
    const nouns = [
        'fox', 'wolf', 'orbit', 'forge', 'wave', 'node', 'spark', 'byte', 'cloud', 'signal',
        'nexus', 'pilot', 'pulse', 'rider', 'storm', 'echo', 'matrix', 'drift', 'vault', 'scope'
    ];
    const letters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const pick = (items: string[]) => items[Math.floor(Math.random() * items.length)];
    const randomSuffix = (length: number) =>
        Array.from({ length }, () => letters[Math.floor(Math.random() * letters.length)]).join('');

    const style = Math.floor(Math.random() * 4);
    if (style === 0) return `${pick(adjectives)}-${pick(nouns)}-${Math.floor(100 + Math.random() * 900)}`;
    if (style === 1) return `${pick(nouns)}-${randomSuffix(5)}`;
    if (style === 2) return `${pick(adjectives)}${Math.floor(1000 + Math.random() * 9000)}`;
    return `${pick(adjectives)}-${pick(nouns)}-${randomSuffix(4)}`;
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

type CreateInboxPreferences = {
    ttlMs: number | null;
    selectedDomainId: string;
    useRandomDomainPool: boolean;
    randomDomainIds: string[];
};

function readCreateInboxPreferences(): CreateInboxPreferences | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(CREATE_INBOX_PREFERENCES_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Partial<CreateInboxPreferences>;
        if (!parsed || typeof parsed !== 'object') return null;
        const parsedTtl = parsed.ttlMs;
        return {
            ttlMs: parsedTtl === null
                ? null
                : typeof parsedTtl === 'number'
                    ? parsedTtl
                    : DEFAULT_TTL_MS,
            selectedDomainId: typeof parsed.selectedDomainId === 'string' ? parsed.selectedDomainId : '',
            useRandomDomainPool: Boolean(parsed.useRandomDomainPool),
            randomDomainIds: Array.isArray(parsed.randomDomainIds)
                ? parsed.randomDomainIds.filter((id): id is string => typeof id === 'string')
                : [],
        };
    } catch {
        return null;
    }
}

function writeCreateInboxPreferences(preferences: CreateInboxPreferences) {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(CREATE_INBOX_PREFERENCES_KEY, JSON.stringify(preferences));
    } catch {
        // Ignore localStorage write errors (private mode, quota, etc.)
    }
}

function isSameStringArray(a: string[], b: string[]) {
    if (a.length !== b.length) return false;
    return a.every((value, index) => value === b[index]);
}

function normalizeTtlValue(ttlMs: number | null | undefined) {
    if (ttlMs === null) return null;
    if (typeof ttlMs !== 'number') return DEFAULT_TTL_MS;
    const allowedValues = new Set(TTL_OPTIONS.map(opt => opt.value).filter((value): value is number => value !== null));
    return allowedValues.has(ttlMs) ? ttlMs : DEFAULT_TTL_MS;
}

/** Hook to manage create inbox form state and submission */
export function useCreateInboxForm(props: CreateInboxModalProps) {
    const { domains, token, onClose, onInboxCreated } = props;
    const savedPreferences = useMemo(() => readCreateInboxPreferences(), []);
    const verifiedDomains = useMemo(() => domains.filter(d => d.status === 'VERIFIED'), [domains]);
    const preferredDomainId = savedPreferences?.selectedDomainId || domains.find(d => d.isPublic)?.id || domains[0]?.id || '';

    const [loading, setLoading] = useState(false);
    // Lazy state initialization to avoid calling generateRandomName() on every render
    const [localPart, setLocalPart] = useState(() => generateRandomName());
    const [selectedDomainId, setSelectedDomainId] = useState<string>(preferredDomainId);
    const [ttlMs, setTtlMs] = useState<number | null>(() => normalizeTtlValue(savedPreferences?.ttlMs));
    const [useRandomDomainPool, setUseRandomDomainPool] = useState<boolean>(Boolean(savedPreferences?.useRandomDomainPool));
    const [randomDomainIds, setRandomDomainIds] = useState<string[]>(savedPreferences?.randomDomainIds || []);

    const { modalRef, modalProps } = useModalAccessibility({
        isOpen: true,
        onClose,
        closeOnEsc: !loading,
    });

    useEffect(() => {
        if (verifiedDomains.length === 0) return;
        const validDomainIds = new Set(verifiedDomains.map(domain => domain.id));
        setSelectedDomainId(prev => validDomainIds.has(prev) ? prev : verifiedDomains[0].id);
        setRandomDomainIds(prev => {
            const filtered = prev.filter(id => validDomainIds.has(id));
            if (!useRandomDomainPool) return filtered;
            if (filtered.length > 0) return filtered;
            const fallback = validDomainIds.has(selectedDomainId) ? selectedDomainId : verifiedDomains[0].id;
            return fallback ? [fallback] : [];
        });
    }, [selectedDomainId, useRandomDomainPool, verifiedDomains]);

    const activeDomain = useMemo(
        () => verifiedDomains.find(d => d.id === selectedDomainId) || verifiedDomains[0],
        [verifiedDomains, selectedDomainId]
    );

    const randomDomainPool = useMemo(
        () => verifiedDomains.filter(d => randomDomainIds.includes(d.id)),
        [randomDomainIds, verifiedDomains]
    );

    const candidateDomains = useMemo(
        () => (useRandomDomainPool ? randomDomainPool : activeDomain ? [activeDomain] : []),
        [activeDomain, randomDomainPool, useRandomDomainPool]
    );

    useEffect(() => {
        writeCreateInboxPreferences({
            ttlMs,
            selectedDomainId: activeDomain?.id || selectedDomainId,
            useRandomDomainPool,
            randomDomainIds,
        });
    }, [activeDomain?.id, randomDomainIds, selectedDomainId, ttlMs, useRandomDomainPool]);

    const handleRandomPoolToggle = (enabled: boolean) => {
        setUseRandomDomainPool(enabled);
        if (!enabled) return;
        setRandomDomainIds(prev => {
            if (prev.length > 0) return prev;
            if (activeDomain?.id) return [activeDomain.id];
            return verifiedDomains[0]?.id ? [verifiedDomains[0].id] : [];
        });
    };

    const handleRandomDomainSelection = (domainId: string, selected: boolean) => {
        setRandomDomainIds(prev => {
            if (selected) {
                if (prev.includes(domainId)) return prev;
                return [...prev, domainId];
            }
            const next = prev.filter(id => id !== domainId);
            return isSameStringArray(prev, next) ? prev : next;
        });
    };

    const canCreate = Boolean(token && localPart.trim() && candidateDomains.length > 0);
    const previewEmail = useMemo(() => {
        if (!localPart.trim()) return '';
        if (useRandomDomainPool) {
            if (randomDomainPool.length === 0) return `${localPart}@chọn-domain-ngẫu-nhiên`;
            const samples = randomDomainPool.slice(0, 2).map(domain => domain.name).join(', ');
            const extra = randomDomainPool.length > 2 ? ', ...' : '';
            return `${localPart}@{${samples}${extra}}`;
        }
        return activeDomain ? `${localPart}@${activeDomain.name}` : '';
    }, [activeDomain, localPart, randomDomainPool, useRandomDomainPool]);

    const handleRandomize = () => setLocalPart(generateRandomName());

    const handleCreate = async () => {
        if (!localPart.trim() || !token || candidateDomains.length === 0) return;
        const selectedDomain = candidateDomains[Math.floor(Math.random() * candidateDomains.length)];
        if (!selectedDomain) return;

        setLoading(true);
        try {
            const res = await api<{ inbox: Inbox }>('/inboxes', {
                method: 'POST',
                token,
                body: {
                    domainId: selectedDomain.id,
                    localPart: localPart.trim(),
                    expiresAt: ttlMs ? new Date(Date.now() + ttlMs).toISOString() : null
                }
            });

            const newInbox = { ...res.inbox, domain: selectedDomain };
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
        useRandomDomainPool,
        randomDomainIds,
        handleRandomPoolToggle,
        handleRandomDomainSelection,
        modalRef, modalProps,
        verifiedDomains,
        activeDomain,
        canCreate,
        previewEmail,
        handleRandomize,
        handleCreate,
        onClose
    };
}
