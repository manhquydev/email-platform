import { GlassCard } from "../ui/GlassCard";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { useState, useEffect } from "react";
import { api } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import { getFriendlyErrorMessage } from "../../utils/errorMapping";
import type { Payment } from "../../types";

interface UserProfile {
    tier: string;
    credits: number;
    subscriptionEndsAt?: string | null;
    usage?: { domains: number; inboxes: number; storage: number };
    limits?: { domains: number; inboxes: number; storageGB: number; dailyEmails: number };
}

interface SubscriptionSettingsProps {
    profile: UserProfile | null;
    loadProfile: () => void;
}

export function SubscriptionSettings({ profile, loadProfile }: SubscriptionSettingsProps) {
    const { token } = useAuth();
    const [redeemCode, setRedeemCode] = useState("");
    const [redeemBusy, setRedeemBusy] = useState(false);
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

    // Payment History State
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loadingPayments, setLoadingPayments] = useState(false);

    useEffect(() => {
        if (token) {
            loadPayments();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    const loadPayments = async () => {
        setLoadingPayments(true);
        try {
            const data = await api<{ payments: Payment[] }>("/billing/payments", { token });
            setPayments(data?.payments || []);
        } catch {
            // Silent fail for payments list
        } finally {
            setLoadingPayments(false);
        }
    };

    const handlePortal = async () => {
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
    };

    const handleRedeem = async () => {
        if (!redeemCode.trim()) return;
        setRedeemBusy(true);
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const res = await api<{ message: string; user: any }>("/subscription/redeem", {
                method: "POST",
                token,
                body: { code: redeemCode }
            });
            toast.success(res.message);
            setRedeemCode("");
            loadProfile();
        } catch (error) {
            toast.error(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setRedeemBusy(false);
        }
    };

    const isPlanActive = (planName: string) => {
        return profile?.tier === planName;
    };

    // Calculate usage percentages
    const domainUsage = profile?.usage?.domains || 0;
    const domainLimit = profile?.limits?.domains || 1; // Avoid divide by zero, default to 1 (Free)
    const domainLimitDisplay = domainLimit === -1 ? "Vô hạn" : domainLimit;
    const domainPercent = domainLimit === -1 ? 0 : Math.min(100, (domainUsage / domainLimit) * 100);

    const storageUsage = profile?.usage?.storage || 0;
    const storageLimitGB = profile?.limits?.storageGB || 0.1;
    const storageLimitBytes = storageLimitGB * 1024 * 1024 * 1024;
    const storagePercent = storageLimitGB === -1 ? 0 : Math.min(100, (storageUsage / storageLimitBytes) * 100);

    // Helper to format bytes
    const formatBytes = (bytes: number) => {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    // Export subscription report as CSV
    const handleExportReport = () => {
        if (payments.length === 0) {
            toast.error("Không có dữ liệu để xuất báo cáo");
            return;
        }

        try {
            // Create CSV content
            const headers = ["Ngày", "Số tiền", "Tiền tệ", "Trạng thái", "Mã giao dịch"];
            const rows = payments.map(p => [
                new Date(p.createdAt).toLocaleDateString("vi-VN"),
                (p.amount / 100).toLocaleString("vi-VN"), // Convert cents to actual amount
                p.currency.toUpperCase(),
                p.status === "succeeded" ? "Thành công" : p.status,
                p.stripePaymentId || "-"
            ]);

            const csvContent = [
                headers.join(","),
                ...rows.map(row => row.join(","))
            ].join("\n");

            // Add BOM for Excel UTF-8 compatibility
            const BOM = "\uFEFF";
            const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);

            // Download file
            const link = document.createElement("a");
            link.href = url;
            link.download = `subscription-report-${new Date().toISOString().split("T")[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast.success("Đã xuất báo cáo thành công");
        } catch {
            toast.error("Lỗi khi xuất báo cáo");
        }
    };

    // Download individual invoice
    const handleDownloadInvoice = async (payment: Payment) => {
        try {
            // Generate invoice text content
            const invoiceContent = `
HÓA ĐƠN THANH TOÁN
==========================================
Mã giao dịch: #${payment.id.slice(0, 8).toUpperCase()}
Mã Stripe: ${payment.stripePaymentId || "N/A"}
Ngày: ${new Date(payment.createdAt).toLocaleDateString("vi-VN")}
Số tiền: ${(payment.amount / 100).toLocaleString("vi-VN")} ${payment.currency.toUpperCase()}
Trạng thái: ${payment.status === "succeeded" || payment.status === "COMPLETED" || payment.status === "PAID" ? "Thành công" : payment.status}
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
        } catch {
            toast.error("Lỗi khi tải hóa đơn");
        }
    };



    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-bold text-nebula-text mb-2 tracking-tight">Gói & Thanh toán</h2>
                    <p className="text-nebula-text-muted font-body">Quản lý đăng ký, số dư và hóa đơn của bạn.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleExportReport}
                        className="glass-panel px-4 py-2 rounded-lg text-sm font-medium hover:bg-nebula-elevated transition-colors flex items-center gap-2 border border-nebula-border text-nebula-text-secondary"
                    >
                        <span className="material-symbols-outlined text-[18px]">download</span>
                        Xuất báo cáo
                    </button>
                    {/* Redeem Section Compact */}
                    <div className="flex gap-2">
                        <Input
                            value={redeemCode}
                            onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                            placeholder="MÃ KÍCH HOẠT"
                            className="font-mono uppercase !py-1.5 !text-sm w-32"
                        />
                        <Button
                            onClick={handleRedeem}
                            disabled={redeemBusy || !redeemCode}
                            size="sm"
                        >
                            {redeemBusy ? "..." : "Kích hoạt"}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Dashboard Grid: Stats + Payment Method */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Usage Stats (Spans 2 cols on large screens) */}
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <GlassCard className="p-6 rounded-xl flex flex-col justify-between h-full gap-4 relative overflow-hidden group bg-nebula-surface border border-nebula-border shadow-sm">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="material-symbols-outlined text-6xl text-nebula-text">diamond</span>
                        </div>
                        <div>
                            <p className="text-nebula-text-muted text-sm font-medium uppercase tracking-wider">Gói hiện tại</p>
                            <p className="text-3xl font-bold mt-1 text-nebula-text">{profile?.tier === 'FREE' ? 'MIỄN PHÍ' : profile?.tier || 'MIỄN PHÍ'}</p>
                        </div>
                        <div className="w-full bg-nebula-elevated h-1.5 rounded-full mt-2 overflow-hidden">
                            <div className="bg-nebula-violet h-full rounded-full w-[40%]"></div>
                        </div>
                        <p className="text-xs text-nebula-text-muted">
                            {profile?.subscriptionEndsAt
                                ? `Gia hạn vào ${new Date(profile.subscriptionEndsAt).toLocaleDateString("vi-VN")}`
                                : 'Miễn phí mãi mãi'}
                        </p>
                    </GlassCard>

                    <GlassCard className="p-6 rounded-xl flex flex-col justify-between h-full gap-4 relative overflow-hidden group bg-nebula-surface border border-nebula-border shadow-sm">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="material-symbols-outlined text-6xl text-nebula-text">account_balance_wallet</span>
                        </div>
                        <div>
                            <p className="text-nebula-text-muted text-sm font-medium uppercase tracking-wider">Số dư</p>
                            <p className="text-3xl font-bold mt-1 text-success">{profile?.credits || 0}</p>
                        </div>
                        <p className="text-sm text-nebula-text-muted font-medium flex items-center gap-1">
                            Số dư khả dụng
                        </p>
                    </GlassCard>

                    <GlassCard className="p-6 rounded-xl flex flex-col justify-between h-full gap-2 bg-nebula-surface border border-nebula-border shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-nebula-text-muted text-sm font-medium uppercase tracking-wider">Tên miền riêng</p>
                                <p className="text-2xl font-bold mt-1 text-nebula-text">{domainUsage} <span className="text-lg text-nebula-text-muted font-normal">/ {domainLimitDisplay}</span></p>
                            </div>
                            <span className="material-symbols-outlined text-nebula-text-muted">dns</span>
                        </div>
                        <div className="w-full bg-nebula-elevated h-1.5 rounded-full mt-2 overflow-hidden">
                            <div className="bg-success h-full rounded-full" style={{ width: `${domainPercent}%` }}></div>
                        </div>
                    </GlassCard>

                    <GlassCard className="p-6 rounded-xl flex flex-col justify-between h-full gap-2 bg-nebula-surface border border-nebula-border shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-nebula-text-muted text-sm font-medium uppercase tracking-wider">Dung lượng</p>
                                <p className="text-2xl font-bold mt-1 text-nebula-text">{Math.round((storageUsage / storageLimitBytes) * 100)}% <span className="text-lg text-nebula-text-muted font-normal">({formatBytes(storageUsage)})</span></p>
                            </div>
                            <span className="material-symbols-outlined text-nebula-text-muted">cloud_done</span>
                        </div>
                        <div className="w-full bg-nebula-elevated h-1.5 rounded-full mt-2 overflow-hidden">
                            <div className="bg-warning h-full rounded-full" style={{ width: `${storagePercent}%` }}></div>
                        </div>
                    </GlassCard>
                </div>

                {/* Payment Method Card */}
                <GlassCard className="p-6 rounded-xl flex flex-col gap-6 relative overflow-hidden bg-nebula-surface border border-nebula-border shadow-sm">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
                    <div className="flex items-center justify-between relative z-10">
                        <h3 className="text-lg font-bold text-nebula-text">Phương thức thanh toán</h3>
                        <button onClick={handlePortal} className="text-nebula-violet hover:text-nebula-violet-dark text-sm font-medium transition-colors">Quản lý</button>
                    </div>
                    <div className="flex flex-col gap-4 relative z-10 flex-1 justify-center">
                        <div className="flex items-center gap-4 p-4 rounded-lg bg-nebula-elevated border border-nebula-border">
                            <div aria-label="Mastercard logo" className="w-12 h-8 bg-nebula-surface rounded flex items-center justify-center border border-nebula-border">
                                <div className="flex -space-x-2">
                                    <div className="w-4 h-4 rounded-full bg-danger/80"></div>
                                    <div className="w-4 h-4 rounded-full bg-warning/80"></div>
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-bold tracking-widest text-nebula-text">•••• 8834</span>
                                <span className="text-xs text-nebula-text-muted">Hết hạn 12/25</span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 text-sm text-nebula-text-muted mt-2">
                            <div className="flex justify-between">
                                <span>Email thanh toán</span>
                                <span>--</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Trạng thái</span>
                                <span className="text-success">Đang hoạt động</span>
                            </div>
                        </div>
                    </div>
                </GlassCard>
            </div>

            {/* Pricing Section */}
            <div className="flex flex-col gap-8 mt-4">
                <div className="flex flex-col items-center gap-4">
                    <h2 className="text-2xl font-bold text-nebula-text">Nâng cấp gói của bạn</h2>
                    {/* Toggle Switch */}
                    <div className="p-1 rounded-xl inline-flex relative bg-nebula-elevated border border-nebula-border">
                        <button
                            onClick={() => setBillingCycle('monthly')}
                            className={`relative z-10 px-6 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${billingCycle === 'monthly' ? 'bg-nebula-violet text-white shadow-lg' : 'text-nebula-text-muted hover:text-nebula-text'}`}
                        >
                            Hàng tháng
                        </button>
                        <button
                            onClick={() => setBillingCycle('yearly')}
                            className={`relative z-10 px-6 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${billingCycle === 'yearly' ? 'bg-nebula-violet text-white shadow-lg' : 'text-nebula-text-muted hover:text-nebula-text'}`}
                        >
                            <span>Hàng năm <span className="text-[10px] ml-1 bg-nebula-elevated px-1.5 py-0.5 rounded text-nebula-text">Tiết kiệm 20%</span></span>
                        </button>
                    </div>
                </div>

                {/* Pricing Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    {/* Free Tier */}
                    <GlassCard className={`p-6 flex flex-col gap-6 hover:-translate-y-1 transition-transform duration-300 bg-nebula-surface border border-nebula-border shadow-sm ${isPlanActive('FREE') ? 'border-nebula-violet shadow-[0_0_30px_rgba(139,92,246,0.15)] ring-2 ring-nebula-violet/20' : ''}`}>
                        <div>
                            <h3 className="text-lg font-bold text-nebula-text">Miễn phí</h3>
                            <p className="text-nebula-text-muted text-sm mt-1">Cơ bản ẩn danh</p>
                            <div className="mt-4 flex items-baseline gap-1">
                                <span className="text-4xl font-bold text-nebula-text">$0</span>
                                <span className="text-nebula-text-muted text-sm">/mo</span>
                            </div>
                        </div>
                        <Button variant={isPlanActive('FREE') ? "secondary" : "ghost"} disabled={isPlanActive('FREE')} className="w-full">
                            {isPlanActive('FREE') ? "Gói hiện tại" : "Hạ cấp"}
                        </Button>
                        <ul className="flex flex-col gap-3 text-sm text-nebula-text-secondary">
                            <li className="flex gap-3"><span className="material-symbols-outlined text-success text-[20px]">check</span> Anonymous ID</li>
                            <li className="flex gap-3"><span className="material-symbols-outlined text-success text-[20px]">check</span> 1GB Storage</li>
                            <li className="flex gap-3 text-nebula-text-muted/70"><span className="material-symbols-outlined text-[20px]">close</span> No Custom Domains</li>
                        </ul>
                    </GlassCard>

                    {/* Starter Tier */}
                    <GlassCard className={`p-6 flex flex-col gap-6 hover:-translate-y-1 transition-transform duration-300 relative bg-nebula-surface border border-nebula-border shadow-sm ${isPlanActive('STARTER') ? 'border-nebula-violet shadow-[0_0_30px_rgba(139,92,246,0.15)] ring-2 ring-nebula-violet/20' : ''}`}>
                        {isPlanActive('STARTER') && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-nebula-violet text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg shadow-nebula-violet/40">
                                Gói hiện tại
                            </div>
                        )}
                        <div>
                            <h3 className="text-lg font-bold text-nebula-text">Khởi đầu</h3>
                            <p className="text-nebula-text-muted text-sm mt-1">Cho cá nhân</p>
                            <div className="mt-4 flex items-baseline gap-1">
                                <span className="text-4xl font-bold text-nebula-text">${billingCycle === 'monthly' ? '15' : '12'}</span>
                                <span className="text-nebula-text-muted text-sm">/mo</span>
                            </div>
                        </div>
                        <Button onClick={handlePortal} variant={isPlanActive('STARTER') ? "secondary" : "primary"} className="w-full">
                            {isPlanActive('STARTER') ? "Quản lý đăng ký" : "Nâng cấp"}
                        </Button>
                        <ul className="flex flex-col gap-3 text-sm text-nebula-text-secondary">
                            <li className="flex gap-3"><span className="material-symbols-outlined text-success text-[20px]">check</span> 5 Custom Domains</li>
                            <li className="flex gap-3"><span className="material-symbols-outlined text-success text-[20px]">check</span> 10GB Storage</li>
                            <li className="flex gap-3"><span className="material-symbols-outlined text-success text-[20px]">check</span> Priority Support</li>
                        </ul>
                    </GlassCard>

                    {/* Pro Tier (Best Value) */}
                    <GlassCard className={`p-6 flex flex-col gap-6 hover:-translate-y-1 transition-transform duration-300 relative bg-nebula-surface shadow-[0_0_40px_-10px_rgba(139,92,246,0.15)] border ${isPlanActive('PRO') ? 'border-nebula-violet ring-2 ring-nebula-violet/20' : 'border-nebula-violet/50'}`}>
                        <div className="absolute top-0 right-0 p-3">
                            <span className="flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-nebula-violet opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-nebula-violet"></span>
                            </span>
                        </div>
                        <div>
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-bold text-nebula-text">Pro</h3>
                                <span className="text-xs font-bold text-nebula-violet bg-nebula-violet/10 px-2 py-1 rounded">PHỔ BIẾN</span>
                            </div>
                            <p className="text-nebula-text-muted text-sm mt-1">Ẩn danh & riêng tư tối đa</p>
                            <div className="mt-4 flex items-baseline gap-1">
                                <span className="text-4xl font-bold text-nebula-text">${billingCycle === 'monthly' ? '35' : '28'}</span>
                                <span className="text-nebula-text-muted text-sm">/mo</span>
                            </div>
                        </div>
                        <Button onClick={handlePortal} variant="primary" className="w-full shadow-lg shadow-nebula-violet/25">
                            {isPlanActive('PRO') ? "Gói hiện tại" : "Nâng cấp lên Pro"}
                        </Button>
                        <ul className="flex flex-col gap-3 text-sm text-nebula-text-secondary">
                            <li className="flex gap-3"><span className="material-symbols-outlined text-success text-[20px]">check</span> Unlimited Domains</li>
                            <li className="flex gap-3"><span className="material-symbols-outlined text-success text-[20px]">check</span> 100GB Storage</li>
                            <li className="flex gap-3"><span className="material-symbols-outlined text-success text-[20px]">check</span> API Access</li>
                            <li className="flex gap-3"><span className="material-symbols-outlined text-success text-[20px]">check</span> 24/7 Support</li>
                        </ul>
                    </GlassCard>

                    {/* Enterprise Tier */}
                    <GlassCard className="p-6 flex flex-col gap-6 hover:-translate-y-1 transition-transform duration-300 bg-nebula-surface border border-nebula-border shadow-sm">
                        <div>
                            <h3 className="text-lg font-bold text-nebula-text">Doanh nghiệp</h3>
                            <p className="text-nebula-text-muted text-sm mt-1">Truy cập API & lưu lượng lớn</p>
                            <div className="mt-4 flex items-baseline gap-1">
                                <span className="text-4xl font-bold text-nebula-text">Liên hệ</span>
                            </div>
                        </div>
                        <Button variant="ghost" className="w-full">
                            Liên hệ bán hàng
                        </Button>
                        <ul className="flex flex-col gap-3 text-sm text-nebula-text-secondary">
                            <li className="flex gap-3"><span className="material-symbols-outlined text-success text-[20px]">check</span> Dedicated Instance</li>
                            <li className="flex gap-3"><span className="material-symbols-outlined text-success text-[20px]">check</span> Unlimited Storage</li>
                            <li className="flex gap-3"><span className="material-symbols-outlined text-success text-[20px]">check</span> Custom SLA</li>
                        </ul>
                    </GlassCard>
                </div>
            </div>

            {/* Billing History Table */}
            <div className="flex flex-col gap-4 mt-6">
                <h2 className="text-2xl font-bold text-nebula-text">Lịch sử thanh toán</h2>
                <GlassCard className="rounded-xl overflow-hidden overflow-x-auto p-0 bg-nebula-surface border border-nebula-border shadow-sm">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-nebula-elevated text-nebula-text-muted uppercase text-xs font-semibold tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Mã hóa đơn</th>
                                <th className="px-6 py-4">Ngày</th>
                                <th className="px-6 py-4">Số tiền</th>
                                <th className="px-6 py-4">Trạng thái</th>
                                <th className="px-6 py-4 text-right">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-nebula-border text-nebula-text-secondary">
                            {loadingPayments ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-nebula-text-muted italic">Đang tải lịch sử...</td>
                                </tr>
                            ) : payments.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-nebula-text-muted">Chưa có giao dịch thanh toán nào.</td>
                                </tr>
                            ) : (
                                payments.map(payment => (
                                    <tr key={payment.id} className="hover:bg-nebula-elevated transition-colors group">
                                        <td className="px-6 py-4 font-medium text-nebula-text">#{payment.id.slice(0, 8).toUpperCase()}</td>
                                        <td className="px-6 py-4">{new Date(payment.createdAt).toLocaleDateString("vi-VN")}</td>
                                        <td className="px-6 py-4">{payment.amount} {payment.currency}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${payment.status === 'COMPLETED' || payment.status === 'PAID'
                                                ? 'bg-success/10 text-success border-success/20'
                                                : 'bg-nebula-elevated text-nebula-text-muted border-nebula-border'
                                                }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${payment.status === 'COMPLETED' || payment.status === 'PAID' ? 'bg-success' : 'bg-nebula-text-muted'
                                                    }`}></span>
                                                {payment.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                aria-label="Download invoice"
                                                onClick={() => handleDownloadInvoice(payment)}
                                                className="text-nebula-text-muted hover:text-nebula-text transition-colors group-hover:scale-110"
                                            >
                                                <span className="material-symbols-outlined">download</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </GlassCard>
            </div>
        </div>
    );
}
