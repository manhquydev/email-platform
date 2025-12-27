
import { useState, type FormEvent } from "react";
import { api } from "../../utils/api";
import { getFriendlyErrorMessage } from "../../utils/errorMapping";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";

export function AdminNotificationPage() {
    const { token } = useAuth();
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [type, setType] = useState("INFO");
    const [targetMode, setTargetMode] = useState<"specific" | "all">("specific");
    const [targetUserId, setTargetUserId] = useState("");
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
                type
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
        } catch (error) {
            toast.error(getFriendlyErrorMessage((error as Error).message), { id: toastId });
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl">
            <div className="mb-6">
                <h1 className="text-xl font-semibold">Quản lý thông báo</h1>
                <p className="text-sm text-muted mt-1">Gửi thông báo đến người dùng qua Web và Telegram</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Compose Form */}
                <div className="md:col-span-2 bg-surface border border-border rounded-lg p-5">
                    <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                        <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                        Soạn thông báo
                    </h3>

                    <form onSubmit={submit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-muted mb-1.5">Loại thông báo</label>
                                <div className="relative">
                                    <select
                                        value={type}
                                        onChange={(e) => setType(e.target.value)}
                                        className="text-sm input-nebula w-full appearance-none pr-8"
                                    >
                                        <option value="INFO">ℹ️ Thông tin</option>
                                        <option value="WARNING">⚠️ Cảnh báo</option>
                                        <option value="SUCCESS">✅ Thành công</option>
                                        <option value="ERROR">❌ Lỗi</option>
                                        <option value="PROMOTION">🎉 Khuyến mãi</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-muted">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs text-muted mb-1.5">Tiêu đề</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Nhập tiêu đề thông báo..."
                                className="text-sm input-nebula w-full"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs text-muted mb-1.5">Nội dung</label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Nhập nội dung chi tiết..."
                                className="text-sm input-nebula w-full h-32 resize-none py-2"
                                required
                            />
                        </div>

                        <div className="pt-2 border-t border-border">
                            <label className="block text-xs text-muted mb-2">Đối tượng gửi</label>
                            <div className="flex gap-4 mb-3">
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="radio"
                                        checked={targetMode === "specific"}
                                        onChange={() => setTargetMode("specific")}
                                        className="text-primary focus:ring-primary"
                                    />
                                    <span>Người dùng cụ thể</span>
                                </label>
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="radio"
                                        checked={targetMode === "all"}
                                        onChange={() => setTargetMode("all")}
                                        className="text-primary focus:ring-primary"
                                    />
                                    <span>Tất cả người dùng</span>
                                </label>
                            </div>

                            {targetMode === "specific" && (
                                <div>
                                    <input
                                        type="text"
                                        value={targetUserId}
                                        onChange={(e) => setTargetUserId(e.target.value)}
                                        placeholder="Nhập User ID (UUID)..."
                                        className="text-sm input-nebula w-full font-mono"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end pt-4">
                            <button
                                type="submit"
                                disabled={busy}
                                className="btn-primary h-10 px-6 flex items-center gap-2"
                            >
                                {busy ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Đang gửi...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                                        </svg>
                                        Gửi thông báo
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Info / Preview */}
                <div className="space-y-6">
                    <div className="bg-surface border border-border rounded-lg p-5">
                        <h3 className="text-sm font-medium mb-3 text-muted">Lưu ý</h3>
                        <ul className="text-xs text-muted space-y-2 list-disc pl-4">
                            <li>Thông báo sẽ hiển thị trên web cho người dùng.</li>
                            <li>Nếu người dùng đã liên kết Telegram, họ cũng sẽ nhận được tin nhắn qua bot.</li>
                            <li>Gửi cho "Tất cả người dùng" có thể mất vài giây để xử lý nếu lượng người dùng lớn.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
