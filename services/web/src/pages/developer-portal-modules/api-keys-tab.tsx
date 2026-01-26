/**
 * API Keys Tab - Manage API keys with create, revoke, copy functionality
 */
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { developerService, type APIKey, type APIKeyCreateResponse } from '../../services/developerService';
import { ConfirmModal } from '../../components/ui/ConfirmModal';

export function APIKeysTab() {
    const [keys, setKeys] = useState<APIKey[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newlyCreatedKey, setNewlyCreatedKey] = useState<APIKeyCreateResponse | null>(null);
    const [confirmRevoke, setConfirmRevoke] = useState<APIKey | null>(null);

    useEffect(() => {
        loadKeys();
    }, []);

    const loadKeys = async () => {
        setError(null);
        try {
            const response = await developerService.listKeys();
            setKeys(response.data || []);
        } catch {
            setError('Không thể tải danh sách API keys. Vui lòng thử lại.');
            toast.error('Không thể tải API keys');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRevoke = async (key: APIKey) => {
        setConfirmRevoke(key);
    };

    const confirmRevokeKey = async () => {
        if (!confirmRevoke) return;
        const key = confirmRevoke;
        setConfirmRevoke(null);
        try {
            await developerService.revokeKey(key.id);
            setKeys(prev => prev.filter(k => k.id !== key.id));
            toast.success('Đã thu hồi API key');
        } catch {
            toast.error('Không thể thu hồi key');
        }
    };

    const handleCreated = (response: APIKeyCreateResponse) => {
        setNewlyCreatedKey(response);
        setShowCreateModal(false);
        setKeys(prev => [{
            id: response.id,
            name: response.name,
            keyPreview: response.keyPreview,
            createdAt: response.createdAt,
            lastUsedAt: null,
            expiresAt: null,
            permissions: ['read', 'write'],
            isActive: true,
        }, ...prev]);
    };

    if (isLoading) {
        return <LoadingState />;
    }

    if (error) {
        return <ErrorState message={error} onRetry={loadKeys} />;
    }

    return (
        <div className="space-y-6">
            {/* Confirm Revoke Modal */}
            <ConfirmModal
                isOpen={!!confirmRevoke}
                title="Thu hồi API Key"
                message={`Bạn có chắc muốn thu hồi API key "${confirmRevoke?.name}"? Hành động này không thể hoàn tác.`}
                confirmText="Thu hồi"
                cancelText="Hủy"
                variant="danger"
                onConfirm={confirmRevokeKey}
                onCancel={() => setConfirmRevoke(null)}
            />
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-semibold text-white">API Keys</h2>
                    <p className="text-sm text-[var(--nebula-text-secondary)]">Quản lý keys để truy cập API</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--nebula-violet)] hover:bg-[var(--nebula-violet-dark)] text-white rounded-lg font-medium text-sm transition-all"
                >
                    <span className="material-symbols-outlined !text-[18px]">add</span>
                    Tạo Key mới
                </button>
            </div>

            {/* Newly Created Key Warning */}
            {newlyCreatedKey && (
                <NewKeyDisplay keyData={newlyCreatedKey} onDismiss={() => setNewlyCreatedKey(null)} />
            )}

            {/* Keys List */}
            {keys.length === 0 ? (
                <EmptyState onCreateClick={() => setShowCreateModal(true)} />
            ) : (
                <div className="space-y-3">
                    {keys.map((key) => (
                        <KeyCard key={key.id} apiKey={key} onRevoke={() => handleRevoke(key)} />
                    ))}
                </div>
            )}

            {/* Security Notice */}
            <div className="neo-glass rounded-xl p-4 border-l-4 border-l-yellow-500">
                <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-yellow-400 !text-[20px]">warning</span>
                    <div>
                        <h4 className="font-medium text-white">Bảo mật API Key</h4>
                        <p className="text-sm text-[var(--nebula-text-secondary)] mt-1">
                            API key chỉ hiển thị đầy đủ một lần khi tạo. Lưu trữ an toàn và không chia sẻ công khai.
                            Nếu key bị lộ, hãy thu hồi ngay và tạo key mới.
                        </p>
                    </div>
                </div>
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <CreateKeyModal onClose={() => setShowCreateModal(false)} onCreated={handleCreated} />
            )}
        </div>
    );
}

function NewKeyDisplay({ keyData, onDismiss }: { keyData: APIKeyCreateResponse; onDismiss: () => void }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(keyData.key);
            setCopied(true);
            toast.success('Đã copy API key');
            setTimeout(() => setCopied(false), 3000);
        } catch {
            toast.error('Không thể copy. Vui lòng copy thủ công.');
        }
    };

    return (
        <div className="neo-glass rounded-xl p-6 border-2 border-green-500/50 bg-green-500/5">
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-green-400">check_circle</span>
                        <h3 className="font-semibold text-white">API Key đã tạo!</h3>
                    </div>
                    <p className="text-sm text-[var(--nebula-text-secondary)] mb-4">
                        <strong className="text-yellow-400">Quan trọng:</strong> Copy và lưu key này ngay. Bạn sẽ không thể xem lại key đầy đủ sau khi đóng.
                    </p>
                    <div className="flex items-center gap-2">
                        <code className="flex-1 px-4 py-3 bg-black/30 rounded-lg font-mono text-sm text-green-400 break-all">
                            {keyData.key}
                        </code>
                        <button
                            onClick={handleCopy}
                            className="px-4 py-3 bg-[var(--nebula-violet)] hover:bg-[var(--nebula-violet-dark)] text-white rounded-lg transition-all"
                        >
                            {copied ? '✓ Copied' : 'Copy'}
                        </button>
                    </div>
                </div>
                <button onClick={onDismiss} className="p-2 hover:bg-white/10 rounded-lg">
                    <span className="material-symbols-outlined text-white">close</span>
                </button>
            </div>
        </div>
    );
}

function KeyCard({ apiKey, onRevoke }: { apiKey: APIKey; onRevoke: () => void }) {
    const copyPreview = async () => {
        try {
            await navigator.clipboard.writeText(apiKey.keyPreview);
            toast.success('Đã copy key preview');
        } catch {
            toast.error('Không thể copy');
        }
    };

    return (
        <div className="neo-glass rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-white">{apiKey.name}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${apiKey.isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                        {apiKey.isActive ? 'Active' : 'Revoked'}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <code className="text-sm text-[var(--nebula-text-muted)] font-mono">{apiKey.keyPreview}</code>
                    <button onClick={copyPreview} className="text-xs text-[var(--nebula-violet)] hover:underline">Copy</button>
                </div>
                <div className="flex gap-4 mt-2 text-xs text-[var(--nebula-text-muted)]">
                    <span>Tạo: {new Date(apiKey.createdAt).toLocaleDateString('vi-VN')}</span>
                    {apiKey.lastUsedAt && <span>Dùng lần cuối: {new Date(apiKey.lastUsedAt).toLocaleDateString('vi-VN')}</span>}
                </div>
            </div>
            <button
                onClick={onRevoke}
                className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Thu hồi"
            >
                <span className="material-symbols-outlined !text-[20px] text-red-400">delete</span>
            </button>
        </div>
    );
}

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
    return (
        <div className="neo-glass rounded-xl p-12 text-center">
            <span className="material-symbols-outlined text-[48px] text-[var(--nebula-violet)] mb-4">key</span>
            <h3 className="text-xl font-semibold text-white mb-2">Chưa có API Key</h3>
            <p className="text-[var(--nebula-text-secondary)] mb-4">Tạo API key để bắt đầu sử dụng API</p>
            <button onClick={onCreateClick} className="px-6 py-3 bg-[var(--nebula-violet)] hover:bg-[var(--nebula-violet-dark)] text-white rounded-lg font-medium transition-all">
                Tạo API Key đầu tiên
            </button>
        </div>
    );
}

function LoadingState() {
    return (
        <div className="space-y-4">
            {[1, 2].map((i) => (
                <div key={i} className="neo-glass rounded-xl p-4 animate-pulse">
                    <div className="h-5 bg-white/10 rounded w-1/4 mb-2"></div>
                    <div className="h-4 bg-white/10 rounded w-1/3 mb-2"></div>
                    <div className="h-3 bg-white/10 rounded w-1/2"></div>
                </div>
            ))}
        </div>
    );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
    return (
        <div className="neo-glass rounded-xl p-12 text-center">
            <span className="material-symbols-outlined text-[48px] text-red-400 mb-4">error</span>
            <h3 className="text-xl font-semibold text-white mb-2">Đã xảy ra lỗi</h3>
            <p className="text-[var(--nebula-text-secondary)] mb-4">{message}</p>
            <button
                onClick={onRetry}
                className="px-6 py-3 bg-[var(--nebula-violet)] hover:bg-[var(--nebula-violet-dark)] text-white rounded-lg font-medium transition-all"
            >
                Thử lại
            </button>
        </div>
    );
}

function CreateKeyModal({ onClose, onCreated }: { onClose: () => void; onCreated: (key: APIKeyCreateResponse) => void }) {
    const [name, setName] = useState('');
    const [permissions, setPermissions] = useState<string[]>(['read', 'write']);
    const [isCreating, setIsCreating] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error('Vui lòng nhập tên cho API key');
            return;
        }
        setIsCreating(true);
        try {
            const response = await developerService.createKey(name, permissions);
            onCreated(response);
            toast.success('Đã tạo API key mới!');
        } catch {
            toast.error('Không thể tạo API key. Vui lòng thử lại.');
        } finally {
            setIsCreating(false);
        }
    };

    const togglePermission = (perm: string) => {
        setPermissions(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-[var(--nebula-surface)] rounded-xl border border-white/10 shadow-2xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <h3 className="font-semibold text-white">Tạo API Key mới</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
                        <span className="material-symbols-outlined text-white">close</span>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm text-[var(--nebula-text-secondary)] mb-2">Tên Key</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="VD: Production, Development..."
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-[var(--nebula-text-muted)] focus:border-[var(--nebula-violet)] focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-[var(--nebula-text-secondary)] mb-2">Quyền</label>
                        <div className="flex gap-3">
                            {['read', 'write'].map((perm) => (
                                <label key={perm} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={permissions.includes(perm)}
                                        onChange={() => togglePermission(perm)}
                                        className="rounded"
                                    />
                                    <span className="text-sm text-white capitalize">{perm}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={isCreating}
                        className="w-full py-3 bg-[var(--nebula-violet)] hover:bg-[var(--nebula-violet-dark)] disabled:opacity-50 text-white rounded-lg font-medium transition-all"
                    >
                        {isCreating ? 'Đang tạo...' : 'Tạo API Key'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default APIKeysTab;
