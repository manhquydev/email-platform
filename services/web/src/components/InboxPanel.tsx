import { useState } from "react";
import type { Domain, Inbox } from "../types";
import { PAGE_SIZE } from "../utils/api";
import { formatDate } from "../utils/format";

export function InboxPanel({
    domain,
    inboxes,
    selectedInbox,
    onSelectInbox,
    onCreate,
    busy,
    search,
    onSearchChange,
    onSearch,
    onPaginate,
    offset,
    total,
    isAdmin,
}: {
    domain?: Domain;
    inboxes: Inbox[];
    selectedInbox: string;
    onSelectInbox: (id: string) => void;
    onCreate: (domainId: string, localPart: string, expiresAt?: string) => Promise<void>;
    busy: boolean;
    search: string;
    onSearchChange: (value: string) => void;
    onSearch: () => void;
    onPaginate: (offset: number) => void;
    offset: number;
    total: number;
    isAdmin: boolean;
}) {
    const [localPart, setLocalPart] = useState("hello");
    const [expiresAt, setExpiresAt] = useState("");

    const domainLabel = domain ? domain.name : "Chọn domain";

    return (
        <div className="panel">
            <div className="row" style={{ justifyContent: "space-between" }}>
                <h2>Inboxes ({domainLabel})</h2>
                <span className="badge">
                    {inboxes.length} / {total || inboxes.length}
                </span>
            </div>

            <div className="grid-two">
                <label className="label">
                    Local-part
                    <input
                        value={localPart}
                        onChange={(e) => setLocalPart(e.target.value)}
                        placeholder="alias"
                        aria-label="Local part"
                    />
                </label>
                <label className="label">
                    Thời gian tồn tại (Expiration)
                    <select
                        value={expiresAt}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val === "") {
                                setExpiresAt("");
                            } else {
                                const ms = parseInt(val);
                                const date = new Date(Date.now() + ms);
                                setExpiresAt(date.toISOString());
                            }
                        }}
                    >
                        <option value="">Vĩnh viễn (Never)</option>
                        <option value={3600 * 1000}>1 Giờ</option>
                        <option value={24 * 3600 * 1000}>1 Ngày</option>
                        <option value={7 * 24 * 3600 * 1000}>1 Tuần</option>
                        <option value={30 * 24 * 3600 * 1000}>1 Tháng</option>
                    </select>
                </label>
            </div>
            <button
                type="button"
                disabled={!domain || busy || !isAdmin}
                onClick={() => domain && onCreate(domain.id, localPart, expiresAt || undefined)}
            >
                Tạo inbox
            </button>
            {!isAdmin && <div className="small muted">Admin only: inbox creation</div>}

            <div className="grid-two">
                <label className="label">
                    Search inbox
                    <input
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Filter by alias"
                        aria-label="Search inbox"
                        onKeyDown={(e) => e.key === "Enter" && onSearch()}
                    />
                </label>
                <div className="row" style={{ gap: "0.5rem", alignItems: "flex-end" }}>
                    <button type="button" onClick={() => onSearch()}>
                        Apply
                    </button>
                    <button
                        type="button"
                        disabled={offset <= 0}
                        onClick={() => onPaginate(Math.max(0, offset - PAGE_SIZE.inboxes))}
                    >
                        ← Prev
                    </button>
                    <button
                        type="button"
                        disabled={offset + PAGE_SIZE.inboxes >= total}
                        onClick={() => onPaginate(offset + PAGE_SIZE.inboxes)}
                    >
                        Next →
                    </button>
                </div>
            </div>

            <div className="list">
                {inboxes.map((inbox) => (
                    <div
                        key={inbox.id}
                        className="item"
                        style={{ cursor: "pointer", borderColor: inbox.id === selectedInbox ? "#2563eb" : undefined }}
                        onClick={() => onSelectInbox(inbox.id)}
                    >
                        <div>
                            <div className="label">
                                {inbox.localPart}@{inbox.domain?.name ?? domain?.name ?? ""}
                            </div>
                            <div className="small">Created: {formatDate(inbox.createdAt)}</div>
                        </div>
                        <div className="small">TTL: {inbox.expiresAt ? formatDate(inbox.expiresAt) : "None"}</div>
                    </div>
                ))}
                {!inboxes.length && <div className="muted">Chưa có inbox. Tạo một alias để nhận mail.</div>}
            </div>
        </div>
    );
}
