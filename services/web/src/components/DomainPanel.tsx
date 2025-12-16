import { useState } from "react";
import type { Domain } from "../types";
import { PAGE_SIZE } from "../utils/api";
import { formatDate } from "../utils/format";

function DomainWizard({ domain }: { domain?: Domain }) {
    if (!domain) return null;
    const dkimSelector = "s1";
    const dmarc = `_dmarc.${domain.name}`;
    const dkim = `${dkimSelector}._domainkey.${domain.name}`;
    const mtaSts = `_mta-sts.${domain.name}`;
    const tlsRpt = `_smtp._tls.${domain.name}`;

    return (
        <div className="panel" style={{ background: "#f8fafc", borderStyle: "dashed" }}>
            <div className="label">Domain onboarding wizard</div>
            <div className="small">
                - Verify TXT: host=@ value=<strong>{domain.verificationToken}</strong>
                <br />- SPF: host=@ value="v=spf1 mx -all"
                <br />- DKIM: host={dkim} value="v=DKIM1; k=rsa; p=..." (outbound signing)
                <br />- DMARC: host={dmarc} value="v=DMARC1; p=none; rua=mailto:dmarc@{domain.name}"
                <br />- MTA-STS: host={mtaSts} value="v=STSv1; id=2024-01"; serve policy via
                https://mta-sts.{domain.name}/.well-known/mta-sts.txt
                <br />- TLS-RPT: host={tlsRpt} value="v=TLSRPTv1; rua=mailto:tlsrpt@{domain.name}"
                <br />- PTR/rDNS: map your sending IP to mail.{domain.name}; ensure SMTP banner matches.
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
    const [verifyCode, setVerifyCode] = useState("");
    const selected = domains.find((d) => d.id === selectedDomain);

    return (
        <div className="panel">
            <div className="row" style={{ justifyContent: "space-between" }}>
                <h2>Domains</h2>
                <span className="badge">
                    {domains.length} / {total || domains.length} items
                </span>
            </div>
            <div className="grid-two">
                <label className="label">
                    Thêm domain
                    <div className="row" style={{ gap: "0.5rem" }}>
                        <input
                            placeholder="example.com"
                            value={newDomain}
                            onChange={(e) => setNewDomain(e.target.value)}
                            aria-label="New domain"
                            disabled={!isAdmin}
                        />
                        <button type="button" onClick={() => onCreate(newDomain)} disabled={busy || !isAdmin}>
                            Thêm
                        </button>
                    </div>
                    {!isAdmin && <div className="small muted">Admin only</div>}
                </label>
                <label className="label">
                    Mã verify
                    <div className="row" style={{ gap: "0.5rem" }}>
                        <input
                            placeholder="token từ DNS TXT"
                            value={verifyCode}
                            onChange={(e) => setVerifyCode(e.target.value)}
                            aria-label="Verification token"
                            disabled={!isAdmin}
                        />
                        <button
                            type="button"
                            onClick={() => selectedDomain && onVerify(selectedDomain, verifyCode)}
                            disabled={busy || !selectedDomain || !isAdmin}
                        >
                            Verify
                        </button>
                    </div>
                </label>
            </div>
            <div className="grid-two">
                <label className="label">
                    Search domain
                    <input
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Filter by name"
                        aria-label="Search domain"
                        onKeyDown={(e) => e.key === "Enter" && onSearch()}
                    />
                </label>
                <div className="row" style={{ gap: "0.5rem", alignItems: "flex-end" }}>
                    <button type="button" onClick={() => onSearch()} aria-label="Apply domain search">
                        Apply
                    </button>
                    <button
                        type="button"
                        disabled={offset <= 0}
                        onClick={() => onPaginate(Math.max(0, offset - PAGE_SIZE.domains))}
                    >
                        ← Prev
                    </button>
                    <button
                        type="button"
                        disabled={offset + PAGE_SIZE.domains >= total}
                        onClick={() => onPaginate(offset + PAGE_SIZE.domains)}
                    >
                        Next →
                    </button>
                </div>
            </div>
            <DomainWizard domain={selected} />
            <div className="list">
                {domains.map((d) => (
                    <div
                        key={d.id}
                        className="item"
                        onClick={() => onSelect(d.id)}
                        style={{ cursor: "pointer", borderColor: d.id === selectedDomain ? "#2563eb" : undefined }}
                    >
                        <div>
                            <div className="label">{d.name}</div>
                            <div className="small">Created: {formatDate(d.createdAt)}</div>
                        </div>
                        <div className="actions">
                            <span
                                className="badge"
                                style={{ borderColor: d.status === "VERIFIED" ? "#22c55e" : "#f59e0b" }}
                            >
                                {d.status}
                            </span>
                            {d.status === "PENDING" && <span className="small">TXT token: {d.verificationToken}</span>}
                        </div>
                    </div>
                ))}
                {!domains.length && <div className="muted">Chưa có domain. Thêm domain để bắt đầu.</div>}
            </div>
        </div>
    );
}
