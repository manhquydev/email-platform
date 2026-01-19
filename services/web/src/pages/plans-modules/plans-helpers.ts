/**
 * Types and helpers for Plans page
 */
import type { ServicePackage } from "../../types";

export interface PlanFeature {
    text: string;
    included: boolean;
}

export interface DisplayPackage extends ServicePackage {
    features?: PlanFeature[];
    displayOrder?: number;
    recommended?: boolean;
    badge?: string;
}

// Default features based on tier
export function getDefaultFeatures(pkg: DisplayPackage): PlanFeature[] {
    const tier = pkg.targetTier;
    switch (tier) {
        case 'FREE':
            return [
                { text: "1 Tên miền riêng", included: true },
                { text: "3 Hộp thư email", included: true },
                { text: "100MB Lưu trữ", included: true },
                { text: "50 Email gửi/ngày", included: true },
                { text: "API Access", included: false },
            ];
        case 'STARTER':
            return [
                { text: "3 Tên miền riêng", included: true },
                { text: "20 Hộp thư email", included: true },
                { text: "1GB Lưu trữ", included: true },
                { text: "200 Email gửi/ngày", included: true },
                { text: "API Access", included: false },
            ];
        case 'PROFESSIONAL':
            return [
                { text: "10 Tên miền riêng", included: true },
                { text: "100 Hộp thư email", included: true },
                { text: "5GB Lưu trữ", included: true },
                { text: "1000 Email gửi/ngày", included: true },
                { text: "API Access", included: true },
            ];
        case 'ENTERPRISE':
            return [
                { text: "Không giới hạn tên miền", included: true },
                { text: "Không giới hạn hộp thư", included: true },
                { text: "50GB+ Lưu trữ", included: true },
                { text: "Email không giới hạn", included: true },
                { text: "Dedicated Support", included: true },
            ];
        default:
            return [
                { text: `${pkg.durationDays || 30} ngày sử dụng`, included: true },
            ];
    }
}

// Format price display
export function formatPrice(price: number, currency: string): string {
    if (price === 0) return "0";
    if (currency === 'VND') {
        return new Intl.NumberFormat('vi-VN').format(price);
    }
    return new Intl.NumberFormat('en-US').format(price);
}

// Get currency symbol
export function getCurrencySymbol(currency: string): string {
    return currency === 'VND' ? 'đ' : currency;
}

// Get period text
export function getPeriod(pkg: DisplayPackage): string {
    if (pkg.type === 'USAGE_BASED') return ' lượt';
    return pkg.durationDays && pkg.durationDays > 45 ? '/năm' : '/tháng';
}

// Filter packages based on billing cycle
export function filterPackages(packages: DisplayPackage[], billingCycle: "monthly" | "yearly"): DisplayPackage[] {
    return packages.filter(pkg => {
        if (!pkg.isActive) return false;
        if (pkg.type !== 'TIME_BASED') return true;
        const days = pkg.durationDays || 30;
        if (billingCycle === 'monthly') {
            return days <= 45;
        } else {
            return days > 45;
        }
    });
}

// Sort packages by displayOrder then tier hierarchy
export function sortPackages(packages: DisplayPackage[]): DisplayPackage[] {
    return [...packages].sort((a, b) => {
        const orderA = a.displayOrder ?? 99;
        const orderB = b.displayOrder ?? 99;
        if (orderA !== orderB) return orderA - orderB;

        const tierOrder = { FREE: 0, STARTER: 1, PROFESSIONAL: 2, ENTERPRISE: 3 };
        return (tierOrder[a.targetTier as keyof typeof tierOrder] || 0) -
               (tierOrder[b.targetTier as keyof typeof tierOrder] || 0);
    });
}
