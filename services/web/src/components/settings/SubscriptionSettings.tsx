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
    }, [token]);

    const loadPayments = async () => {
        setLoadingPayments(true);
        try {
            const data = await api<{ payments: Payment[] }>("/billing/payments", { token });
            setPayments(data?.payments || []);
        } catch (err) {
            console.error("Failed to load payments", err);
            // Silent fail for now, or minimal toast
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

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Gói & Thanh toán</h2>
                    <p className="text-slate-500 dark:text-gray-400 font-body">Quản lý đăng ký, số dư và hóa đơn của bạn.</p>
                </div>
                <div className="flex gap-3">
                    <button className="glass-panel px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-100 dark:hover:bg-white/5 transition-colors flex items-center gap-2 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-300">
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
                    <GlassCard className="p-6 rounded-xl flex flex-col justify-between h-full gap-4 relative overflow-hidden group bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="material-symbols-outlined text-6xl text-slate-900 dark:text-white">diamond</span>
                        </div>
                        <div>
                            <p className="text-slate-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider">Gói hiện tại</p>
                            <p className="text-3xl font-bold mt-1 text-slate-900 dark:text-white">{profile?.tier === 'FREE' ? 'MIỄN PHÍ' : profile?.tier || 'MIỄN PHÍ'}</p>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                            <div className="bg-primary h-full rounded-full w-[40%]"></div>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-gray-500">
                            {profile?.subscriptionEndsAt
                                ? `Gia hạn vào ${new Date(profile.subscriptionEndsAt).toLocaleDateString("vi-VN")}`
                                : 'Miễn phí mãi mãi'}
                        </p>
                    </GlassCard>

                    <GlassCard className="p-6 rounded-xl flex flex-col justify-between h-full gap-4 relative overflow-hidden group bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="material-symbols-outlined text-6xl text-slate-900 dark:text-white">account_balance_wallet</span>
                        </div>
                        <div>
                            <p className="text-slate-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider">Số dư</p>
                            <p className="text-3xl font-bold mt-1 text-green-600 dark:text-green-400">{profile?.credits || 0}</p>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-gray-400 font-medium flex items-center gap-1">
                            Số dư khả dụng
                        </p>
                    </GlassCard>

                    <GlassCard className="p-6 rounded-xl flex flex-col justify-between h-full gap-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-slate-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider">Tên miền riêng</p>
                                <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">0 <span className="text-lg text-slate-400 dark:text-gray-500 font-normal">/ 10</span></p>
                            </div>
                            <span className="material-symbols-outlined text-slate-400 dark:text-gray-500">dns</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full w-[0%]"></div>
                        </div>
                    </GlassCard>

                    <GlassCard className="p-6 rounded-xl flex flex-col justify-between h-full gap-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-slate-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider">Băng thông</p>
                                <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">5% <span className="text-lg text-slate-400 dark:text-gray-500 font-normal">Đã dùng</span></p>
                            </div>
                            <span className="material-symbols-outlined text-slate-400 dark:text-gray-500">network_check</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                            <div className="bg-orange-500 h-full rounded-full w-[5%]"></div>
                        </div>
                    </GlassCard>
                </div>

                {/* Payment Method Card */}
                <GlassCard className="p-6 rounded-xl flex flex-col gap-6 relative overflow-hidden bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
                    <div className="flex items-center justify-between relative z-10">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Phương thức thanh toán</h3>
                        <button onClick={handlePortal} className="text-primary hover:text-blue-600 dark:hover:text-white text-sm font-medium transition-colors">Quản lý</button>
                    </div>
                    <div className="flex flex-col gap-4 relative z-10 flex-1 justify-center">
                        <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5">
                            <div aria-label="Mastercard logo" className="w-12 h-8 bg-white/90 rounded flex items-center justify-center border border-slate-100">
                                <div className="flex -space-x-2">
                                    <div className="w-4 h-4 rounded-full bg-red-500/80"></div>
                                    <div className="w-4 h-4 rounded-full bg-yellow-500/80"></div>
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-bold tracking-widest text-slate-700 dark:text-white">•••• 8834</span>
                                <span className="text-xs text-slate-500 dark:text-gray-400">Hết hạn 12/25</span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 text-sm text-slate-500 dark:text-gray-400 mt-2">
                            <div className="flex justify-between">
                                <span>Email thanh toán</span>
                                <span>--</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Trạng thái</span>
                                <span className="text-green-600 dark:text-green-400">Đang hoạt động</span>
                            </div>
                        </div>
                    </div>
                </GlassCard>
            </div>

            {/* Pricing Section */}
            <div className="flex flex-col gap-8 mt-4">
                <div className="flex flex-col items-center gap-4">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Nâng cấp gói của bạn</h2>
                    {/* Toggle Switch */}
                    <div className="p-1 rounded-xl inline-flex relative bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10">
                        <button
                            onClick={() => setBillingCycle('monthly')}
                            className={`relative z-10 px-6 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${billingCycle === 'monthly' ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white'}`}
                        >
                            Hàng tháng
                        </button>
                        <button
                            onClick={() => setBillingCycle('yearly')}
                            className={`relative z-10 px-6 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${billingCycle === 'yearly' ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white'}`}
                        >
                            <span>Hàng năm <span className="text-[10px] ml-1 bg-slate-200 dark:bg-white/20 px-1.5 py-0.5 rounded text-slate-800 dark:text-white">Tiết kiệm 20%</span></span>
                        </button>
                    </div>
                </div>

                {/* Pricing Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    {/* Free Tier */}
                    <GlassCard className={`p-6 flex flex-col gap-6 hover:-translate-y-1 transition-transform duration-300 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none ${isPlanActive('FREE') ? 'border-primary shadow-[0_0_30px_rgba(25,25,230,0.15)] ring-2 ring-primary/20' : ''}`}>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Miễn phí</h3>
                            <p className="text-slate-500 dark:text-gray-400 text-sm mt-1">Cơ bản ẩn danh</p>
                            <div className="mt-4 flex items-baseline gap-1">
                                <span className="text-4xl font-bold text-slate-900 dark:text-white">$0</span>
                                <span className="text-slate-500 dark:text-gray-400 text-sm">/mo</span>
                            </div>
                        </div>
                        <Button variant={isPlanActive('FREE') ? "secondary" : "ghost"} disabled={isPlanActive('FREE')} className="w-full">
                            {isPlanActive('FREE') ? "Gói hiện tại" : "Hạ cấp"}
                        </Button>
                        <ul className="flex flex-col gap-3 text-sm text-slate-600 dark:text-gray-300">
                            <li className="flex gap-3"><span className="material-symbols-outlined text-green-500 dark:text-green-400 text-[20px]">check</span> Anonymous ID</li>
                            <li className="flex gap-3"><span className="material-symbols-outlined text-green-500 dark:text-green-400 text-[20px]">check</span> 1GB Storage</li>
                            <li className="flex gap-3 text-slate-400 dark:text-gray-600"><span className="material-symbols-outlined text-[20px]">close</span> No Custom Domains</li>
                        </ul>
                    </GlassCard>

                    {/* Starter Tier */}
                    <GlassCard className={`p-6 flex flex-col gap-6 hover:-translate-y-1 transition-transform duration-300 relative dark:!bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none ${isPlanActive('STARTER') ? 'border-primary shadow-[0_0_30px_rgba(25,25,230,0.15)] ring-2 ring-primary/20' : ''}`}>
                        {isPlanActive('STARTER') && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg shadow-primary/40">
                                Gói hiện tại
                            </div>
                        )}
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Khởi đầu</h3>
                            <p className="text-slate-500 dark:text-gray-400 text-sm mt-1">Cho cá nhân</p>
                            <div className="mt-4 flex items-baseline gap-1">
                                <span className="text-4xl font-bold text-slate-900 dark:text-white">${billingCycle === 'monthly' ? '15' : '12'}</span>
                                <span className="text-slate-500 dark:text-gray-400 text-sm">/mo</span>
                            </div>
                        </div>
                        <Button onClick={handlePortal} variant={isPlanActive('STARTER') ? "secondary" : "primary"} className="w-full">
                            {isPlanActive('STARTER') ? "Quản lý đăng ký" : "Nâng cấp"}
                        </Button>
                        <ul className="flex flex-col gap-3 text-sm text-slate-600 dark:text-gray-300">
                            <li className="flex gap-3"><span className="material-symbols-outlined text-green-500 dark:text-green-400 text-[20px]">check</span> 5 Custom Domains</li>
                            <li className="flex gap-3"><span className="material-symbols-outlined text-green-500 dark:text-green-400 text-[20px]">check</span> 10GB Storage</li>
                            <li className="flex gap-3"><span className="material-symbols-outlined text-green-500 dark:text-green-400 text-[20px]">check</span> Priority Support</li>
                        </ul>
                    </GlassCard>

                    {/* Pro Tier (Best Value) */}
                    <GlassCard className={`p-6 flex flex-col gap-6 hover:-translate-y-1 transition-transform duration-300 relative bg-white dark:bg-white/5 shadow-[0_0_40px_-10px_rgba(25,25,230,0.15)] border ${isPlanActive('PRO') ? 'border-primary ring-2 ring-primary/20' : 'border-primary/50 dark:border-primary/30'}`}>
                        <div className="absolute top-0 right-0 p-3">
                            <span className="flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                            </span>
                        </div>
                        <div>
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Pro</h3>
                                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded">PHỔ BIẾN</span>
                            </div>
                            <p className="text-slate-500 dark:text-gray-400 text-sm mt-1">Ẩn danh & riêng tư tối đa</p>
                            <div className="mt-4 flex items-baseline gap-1">
                                <span className="text-4xl font-bold text-slate-900 dark:text-white">${billingCycle === 'monthly' ? '35' : '28'}</span>
                                <span className="text-slate-500 dark:text-gray-400 text-sm">/mo</span>
                            </div>
                        </div>
                        <Button onClick={handlePortal} variant="primary" className="w-full shadow-lg shadow-primary/25">
                            {isPlanActive('PRO') ? "Gói hiện tại" : "Nâng cấp lên Pro"}
                        </Button>
                        <ul className="flex flex-col gap-3 text-sm text-slate-600 dark:text-gray-300">
                            <li className="flex gap-3"><span className="material-symbols-outlined text-green-500 dark:text-green-400 text-[20px]">check</span> Unlimited Domains</li>
                            <li className="flex gap-3"><span className="material-symbols-outlined text-green-500 dark:text-green-400 text-[20px]">check</span> 100GB Storage</li>
                            <li className="flex gap-3"><span className="material-symbols-outlined text-green-500 dark:text-green-400 text-[20px]">check</span> API Access</li>
                            <li className="flex gap-3"><span className="material-symbols-outlined text-green-500 dark:text-green-400 text-[20px]">check</span> 24/7 Support</li>
                        </ul>
                    </GlassCard>

                    {/* Enterprise Tier */}
                    <GlassCard className="p-6 flex flex-col gap-6 hover:-translate-y-1 transition-transform duration-300 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Doanh nghiệp</h3>
                            <p className="text-slate-500 dark:text-gray-400 text-sm mt-1">Truy cập API & lưu lượng lớn</p>
                            <div className="mt-4 flex items-baseline gap-1">
                                <span className="text-4xl font-bold text-slate-900 dark:text-white">Liên hệ</span>
                            </div>
                        </div>
                        <Button variant="ghost" className="w-full">
                            Liên hệ bán hàng
                        </Button>
                        <ul className="flex flex-col gap-3 text-sm text-slate-600 dark:text-gray-300">
                            <li className="flex gap-3"><span className="material-symbols-outlined text-green-500 dark:text-green-400 text-[20px]">check</span> Dedicated Instance</li>
                            <li className="flex gap-3"><span className="material-symbols-outlined text-green-500 dark:text-green-400 text-[20px]">check</span> Unlimited Storage</li>
                            <li className="flex gap-3"><span className="material-symbols-outlined text-green-500 dark:text-green-400 text-[20px]">check</span> Custom SLA</li>
                        </ul>
                    </GlassCard>
                </div>
            </div>

            {/* Billing History Table */}
            <div className="flex flex-col gap-4 mt-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Lịch sử thanh toán</h2>
                <GlassCard className="rounded-xl overflow-hidden overflow-x-auto p-0 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-gray-400 uppercase text-xs font-semibold tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Mã hóa đơn</th>
                                <th className="px-6 py-4">Ngày</th>
                                <th className="px-6 py-4">Số tiền</th>
                                <th className="px-6 py-4">Trạng thái</th>
                                <th className="px-6 py-4 text-right">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-white/5 text-slate-600 dark:text-gray-300">
                            {loadingPayments ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500 dark:text-gray-500 italic">Đang tải lịch sử...</td>
                                </tr>
                            ) : payments.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500 dark:text-gray-500">Chưa có giao dịch thanh toán nào.</td>
                                </tr>
                            ) : (
                                payments.map(payment => (
                                    <tr key={payment.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">#{payment.id.slice(0, 8).toUpperCase()}</td>
                                        <td className="px-6 py-4">{new Date(payment.createdAt).toLocaleDateString("vi-VN")}</td>
                                        <td className="px-6 py-4">{payment.amount} {payment.currency}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${payment.status === 'COMPLETED' || payment.status === 'PAID'
                                                ? 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-500/20'
                                                : 'bg-slate-100 dark:bg-gray-500/10 text-slate-500 dark:text-gray-400 border-slate-200 dark:border-gray-500/20'
                                                }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${payment.status === 'COMPLETED' || payment.status === 'PAID' ? 'bg-green-500' : 'bg-gray-400'
                                                    }`}></span>
                                                {payment.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button aria-label="Download invoice" className="text-slate-400 hover:text-slate-900 dark:text-gray-500 dark:hover:text-white transition-colors group-hover:scale-110">
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
