import { useState } from "react";
import toast from "react-hot-toast";
import type { Domain } from "../types";
import { PAGE_SIZE } from "../utils/api";
import { formatDate } from "../utils/format";

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
    return (
        <button
            type="button"
            className="row"
            onClick={() => {
                navigator.clipboard.writeText(text);
                toast.success("Đã sao chép!");
            }}
            style={{
                padding: "0.25rem 0.6rem",
                fontSize: "0.75rem",
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                color: "#1d4ed8",
                whiteSpace: "nowrap",
            }}
            title="Sao chép vào khay nhớ tạm"
        >
            <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            {label}
        </button>
    );
}

function DnsCard({ title, host, value, desc, warning }: { title: string; host: string; value: string; desc?: string; warning?: boolean }) {
    return (
        <div style={{
            background: warning ? "#fff7ed" : "#f8fafc",
            border: `1px solid ${warning ? "#fdba74" : "#e2e8f0"}`,
            borderRadius: "8px",
            padding: "1rem",
            marginBottom: "0.75rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem"
        }}>
            <div style={{ fontWeight: 600, color: warning ? "#9a3412" : "#334155", fontSize: "0.9rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{title}</span>
                <CopyButton text={value} label="Sao chép" />
            </div>
            {desc && <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{desc}</div>}
            <div style={{
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                padding: "0.5rem 0.75rem",
                fontFamily: "monospace",
                color: "#0f172a",
                fontSize: "0.85rem",
                wordBreak: "break-all",
                display: "grid",
                gridTemplateColumns: "100px 1fr",
                gap: "1rem",
                alignItems: "center"
            }}>
                <div style={{ color: "#64748b", fontWeight: 500 }}>Host/Name:</div>
                <div style={{ fontWeight: 600 }}>{host}</div>

                <div style={{ color: "#64748b", fontWeight: 500 }}>Value:</div>
                <div>{value}</div>
            </div>
        </div>
    );
}

function DomainWizard({ domain }: { domain?: Domain }) {
    if (!domain) return null;
    const dmarc = `_dmarc.${domain.name}`;
    const dkim = `s1._domainkey.${domain.name}`;
    // Assumption: user hosts their own server, we give them the generic instructions for MX
    const mxHost = "mail." + domain.name;

    return (
        <div className="panel" style={{ background: "#ffffff", border: "1px solid #e2e8f0" }}>
            <h3 style={{ marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                Cấu hình DNS cho {domain.name}
            </h3>
            <div className="small" style={{ marginBottom: "1rem", color: "#475569" }}>
                Thêm các bản ghi sau vào trang quản lý tên miền của bạn để kích hoạt nhận và gửi email.
            </div>

            {domain.status === "PENDING" && (
                <DnsCard
                    title="1. Xác thực tên miền (Bắt buộc)"
                    host="@"
                    value={domain.verificationToken}
                    desc="Thêm bản ghi TXT này để chứng minh bạn sở hữu tên miền."
                    warning
                />
            )}

            <DnsCard
                title="2. Bản ghi MX (Nhận email)"
                host="@"
                value={`10 ${mxHost}`}
                desc={`Trỏ về ${mxHost}. Đừng quên tạo một bản ghi 'A' cho '${mxHost}' trỏ về IP máy chủ của bạn.`}
            />

            <DnsCard
                title="3. SPF (Cho phép gửi email)"
                host="@"
                value="v=spf1 mx -all"
                desc="Cho phép máy chủ này gửi email thay mặt domain của bạn."
            />

            <DnsCard
                title="4. DMARC (Bảo mật nâng cao)"
                host={dmarc.split(".")[0]}
                value={`v=DMARC1; p=none; rua=mailto:admin@${domain.name}`}
                desc="Giúp theo dõi và ngăn chặn giả mạo email."
            />

            <div style={{ marginTop: "1rem", fontSize: "0.85rem", color: "#64748b" }}>
                * DKIM và các bản ghi khác sẽ được tự động cấu hình khi gửi.
            </div>
        </div>
    );
}

export function DomainPanel({
    domains,
    onCreate,
    onVerify,
    busy,
    selectedDomain,
    onSelect,
    search,
    onSearchChange,
    onSearch,
    onPaginate,
    offset,
    total,
    isAdmin,
}: {
    domains: Domain[];
    onCreate: (name: string) => Promise<void>;
    onVerify: (id: string, token: string) => Promise<void>;
    busy: boolean;
    selectedDomain: string;
    onSelect: (id: string) => void;
    search: string;
    onSearchChange: (value: string) => void;
    onSearch: () => void;
    onPaginate: (nextOffset: number) => void;
    offset: number;
    total: number;
    isAdmin: boolean;
}) {
    const [newDomain, setNewDomain] = useState("");
    const selected = domains.find((d) => d.id === selectedDomain);

    return (
        <div className="panel">
            <div className="row" style={{ justifyContent: "space-between" }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h2>Quản lý Domains</h2>
                    <span style={{ fontSize: '0.8rem', background: '#e2e8f0', padding: '0.1rem 0.5rem', borderRadius: '4px' }}>
                        {domains.length}
                    </span>
                </div>
            </div>

            {isAdmin && (
                <div className="panel" style={{ background: "#f0f9ff", border: "1px solid #bae6fd", padding: "1.25rem" }}>
                    <label className="label" style={{ color: "#0369a1", fontSize: "1rem", marginBottom: "0.5rem", display: "block" }}>
                        + Thêm Tên Miền Mới
                    </label>
                    <div className="row" style={{ gap: "0.5rem" }}>
                        <input
                            placeholder="nhập-tên-miền-của-bạn.com"
                            value={newDomain}
                            onChange={(e) => setNewDomain(e.target.value)}
                            aria-label="New domain"
                            disabled={busy}
                            style={{ maxWidth: "400px" }}
                            onKeyDown={(e) => e.key === "Enter" && onCreate(newDomain)}
                        />
                        <button
                            type="button"
                            onClick={() => { onCreate(newDomain); setNewDomain(""); }}
                            disabled={busy || !newDomain}
                            style={{ background: "#0ea5e9", color: "white", border: "none" }}
                        >
                            Thêm Ngay
                        </button>
                    </div>
                    <div className="small" style={{ color: "#0c4a6e", marginTop: "0.5rem" }}>
                        Ví dụ: <strong>mycompany.com</strong> hoặc <strong>mail.mycompany.com</strong>
                    </div>
                </div>
            )}

            <div className="grid-two" style={{ marginTop: '1rem', alignItems: 'flex-start' }}>
                <div className="list">
                    <div className="row" style={{ marginBottom: "0.5rem", gap: "0.5rem" }}>
                        <input
                            value={search}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder="Tìm kiếm domain..."
                            aria-label="Search domain"
                            onKeyDown={(e) => e.key === "Enter" && onSearch()}
                            style={{ padding: "0.5rem" }}
                        />
                        <button type="button" onClick={() => onSearch()} aria-label="Apply domain search" style={{ padding: "0.5rem 1rem" }}>
                            Tìm
                        </button>
                    </div>

                    {domains.map((d) => (
                        <div
                            key={d.id}
                            className="item"
                            onClick={() => onSelect(d.id)}
                            style={{
                                cursor: "pointer",
                                borderColor: d.id === selectedDomain ? "#2563eb" : undefined,
                                background: d.id === selectedDomain ? "#eff6ff" : "white",
                                flexDirection: "column",
                                alignItems: "flex-start",
                                gap: "0.25rem"
                            }}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                                <div className="label" style={{ fontSize: "1rem" }}>{d.name}</div>
                                <span
                                    className="badge"
                                    style={{
                                        borderColor: d.status === "VERIFIED" ? "#22c55e" : "#f59e0b",
                                        color: d.status === "VERIFIED" ? "#15803d" : "#b45309",
                                        background: d.status === "VERIFIED" ? "#dcfce7" : "#fef3c7"
                                    }}
                                >
                                    {d.status}
                                </span>
                            </div>
                            <div className="small">Ngày tạo: {formatDate(d.createdAt)}</div>
                        </div>
                    ))}

                    {!domains.length && <div className="muted" style={{ padding: "1rem", textAlign: "center" }}>Chưa có domain nào.</div>}

                    <div className="row" style={{ gap: "0.5rem", justifyContent: "center", marginTop: "1rem" }}>
                        <button
                            type="button"
                            disabled={offset <= 0}
                            onClick={() => onPaginate(Math.max(0, offset - PAGE_SIZE.domains))}
                            style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
                        >
                            ← Prev
                        </button>
                        <button
                            type="button"
                            disabled={offset + PAGE_SIZE.domains >= total}
                            onClick={() => onPaginate(offset + PAGE_SIZE.domains)}
                            style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
                        >
                            Next →
                        </button>
                    </div>
                </div>

                {/* Right side: Wizard or Instructions */}
                <div>
                    {selected ? (
                        <div className="stack">
                            <div className="row" style={{ justifyContent: "flex-end" }}>
                                {selected.status === "PENDING" && (
                                    <button
                                        type="button"
                                        onClick={() => onVerify(selected.id, selected.verificationToken)}
                                        disabled={busy}
                                        style={{ background: "#22c55e", color: "white", border: "none" }}
                                    >
                                        Check Verify DNS
                                    </button>
                                )}
                            </div>
                            <DomainWizard domain={selected} />
                        </div>
                    ) : (
                        <div className="panel" style={{ height: "100%", alignItems: "center", justifyContent: "center", minHeight: "200px", background: "#f8fafc", color: "#64748b" }}>
                            <p>Chọn một tên miền để xem cấu hình DNS</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
