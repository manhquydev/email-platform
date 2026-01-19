/**
 * UI components for QuickGenerateCard
 * Following Vercel React Best Practices: rendering-hoist-jsx, rerender-memo
 */
import type { Domain } from '../../types';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import { TTL_OPTIONS, type TtlValue } from './quick-generate-card-utils';

/** Empty state when no verified domains */
export function NoDomainState() {
    return (
        <div className="p-6 md:p-8 rounded-2xl flex flex-col items-center justify-center text-center bg-surface-glass border border-white/10">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                <span className="text-3xl filter grayscale opacity-70">📧</span>
            </div>
            <h4 className="text-base font-bold text-text-primary mb-2">Không có tên miền khả dụng</h4>
            <p className="text-text-secondary text-sm max-w-xs mb-6">
                Tài khoản của bạn không có tên miền nào được xác thực hoặc tất cả các tên miền đã hết hạn.
            </p>
            <Button
                variant="primary"
                size="sm"
                onClick={() => window.location.href = '/app?tab=domains'}
            >
                + Quản lý tên miền
            </Button>
        </div>
    );
}

/** Generated email display with copy button */
interface GeneratedEmailDisplayProps {
    email: string;
    copied: boolean;
    onCopy: () => void;
    onRegenerate: () => void;
    loading: boolean;
}

export function GeneratedEmailDisplay({ email, copied, onCopy, onRegenerate, loading }: GeneratedEmailDisplayProps) {
    return (
        <div className="space-y-4 relative z-10">
            <div className="bg-black/40 border border-white/10 rounded-xl p-3 flex items-center justify-between gap-3">
                <span className="font-mono text-primary font-bold truncate">{email}</span>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onCopy}
                    className={cn("shrink-0", copied && "text-green-400 hover:text-green-400")}
                    title="Sao chép địa chỉ email"
                    icon={copied ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    )}
                />
            </div>

            <Button
                variant="secondary"
                onClick={onRegenerate}
                disabled={loading}
                className="w-full justify-center"
                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>}
            >
                Tạo email khác
            </Button>
        </div>
    );
}

/** Domain selector dropdown */
interface DomainSelectorProps {
    domains: Domain[];
    value: string;
    onChange: (id: string) => void;
}

export function DomainSelector({ domains, value, onChange }: DomainSelectorProps) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-secondary ml-1">Tên miền:</label>
            <div className="relative">
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full h-10 px-3 bg-black/40 border border-white/10 rounded-lg text-sm text-white appearance-none focus:outline-none focus:border-primary/50 cursor-pointer transition-colors"
                >
                    {domains.map(d => (
                        <option key={d.id} value={d.id} className="bg-gray-900">
                            {d.name} {d.isPublic ? '(Chia sẻ)' : ''}
                        </option>
                    ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-tertiary">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                </div>
            </div>
        </div>
    );
}

/** TTL selector buttons */
interface TtlSelectorProps {
    value: TtlValue;
    onChange: (value: TtlValue) => void;
}

export function TtlSelector({ value, onChange }: TtlSelectorProps) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-secondary ml-1">Thời hạn:</label>
            <div className="flex gap-1.5 flex-wrap">
                {TTL_OPTIONS.map(opt => (
                    <button
                        key={opt.label}
                        type="button"
                        onClick={() => onChange(opt.value)}
                        className={cn(
                            "px-2.5 py-1.5 text-xs rounded-lg border transition-all",
                            value === opt.value
                                ? "bg-primary/20 border-primary/50 text-primary font-medium"
                                : "bg-black/20 border-white/10 text-text-secondary hover:border-white/20"
                        )}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

/** Generate button with loading state */
interface GenerateButtonProps {
    onClick: () => void;
    disabled: boolean;
    loading: boolean;
}

export function GenerateButton({ onClick, disabled, loading }: GenerateButtonProps) {
    return (
        <Button
            variant="primary"
            onClick={onClick}
            disabled={disabled}
            className="w-full justify-center"
            isLoading={loading}
            icon={!loading && <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
        >
            Tạo email ngay
        </Button>
    );
}
