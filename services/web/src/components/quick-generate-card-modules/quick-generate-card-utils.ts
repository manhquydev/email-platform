/**
 * Types and constants for QuickGenerateCard
 * Following Vercel React Best Practices: rendering-hoist-jsx
 */
import type { Domain } from "../../types";

export interface QuickGenerateCardProps {
    domains: Domain[];
    token: string | null;
    onInboxCreated?: (inboxId: string, email: string) => void;
}

/** TTL options in milliseconds (null = permanent) */
export const TTL_OPTIONS = [
    { label: '10 phút', value: 10 * 60 * 1000 },
    { label: '1 giờ', value: 60 * 60 * 1000 },
    { label: '24 giờ', value: 24 * 60 * 60 * 1000 },
    { label: 'Vĩnh viễn', value: null },
] as const;

export type TtlValue = typeof TTL_OPTIONS[number]['value'];

/** Default TTL (10 minutes) */
export const DEFAULT_TTL = 10 * 60 * 1000;
