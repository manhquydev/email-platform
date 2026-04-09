/**
 * ManagerWorkspacePane - secondary pane for /app/manager desktop mode
 * Focuses on quick actions and selected inbox summary instead of message reading.
 */
import { Link } from "react-router-dom";
import type { Inbox } from "../../../types";

interface ManagerWorkspacePaneProps {
    activeInbox: Inbox | null;
    filteredCount: number;
    onCreateInbox: () => void;
}

function formatExpiry(expiresAt?: string | null) {
    if (!expiresAt) return "Vĩnh viễn";
    const date = new Date(expiresAt);
    if (Number.isNaN(date.getTime())) return "Không xác định";
    return date.toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function ManagerWorkspacePane({ activeInbox, filteredCount, onCreateInbox }: ManagerWorkspacePaneProps) {
    const inboxEmail = activeInbox ? `${activeInbox.localPart}@${activeInbox.domain?.name}` : "";

    return (
        <div className="h-full overflow-auto p-4 sm:p-6">
            <div className="max-w-4xl mx-auto space-y-4">
                <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
                    <p className="text-xs uppercase tracking-[0.16em] text-text-secondary mb-2">Manager</p>
                    <h1 className="text-xl sm:text-2xl font-bold text-text-main">Bảng điều khiển inbox (2-pane)</h1>
                    <p className="text-sm text-text-secondary mt-2">
                        Quản lý nhanh hộp thư ở pane trái. Mở workspace đọc mail riêng khi cần triage nội dung.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={onCreateInbox}
                            className="px-4 py-2 rounded-lg bg-primary/15 text-primary border border-primary/30 hover:bg-primary/20 transition-colors"
                        >
                            Tạo inbox mới
                        </button>
                        {activeInbox && (
                            <Link
                                to={`/app/inbox/${activeInbox.id}`}
                                className="px-4 py-2 rounded-lg border border-cyan-400/30 text-cyan-300 hover:bg-cyan-500/10 transition-colors"
                            >
                                Mở workspace đọc mail
                            </Link>
                        )}
                    </div>
                </section>

                <section className="rounded-2xl border border-white/10 bg-surface/30 p-5 sm:p-6">
                    <h2 className="text-sm font-semibold text-text-main mb-3">Inbox đang chọn</h2>
                    {activeInbox ? (
                        <div className="space-y-2 text-sm">
                            <div className="text-text-main break-all">{inboxEmail}</div>
                            <div className="text-text-secondary">Hạn dùng: {formatExpiry(activeInbox.expiresAt)}</div>
                            <div className="text-text-secondary">Chế độ chia sẻ: {activeInbox.shareMode ?? "PRIVATE"}</div>
                            <div className="text-text-secondary">Tổng email: {activeInbox._count?.messages ?? 0}</div>
                        </div>
                    ) : (
                        <p className="text-sm text-text-secondary">Chọn inbox ở pane trái để xem tóm tắt và mở workspace.</p>
                    )}
                </section>

                <section className="rounded-2xl border border-white/10 bg-surface/30 p-5 sm:p-6">
                    <h2 className="text-sm font-semibold text-text-main mb-2">Trạng thái lọc hiện tại</h2>
                    <p className="text-sm text-text-secondary">{filteredCount} inbox đang hiển thị theo bộ lọc hiện hành.</p>
                </section>
            </div>
        </div>
    );
}
