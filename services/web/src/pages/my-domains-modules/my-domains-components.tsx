/**
 * UI Components for MyDomains page
 * Phase 1 semantic-token theming (light + dark), monochrome outline icons (Lucide-style)
 * Compact card layout
 */
import type { Domain } from "../../types";
import { Badge } from "../../components/ui/Badge";

// Mail server configuration from environment
const MAIL_HOSTNAME = import.meta.env.VITE_MAIL_HOSTNAME || "mail.manhquy.id.vn";
const MAIL_SERVER_IP = import.meta.env.VITE_MAIL_SERVER_IP || "165.22.48.193";

// ============================================
// ICON COMPONENTS - Monochrome Outline Style
// ============================================

/** Copy icon - clipboard outline */
function IconCopy({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
    );
}

/** Check circle icon - verification success */
function IconCheckCircle({ className = "w-5 h-5" }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

/** Clock icon - pending status */
function IconClock({ className = "w-5 h-5" }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

/** Close icon - X mark */
function IconClose({ className = "w-5 h-5" }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

/** Plus icon - add action */
function IconPlus({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

/** Globe icon - domain/public */
function IconGlobe({ className = "w-5 h-5" }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20" strokeLinecap="round" />
            <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
        </svg>
    );
}

/** Lock icon - private */
function IconLock({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
    );
}

/** Unlock icon - public */
function IconUnlock({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 019.9-1" />
        </svg>
    );
}

/** Trash icon - delete action */
function IconTrash({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10 11v6M14 11v6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

/** Shield check icon - verify action */
function IconShieldCheck({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

/** Info icon - information */
function IconInfo({ className = "w-5 h-5" }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

/** Server icon - DNS/mail server */
function IconServer({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <rect x="2" y="2" width="20" height="8" rx="2" />
            <rect x="2" y="14" width="20" height="8" rx="2" />
            <path d="M6 6h.01M6 18h.01" strokeLinecap="round" />
        </svg>
    );
}

/** External link icon */
function IconExternalLink({ className = "w-3 h-3" }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M15 3h6v6M10 14L21 3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

/** Loader icon - spinning */
function IconLoader({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg className={`${className} animate-spin`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
        </svg>
    );
}

// ============================================
// SHARED COMPONENTS
// ============================================

/** Copy button with icon */
function CopyButton({ text, onCopy }: { text: string; onCopy: (text: string) => void }) {
    return (
        <button
            onClick={() => onCopy(text)}
            className="p-1.5 rounded-md text-semantic-text-muted hover:text-semantic-text-main hover:bg-semantic-bg-hover transition-all duration-150"
            title="Sao chép"
        >
            <IconCopy className="w-3.5 h-3.5" />
        </button>
    );
}

/** Status badge component - uses Phase 1 Badge primitive */
function StatusBadge({ status, isPublic }: { status: string; isPublic?: boolean }) {
    const isVerified = status === "VERIFIED";

    return (
        <div className="flex items-center gap-1.5">
            <Badge variant={isVerified ? "success" : "warning"} className="uppercase tracking-wide">
                {isVerified ? (
                    <>
                        <IconCheckCircle className="w-3 h-3" />
                        Đã xác minh
                    </>
                ) : (
                    <>
                        <IconClock className="w-3 h-3" />
                        Chờ xác minh
                    </>
                )}
            </Badge>
            {isPublic && isVerified && (
                <Badge variant="info" className="uppercase tracking-wide">
                    <IconGlobe className="w-3 h-3" />
                    Công khai
                </Badge>
            )}
        </div>
    );
}

// ============================================
// ADD DOMAIN MODAL
// ============================================

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-lg bg-semantic-bg-elevated border border-semantic-border rounded-xl shadow-semantic-lg animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-semantic-border">
                    <div className="flex items-center gap-3">
                        {addedDomain ? (
                            <div className="w-8 h-8 rounded-lg bg-semantic-success-subtle flex items-center justify-center">
                                <IconCheckCircle className="w-4 h-4 text-semantic-success" />
                            </div>
                        ) : (
                            <div className="w-8 h-8 rounded-lg bg-semantic-accent-subtle flex items-center justify-center">
                                <IconGlobe className="w-4 h-4 text-semantic-accent-text" />
                            </div>
                        )}
                        <h2 className="text-base font-semibold text-semantic-text-main">
                            {addedDomain ? "Đã thêm tên miền" : "Thêm tên miền"}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-semantic-text-muted hover:text-semantic-text-main hover:bg-semantic-bg-hover transition-colors"
                    >
                        <IconClose className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-5 py-4">
                    {!addedDomain ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-semantic-text-secondary mb-1.5 uppercase tracking-wide">
                                    Tên miền
                                </label>
                                <input
                                    type="text"
                                    value={newDomainName}
                                    onChange={(e) => setNewDomainName(e.target.value)}
                                    placeholder="example.com"
                                    className="w-full px-3 py-2.5 bg-semantic-bg-primary border border-semantic-border rounded-lg text-sm text-semantic-text-main placeholder-semantic-text-muted focus:outline-none focus:ring-2 focus:ring-semantic-accent/40 focus:border-semantic-accent/40 transition-all"
                                    onKeyDown={(e) => e.key === "Enter" && onAdd()}
                                    autoFocus
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 text-sm font-medium text-semantic-text-secondary hover:text-semantic-text-main hover:bg-semantic-bg-hover rounded-lg transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={onAdd}
                                    disabled={busy}
                                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-semantic-text-inverse bg-semantic-accent hover:bg-semantic-accent-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                                >
                                    {busy ? (
                                        <>
                                            <IconLoader className="w-3.5 h-3.5" />
                                            Đang thêm...
                                        </>
                                    ) : (
                                        <>
                                            <IconPlus className="w-3.5 h-3.5" />
                                            Thêm tên miền
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-sm text-semantic-text-secondary">
                                Cấu hình bản ghi DNS cho <span className="text-semantic-text-main font-medium">{addedDomain.name}</span>:
                            </p>

                            {/* DNS Records Table */}
                            <div className="rounded-lg border border-semantic-border overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-semantic-bg-hover">
                                            <th className="px-3 py-2 text-left text-[11px] font-semibold text-semantic-text-secondary uppercase tracking-wider w-16">Loại</th>
                                            <th className="px-3 py-2 text-left text-[11px] font-semibold text-semantic-text-secondary uppercase tracking-wider">Giá trị</th>
                                            <th className="px-3 py-2 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-semantic-border">
                                        <tr className="hover:bg-semantic-bg-hover transition-colors">
                                            <td className="px-3 py-2.5">
                                                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-semantic-danger-subtle text-semantic-danger rounded">MX</span>
                                            </td>
                                            <td className="px-3 py-2.5 font-mono text-xs text-semantic-text-main">{MAIL_HOSTNAME}</td>
                                            <td className="px-3 py-2.5">
                                                <CopyButton text={MAIL_HOSTNAME} onCopy={copyToClipboard} />
                                            </td>
                                        </tr>
                                        <tr className="hover:bg-semantic-bg-hover transition-colors">
                                            <td className="px-3 py-2.5">
                                                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-semantic-warning-subtle text-semantic-warning rounded">A</span>
                                            </td>
                                            <td className="px-3 py-2.5 font-mono text-xs text-semantic-text-main">
                                                <span className="text-semantic-text-muted">mail →</span> {MAIL_SERVER_IP}
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <CopyButton text={MAIL_SERVER_IP} onCopy={copyToClipboard} />
                                            </td>
                                        </tr>
                                        <tr className="hover:bg-semantic-bg-hover transition-colors">
                                            <td className="px-3 py-2.5">
                                                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-semantic-success-subtle text-semantic-success rounded">TXT</span>
                                            </td>
                                            <td className="px-3 py-2.5 font-mono text-xs text-semantic-text-main break-all max-w-[280px]">
                                                {addedDomain.verificationToken}
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <CopyButton text={addedDomain.verificationToken} onCopy={copyToClipboard} />
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <button
                                onClick={onClose}
                                className="w-full py-2.5 text-sm font-medium text-semantic-text-inverse bg-semantic-accent hover:bg-semantic-accent-hover rounded-lg transition-colors"
                            >
                                Đã hiểu, đóng
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ============================================
// DNS CONFIG CARD
// ============================================

export function DNSConfigCard() {
    return (
        <div className="mb-5 rounded-xl border border-semantic-border bg-semantic-bg-elevated overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-semantic-border bg-semantic-bg-hover">
                <div className="w-7 h-7 rounded-lg bg-semantic-accent-subtle flex items-center justify-center">
                    <IconServer className="w-3.5 h-3.5 text-semantic-accent-text" />
                </div>
                <h3 className="text-sm font-semibold text-semantic-text-main">Hướng dẫn cấu hình DNS</h3>
            </div>

            {/* Content */}
            <div className="p-4">
                <p className="text-xs text-semantic-text-muted mb-3">
                    Thêm các bản ghi DNS sau để nhận email trên tên miền của bạn:
                </p>

                <div className="rounded-lg border border-semantic-border overflow-hidden">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="bg-semantic-bg-hover">
                                <th className="px-3 py-2 text-left text-[10px] font-semibold text-semantic-text-muted uppercase tracking-wider w-14">Loại</th>
                                <th className="px-3 py-2 text-left text-[10px] font-semibold text-semantic-text-muted uppercase tracking-wider w-16">Tên</th>
                                <th className="px-3 py-2 text-left text-[10px] font-semibold text-semantic-text-muted uppercase tracking-wider">Giá trị</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-semantic-border">
                            <tr>
                                <td className="px-3 py-2">
                                    <span className="px-1.5 py-0.5 text-[9px] font-bold bg-semantic-danger-subtle text-semantic-danger rounded">MX</span>
                                </td>
                                <td className="px-3 py-2 font-mono text-semantic-text-secondary">@</td>
                                <td className="px-3 py-2 font-mono text-semantic-text-main">
                                    {MAIL_HOSTNAME} <span className="text-semantic-text-muted">(priority 10)</span>
                                </td>
                            </tr>
                            <tr>
                                <td className="px-3 py-2">
                                    <span className="px-1.5 py-0.5 text-[9px] font-bold bg-semantic-warning-subtle text-semantic-warning rounded">A</span>
                                </td>
                                <td className="px-3 py-2 font-mono text-semantic-text-secondary">mail</td>
                                <td className="px-3 py-2 font-mono text-semantic-text-main">{MAIL_SERVER_IP}</td>
                            </tr>
                            <tr>
                                <td className="px-3 py-2">
                                    <span className="px-1.5 py-0.5 text-[9px] font-bold bg-semantic-success-subtle text-semantic-success rounded">TXT</span>
                                </td>
                                <td className="px-3 py-2 font-mono text-semantic-text-secondary">@</td>
                                <td className="px-3 py-2 font-mono text-semantic-text-muted italic">[mã xác minh]</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// ============================================
// DOMAIN CARD
// ============================================

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
    const isVerified = domain.status === "VERIFIED";
    const isVerifying = verifyingId === domain.id;
    const isToggling = togglingId === domain.id;
    const isDeleting = deletingId === domain.id;

    return (
        <div className="group rounded-xl border border-semantic-border bg-semantic-bg-elevated hover:bg-semantic-bg-hover hover:border-semantic-border-hover transition-all duration-200">
            {/* Main Content */}
            <div className="px-4 py-3.5">
                <div className="flex items-center justify-between gap-4">
                    {/* Left: Domain Info */}
                    <div className="flex items-center gap-3 min-w-0">
                        <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
                            isVerified
                                ? "bg-semantic-success-subtle ring-1 ring-semantic-success/20"
                                : "bg-semantic-warning-subtle ring-1 ring-semantic-warning/20"
                        }`}>
                            {isVerified ? (
                                <IconCheckCircle className="w-4 h-4 text-semantic-success" />
                            ) : (
                                <IconClock className="w-4 h-4 text-semantic-warning" />
                            )}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <h3 className="text-sm font-semibold text-semantic-text-main truncate">{domain.name}</h3>
                                <IconExternalLink className="w-3 h-3 text-semantic-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="flex items-center gap-2">
                                <StatusBadge status={domain.status} isPublic={domain.isPublic} />
                                <span className="text-[11px] text-semantic-text-muted">
                                    {new Date(domain.createdAt).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric"
                                    })}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1.5">
                        {!isVerified && (
                            <button
                                onClick={() => onVerify(domain.id, domain.verificationToken)}
                                disabled={isVerifying}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-semantic-accent-text bg-semantic-accent-subtle hover:opacity-80 disabled:opacity-50 rounded-lg transition-opacity"
                            >
                                {isVerifying ? (
                                    <IconLoader className="w-3 h-3" />
                                ) : (
                                    <IconShieldCheck className="w-3 h-3" />
                                )}
                                Xác minh
                            </button>
                        )}

                        {isVerified && (
                            <button
                                onClick={() => onTogglePublic(domain.id, domain.isPublic)}
                                disabled={isToggling}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-semantic-text-secondary hover:text-semantic-text-main bg-semantic-bg-secondary hover:bg-semantic-bg-hover disabled:opacity-50 rounded-lg transition-colors"
                                title={domain.isPublic ? "Chuyển sang riêng tư" : "Chuyển sang công khai"}
                            >
                                {isToggling ? (
                                    <IconLoader className="w-3 h-3" />
                                ) : domain.isPublic ? (
                                    <IconLock className="w-3 h-3" />
                                ) : (
                                    <IconUnlock className="w-3 h-3" />
                                )}
                                {domain.isPublic ? "Riêng tư" : "Công khai"}
                            </button>
                        )}

                        <button
                            onClick={() => onDelete(domain)}
                            disabled={isDeleting}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-semantic-text-muted hover:text-semantic-danger hover:bg-semantic-danger-subtle disabled:opacity-50 rounded-lg transition-colors"
                            title="Xóa tên miền"
                        >
                            {isDeleting ? (
                                <IconLoader className="w-3 h-3" />
                            ) : (
                                <IconTrash className="w-3 h-3" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Verification Instructions - Show when pending */}
            {!isVerified && (
                <div className="px-4 pb-3.5">
                    <div className="p-3 rounded-lg bg-semantic-warning-subtle border border-semantic-warning/20">
                        <div className="flex items-start gap-2">
                            <IconInfo className="w-4 h-4 text-semantic-warning flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-semantic-warning mb-2">
                                    Thêm bản ghi TXT sau để xác minh quyền sở hữu:
                                </p>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 px-2.5 py-1.5 bg-semantic-bg-primary rounded text-[11px] font-mono text-semantic-text-main break-all">
                                        {domain.verificationToken}
                                    </code>
                                    <button
                                        onClick={() => copyToClipboard(domain.verificationToken)}
                                        className="flex-shrink-0 px-2.5 py-1.5 text-[11px] font-medium text-semantic-text-secondary hover:text-semantic-text-main bg-semantic-bg-secondary hover:bg-semantic-bg-hover rounded transition-colors"
                                    >
                                        Sao chép
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Public Domain Notice */}
            {domain.isPublic && isVerified && (
                <div className="px-4 pb-3.5">
                    <div className="p-3 rounded-lg bg-semantic-accent-subtle border border-semantic-accent/20">
                        <div className="flex items-center gap-2">
                            <IconGlobe className="w-4 h-4 text-semantic-accent-text" />
                            <p className="text-xs text-semantic-accent-text">
                                <span className="font-medium">Tên miền công khai.</span> Người dùng khác có thể tạo email trên tên miền này.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================
// EMPTY STATE
// ============================================

export function DomainsEmptyState({ onAdd }: { onAdd: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-6">
            {/* Icon */}
            <div className="w-16 h-16 rounded-2xl bg-semantic-bg-hover border border-semantic-border flex items-center justify-center mb-5">
                <IconGlobe className="w-8 h-8 text-semantic-text-muted" />
            </div>

            {/* Text */}
            <h3 className="text-lg font-semibold text-semantic-text-main mb-1.5">Chưa có tên miền</h3>
            <p className="text-sm text-semantic-text-secondary text-center max-w-sm mb-6">
                Thêm tên miền đầu tiên để bắt đầu nhận email.
            </p>

            {/* Action */}
            <button
                onClick={onAdd}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-semantic-text-inverse bg-semantic-accent hover:bg-semantic-accent-hover rounded-lg transition-colors"
            >
                <IconPlus className="w-4 h-4" />
                Thêm tên miền đầu tiên
            </button>
        </div>
    );
}
