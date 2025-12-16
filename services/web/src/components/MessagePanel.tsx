import DOMPurify from "dompurify";
import type { Inbox, Message } from "../types";
import { API_BASE, PAGE_SIZE } from "../utils/api";
import { formatBytes, formatDate, isImage } from "../utils/format";

export function MessagePanel({
    inbox,
    messages,
    selected,
    onSelect,
    reload,
    offset,
    total,
    onPaginate,
    search,
    onSearchChange,
    hasAttachments,
    onToggleAttachments,
    viewMode,
    onViewModeChange,
    onCompose,
    outboundEnabled,
}: {
    inbox?: Inbox;
    messages: Message[];
    selected: Message | null;
    onSelect: (msg: Message | null) => void;
    reload: () => void;
    offset: number;
    total: number;
    onPaginate: (offset: number) => void;
    search: string;
    onSearchChange: (value: string) => void;
    hasAttachments: boolean;
    onToggleAttachments: () => void;
    viewMode: "html" | "text";
    onViewModeChange: (mode: "html" | "text") => void;
    onCompose: () => void;
    outboundEnabled?: boolean;
}) {
    const pageSize = PAGE_SIZE.messages;
    return (
        <div className="panel">
            <div className="row" style={{ justifyContent: "space-between" }}>
                <h2>Messages</h2>

                <div className="row" style={{ gap: "0.5rem" }}>
                    {outboundEnabled && (
                        <button type="button" onClick={() => onCompose()} style={{ backgroundColor: "#2563eb", color: "white" }}>
                            + Soạn thư
                        </button>
                    )}
                    <span className="badge">
                        {messages.length} / {total || messages.length} items
                    </span>
                    <button type="button" onClick={reload} aria-label="Reload messages">
                        Reload
                    </button>
                </div>
            </div>

            <div className="grid-two">
                <label className="label">
                    Search (subject/from/body)
                    <input
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="otp, sender@example.com"
                        aria-label="Search messages"
                        onKeyDown={(e) => e.key === "Enter" && onPaginate(0)}
                    />
                </label>
                <div className="row" style={{ gap: "0.5rem", alignItems: "flex-end" }}>
                    <label className="small row" style={{ gap: "0.35rem" }}>
                        <input
                            type="checkbox"
                            checked={hasAttachments}
                            onChange={onToggleAttachments}
                            aria-label="Only messages with attachments"
                        />{" "}
                        Has attachments
                    </label>
                    <button type="button" disabled={offset <= 0} onClick={() => onPaginate(Math.max(0, offset - pageSize))}>
                        ← Prev
                    </button>
                    <button type="button" disabled={offset + pageSize >= total} onClick={() => onPaginate(offset + pageSize)}>
                        Next →
                    </button>
                </div>
            </div>

            <div className="split">
                <div className="list">
                    {messages.map((m) => (
                        <div
                            key={m.id}
                            className="item"
                            style={{
                                cursor: "pointer",
                                borderColor: selected?.id === m.id ? "#2563eb" : undefined,
                                backgroundColor: !m.isRead ? "#f8fafc" : "white"
                            }}
                            onClick={() => onSelect(m)}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <div style={{ flex: 1 }}>
                                    <div className="label" style={{ fontWeight: !m.isRead ? 700 : 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        {!m.isRead && (
                                            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#2563eb", display: "inline-block" }}></span>
                                        )}
                                        {m.subject || "(No subject)"}
                                    </div>
                                    <div className="small" style={{ fontWeight: !m.isRead ? 600 : 400, color: !m.isRead ? "#0f172a" : "#64748b" }}>
                                        {m.fromAddress ?? "Unknown"} → {m.toAddress ?? inbox?.localPart}
                                    </div>
                                </div>
                                <div className="small" style={{ whiteSpace: "nowrap", marginLeft: "0.5rem" }}>
                                    {formatDate(m.receivedAt)}
                                </div>
                            </div>
                        </div>
                    ))}
                    {!messages.length && <div className="muted">Chưa có email cho inbox này.</div>}
                    <div className="row" style={{ justifyContent: "space-between" }}>
                        <button type="button" disabled={offset <= 0} onClick={() => onPaginate(Math.max(0, offset - pageSize))}>
                            ← Prev
                        </button>
                        <button type="button" onClick={() => onPaginate(offset + pageSize)} disabled={offset + pageSize >= total}>
                            Next →
                        </button>
                    </div>
                </div>

                <div className="panel" style={{ margin: 0 }}>
                    {selected ? (
                        <div className="stack">
                            <div className="label">{selected.subject || "(No subject)"}</div>
                            <div className="small">
                                From: {selected.fromAddress ?? "Unknown"} <br />
                                To: {selected.toAddress ?? "Unknown"} <br />
                                At: {formatDate(selected.receivedAt)}
                            </div>
                            <div className="row" style={{ gap: "0.5rem" }}>
                                <label className="small row" style={{ gap: "0.25rem" }}>
                                    <input
                                        type="radio"
                                        checked={viewMode === "html"}
                                        onChange={() => onViewModeChange("html")}
                                    />{" "}
                                    HTML (sanitized)
                                </label>
                                <label className="small row" style={{ gap: "0.25rem" }}>
                                    <input
                                        type="radio"
                                        checked={viewMode === "text"}
                                        onChange={() => onViewModeChange("text")}
                                    />{" "}
                                    Plain text
                                </label>
                            </div>
                            <div className="message-body">
                                {viewMode === "html" && selected.htmlBody ? (
                                    <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selected.htmlBody) }} />
                                ) : (
                                    <pre style={{ whiteSpace: "pre-wrap" }}>{selected.textBody || "(No text body)"}</pre>
                                )}
                            </div>
                            {selected.attachments.length > 0 && (
                                <div className="small">
                                    Attachments:
                                    <ul>
                                        {selected.attachments.map((a) => (
                                            <li key={a.id}>
                                                <a
                                                    className="link"
                                                    href={`${API_BASE}/attachments/${a.id}/download`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    aria-label={`Download ${a.filename}`}
                                                >
                                                    {a.filename} ({formatBytes(a.size)})
                                                </a>
                                                {isImage(a.mimeType) && (
                                                    <div style={{ marginTop: "0.35rem" }}>
                                                        <img
                                                            src={`${API_BASE}/attachments/${a.id}/download`}
                                                            alt={a.filename}
                                                            style={{ maxWidth: "100%", borderRadius: "6px" }}
                                                            loading="lazy"
                                                        />
                                                    </div>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="muted">Chọn email để xem chi tiết.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
