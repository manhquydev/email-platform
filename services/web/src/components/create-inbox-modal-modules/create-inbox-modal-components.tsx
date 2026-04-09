/**
 * UI components for CreateInboxModal
 */
import type { Domain } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { cn } from '../../utils/cn';
import { TTL_OPTIONS } from './create-inbox-modal-hooks';

/** Modal header */
export function ModalHeader({ onClose }: { onClose: () => void }) {
    return (
        <div className="flex items-center justify-between mb-6">
            <h2 id="create-inbox-modal-title" className="text-xl font-bold text-nebula-text">Tạo email mới</h2>
            <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-nebula-elevated text-text-secondary transition-colors"
                title="Đóng"
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
}

/** Email preview */
export function EmailPreview({ previewEmail }: { previewEmail: string }) {
    return (
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex flex-col items-center text-center">
            <span className="text-xs font-medium text-primary/80 uppercase tracking-widest mb-1">Địa chỉ email của bạn</span>
            <span className="text-lg sm:text-xl font-bold text-nebula-text break-all">
                {previewEmail || 'chọn domain...'}
            </span>
        </div>
    );
}

/** No domains state */
export function NoDomainState() {
    return (
        <div className="flex flex-col items-center justify-center py-8 text-center text-text-secondary">
            <div className="text-4xl mb-4">📧</div>
            <h4 className="text-lg font-medium text-nebula-text mb-2">Chưa có domain khả dụng</h4>
            <p className="mb-6">Tài khoản của bạn chưa có domain nào được xác thực.</p>
            <Button variant="primary" onClick={() => window.location.href = '/my-domains'}>
                + Quản lý Domain
            </Button>
        </div>
    );
}

/** Local part input with randomize button */
interface LocalPartInputProps {
    value: string;
    onChange: (value: string) => void;
    onRandomize: () => void;
}

export function LocalPartInput({ value, onChange, onRandomize }: LocalPartInputProps) {
    return (
        <div className="flex gap-2 items-end">
            <div className="flex-1">
                <Input
                    label="Tên email"
                    id="localPart"
                    value={value}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value.toLowerCase())}
                    placeholder="vd: contact, info, hello"
                    autoFocus
                />
            </div>
            <Button
                variant="secondary"
                size="icon"
                onClick={onRandomize}
                title="Tạo ngẫu nhiên"
                className="mb-[2px] h-[46px] w-[46px]"
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
            </Button>
        </div>
    );
}

/** Domain select */
interface DomainSelectProps {
    domains: Domain[];
    value: string;
    onChange: (value: string) => void;
    useRandomDomainPool: boolean;
    randomDomainIds: string[];
    onRandomPoolToggle: (enabled: boolean) => void;
    onRandomDomainSelection: (domainId: string, selected: boolean) => void;
}

export function DomainSelect({
    domains,
    value,
    onChange,
    useRandomDomainPool,
    randomDomainIds,
    onRandomPoolToggle,
    onRandomDomainSelection
}: DomainSelectProps) {
    return (
        <div className="space-y-2">
            <label htmlFor="domain" className="text-sm font-medium text-text-secondary ml-1">Domain</label>
            <div className="relative">
                <select
                    id="domain"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={useRandomDomainPool}
                    className={cn(
                        "w-full h-[46px] px-4 bg-nebula-elevated border border-nebula-border rounded-xl",
                        "text-nebula-text outline-none transition-all duration-200",
                        "focus:border-primary/50 focus:ring-1 focus:ring-primary/50",
                        "appearance-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    )}
                >
                    {domains.map(d => (
                        <option key={d.id} value={d.id} className="bg-nebula-surface text-nebula-text">
                            @{d.name} {d.isPublic ? '(Shared)' : '(Private)'}
                        </option>
                    ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-tertiary">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer select-none">
                <input
                    type="checkbox"
                    checked={useRandomDomainPool}
                    onChange={(event) => onRandomPoolToggle(event.target.checked)}
                    className="h-4 w-4 rounded border-nebula-border bg-nebula-elevated accent-primary"
                />
                Random domain từ nhóm đã chọn
            </label>

            {useRandomDomainPool && (
                <div className="rounded-xl border border-nebula-border bg-nebula-elevated/40 p-3 space-y-2">
                    <p className="text-xs text-text-secondary">
                        Chọn domain để hệ thống random khi tạo email ({randomDomainIds.length}/{domains.length} đã chọn)
                    </p>
                    <div className="space-y-1.5 max-h-36 overflow-auto pr-1">
                        {domains.map(domain => {
                            const checked = randomDomainIds.includes(domain.id);
                            return (
                                <label
                                    key={domain.id}
                                    className={cn(
                                        "flex items-center gap-2 rounded-lg px-2.5 py-2 border transition-colors cursor-pointer",
                                        checked
                                            ? "border-primary/50 bg-primary/10"
                                            : "border-nebula-border hover:border-primary/30"
                                    )}
                                >
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={(event) => onRandomDomainSelection(domain.id, event.target.checked)}
                                        className="h-4 w-4 rounded border-nebula-border bg-nebula-elevated accent-primary"
                                    />
                                    <span className="text-sm text-nebula-text">
                                        @{domain.name} {domain.isPublic ? '(Shared)' : '(Private)'}
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                    {randomDomainIds.length === 0 && (
                        <p className="text-xs text-amber-300">Vui lòng chọn ít nhất 1 domain để random.</p>
                    )}
                </div>
            )}
        </div>
    );
}

/** TTL select */
interface TTLSelectProps {
    value: number | null;
    onChange: (value: number | null) => void;
}

export function TTLSelect({ value, onChange }: TTLSelectProps) {
    return (
        <div className="space-y-2">
            <label htmlFor="ttl" className="text-sm font-medium text-text-secondary ml-1">Thời hạn</label>
            <div className="relative">
                <select
                    id="ttl"
                    value={value === null ? 'null' : String(value)}
                    onChange={(e) => onChange(e.target.value === 'null' ? null : Number(e.target.value))}
                    className={cn(
                        "w-full h-[46px] px-4 bg-nebula-elevated border border-nebula-border rounded-xl",
                        "text-nebula-text outline-none transition-all duration-200",
                        "focus:border-primary/50 focus:ring-1 focus:ring-primary/50",
                        "appearance-none cursor-pointer"
                    )}
                >
                    {TTL_OPTIONS.map(opt => (
                        <option key={opt.label} value={opt.value === null ? 'null' : String(opt.value)} className="bg-nebula-surface text-nebula-text">
                            {opt.label}
                        </option>
                    ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-tertiary">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
            </div>
        </div>
    );
}

/** Footer buttons */
interface ModalFooterProps {
    loading: boolean;
    canCreate: boolean;
    onClose: () => void;
    onCreate: () => void;
}

export function ModalFooter({ loading, canCreate, onClose, onCreate }: ModalFooterProps) {
    return (
        <div className="flex gap-3 justify-end mt-8">
            <Button variant="ghost" onClick={onClose} disabled={loading}>
                Hủy
            </Button>
            <Button
                variant="primary"
                onClick={onCreate}
                disabled={loading || !canCreate}
                isLoading={loading}
                icon={
                    !loading && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                    )
                }
            >
                Tạo Email
            </Button>
        </div>
    );
}
