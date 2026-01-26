/**
 * Aliases Tab - Manage email aliases with forwarding
 */
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { identityService, type Alias } from '../../services/identityService';

export function AliasesTab() {
    const [aliases, setAliases] = useState<Alias[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        loadAliases();
    }, []);

    const loadAliases = async () => {
        try {
            const response = await identityService.listAliases();
            setAliases(response.data || []);
        } catch (error) {
            toast.error('Không thể tải danh sách bí danh');
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggle = async (alias: Alias) => {
        // Optimistic update
        setAliases(prev => prev.map(a =>
            a.id === alias.id ? { ...a, isActive: !a.isActive } : a
        ));
        try {
            await identityService.toggleAlias(alias.id);
            toast.success(alias.isActive ? 'Đã tắt bí danh' : 'Đã bật bí danh');
        } catch {
            // Revert on error
            setAliases(prev => prev.map(a =>
                a.id === alias.id ? { ...a, isActive: alias.isActive } : a
            ));
            toast.error('Không thể thay đổi trạng thái');
        }
    };

    const handleDelete = async (alias: Alias) => {
        if (!confirm(`Xóa bí danh ${alias.address}?`)) return;
        try {
            await identityService.deleteAlias(alias.id);
            setAliases(prev => prev.filter(a => a.id !== alias.id));
            toast.success('Đã xóa bí danh');
        } catch {
            toast.error('Không thể xóa bí danh');
        }
    };

    if (isLoading) {
        return <LoadingState />;
    }

    return (
        <div className="space-y-6">
            {/* Stats Header */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon="tag" label="Tổng bí danh" value={aliases.length} />
                <StatCard icon="check_circle" label="Đang hoạt động" value={aliases.filter(a => a.isActive).length} color="green" />
                <StatCard icon="forward_to_inbox" label="Có chuyển tiếp" value={aliases.filter(a => a.forwardTo).length} color="blue" />
                <StatCard icon="block" label="Đã chặn" value={aliases.reduce((acc, a) => acc + (a.stats?.blocked || 0), 0)} color="red" />
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-white">Danh sách bí danh</h2>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--nebula-violet)] hover:bg-[var(--nebula-violet-dark)] text-white rounded-lg font-medium text-sm transition-all"
                >
                    <span className="material-symbols-outlined !text-[18px]">add</span>
                    Tạo bí danh
                </button>
            </div>

            {/* Alias List */}
            {aliases.length === 0 ? (
                <EmptyState onCreateClick={() => setShowCreateModal(true)} />
            ) : (
                <div className="space-y-3">
                    {aliases.map((alias) => (
                        <AliasCard
                            key={alias.id}
                            alias={alias}
                            onToggle={() => handleToggle(alias)}
                            onDelete={() => handleDelete(alias)}
                        />
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <CreateAliasModal
                    onClose={() => setShowCreateModal(false)}
                    onCreated={(newAlias) => {
                        setAliases(prev => [newAlias, ...prev]);
                        setShowCreateModal(false);
                    }}
                />
            )}
        </div>
    );
}

function StatCard({ icon, label, value, color = 'violet' }: { icon: string; label: string; value: number; color?: string }) {
    const colors = {
        violet: 'bg-[var(--nebula-violet)]/10 text-[var(--nebula-violet)]',
        green: 'bg-green-500/10 text-green-400',
        blue: 'bg-blue-500/10 text-blue-400',
        red: 'bg-red-500/10 text-red-400',
    };
    return (
        <div className="neo-glass rounded-xl p-4">
            <div className={`w-10 h-10 rounded-lg ${colors[color as keyof typeof colors]} flex items-center justify-center mb-3`}>
                <span className="material-symbols-outlined !text-[20px]">{icon}</span>
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-[var(--nebula-text-secondary)]">{label}</p>
        </div>
    );
}

function AliasCard({ alias, onToggle, onDelete }: { alias: Alias; onToggle: () => void; onDelete: () => void }) {
    return (
        <div className="neo-glass rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-white truncate">{alias.address}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${alias.isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                        {alias.isActive ? 'Hoạt động' : 'Tắt'}
                    </span>
                </div>
                {alias.forwardTo && (
                    <p className="text-xs text-[var(--nebula-text-secondary)] truncate">
                        → {alias.forwardTo}
                    </p>
                )}
                <div className="flex gap-4 mt-2 text-xs text-[var(--nebula-text-muted)]">
                    <span>📥 {alias.stats?.received || 0} nhận</span>
                    <span>📤 {alias.stats?.forwarded || 0} chuyển tiếp</span>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={onToggle}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    title={alias.isActive ? 'Tắt' : 'Bật'}
                >
                    <span className="material-symbols-outlined !text-[20px] text-[var(--nebula-text-secondary)]">
                        {alias.isActive ? 'toggle_on' : 'toggle_off'}
                    </span>
                </button>
                <button
                    onClick={onDelete}
                    className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Xóa"
                >
                    <span className="material-symbols-outlined !text-[20px] text-red-400">delete</span>
                </button>
            </div>
        </div>
    );
}

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
    return (
        <div className="neo-glass rounded-xl p-12 text-center">
            <span className="material-symbols-outlined text-[48px] text-[var(--nebula-violet)] mb-4">alternate_email</span>
            <h3 className="text-xl font-semibold text-white mb-2">Chưa có bí danh</h3>
            <p className="text-[var(--nebula-text-secondary)] mb-4">Tạo bí danh email để bảo vệ địa chỉ thật của bạn</p>
            <button onClick={onCreateClick} className="px-6 py-3 bg-[var(--nebula-violet)] hover:bg-[var(--nebula-violet-dark)] text-white rounded-lg font-medium transition-all">
                Tạo bí danh đầu tiên
            </button>
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

function CreateAliasModal({ onClose, onCreated }: { onClose: () => void; onCreated: (alias: Alias) => void }) {
    const [localPart, setLocalPart] = useState('');
    const [forwardTo, setForwardTo] = useState('');
    const [isRandom, setIsRandom] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        try {
            const newAlias = await identityService.createAlias({
                localPart: isRandom ? undefined : localPart,
                domainId: 'default', // Use default domain
                forwardTo: forwardTo || undefined,
                random: isRandom,
            });
            toast.success('Đã tạo bí danh mới!');
            onCreated(newAlias);
        } catch {
            toast.error('Không thể tạo bí danh');
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-[var(--nebula-surface)] rounded-xl border border-white/10 shadow-2xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <h3 className="font-semibold text-white">Tạo bí danh mới</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
                        <span className="material-symbols-outlined text-white">close</span>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="flex items-center gap-2 mb-3">
                            <input
                                type="checkbox"
                                checked={isRandom}
                                onChange={(e) => setIsRandom(e.target.checked)}
                                className="rounded"
                            />
                            <span className="text-sm text-white">Tạo bí danh ngẫu nhiên</span>
                        </label>
                        {!isRandom && (
                            <input
                                type="text"
                                value={localPart}
                                onChange={(e) => setLocalPart(e.target.value)}
                                placeholder="tên bí danh"
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-[var(--nebula-text-muted)] focus:border-[var(--nebula-violet)] focus:outline-none"
                            />
                        )}
                    </div>
                    <div>
                        <label className="block text-sm text-[var(--nebula-text-secondary)] mb-2">Chuyển tiếp đến (tùy chọn)</label>
                        <input
                            type="email"
                            value={forwardTo}
                            onChange={(e) => setForwardTo(e.target.value)}
                            placeholder="email@example.com"
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-[var(--nebula-text-muted)] focus:border-[var(--nebula-violet)] focus:outline-none"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isCreating}
                        className="w-full py-3 bg-[var(--nebula-violet)] hover:bg-[var(--nebula-violet-dark)] disabled:opacity-50 text-white rounded-lg font-medium transition-all"
                    >
                        {isCreating ? 'Đang tạo...' : 'Tạo bí danh'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default AliasesTab;
