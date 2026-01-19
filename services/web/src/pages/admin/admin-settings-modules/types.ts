/**
 * Types for AdminSettingsPage
 */

export interface SystemSetting {
    key: string;
    value: string;
    description?: string;
}

export interface AdminProfile {
    email: string;
    role: string;
    createdAt: string;
    twoFactorEnabled?: boolean;
    _count: { domains: number };
}

export interface SystemInfo {
    userCount: number;
    domainCount: number;
    messageCount: number;
    recentLogins24h: number;
    serverTime: string;
}

export type TwoFAStep = "idle" | "setup" | "verify" | "backup";
