/**
 * UI Components for MyDomains page
 * AddDomainModal, DNSConfigCard, DomainCard, EmptyState
 */
import type { Domain } from "../../types";

// Mail server configuration from environment
const MAIL_HOSTNAME = import.meta.env.VITE_MAIL_HOSTNAME || "mail.manhquy.click";
const MAIL_SERVER_IP = import.meta.env.VITE_MAIL_SERVER_IP || "165.22.48.193";

// --- Copy Icon Component ---
function CopyIcon() {
    return (
        <svg className="w-4 h-4 text-[var(--nebula-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
    );
}

// --- Add Domain Modal ---
export interface AddDomainModalProps {
    showAddForm: boolean;
    newDomainName: string;
    setNewDomainName: (name: string) => void;
    addedDomain: Domain | null;
    busy: boolean;
    onClose: () => void;
    onAdd: () => Promise<void>;
    copyToClipboard: (text: string) => void;
}

export function AddDomainModal({
    showAddForm,
    newDomainName,
    setNewDomainName,
    addedDomain,
    busy,
    onClose,
    onAdd,
    copyToClipboard,
}: AddDomainModalProps) {
    if (!showAddForm) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-nebula-fade-in">
            <div className="glass-card-elevated w-full max-w-md animate-nebula-scale-in">
                <div className="glass-card-header">
                    <h2 className="text-lg font-semibold" style={{ color: 'var(--nebula-text)' }}>
                        {addedDomain ? (
                            <span className="flex items-center gap-2 text-[var(--nebula-success)]">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Đã thêm tên miền!
                            </span>
                        ) : (
                            "Thêm tên miền mới"
                        )}
                    </h2>
                    <button onClick={onClose} className="btn-nebula btn-nebula-ghost btn-nebula-icon">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="glass-card-body space-y-4">
                    {!addedDomain ? (
                        <>
                            <div>
                                <label className="label-nebula">Tên miền</label>
                                <input
                                    type="text"
                                    value={newDomainName}
                                    onChange={(e) => setNewDomainName(e.target.value)}
                                    placeholder="example.com"
                                    className="input-nebula"
                                    onKeyDown={(e) => e.key === "Enter" && onAdd()}
                                    autoFocus
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button onClick={onClose} className="btn-nebula btn-nebula-secondary">Hủy</button>
                                <button onClick={onAdd} disabled={busy} className="btn-nebula btn-nebula-primary">
                                    {busy ? "Đang thêm..." : "Thêm tên miền"}
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="animate-nebula-fade-in">
                            <p className="text-sm mb-4" style={{ color: 'var(--nebula-text-muted)' }}>
                                Để hoàn tất, hãy cấu hình DNS cho <strong>{addedDomain.name}</strong>:
                            </p>

                            <div className="rounded-lg overflow-hidden mb-6" style={{ border: '1px solid var(--nebula-border)' }}>
                                <table className="w-full text-sm">
                                    <thead style={{ background: 'var(--nebula-elevated)' }}>
                                        <tr>
                                            <th className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--nebula-text)' }}>Loại</th>
                                            <th className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--nebula-text)' }}>Giá trị</th>
                                            <th className="px-3 py-2 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr style={{ borderTop: '1px solid var(--nebula-border)' }}>
                                            <td className="px-3 py-2 font-mono font-bold" style={{ color: 'var(--nebula-error)' }}>MX</td>
                                            <td className="px-3 py-2 font-mono text-xs break-all" style={{ color: 'var(--nebula-text-secondary)' }}>
                                                {MAIL_HOSTNAME}
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                <button onClick={() => copyToClipboard(MAIL_HOSTNAME)} className="p-1 hover:bg-[var(--nebula-elevated)] rounded">
                                                    <CopyIcon />
                                                </button>
                                            </td>
                                        </tr>
                                        <tr style={{ borderTop: '1px solid var(--nebula-border)' }}>
                                            <td className="px-3 py-2 font-mono font-bold" style={{ color: 'var(--nebula-warning)' }}>A</td>
                                            <td className="px-3 py-2 font-mono text-xs break-all" style={{ color: 'var(--nebula-text-secondary)' }}>
                                                mail → {MAIL_SERVER_IP}
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                <button onClick={() => copyToClipboard(MAIL_SERVER_IP)} className="p-1 hover:bg-[var(--nebula-elevated)] rounded">
                                                    <CopyIcon />
                                                </button>
                                            </td>
                                        </tr>
                                        <tr style={{ borderTop: '1px solid var(--nebula-border)' }}>
                                            <td className="px-3 py-2 font-mono font-bold" style={{ color: 'var(--nebula-success)' }}>TXT</td>
                                            <td className="px-3 py-2 font-mono text-xs break-all" style={{ color: 'var(--nebula-text-secondary)' }}>
                                                {addedDomain.verificationToken}
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                <button onClick={() => copyToClipboard(addedDomain.verificationToken)} className="p-1 hover:bg-[var(--nebula-elevated)] rounded">
                                                    <CopyIcon />
                                                </button>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex justify-end">
                                <button onClick={onClose} className="btn-nebula btn-nebula-primary w-full justify-center">
                                    Đã hiểu, đóng lại
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// --- DNS Config Card ---
export function DNSConfigCard() {
    return (
        <div className="glass-card mb-6">
            <div className="glass-card-header">
                <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--nebula-text)' }}>
                    <svg className="w-5 h-5" style={{ color: 'var(--nebula-cyan)' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Hướng dẫn cấu hình DNS
                </h3>
            </div>
            <div className="glass-card-body">
                <p className="text-sm mb-4" style={{ color: 'var(--nebula-text-muted)' }}>
                    Để nhận được email, thêm các bản ghi DNS sau vào domain của bạn:
                </p>
                <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--nebula-border)' }}>
                    <table className="w-full text-sm">
                        <thead style={{ background: 'var(--nebula-elevated)' }}>
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--nebula-text)' }}>Loại</th>
                                <th className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--nebula-text)' }}>Tên</th>
                                <th className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--nebula-text)' }}>Giá trị</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style={{ borderTop: '1px solid var(--nebula-border)' }}>
                                <td className="px-4 py-3 font-mono font-bold" style={{ color: 'var(--nebula-error)' }}>MX</td>
                                <td className="px-4 py-3 font-mono" style={{ color: 'var(--nebula-text-secondary)' }}>@</td>
                                <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--nebula-text-secondary)' }}>{MAIL_HOSTNAME} (độ ưu tiên 10)</td>
                            </tr>
                            <tr style={{ borderTop: '1px solid var(--nebula-border)' }}>
                                <td className="px-4 py-3 font-mono font-bold" style={{ color: 'var(--nebula-warning)' }}>A</td>
                                <td className="px-4 py-3 font-mono" style={{ color: 'var(--nebula-text-secondary)' }}>mail</td>
                                <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--nebula-text-secondary)' }}>{MAIL_SERVER_IP}</td>
                            </tr>
                            <tr style={{ borderTop: '1px solid var(--nebula-border)' }}>
                                <td className="px-4 py-3 font-mono font-bold" style={{ color: 'var(--nebula-success)' }}>TXT</td>
                                <td className="px-4 py-3 font-mono" style={{ color: 'var(--nebula-text-secondary)' }}>@</td>
                                <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--nebula-text-secondary)' }}>[mã xác thực từ hệ thống]</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// --- Domain Card ---
export interface DomainCardProps {
    domain: Domain;
    verifyingId: string | null;
    togglingId: string | null;
    deletingId: string | null;
    onVerify: (domainId: string, token: string) => Promise<void>;
    onTogglePublic: (domainId: string, currentPublic: boolean) => Promise<void>;
    onDelete: (domain: Domain) => void;
    copyToClipboard: (text: string) => void;
}

export function DomainCard({
    domain,
    verifyingId,
    togglingId,
    deletingId,
    onVerify,
    onTogglePublic,
    onDelete,
    copyToClipboard,
}: DomainCardProps) {
    return (
        <div className="glass-card animate-nebula-fade-in">
            <div className="glass-card-body">
                <div className="flex items-start justify-between gap-4">
                    {/* Domain Info */}
                    <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${domain.status === 'VERIFIED' ? 'bg-[var(--nebula-glow-cyan)]' : 'bg-[var(--nebula-glow-pink)]'}`}>
                            {domain.status === 'VERIFIED' ? (
                                <svg className="w-6 h-6" style={{ color: 'var(--nebula-cyan)' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            ) : (
                                <svg className="w-6 h-6" style={{ color: 'var(--nebula-pink)' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-lg" style={{ color: 'var(--nebula-text)' }}>{domain.name}</h3>
                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${domain.status === "VERIFIED"
                                    ? "bg-[rgba(16,185,129,0.1)] text-[var(--nebula-success)]"
                                    : "bg-[rgba(245,158,11,0.1)] text-[var(--nebula-warning)]"
                                }`}>
                                    {domain.status === "VERIFIED" ? "✓ Đã xác thực" : "⏳ Đang chờ"}
                                </span>
                                {domain.isPublic && (
                                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--nebula-glow-violet)] text-[var(--nebula-violet)]">
                                        🌐 Công khai
                                    </span>
                                )}
                            </div>
                            <p className="text-sm" style={{ color: 'var(--nebula-text-muted)' }}>
                                Thêm ngày: {new Date(domain.createdAt).toLocaleDateString("vi-VN")}
                            </p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        {domain.status !== "VERIFIED" && (
                            <button
                                onClick={() => onVerify(domain.id, domain.verificationToken)}
                                disabled={verifyingId === domain.id}
                                className="btn-nebula btn-nebula-primary text-sm"
                            >
                                {verifyingId === domain.id ? "..." : "Xác thực"}
                            </button>
                        )}

                        {domain.status === "VERIFIED" && (
                            <button
                                onClick={() => onTogglePublic(domain.id, domain.isPublic)}
                                disabled={togglingId === domain.id}
                                className="btn-nebula btn-nebula-secondary text-sm"
                            >
                                {togglingId === domain.id ? "..." : domain.isPublic ? "Riêng tư" : "Công khai"}
                            </button>
                        )}

                        <button
                            onClick={() => onDelete(domain)}
                            disabled={deletingId === domain.id}
                            className="btn-nebula btn-nebula-ghost text-sm"
                            style={{ color: 'var(--nebula-error)' }}
                        >
                            {deletingId === domain.id ? "..." : "Xóa"}
                        </button>
                    </div>
                </div>

                {/* Verification Instructions */}
                {domain.status !== "VERIFIED" && (
                    <div className="mt-4 p-4 rounded-xl" style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                        <p className="text-sm font-medium mb-2" style={{ color: 'var(--nebula-warning)' }}>
                            Thêm TXT record sau vào DNS để xác thực:
                        </p>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 px-3 py-2 rounded-lg text-xs font-mono break-all" style={{ background: 'var(--nebula-surface)', color: 'var(--nebula-text)' }}>
                                {domain.verificationToken}
                            </code>
                            <button
                                onClick={() => copyToClipboard(domain.verificationToken)}
                                className="btn-nebula btn-nebula-secondary text-xs flex-shrink-0"
                            >
                                Sao chép
                            </button>
                        </div>
                    </div>
                )}

                {/* Public sharing info */}
                {domain.isPublic && domain.status === "VERIFIED" && (
                    <div className="mt-4 p-4 rounded-xl" style={{ background: 'var(--nebula-glow-violet)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                        <p className="text-sm" style={{ color: 'var(--nebula-violet)' }}>
                            <strong>Tên miền công khai.</strong> Người dùng khác có thể tạo email trên domain này.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

// --- Empty State ---
export function DomainsEmptyState({ onAdd }: { onAdd: () => void }) {
    return (
        <div className="empty-state-nebula">
            <div className="empty-state-nebula-icon">
                <svg fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
            </div>
            <h3 className="empty-state-nebula-title">Chưa có tên miền nào</h3>
            <p className="empty-state-nebula-description">
                Thêm tên miền đầu tiên để bắt đầu nhận email.
            </p>
            <button onClick={onAdd} className="btn-nebula btn-nebula-primary">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Thêm tên miền đầu tiên
            </button>
        </div>
    );
}
