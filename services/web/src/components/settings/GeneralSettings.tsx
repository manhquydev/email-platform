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
            logout('manual');
        } catch (err) {
            console.error(err);
            toast.error("Không thể xóa tài khoản");
        }
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold text-nebula-text mb-2 tracking-tight">Cài đặt chung</h2>
                <p className="text-nebula-text-muted font-body">Quản lý hồ sơ, tùy chọn và quyền riêng tư tài khoản của bạn.</p>
            </div>

            {/* Profile Section */}
            <section className="glass-panel rounded-xl p-6 bg-nebula-surface relative overflow-hidden group border border-nebula-border shadow-sm">
                <div className="absolute top-0 right-0 w-64 h-64 bg-nebula-violet/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                    <div className="flex items-center gap-5">
                        <div className="relative">
                            <div className="w-20 h-20 rounded-full bg-nebula-elevated border-2 border-nebula-border overflow-hidden shadow-sm flex items-center justify-center">
                                {/* Use a placeholder or the profile initial */}
                                <span className="text-3xl font-bold text-nebula-text">
                                    {displayName?.charAt(0).toUpperCase() || profile?.email?.charAt(0).toUpperCase() || "U"}
                                </span>
                            </div>
                            <div className="absolute bottom-0 right-0 w-5 h-5 bg-success border-2 border-nebula-surface rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-nebula-text relative z-10">{displayName || profile?.email?.split('@')[0] || "Người dùng ẩn danh"}</h3>
                            <p className="text-nebula-text-muted text-sm font-body relative z-10">ID: {profile?.id || "eph_..."} • <span className="text-success">Bộ nhớ đã mã hóa đang hoạt động</span></p>
                        </div>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Form Fields */}
                <div className="lg:col-span-2 flex flex-col gap-8">
                    {/* Identity Form */}
                    <GlassCard className="p-6 bg-nebula-surface/80 border border-nebula-border shadow-sm">
                        <h3 className="text-lg font-bold text-nebula-text mb-6 flex items-center gap-2">
                            <span className="material-symbols-outlined text-nebula-violet">badge</span>
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
                                    <span className="text-sm font-medium text-nebula-text-secondary">Bí danh mặc định</span>
                                    <div className="relative">
                                        <input
                                            className="w-full bg-nebula-elevated border border-nebula-border rounded-lg px-4 py-2.5 text-nebula-text-secondary focus:outline-none font-body cursor-not-allowed"
                                            readOnly
                                            type="text"
                                            value={profile?.email || ""}
                                        />
                                        <button
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-nebula-text-muted hover:text-nebula-text transition-colors"
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
                    <section className="border border-danger/30 rounded-xl p-6 bg-danger/5">
                        <h3 className="text-sm font-bold text-danger mb-3 uppercase tracking-wider">Vùng nguy hiểm</h3>
                        <p className="text-xs text-nebula-text-muted mb-4">Khi bạn xóa tài khoản, hành động này không thể hoàn tác. Vui lòng chắc chắn.</p>
                        <button
                            onClick={handleDeleteAccount}
                            className="w-full py-2 rounded-lg border border-danger/50 text-danger hover:bg-danger/10 hover:text-danger text-sm font-medium transition-all"
                        >
                            Xóa tài khoản
                        </button>
                    </section>
                </div>
            </div>
        </div>
    );
}
