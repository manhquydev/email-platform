/**
 * Hook for subscription actions
 * Handles checkout, redeem, portal, invoice/report export
 * Updated: Uses SePay VietQR for checkout instead of Stripe redirect
 */
import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../../../../utils/api";
import { useAuth } from "../../../../context/AuthContext";
import { getFriendlyErrorMessage } from "../../../../utils/errorMapping";
import type { Payment } from "../../../../types";

export interface SepayCheckoutResult {
    orderCode: string;
    qrUrl: string;
    amount: number;
    expiresAt: string;
}

export interface UseSubscriptionActionsProps {
    loadProfile: () => void;
    payments: Payment[];
}

export interface UseSubscriptionActionsReturn {
    handlePortal: () => Promise<void>;
    handleCheckout: (packageId: string, packageName: string) => Promise<void>;
    handleRedeem: (code: string) => Promise<boolean>;
    handleExportReport: () => void;
    handleDownloadInvoice: (payment: Payment) => void;
    // SePay checkout state
    sepayCheckout: SepayCheckoutResult | null;
    sepayPackageName: string;
    isSepayModalOpen: boolean;
    closeSepayModal: () => void;
}

export function useSubscriptionActions({ loadProfile, payments }: UseSubscriptionActionsProps): UseSubscriptionActionsReturn {
    const { token } = useAuth();

    // SePay checkout state
    const [sepayCheckout, setSepayCheckout] = useState<SepayCheckoutResult | null>(null);
    const [sepayPackageName, setSepayPackageName] = useState("");
    const [isSepayModalOpen, setIsSepayModalOpen] = useState(false);

    const handlePortal = useCallback(async () => {
        try {
            toast.loading("Đang chuyển hướng đến cổng thanh toán...");
            const res = await api<{ url: string }>("/billing/portal", { method: "POST", token });
            if (res.url) {
                window.location.href = res.url;
            } else {
                toast.dismiss();
                toast.error("Không tìm thấy URL cổng thanh toán");
            }
        } catch (error) {
            toast.dismiss();
            toast.error(getFriendlyErrorMessage((error as Error).message));
        }
    }, [token]);

    const handleCheckout = useCallback(async (packageId: string, packageName: string = "Gói dịch vụ") => {
        try {
            toast.loading("Đang tạo mã QR thanh toán...");

            // Try SePay first
            const res = await api<SepayCheckoutResult>("/billing/sepay/checkout", {
                method: "POST",
                token,
                body: { packageId }
            });

            toast.dismiss();

            // Open VietQR modal
            setSepayCheckout(res);
            setSepayPackageName(packageName);
            setIsSepayModalOpen(true);
        } catch (error: any) {
            toast.dismiss();

            // If SePay fails, try Stripe as fallback
            if (error.message?.includes("not configured") || error.message?.includes("503")) {
                try {
                    toast.loading("Đang chuyển hướng đến Stripe...");
                    const stripeRes = await api<{ url: string }>("/billing/checkout", {
                        method: "POST",
                        token,
                        body: { packageId }
                    });
                    toast.dismiss();
                    if (stripeRes.url) {
                        window.location.href = stripeRes.url;
                    }
                } catch (stripeError) {
                    toast.dismiss();
                    toast.error("Thanh toán tạm thời không khả dụng. Vui lòng thử lại sau.");
                }
            } else {
                toast.error(getFriendlyErrorMessage((error as Error).message));
            }
        }
    }, [token]);

    const closeSepayModal = useCallback(() => {
        setIsSepayModalOpen(false);
        setSepayCheckout(null);
        setSepayPackageName("");
        // Reload profile to get updated subscription status
        loadProfile();
    }, [loadProfile]);

    const handleRedeem = useCallback(async (code: string): Promise<boolean> => {
        if (!code.trim()) return false;
        try {
            const res = await api<{ message: string }>("/subscription/redeem", {
                method: "POST",
                token,
                body: { code }
            });
            toast.success(res.message);
            loadProfile();
            return true;
        } catch (error) {
            toast.error(getFriendlyErrorMessage((error as Error).message));
            return false;
        }
    }, [token, loadProfile]);

    const handleExportReport = useCallback(() => {
        if (payments.length === 0) {
            toast.error("Không có dữ liệu để xuất báo cáo");
            return;
        }

        try {
            const headers = ["Ngày", "Số tiền", "Tiền tệ", "Trạng thái", "Mã giao dịch"];
            const rows = payments.map(p => [
                new Date(p.createdAt).toLocaleDateString("vi-VN"),
                p.amount.toLocaleString("vi-VN"),
                p.currency.toUpperCase(),
                p.status === "SUCCEEDED" ? "Thành công" : p.status,
                p.stripePaymentId || "-"
            ]);

            const csvContent = [
                headers.join(","),
                ...rows.map(row => row.join(","))
            ].join("\n");

            const BOM = "\uFEFF";
            const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = url;
            link.download = `subscription-report-${new Date().toISOString().split("T")[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast.success("Đã xuất báo cáo thành công");
        } catch (error) {
            console.error('[Subscription] Export report failed:', error);
            toast.error("Lỗi khi xuất báo cáo");
        }
    }, [payments]);

    const handleDownloadInvoice = useCallback((payment: Payment) => {
        try {
            const invoiceContent = `
HÓA ĐƠN THANH TOÁN
==========================================
Mã giao dịch: #${payment.id.slice(0, 8).toUpperCase()}
Mã Stripe: ${payment.stripePaymentId || "N/A"}
Ngày: ${new Date(payment.createdAt).toLocaleDateString("vi-VN")}
Số tiền: ${payment.amount.toLocaleString("vi-VN")} ${payment.currency.toUpperCase()}
Trạng thái: ${payment.status === "SUCCEEDED" || payment.status === "COMPLETED" || payment.status === "PAID" ? "Thành công" : payment.status}
==========================================
Cảm ơn bạn đã sử dụng dịch vụ!
            `.trim();

            const blob = new Blob([invoiceContent], { type: "text/plain;charset=utf-8;" });
            const url = URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = url;
            link.download = `invoice-${payment.id.slice(0, 8)}-${new Date(payment.createdAt).toISOString().split("T")[0]}.txt`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast.success("Đã tải hóa đơn");
        } catch (error) {
            console.error('[Subscription] Download invoice failed:', error);
            toast.error("Lỗi khi tải hóa đơn");
        }
    }, []);

    return {
        handlePortal,
        handleCheckout,
        handleRedeem,
        handleExportReport,
        handleDownloadInvoice,
        // SePay checkout state
        sepayCheckout,
        sepayPackageName,
        isSepayModalOpen,
        closeSepayModal
    };
}
