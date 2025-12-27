
import { useState, type FormEvent } from "react";
import { api, API_BASE } from "../../utils/api";
import { getFriendlyErrorMessage } from "../../utils/errorMapping";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { GlassCard, SectionHeader, PremiumInput, PremiumButton } from "../../components/admin/AdminUIComponents";
import { UserSelect } from "../../components/admin/UserSelect";

export function AdminNotificationPage() {
    const { token } = useAuth();
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [type, setType] = useState("INFO");
    const [targetMode, setTargetMode] = useState<"specific" | "all">("specific");
    const [targetUserId, setTargetUserId] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [busy, setBusy] = useState(false);

    const submit = async (e: FormEvent) => {
        e.preventDefault();

        if (targetMode === "specific" && !targetUserId) {
            toast.error("Vui lòng nhập ID người dùng");
            return;
        }

        if (!title.trim() || !message.trim()) {
            toast.error("Vui lòng nhập tiêu đề và nội dung");
            return;
        }

        setBusy(true);
        const toastId = toast.loading("Đang gửi thông báo...");

        try {
            const payload: any = {
                title,
                message,
                type,
                imageUrl
            };

            if (targetMode === "specific") {
                payload.targetUserId = targetUserId;
            } else {
                payload.sendToAll = true;
            }

            const res = await api<{ success: boolean; count?: number }>("/notifications/admin/send", {
                method: "POST",
                token,
                body: payload
            });

            toast.success(`Gửi thành công cho ${res.count || 1} người dùng`, { id: toastId });

            // Reset form
            setTitle("");
            setMessage("");
            setType("INFO");
            setTargetUserId("");
            setImageUrl("");
        } catch (error) {
            toast.error(getFriendlyErrorMessage((error as Error).message), { id: toastId });
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <SectionHeader
                title="Gửi Thông Báo"
                subtitle="Gửi thông báo hệ thống đến người dùng qua Web và Telegram"
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                    <GlassCard className="p-6">
                        <form onSubmit={submit} className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Loại thông báo</label>
                                    <div className="relative">
                                        <select
                                            value={type}
                                            onChange={(e) => setType(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all appearance-none text-sm"
                                        >
                                            <option value="INFO">Thông tin (Info)</option>
                                            <option value="WARNING">Cảnh báo (Warning)</option>
                                            <option value="SUCCESS">Thành công (Success)</option>
                                            <option value="ERROR">Lỗi (Error)</option>
                                            <option value="PROMOTION">Khuyến mãi (Promotion)</option>
                                        </select>
                                        <div className="absolute left-3 top-2.5 text-slate-400">
                                            {type === "INFO" && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                                            {type === "WARNING" && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
                                            {type === "SUCCESS" && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                                            {type === "ERROR" && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                                            {type === "PROMOTION" && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>}
                                        </div>
                                        <div className="absolute right-3 top-3 pointer-events-none text-slate-400">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Đối tượng nhận</label>
                                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                                        <button
                                            type="button"
                                            onClick={() => setTargetMode("specific")}
                                            className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${targetMode === "specific"
                                                ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-sm"
                                                : "text-slate-500 hover:text-slate-700"
                                                }`}
                                        >
                                            Người dùng cụ thể
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setTargetMode("all")}
                                            className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${targetMode === "all"
                                                ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-sm"
                                                : "text-slate-500 hover:text-slate-700"
                                                }`}
                                        >
                                            Tất cả mọi người
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {targetMode === "specific" && (
                                <div className="animate-fade-in-up">
                                    <UserSelect
                                        label="Người nhận"
                                        value={targetUserId}
                                        onChange={setTargetUserId}
                                        placeholder="Tìm kiếm người dùng qua email..."
                                        token={token}
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Hình ảnh (Upload hoặc URL)</label>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <input
                                            type="url"
                                            value={imageUrl}
                                            onChange={(e) => setImageUrl(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
                                            placeholder="https://example.com/image.jpg"
                                        />
                                    </div>
                                    <label className="cursor-pointer bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-600 dark:text-gray-300 px-4 py-2.5 rounded-xl border border-transparent transition-all flex items-center gap-2">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                        <span className="text-sm font-medium">Tải lên</span>
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;

                                                const formData = new FormData();
                                                formData.append("file", file);

                                                const toastId = toast.loading("Đang tải ảnh lên...");
                                                try {
                                                    // Assuming we have a way to make multipart request via api util or fetch
                                                    // api util likely uses JSON. We might need standard fetch here or update api util.
                                                    // Utilizing explicit fetch for multipart:
                                                    const res = await fetch(`${API_BASE}/uploads/upload`, {
                                                        method: "POST",
                                                        headers: {
                                                            "Authorization": `Bearer ${token}`
                                                        },
                                                        body: formData
                                                    });

                                                    if (!res.ok) throw new Error("Upload failed");
                                                    const data = await res.json();
                                                    setImageUrl(data.url);
                                                    toast.success("Tải ảnh thành công", { id: toastId });
                                                } catch (err) {
                                                    console.error(err);
                                                    toast.error("Tải ảnh thất bại", { id: toastId });
                                                }
                                            }}
                                        />
                                    </label>
                                </div>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    Hình ảnh sẽ được hiển thị trong tin nhắn Telegram.
                                </p>
                            </div>

                            <PremiumInput
                                label="Tiêu đề"
                                value={title}
                                onChange={setTitle}
                                placeholder="Nhập tiêu đề thông báo..."
                                required
                            />

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nội dung chi tiết</label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Nhập nội dung thông báo..."
                                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm h-32 resize-none"
                                    required
                                />
                            </div>

                            <div className="pt-2 flex justify-end">
                                <PremiumButton
                                    type="submit"
                                    isLoading={busy}
                                    className="px-8"
                                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>}
                                >
                                    Gửi thông báo
                                </PremiumButton>
                            </div>
                        </form>
                    </GlassCard>
                </div>

                <div className="md:col-span-1 space-y-6">
                    <GlassCard className="p-6">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Hướng dẫn
                        </h3>
                        <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
                            <p className="leading-relaxed">
                                Hệ thống cho phép gửi thông báo realtime đến người dùng. Thông báo sẽ xuất hiện ngay lập tức trên giao diện web.
                            </p>
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800/50">
                                <div className="font-medium text-blue-700 dark:text-blue-400 mb-1">Telegram Integration</div>
                                <p className="text-xs text-blue-600 dark:text-blue-300/80">
                                    Nếu người dùng đã kết nối Telegram, bot cũng sẽ gửi tin nhắn trực tiếp cho họ.
                                </p>
                            </div>
                            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-800/50">
                                <div className="font-medium text-amber-700 dark:text-amber-400 mb-1">Lưu ý hiệu năng</div>
                                <p className="text-xs text-amber-600 dark:text-amber-300/80">
                                    Gửi cho "Tất cả mọi người" có thể mất vài giây để xử lý nếu số lượng người dùng lớn. Hệ thống sẽ xử lý trong nền.
                                </p>
                            </div>
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div >
    );
}
