import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { GlassCard } from "../ui/GlassCard";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import toast from "react-hot-toast";

interface UserProfile {
    id: string;
    email: string;
    role: string;
    createdAt: string;
    tier: string;
    // Add other fields as needed from the main profile type
}

export function GeneralSettings({ profile }: { profile: UserProfile | null; loading?: boolean }) {
    const { user } = useAuth();
    const [displayName, setDisplayName] = useState(user?.email?.split('@')[0] || "");
    const [forwardingEmail, setForwardingEmail] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        toast.success("Đã lưu cài đặt thành công");
        setIsSaving(false);
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Cài đặt chung</h2>
                <p className="text-slate-500 dark:text-gray-400 font-body">Quản lý hồ sơ, tùy chọn và quyền riêng tư tài khoản của bạn.</p>
            </div>

            {/* Profile Section */}
            <section className="glass-panel rounded-xl p-6 bg-white dark:bg-white/5 relative overflow-hidden group border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                    <div className="flex items-center gap-5">
                        <div className="relative">
                            <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-gray-800 border-2 border-slate-200 dark:border-primary/50 overflow-hidden shadow-sm dark:shadow-[0_0_20px_rgba(37,37,244,0.3)] flex items-center justify-center">
                                {/* Use a placeholder or the profile initial */}
                                <span className="text-3xl font-bold text-slate-700 dark:text-white">
                                    {profile?.email?.charAt(0).toUpperCase() || "U"}
                                </span>
                            </div>
                            <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 border-2 border-white dark:border-[#0a0a0f] rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white relative z-10">{profile?.email?.split('@')[0] || "Người dùng ẩn danh"}</h3>
                            <p className="text-slate-500 dark:text-gray-400 text-sm font-body relative z-10">ID: {profile?.id || "eph_..."} • <span className="text-green-600 dark:text-green-400">Bộ nhớ đã mã hóa đang hoạt động</span></p>
                        </div>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Form Fields */}
                <div className="lg:col-span-2 flex flex-col gap-8">
                    {/* Identity Form */}
                    <GlassCard className="p-6 dark:!bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none">
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
                                            className="w-full bg-slate-100 dark:bg-surface-dark/50 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-slate-500 dark:text-gray-400 focus:outline-none font-body cursor-not-allowed"
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

                            <div className="flex flex-col gap-2">
                                <span className="text-sm font-medium text-slate-700 dark:text-gray-300">Email chuyển tiếp (Đã mã hóa)</span>
                                <input
                                    className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all font-body"
                                    placeholder="Nhập email thực để chuyển tiếp..."
                                    type="email"
                                    value={forwardingEmail}
                                    onChange={(e) => setForwardingEmail(e.target.value)}
                                />
                                <p className="text-xs text-slate-500 dark:text-gray-500">Chúng tôi không lưu email này ở dạng văn bản thuần túy. Nó sẽ được băm ngay lập tức.</p>
                            </div>
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
                        <button className="w-full py-2 rounded-lg border border-red-300 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-300 text-sm font-medium transition-all">
                            Xóa tài khoản
                        </button>
                    </section>
                </div>
            </div>
        </div>
    );
}
