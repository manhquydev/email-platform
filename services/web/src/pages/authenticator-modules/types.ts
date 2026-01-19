/**
 * Types and constants for Authenticator page
 */

export interface AuthenticatorAccount {
    id: string;
    serviceName: string;
    accountName?: string;
    secret: string;
    issuer?: string;
}

// Service brand colors for visual distinction
export const SERVICE_COLORS: Record<string, { bg: string; icon: string }> = {
    google: { bg: 'bg-red-500/10', icon: '🔴' },
    github: { bg: 'bg-gray-800/20', icon: '⚫' },
    microsoft: { bg: 'bg-blue-500/10', icon: '🔵' },
    amazon: { bg: 'bg-orange-500/10', icon: '🟠' },
    facebook: { bg: 'bg-blue-600/10', icon: '🔵' },
    twitter: { bg: 'bg-sky-500/10', icon: '🐦' },
    discord: { bg: 'bg-indigo-500/10', icon: '💜' },
    slack: { bg: 'bg-purple-500/10', icon: '💬' },
    default: { bg: 'bg-[var(--nebula-glow-violet)]', icon: '🔐' }
};

export function getServiceColor(serviceName: string) {
    const lower = serviceName.toLowerCase();
    for (const [key, value] of Object.entries(SERVICE_COLORS)) {
        if (lower.includes(key)) return value;
    }
    return SERVICE_COLORS.default;
}
