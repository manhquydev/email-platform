/**
 * Breach Monitor Tab - Monitor emails for data breaches
 */
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { identityService, type BreachStatus, type Breach } from '../../services/identityService';

export function BreachMonitorTab() {
    const [monitoredEmails, setMonitoredEmails] = useState<BreachStatus[]>([]);
    const [breachHistory, setBreachHistory] = useState<Breach[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newEmail, setNewEmail] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [tierLocked, setTierLocked] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [statusRes, historyRes] = await Promise.all([
                identityService.getBreachStatus(),
                identityService.getBreachHistory(),
            ]);
            setMonitoredEmails(statusRes.data || []);
            setBreachHistory(historyRes.data || []);
            setTierLocked(statusRes.tier === 'FREE');
        } catch {
            // May be tier-locked
            setTierLocked(true);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEmail.trim()) return;
        setIsAdding(true);
        try {
            const status = await identityService.enableMonitoring(newEmail);
            setMonitoredEmails(prev => [...prev, status]);
            setNewEmail('');
            toast.success('Đã thêm email vào danh sách giám sát');
        } catch {
            toast.error('Không thể thêm email');
        } finally {
            setIsAdding(false);
        }
    };

    const handleCheck = async (email: string) => {
        try {
            toast.loading('Đang kiểm tra...', { id: 'check' });
            const result = await identityService.checkBreaches(email);
            toast.dismiss('check');
            if (result.breaches.length > 0) {
                toast.error(`Tìm thấy ${result.breaches.length} rò rỉ!`);
                setBreachHistory(prev => [...result.breaches, ...prev]);
            } else {
                toast.success('Không tìm thấy rò rỉ nào!');
            }
            await loadData(); // Refresh status
        } catch {
            toast.dismiss('check');
            toast.error('Lỗi kiểm tra');
        }
    };

    const handleRemove = async (email: string) => {
        try {
            await identityService.disableMonitoring(email);
            setMonitoredEmails(prev => prev.filter(e => e.email !== email));
            toast.success('Đã xóa khỏi danh sách giám sát');
        } catch {
            toast.error('Không thể xóa');
        }
    };

    if (isLoading) {
        return <LoadingState />;
    }

    if (tierLocked) {
        return <UpgradePrompt />;
    }

    return (
        <div className="space-y-6">
            {/* Add Email Form */}
            <form onSubmit={handleAddEmail} className="neo-glass rounded-xl p-4 flex gap-3">
                <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Thêm email cần giám sát..."
                    className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-[var(--nebula-text-muted)] focus:border-[var(--nebula-violet)] focus:outline-none"
                />
                <button
                    type="submit"
                    disabled={isAdding}
                    className="px-6 py-3 bg-[var(--nebula-violet)] hover:bg-[var(--nebula-violet-dark)] disabled:opacity-50 text-white rounded-lg font-medium transition-all"
                >
                    {isAdding ? '...' : 'Thêm'}
                </button>
            </form>

            {/* Monitored Emails */}
            <div>
                <h2 className="text-lg font-semibold text-white mb-4">Email đang giám sát ({monitoredEmails.length})</h2>
                {monitoredEmails.length === 0 ? (
                    <p className="text-[var(--nebula-text-secondary)] text-center py-8">Chưa có email nào được giám sát</p>
                ) : (
                    <div className="space-y-3">
                        {monitoredEmails.map((status) => (
                            <EmailStatusCard
                                key={status.email}
                                status={status}
                                onCheck={() => handleCheck(status.email)}
                                onRemove={() => handleRemove(status.email)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Breach History */}
            {breachHistory.length > 0 && (
                <div>
                    <h2 className="text-lg font-semibold text-white mb-4">Lịch sử rò rỉ</h2>
                    <div className="space-y-3">
                        {breachHistory.slice(0, 10).map((breach) => (
                            <BreachCard key={breach.id} breach={breach} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function EmailStatusCard({ status, onCheck, onRemove }: { status: BreachStatus; onCheck: () => void; onRemove: () => void }) {
    const severityColors = {
        safe: 'bg-green-500/20 text-green-400 border-green-500/30',
        low: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        medium: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
        high: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    const severityLabels = { safe: 'An toàn', low: 'Thấp', medium: 'Trung bình', high: 'Cao' };

    return (
        <div className="neo-glass rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-white truncate">{status.email}</span>
                    <span className={`px-2 py-0.5 rounded border text-xs ${severityColors[status.severity]}`}>
                        {severityLabels[status.severity]}
                    </span>
                </div>
                <p className="text-xs text-[var(--nebula-text-secondary)]">
                    {status.breachCount} rò rỉ được tìm thấy
                    {status.lastChecked && ` • Kiểm tra lần cuối: ${new Date(status.lastChecked).toLocaleDateString('vi-VN')}`}
                </p>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={onCheck} className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Kiểm tra ngay">
                    <span className="material-symbols-outlined !text-[20px] text-[var(--nebula-text-secondary)]">refresh</span>
                </button>
                <button onClick={onRemove} className="p-2 hover:bg-red-500/10 rounded-lg transition-colors" title="Xóa">
                    <span className="material-symbols-outlined !text-[20px] text-red-400">delete</span>
                </button>
            </div>
        </div>
    );
}

function BreachCard({ breach }: { breach: Breach }) {
    const severityColors = {
        low: 'border-l-yellow-500',
        medium: 'border-l-orange-500',
        high: 'border-l-red-500',
    };

    return (
        <div className={`neo-glass rounded-xl p-4 border-l-4 ${severityColors[breach.severity]}`}>
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h4 className="font-medium text-white">{breach.name}</h4>
                    <p className="text-xs text-[var(--nebula-text-secondary)] mt-1">{breach.domain}</p>
                </div>
                <span className="text-xs text-[var(--nebula-text-muted)]">
                    {new Date(breach.breachDate).toLocaleDateString('vi-VN')}
                </span>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
                {breach.dataClasses.slice(0, 5).map((dc) => (
                    <span key={dc} className="px-2 py-0.5 bg-white/5 rounded text-xs text-[var(--nebula-text-secondary)]">{dc}</span>
                ))}
            </div>
        </div>
    );
}

function UpgradePrompt() {
    return (
        <div className="neo-glass rounded-xl p-12 text-center">
            <span className="material-symbols-outlined text-[48px] text-orange-400 mb-4">lock</span>
            <h3 className="text-xl font-semibold text-white mb-2">Tính năng Premium</h3>
            <p className="text-[var(--nebula-text-secondary)] mb-4 max-w-md mx-auto">
                Giám sát rò rỉ dữ liệu yêu cầu gói GUARD trở lên. Nâng cấp để bảo vệ email của bạn.
            </p>
            <a href="/plans" className="inline-block px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg font-medium transition-all hover:opacity-90">
                Nâng cấp ngay
            </a>
        </div>
    );
}

function LoadingState() {
    return (
        <div className="space-y-4">
            {[1, 2, 3].map((i) => (
                <div key={i} className="neo-glass rounded-xl p-4 animate-pulse">
                    <div className="h-5 bg-white/10 rounded w-1/3 mb-2"></div>
                    <div className="h-4 bg-white/10 rounded w-1/4"></div>
                </div>
            ))}
        </div>
    );
}

export default BreachMonitorTab;
