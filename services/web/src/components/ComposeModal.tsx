import { useState } from "react";
import type { Inbox } from "../types";
import { api } from "../utils/api";
import { Editor } from "./Editor";

type Props = {
    token: string;
    inboxes: Inbox[];
    onClose: () => void;
    initialSubject?: string;
    initialBody?: string;
    initialTo?: string;
    initialFrom?: string;
};

export function ComposeModal({ token, inboxes, onClose, initialSubject = "", initialBody = "", initialTo = "", initialFrom = "" }: Props) {
    const [composeFrom, setComposeFrom] = useState(initialFrom);
    const [composeTo, setComposeTo] = useState(initialTo);
    const [composeSubject, setComposeSubject] = useState(initialSubject);
    const [composeBody, setComposeBody] = useState(initialBody);
    const [files, setFiles] = useState<File[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const handleCompose = async () => {
        if (!composeFrom || !composeTo || !composeSubject) return;
        setBusy(true);
        setError("");
        try {
            const formData = new FormData();
            formData.append("from", composeFrom);
            formData.append("to", composeTo);
            formData.append("subject", composeSubject);
            formData.append("text", composeBody); // Fallback text
            formData.append("html", composeBody); // Send HTML

            files.forEach(f => {
                formData.append("attachments", f);
            });

            await api("/messages/outbound", {
                method: "POST",
                token,
                body: formData,
            });
            onClose();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-surface w-full max-w-4xl h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-border">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg">
                    <h3 className="text-lg font-bold text-text-main">Soạn thư mới</h3>
                    <button
                        onClick={onClose}
                        className="text-muted hover:text-text-main p-1.5 hover:bg-black/5 rounded-full transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                </div>

                {error && (
                    <div className="px-6 py-2 bg-red-50 text-red-600 text-sm border-b border-red-100 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        {error}
                    </div>
                )}

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-text-main">Từ (Người gửi)</label>
                            <select
                                value={composeFrom}
                                onChange={(e) => setComposeFrom(e.target.value)}
                                className="w-full"
                                autoFocus
                            >
                                <option value="">-- Chọn hộp thư gửi --</option>
                                {inboxes.map((i) => (
                                    <option key={i.id} value={`${i.localPart}@${i.domain?.name}`}>
                                        {i.localPart}@{i.domain?.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-text-main">Đến (Người nhận)</label>
                            <input
                                value={composeTo}
                                onChange={(e) => setComposeTo(e.target.value)}
                                placeholder="nguoinhan@example.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-semibold text-text-main">Tiêu đề</label>
                        <input
                            value={composeSubject}
                            onChange={(e) => setComposeSubject(e.target.value)}
                            placeholder="Nhập tiêu đề email..."
                        />
                    </div>

                    <div className="space-y-1 flex flex-col flex-1 min-h-[300px]">
                        <label className="text-sm font-semibold text-text-main">Nội dung</label>
                        <div className="flex-1 border border-border rounded-lg overflow-hidden bg-white">
                            <Editor
                                value={composeBody}
                                onChange={setComposeBody}
                                style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                                placeholder="Soạn nội dung chi tiết..."
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-text-main flex items-center justify-between">
                            <span>Đính kèm tệp</span>
                            {files.length > 0 && <span className="text-xs text-primary font-medium">{files.length} tệp được chọn</span>}
                        </label>
                        <div className="relative border border-dashed border-border rounded-lg p-4 hover:bg-bg transition-colors text-center cursor-pointer">
                            <input
                                type="file"
                                multiple
                                onChange={(e) => setFiles(Array.from(e.target.files || []))}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="flex flex-col items-center gap-1 text-muted pointer-events-none">
                                <svg className="w-8 h-8 text-border-hover" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                <span className="text-sm">Kéo thả hoặc nhấp để tải tệp lên</span>
                            </div>
                        </div>
                        {files.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {files.map((f, idx) => (
                                    <div key={idx} className="flex items-center gap-1 text-xs px-2 py-1 bg-bg border border-border rounded">
                                        <span className="truncate max-w-[150px]">{f.name}</span>
                                        <button
                                            onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                                            className="text-muted hover:text-danger ml-1"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-border bg-bg flex justify-end gap-3 flex-shrink-0">
                    <button
                        onClick={onClose}
                        disabled={busy}
                        className="btn btn-secondary min-w-[80px]"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleCompose}
                        disabled={busy || !composeFrom || !composeTo}
                        className="btn btn-primary min-w-[100px] flex items-center gap-2"
                    >
                        {busy ? (
                            <>
                                <div className="spinner small border-white/30 border-t-white"></div>
                                <span>Đang gửi...</span>
                            </>
                        ) : (
                            <>
                                <span>Gửi thư</span>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
