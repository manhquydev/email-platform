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
const LEGACY_CREATE_INBOX_PREFERENCES_KEYS = [
    'create_inbox_modal_preferences',
    'createInboxModalPreferences'
] as const;
const DEFAULT_TTL_MS = 10 * 60 * 1000;
const DEFAULT_BATCH_COUNT = 5;
const LOCAL_PART_SUFFIX_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';
const LOCAL_PART_MIN_LENGTH = 6;
const LOCAL_PART_MAX_LENGTH = 24;

const VIETNAMESE_FIRST_NAMES = [
    'an', 'bao', 'binh', 'chi', 'duy', 'giang', 'hao', 'khanh', 'linh', 'mai',
    'minh', 'nam', 'ngoc', 'phuong', 'quan', 'trang', 'tuan', 'vy'
];
const VIETNAMESE_LAST_NAMES = [
    'nguyen', 'tran', 'le', 'pham', 'hoang', 'phan', 'vu', 'dang', 'bui', 'do'
];
const NEUTRAL_FIRST_NAMES = [
    'alex', 'sam', 'jules', 'kai', 'morgan', 'taylor', 'riley', 'jordan', 'casey', 'devon'
];
const ROLE_WORDS = ['hello', 'contact', 'support', 'info', 'desk'];
const TEAM_WORDS = ['team', 'studio', 'lab', 'ops', 'inbox'];

const BLOCKED_LOCAL_PART_TOKENS = [
    'test', 'temp', 'fake', 'spam', 'throwaway', 'xxx', 'qwerty', 'admin'
];
const BLOCKED_BRAND_TOKENS = [
    'google', 'apple', 'microsoft', 'amazon', 'meta', 'tiktok', 'openai'
];

type LocalPartPattern =
    | 'first.last'
    | 'firstlast'
    | 'firstlastnn'
    | 'f.lastname'
    | 'role.first'
    | 'team.first'
    | 'first_last'
    | 'first.lastnameyy';

const RANDOM_PATTERN_WEIGHTS: Array<{ pattern: LocalPartPattern; weight: number }> = [
    { pattern: 'first.last', weight: 28 },
    { pattern: 'firstlast', weight: 16 },
    { pattern: 'firstlastnn', weight: 14 },
    { pattern: 'f.lastname', weight: 10 },
    { pattern: 'role.first', weight: 10 },
    { pattern: 'team.first', weight: 8 },
    { pattern: 'first_last', weight: 8 },
    { pattern: 'first.lastnameyy', weight: 6 },
];

/** Generate random email name */
export const generateRandomName = () => {
    for (let attempt = 0; attempt < 32; attempt += 1) {
        const pattern = pickWeightedPattern(RANDOM_PATTERN_WEIGHTS);
        const first = pickRandom([...VIETNAMESE_FIRST_NAMES, ...NEUTRAL_FIRST_NAMES]);
        const last = pickRandom(VIETNAMESE_LAST_NAMES);
        const role = pickRandom(ROLE_WORDS);
        const team = pickRandom(TEAM_WORDS);
        const twoDigits = String(Math.floor(Math.random() * 90) + 10);

        let candidate = '';
        switch (pattern) {
            case 'first.last':
                candidate = `${first}.${last}`;
                break;
            case 'firstlast':
                candidate = `${first}${last}`;
                break;
            case 'firstlastnn':
                candidate = `${first}${last}${twoDigits}`;
                break;
            case 'f.lastname':
                candidate = `${first.charAt(0)}.${last}`;
                break;
            case 'role.first':
                candidate = `${role}.${first}`;
                break;
            case 'team.first':
                candidate = `${team}.${first}`;
                break;
            case 'first_last':
                candidate = `${first}_${last}`;
                break;
            case 'first.lastnameyy':
                candidate = `${first}.${last}${twoDigits}`;
                break;
        }

        const normalized = normalizeLocalPartCandidate(candidate);
        if (isLocalPartValid(normalized)) {
            return normalized;
        }
    }

    return normalizeLocalPartCandidate(`contact.${pickRandom(VIETNAMESE_FIRST_NAMES)}${String(Math.floor(Math.random() * 90) + 10)}`);
};

function pickRandom<T>(items: T[]): T {
    return items[Math.floor(Math.random() * items.length)];
}

function pickWeightedPattern(weights: Array<{ pattern: LocalPartPattern; weight: number }>): LocalPartPattern {
    const total = weights.reduce((sum, entry) => sum + entry.weight, 0);
    let cursor = Math.random() * total;
    for (const entry of weights) {
        cursor -= entry.weight;
        if (cursor <= 0) return entry.pattern;
    }
    return weights[0].pattern;
}

function normalizeLocalPartCandidate(raw: string) {
    const deAccented = raw
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

    return deAccented
        .replace(/[^a-z0-9._]/g, '')
        .replace(/[._]{2,}/g, '.')
        .replace(/^[._]+|[._]+$/g, '')
        .slice(0, LOCAL_PART_MAX_LENGTH);
}

function hasLowVowelRatio(value: string) {
    const letters = value.replace(/[^a-z]/g, '');
    if (letters.length < 7) return false;
    const vowels = letters.match(/[aeiou]/g)?.length ?? 0;
    return vowels / letters.length < 0.18;
}

function isLocalPartValid(value: string) {
    if (!value) return false;
    if (value.length < LOCAL_PART_MIN_LENGTH || value.length > LOCAL_PART_MAX_LENGTH) return false;
    if (/[._]$|^[._]/.test(value)) return false;
    if (/[._]{2,}/.test(value)) return false;
    if (/(.)\1{2,}/.test(value)) return false;
    if (/\d{3,}/.test(value)) return false;

    const digitCount = (value.match(/\d/g)?.length ?? 0);
    if (digitCount > 4) return false;
    if (digitCount / value.length > 0.3) return false;
    if ((value.match(/[._]/g)?.length ?? 0) > 2) return false;
    if (hasLowVowelRatio(value)) return false;

    if (BLOCKED_LOCAL_PART_TOKENS.some((token) => value.includes(token))) return false;
    if (BLOCKED_BRAND_TOKENS.some((token) => value.includes(token))) return false;
    return true;
}

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

let inMemoryCreateInboxPreferences: CreateInboxPreferences | null = null;

function parseTtlFromPreference(raw: unknown): number | null | undefined {
    if (raw === null) return null;
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
    if (typeof raw === 'string') {
        const normalized = raw.trim().toLowerCase();
        if (normalized === 'null' || normalized === 'permanent') return null;
        const numeric = Number(normalized);
        if (Number.isFinite(numeric)) return numeric;
    }
    return undefined;
}

function parseCreateInboxPreferences(raw: string): CreateInboxPreferences | null {
    const parsed = JSON.parse(raw) as Partial<CreateInboxPreferences> & {
        ttl?: number | string | null;
        ttlMinutes?: number;
        ttlHours?: number;
        randomDomains?: string[];
        domainId?: string;
    };

    if (!parsed || typeof parsed !== 'object') return null;

    let parsedTtl = parseTtlFromPreference(parsed.ttlMs);
    if (parsedTtl === undefined) parsedTtl = parseTtlFromPreference(parsed.ttl);
    if (parsedTtl === undefined && typeof parsed.ttlMinutes === 'number') {
        parsedTtl = parsed.ttlMinutes * 60 * 1000;
    }
    if (parsedTtl === undefined && typeof parsed.ttlHours === 'number') {
        parsedTtl = parsed.ttlHours * 60 * 60 * 1000;
    }

    const randomDomainIds = Array.isArray(parsed.randomDomainIds)
        ? parsed.randomDomainIds
        : Array.isArray(parsed.randomDomains)
            ? parsed.randomDomains
            : [];

    return {
        ttlMs: parsedTtl === null
            ? null
            : typeof parsedTtl === 'number'
                ? parsedTtl
                : DEFAULT_TTL_MS,
        selectedDomainId: typeof parsed.selectedDomainId === 'string'
            ? parsed.selectedDomainId
            : typeof parsed.domainId === 'string'
                ? parsed.domainId
                : '',
        useRandomDomainPool: Boolean(parsed.useRandomDomainPool),
        randomDomainIds: randomDomainIds.filter((id): id is string => typeof id === 'string'),
    };
}

function readCreateInboxPreferences(): CreateInboxPreferences | null {
    if (inMemoryCreateInboxPreferences) return inMemoryCreateInboxPreferences;
    if (typeof window === 'undefined') return null;

    const keysToCheck = [CREATE_INBOX_PREFERENCES_KEY, ...LEGACY_CREATE_INBOX_PREFERENCES_KEYS];

    try {
        for (const key of keysToCheck) {
            const raw = window.localStorage.getItem(key);
            if (!raw) continue;
            try {
                const parsed = parseCreateInboxPreferences(raw);
                if (!parsed) continue;

                inMemoryCreateInboxPreferences = parsed;
                if (key !== CREATE_INBOX_PREFERENCES_KEY) {
                    window.localStorage.setItem(CREATE_INBOX_PREFERENCES_KEY, JSON.stringify(parsed));
                }
                return parsed;
            } catch {
                // Ignore invalid legacy payload and continue.
            }
        }
    } catch {
        // Ignore localStorage read errors and fallback to in-memory state.
    }

    return inMemoryCreateInboxPreferences;
}

function writeCreateInboxPreferences(preferences: CreateInboxPreferences) {
    inMemoryCreateInboxPreferences = preferences;
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
    let normalizedBase = normalizeLocalPartCandidate(baseLocalPart.trim().toLowerCase());
    if (!isLocalPartValid(normalizedBase)) {
        normalizedBase = generateRandomName();
    }
    if (count <= 1) return [normalizedBase];

    const results = new Set<string>([normalizedBase]);
    let sequence = 1;
    const separator = normalizedBase.includes('.') ? '.' : normalizedBase.includes('_') ? '_' : '';
    const maxBaseLengthForSequence = LOCAL_PART_MAX_LENGTH - suffixLengthWithSeparator(separator, 2);
    const sequenceBase = trimSeparatorEdges(normalizedBase.slice(0, Math.max(LOCAL_PART_MIN_LENGTH - 2, maxBaseLengthForSequence)));

    while (results.size < count) {
        const suffix = String(sequence).padStart(2, '0');
        const candidate = normalizeLocalPartCandidate(
            separator ? `${sequenceBase}${separator}${suffix}` : `${sequenceBase}${suffix}`
        );

        if (isLocalPartValid(candidate)) {
            results.add(candidate);
        }
        sequence += 1;

        if (sequence > 99 && results.size < count) {
            const fallback = normalizeLocalPartCandidate(`${normalizedBase}${randomLocalPartSuffix(2)}`);
            if (isLocalPartValid(fallback)) {
                results.add(fallback);
            }
        }
    }

    return Array.from(results);
}

function suffixLengthWithSeparator(separator: string, digits: number) {
    return (separator ? 1 : 0) + digits;
}

function trimSeparatorEdges(value: string) {
    return value.replace(/^[._]+|[._]+$/g, '');
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
