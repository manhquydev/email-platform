/**
 * Types and helpers for CodesPage
 */

export interface RedemptionCode {
    id: string;
    code: string;
    packageId: string;
    package: { name: string; type: string; price: number };
    maxUses: number;
    usedCount: number;
    expiresAt?: string;
    isActive: boolean;
    createdAt: string;
}

export interface ServicePackage {
    id: string;
    name: string;
    price: number;
}

export interface CodeFormData {
    packageId: string;
    maxUses: number;
    expiresAt: string;
    prefix: string;
    count: number;
}

export const DEFAULT_FORM_DATA: CodeFormData = {
    packageId: "",
    maxUses: 1,
    expiresAt: "",
    prefix: "",
    count: 1
};

/** Filter codes by search term */
export function filterCodes(codes: RedemptionCode[], search: string): RedemptionCode[] {
    if (!search) return codes;
    const term = search.toLowerCase();
    return codes.filter(c =>
        c.code.toLowerCase().includes(term) ||
        c.package.name.toLowerCase().includes(term)
    );
}

/** Get code status for display */
export function getCodeStatus(code: RedemptionCode): { status: string; variant: "default" | "warning" | "success" } {
    if (!code.isActive) return { status: "INACTIVE", variant: "default" };
    if (code.usedCount >= code.maxUses) return { status: "USED", variant: "warning" };
    return { status: "ACTIVE", variant: "success" };
}

/** Format currency VND */
export function formatVND(amount: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}
