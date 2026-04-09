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
const DEFAULT_BATCH_COUNT = 5;
const LOCAL_PART_SUFFIX_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** Generate random email name */
export const generateRandomName = () => {
    const adjectives = [
        'swift', 'silent', 'bright', 'cool', 'neon', 'epic', 'pure', 'rapid', 'solar', 'lunar',
        'arctic', 'ember', 'nova', 'pixel', 'stellar', 'quantum', 'turbo', 'hyper', 'zen', 'vivid',
        'amber', 'velvet', 'cobalt', 'atomic', 'midnight', 'silver', 'crimson', 'aurora', 'frost', 'delta'
    ];
    const nouns = [
        'fox', 'wolf', 'orbit', 'forge', 'wave', 'node', 'spark', 'byte', 'cloud', 'signal',
        'nexus', 'pilot', 'pulse', 'rider', 'storm', 'echo', 'matrix', 'drift', 'vault', 'scope',
        'frame', 'circuit', 'beacon', 'thread', 'lab', 'relay', 'vector', 'terminal', 'harbor', 'atlas'
    ];
    const letters = LOCAL_PART_SUFFIX_CHARS;
    const pick = (items: string[]) => items[Math.floor(Math.random() * items.length)];
    const randomSuffix = (length: number) =>
        Array.from({ length }, () => letters[Math.floor(Math.random() * letters.length)]).join('');

    const style = Math.floor(Math.random() * 6);
    if (style === 0) return `${pick(adjectives)}-${pick(nouns)}-${Math.floor(100 + Math.random() * 900)}`;
    if (style === 1) return `${pick(nouns)}-${randomSuffix(5)}`;
    if (style === 2) return `${pick(adjectives)}${Math.floor(1000 + Math.random() * 9000)}`;
    if (style === 3) return `${pick(adjectives)}-${pick(nouns)}-${randomSuffix(4)}`;
    if (style === 4) return `${pick(adjectives)}-${pick(nouns)}-${pick(nouns)}`;
    return `${pick(nouns)}-${pick(adjectives)}-${Math.floor(10 + Math.random() * 89)}`;
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

function randomLocalPartSuffix(length = 4) {
    return Array.from(
        { length },
        () => LOCAL_PART_SUFFIX_CHARS[Math.floor(Math.random() * LOCAL_PART_SUFFIX_CHARS.length)]
    ).join('');
}

export function buildBatchLocalParts(baseLocalPart: string, count: number) {
    const normalizedBase = baseLocalPart.trim().toLowerCase();
    if (count <= 1) return [normalizedBase];

    const results = new Set<string>();
    results.add(normalizedBase);

    while (results.size < count) {
        results.add(`${normalizedBase}-${randomLocalPartSuffix()}`);
    }

    return Array.from(results);
}

/** Hook to manage create inbox form state and submission */
export function useCreateInboxForm(props: CreateInboxModalProps) {
    const { domains, token, onClose, onInboxCreated } = props;
    const savedPreferences = useMemo(() => readCreateInboxPreferences(), []);
    const verifiedDomains = useMemo(() => domains.filter(d => d.status === 'VERIFIED'), [domains]);
    const preferredDomainId = savedPreferences?.selectedDomainId || domains.find(d => d.isPublic)?.id || domains[0]?.id || '';

    const [loadingAction, setLoadingAction] = useState<'create' | 'keep' | 'batch-5' | 'batch-10' | null>(null);
    // Lazy state initialization to avoid calling generateRandomName() on every render
    const [localPart, setLocalPart] = useState(() => generateRandomName());
    const [selectedDomainId, setSelectedDomainId] = useState<string>(preferredDomainId);
    const [ttlMs, setTtlMs] = useState<number | null>(() => normalizeTtlValue(savedPreferences?.ttlMs));
    const [useRandomDomainPool, setUseRandomDomainPool] = useState<boolean>(Boolean(savedPreferences?.useRandomDomainPool));
    const [randomDomainIds, setRandomDomainIds] = useState<string[]>(savedPreferences?.randomDomainIds || []);

    const { modalRef, modalProps } = useModalAccessibility({
        isOpen: true,
        onClose,
        closeOnEsc: loadingAction === null,
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

    const loading = loadingAction !== null;
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
    const selectedTtlLabel = useMemo(
        () => TTL_OPTIONS.find((option) => option.value === ttlMs)?.label || '10 phút',
        [ttlMs]
    );
    const presetSummary = useMemo(() => {
        const domainSummary = useRandomDomainPool
            ? `${Math.max(randomDomainPool.length, 0)} domain random`
            : activeDomain
                ? `1 domain: @${activeDomain.name}`
                : 'Chưa chọn domain';

        return `Preset hiện tại: ${selectedTtlLabel} • ${domainSummary}`;
    }, [activeDomain, randomDomainPool.length, selectedTtlLabel, useRandomDomainPool]);

    const handleRandomize = () => setLocalPart(generateRandomName());

    const createInbox = async (nextLocalPart: string) => {
        const selectedDomain = candidateDomains[Math.floor(Math.random() * candidateDomains.length)];
        if (!selectedDomain || !token) {
            throw new Error('Không có domain hợp lệ để tạo hộp thư');
        }

        const res = await api<{ inbox: Inbox }>('/inboxes', {
            method: 'POST',
            token,
            body: {
                domainId: selectedDomain.id,
                localPart: nextLocalPart,
                expiresAt: ttlMs ? new Date(Date.now() + ttlMs).toISOString() : null
            }
        });

        const newInbox = { ...res.inbox, domain: selectedDomain };
        clarityTrack("inbox_created");
        onInboxCreated?.(newInbox);
        return newInbox;
    };

    const handleCreate = async () => {
        if (!canCreate || loading) return;
        setLoadingAction('create');
        try {
            await createInbox(localPart.trim());
            toast.success('Đã tạo hộp thư mới');
            onClose();
        } catch (e) {
            toast.error((e as Error).message || 'Không thể tạo hộp thư');
        } finally {
            setLoadingAction(null);
        }
    };

    const handleCreateAndKeepSetup = async () => {
        if (!canCreate || loading) return;
        setLoadingAction('keep');
        try {
            await createInbox(localPart.trim());
            setLocalPart(generateRandomName());
            toast.success('Đã tạo và giữ nguyên preset');
        } catch (e) {
            toast.error((e as Error).message || 'Không thể tạo hộp thư');
        } finally {
            setLoadingAction(null);
        }
    };

    const handleCreateBatch = async (count = DEFAULT_BATCH_COUNT) => {
        if (!canCreate || loading) return;
        const normalizedCount = count === 10 ? 10 : DEFAULT_BATCH_COUNT;
        setLoadingAction(normalizedCount === 10 ? 'batch-10' : 'batch-5');

        let successCount = 0;
        const localParts = buildBatchLocalParts(localPart, normalizedCount);

        try {
            for (const itemLocalPart of localParts) {
                await createInbox(itemLocalPart);
                successCount += 1;
            }
            setLocalPart(generateRandomName());
            toast.success(`Đã tạo ${successCount} hộp thư`);
        } catch (e) {
            const message = successCount > 0
                ? `Đã tạo ${successCount}/${normalizedCount} hộp thư`
                : ((e as Error).message || 'Không thể tạo hộp thư');
            toast.error(message);
        } finally {
            setLoadingAction(null);
        }
    };

    const handleRequestClose = () => {
        if (loading) return;
        onClose();
    };

    return {
        loading,
        loadingAction,
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
        presetSummary,
        handleRandomize,
        handleCreate,
        handleCreateAndKeepSetup,
        handleCreateBatch,
        handleRequestClose
    };
}
