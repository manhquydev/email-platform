import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { GlassCard } from "../ui/GlassCard";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import toast from "react-hot-toast";
import { api } from "../../utils/api";

interface UserProfile {
    id: string;
    email: string;
    name?: string; // Added name
    role: string;
    createdAt: string;
    tier: string;
    // Add other fields as needed from the main profile type
}

export function GeneralSettings({ profile, loadProfile }: { profile: UserProfile | null; loadProfile: () => void; loading?: boolean }) {
    const { token, logout } = useAuth();
    const [displayName, setDisplayName] = useState(profile?.name || profile?.email?.split('@')[0] || "");
    const [isSaving, setIsSaving] = useState(false);

    // Sync state when profile loads
    useEffect(() => {
        if (profile) {
            setDisplayName(profile.name || profile.email.split('@')[0]);
        }
    }, [profile]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await api("/auth/profile", {
                method: "PATCH",
                token,
                body: { name: displayName }
            });
            toast.success("Đã lưu cài đặt thành công");
            loadProfile(); // Reload to update global state
        } catch (err) {
            console.error(err);
            toast.error("Không thể lưu cài đặt");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!window.confirm("BẠN CÓ CHẮC CHẮN KHÔNG? Hành động này sẽ xóa vĩnh viễn tài khoản và tất cả dữ liệu của bạn.")) return;

        try {
            await api("/auth/me", { method: "DELETE", token });
            toast.success("Đã xóa tài khoản");
            logout();
        } catch (err) {
            console.error(err);
            toast.error("Không thể xóa tài khoản");
        }
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Cài đặt chung</h2>
                <p className="text-slate-500 dark:text-gray-400 font-body">Quản lý hồ sơ, tùy chọn và quyền riêng tư tài khoản của bạn.</p>
            </div>

            {/* Profile Section */}
            <section className="glass-panel rounded-xl p-6 dark:bg-slate-800 relative overflow-hidden group border border-slate-200 dark:border-white/15 shadow-sm dark:shadow-none">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                    <div className="flex items-center gap-5">
                        <div className="relative">
                            <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-gray-800 border-2 border-slate-200 dark:border-primary/50 overflow-hidden shadow-sm dark:shadow-[0_0_20px_rgba(37,37,244,0.3)] flex items-center justify-center">
                                {/* Use a placeholder or the profile initial */}
                                <span className="text-3xl font-bold text-slate-700 dark:text-white">
                                    {displayName?.charAt(0).toUpperCase() || profile?.email?.charAt(0).toUpperCase() || "U"}
                                </span>
                            </div>
                            <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 border-2 border-white dark:border-[#0a0a0f] rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white relative z-10">{displayName || profile?.email?.split('@')[0] || "Người dùng ẩn danh"}</h3>
                            <p className="text-slate-500 dark:text-gray-400 text-sm font-body relative z-10">ID: {profile?.id || "eph_..."} • <span className="text-green-600 dark:text-green-400">Bộ nhớ đã mã hóa đang hoạt động</span></p>
                        </div>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Form Fields */}
                <div className="lg:col-span-2 flex flex-col gap-8">
                    {/* Identity Form */}
                    <GlassCard className="p-6 dark:!bg-white/[0.08] border border-slate-200 dark:border-white/15 shadow-sm dark:shadow-none">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">badge</span>
                            Danh tính
                        </h3>
                        <div className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <Input
                                    label="Tên hiển thị"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    placeholder="Nhập tên hiển thị"
                                />
                                <div className="flex flex-col gap-2">
                                    <span className="text-sm font-medium text-slate-700 dark:text-gray-300">Bí danh mặc định</span>
                                    <div className="relative">
                                        <input
                                            className="w-full bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/20 rounded-lg px-4 py-2.5 text-slate-600 dark:text-gray-300 focus:outline-none font-body cursor-not-allowed"
                                            readOnly
                                            type="text"
                                            value={profile?.email || ""}
                                        />
                                        <button
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-gray-500 dark:hover:text-white transition-colors"
                                            onClick={() => {
                                                navigator.clipboard.writeText(profile?.email || "");
                                                toast.success("Đã sao chép vào bộ nhớ tạm");
                                            }}
                                        >
                                            <span className="material-symbols-outlined text-[18px]">content_copy</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Forwarding Section - Temporarily Disabled or Pending Implementation */}
                            {/* 
                            <div className="flex flex-col gap-2 opacity-50 pointer-events-none">
                                <span className="text-sm font-medium text-slate-700 dark:text-gray-300">Email chuyển tiếp (Đã mã hóa) - Sắp ra mắt</span>
                                <input
                                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/15 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all font-body"
                                    placeholder="Tính năng đang được phát triển..."
                                    type="email"
                                    readOnly
                                />
                            </div>
                            */}
                        </div>

                        <div className="mt-6 flex justify-end">
                            <Button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex items-center gap-2 shadow-[0_0_15px_rgba(37,37,244,0.4)]"
                            >
                                <span className="material-symbols-outlined text-[18px]">save</span>
                                {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
                            </Button>
                        </div>
                    </GlassCard>
                </div>

                {/* Right Column: Danger Zone */}
                <div className="flex flex-col gap-8">
                    <section className="border border-red-200 dark:border-red-900/30 rounded-xl p-6 bg-red-50 dark:bg-red-900/5">
                        <h3 className="text-sm font-bold text-red-600 dark:text-red-400 mb-3 uppercase tracking-wider">Vùng nguy hiểm</h3>
                        <p className="text-xs text-red-500 dark:text-gray-400 mb-4">Khi bạn xóa tài khoản, hành động này không thể hoàn tác. Vui lòng chắc chắn.</p>
                        <button
                            onClick={handleDeleteAccount}
                            className="w-full py-2 rounded-lg border border-red-300 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-300 text-sm font-medium transition-all"
                        >
                            Xóa tài khoản
                        </button>
                    </section>
                </div>
            </div>
        </div>
    );
}
