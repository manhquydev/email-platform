/**
 * Types and helpers for SecuritySettings
 */

export interface UserProfile {
    twoFactorEnabled: boolean;
}

export interface SecuritySettingsProps {
    profile: UserProfile | null;
    loadProfile: () => void;
}

export type TwoFAStep = "idle" | "setup" | "verify" | "backup";

export interface PasswordStrength {
    score: number;
    label: string;
    color: string;
}

/** Calculate password strength */
export function getPasswordStrength(pwd: string): PasswordStrength {
    if (!pwd) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 10) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 2) return { score, label: 'Yếu', color: 'bg-danger' };
    if (score <= 3) return { score, label: 'Trung bình', color: 'bg-warning' };
    if (score <= 4) return { score, label: 'Tốt', color: 'bg-success' };
    return { score, label: 'Mạnh', color: 'bg-success' };
}
