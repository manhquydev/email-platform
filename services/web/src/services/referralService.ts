/**
 * Referral Service - API client for referral program features
 * Handles referral codes, stats, rewards claiming
 */
import { api } from '../utils/api';

// ============ Types ============

export interface ReferralCode {
    code: string; // Format: XXXX-XXXX-XXXX
    createdAt: string;
    shareUrl: string;
}

export interface ReferralStats {
    totalReferrals: number;
    pendingRewards: number;
    claimedRewards: number;
    bonusAliases: number; // +10 per referral
    recentReferrals: Array<{
        id: string;
        date: string;
        status: 'pending' | 'claimed';
    }>;
}

export interface ClaimResult {
    success: boolean;
    aliasesAwarded: number;
    newTotal: number;
}

export interface ApplyCodeResult {
    success: boolean;
    message: string;
    bonusAliases: number;
}

// ============ API Client ============

export const referralService = {
    /**
     * Get user's personal referral code
     */
    async getCode(): Promise<ReferralCode> {
        return api('/api/referral/code');
    },

    /**
     * Get referral statistics
     */
    async getStats(): Promise<ReferralStats> {
        return api('/api/referral/stats');
    },

    /**
     * Claim pending referral rewards
     */
    async claimRewards(): Promise<ClaimResult> {
        return api('/api/referral/claim', {
            method: 'POST',
        });
    },

    /**
     * Apply a referral code (used during registration)
     */
    async applyCode(code: string): Promise<ApplyCodeResult> {
        return api('/api/referral/apply', {
            method: 'POST',
            body: JSON.stringify({ code }),
        });
    },

    /**
     * Generate shareable referral URL
     */
    generateShareUrl(code: string): string {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://ephemera.email';
        return `${baseUrl}/register?ref=${encodeURIComponent(code)}`;
    },

    /**
     * Generate social share URLs
     */
    generateSocialLinks(_code: string, shareUrl: string) {
        const message = encodeURIComponent('Tham gia Ephemera để bảo vệ quyền riêng tư email của bạn! Dùng mã giới thiệu của tôi để nhận +10 bí danh miễn phí:');
        return {
            twitter: `https://twitter.com/intent/tweet?text=${message}&url=${encodeURIComponent(shareUrl)}`,
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
            linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
            email: `mailto:?subject=${encodeURIComponent('Mời tham gia Ephemera')}&body=${message}%20${encodeURIComponent(shareUrl)}`,
        };
    },
};

export default referralService;
