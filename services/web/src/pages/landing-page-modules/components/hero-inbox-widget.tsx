/**
 * HeroInboxWidget - Instant ephemeral email generator for homepage
 * Shows email address + mini inbox directly on landing page
 * Icons: outline/monochrome only (material-symbols-outlined)
 */
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useEphemeralInbox } from '../../../hooks/useEphemeralInbox';
import { AliasCustomizer } from '../../../components/ephemeral/alias-customizer';

/** Format remaining time as HH:MM:SS */
function formatTimeRemaining(expiresAt: string): string {
    const remaining = new Date(expiresAt).getTime() - Date.now();
    if (remaining <= 0) return '00:00:00';

    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function HeroInboxWidget() {
    const {
        inbox,
        messages,
        isLoading,
        isCreating,
        error,
        createInbox,
        clearInbox,
    } = useEphemeralInbox({ autoCreate: true, enablePolling: true });

    const [timeRemaining, setTimeRemaining] = useState('--:--:--');
    const [copied, setCopied] = useState(false);
    const [customAlias, setCustomAlias] = useState<string | null>(null);
    const [customDomainId, setCustomDomainId] = useState<string | null>(null);

    // Handle alias customization changes
    const handleAliasChange = useCallback((localPart: string | null, domainId: string | null) => {
        setCustomAlias(localPart);
        setCustomDomainId(domainId);
    }, []);

    // Update countdown timer
    useEffect(() => {
        if (!inbox?.expiresAt) return;

        const updateTimer = () => setTimeRemaining(formatTimeRemaining(inbox.expiresAt));
        updateTimer();

        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [inbox?.expiresAt]);

    // Copy email to clipboard
    const handleCopy = async () => {
        if (!inbox?.address) return;

        try {
            await navigator.clipboard.writeText(inbox.address);
            setCopied(true);
            toast.success('Đã sao chép!');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error('Không thể sao chép');
        }
    };

    // Generate new inbox
    const handleRefresh = async () => {
        clearInbox();
        await createInbox({
            localPart: customAlias || undefined,
            domainId: customDomainId || undefined,
        });
    };

    // Loading state
    if (isLoading || isCreating) {
        return (
            <div className="neo-glass rounded-2xl p-6 max-w-xl mx-auto animate-pulse">
                <div className="h-6 bg-white/10 rounded w-3/4 mx-auto mb-4" />
                <div className="h-12 bg-white/5 rounded-lg mb-4" />
                <div className="h-4 bg-white/5 rounded w-1/2 mx-auto" />
            </div>
        );
    }

    // Error state
    if (error && !inbox) {
        return (
            <div className="neo-glass rounded-2xl p-6 max-w-xl mx-auto text-center">
                <span className="material-symbols-outlined text-red-400 !text-[32px] mb-2">error</span>
                <p className="text-red-400 text-sm mb-4">{error}</p>
                <button
                    onClick={() => createInbox()}
                    className="px-4 py-2 bg-[var(--nebula-violet)] hover:bg-[var(--nebula-violet-dark)] text-white rounded-lg text-sm font-medium transition-all"
                >
                    Thử lại
                </button>
            </div>
        );
    }

    // Active inbox state
    return (
        <div className="neo-glass rounded-2xl p-6 max-w-xl mx-auto border border-white/10 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[var(--nebula-violet)] !text-[20px]">mail</span>
                    <span className="text-sm font-medium text-white">Email Tạm Thời</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--nebula-text-secondary)]">
                    <span className="material-symbols-outlined !text-[16px]">schedule</span>
                    <span className="font-mono">{timeRemaining}</span>
                </div>
            </div>

            {/* Alias Customizer (collapsible) */}
            <div className="mb-4">
                <AliasCustomizer
                    onAliasChange={handleAliasChange}
                    disabled={isCreating}
                />
            </div>

            {/* Email Address */}
            <div className="flex items-center gap-2 mb-4">
                <div className="flex-1 bg-black/30 rounded-lg px-4 py-3 border border-white/10">
                    <span className="text-white font-mono text-sm sm:text-base break-all">
                        {inbox?.address || 'Đang tạo...'}
                    </span>
                </div>
                <button
                    onClick={handleCopy}
                    disabled={!inbox?.address}
                    className="h-12 w-12 flex items-center justify-center bg-[var(--nebula-violet)] hover:bg-[var(--nebula-violet-dark)] disabled:opacity-50 text-white rounded-lg transition-all"
                    title="Sao chép"
                >
                    <span className="material-symbols-outlined !text-[20px]">
                        {copied ? 'check' : 'content_copy'}
                    </span>
                </button>
                <button
                    onClick={handleRefresh}
                    disabled={isCreating}
                    className="h-12 w-12 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg transition-all"
                    title="Đổi địa chỉ mới"
                >
                    <span className={`material-symbols-outlined !text-[20px] ${isCreating ? 'animate-spin' : ''}`}>
                        refresh
                    </span>
                </button>
            </div>

            {/* Mini Inbox */}
            <div className="bg-black/20 rounded-lg border border-white/5 mb-4">
                <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
                    <span className="text-xs text-[var(--nebula-text-secondary)]">
                        Hộp thư ({messages.length})
                    </span>
                    <span className="text-xs text-green-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        Tự động làm mới
                    </span>
                </div>
                <div className="max-h-32 overflow-y-auto">
                    {messages.length === 0 ? (
                        <div className="py-6 text-center text-[var(--nebula-text-secondary)] text-sm">
                            <span className="material-symbols-outlined !text-[24px] mb-2 opacity-50">inbox</span>
                            <p>Chưa có email. Đang chờ...</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {messages.slice(0, 3).map((msg) => (
                                <div key={msg.id} className="px-4 py-2 hover:bg-white/5 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[var(--nebula-text-secondary)] !text-[16px]">
                                            person
                                        </span>
                                        <span className="text-xs text-white truncate flex-1">
                                            {msg.from || 'Unknown'}
                                        </span>
                                        <span className="text-xs text-[var(--nebula-text-secondary)]">
                                            {new Date(msg.receivedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-xs text-[var(--nebula-text-secondary)] truncate mt-1">
                                        {msg.subject || '(Không có tiêu đề)'}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
                <Link
                    to={inbox?.token ? `/e/${inbox.token}` : '/e'}
                    className="flex-1 h-10 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg text-sm font-medium transition-all"
                >
                    <span className="material-symbols-outlined !text-[18px]">open_in_new</span>
                    Xem đầy đủ
                </Link>
                <Link
                    to="/register"
                    className="flex-1 h-10 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg text-sm font-medium transition-all"
                >
                    <span className="material-symbols-outlined !text-[18px]">diamond</span>
                    Nâng cấp Premium
                </Link>
            </div>
        </div>
    );
}

export default HeroInboxWidget;
