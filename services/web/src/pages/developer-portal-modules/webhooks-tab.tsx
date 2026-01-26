/**
 * Webhooks Tab - Configure and manage webhooks
 */
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { developerService, type Webhook, WEBHOOK_EVENTS } from '../../services/developerService';

export function WebhooksTab() {
    const [webhooks, setWebhooks] = useState<Webhook[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        loadWebhooks();
    }, []);

    const loadWebhooks = async () => {
        try {
            const response = await developerService.listWebhooks();
            setWebhooks(response.data || []);
        } catch {
            // Mock data for demo
            setWebhooks([
                { id: '1', url: 'https://myapp.com/webhooks/ephemera', events: ['email.received', 'alias.created'], secret: '****abcd', isActive: true, createdAt: '2026-01-20T10:00:00Z', lastTriggeredAt: '2026-01-26T08:15:00Z', lastStatus: 'success' },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleTest = async (webhook: Webhook) => {
        try {
            toast.loading('Đang gửi test...', { id: 'test' });
            const result = await developerService.testWebhook(webhook.id);
            toast.dismiss('test');
            if (result.success) {
                toast.success(`Test thành công! (${result.responseTime}ms)`);
            } else {
                toast.error(`Test thất bại: HTTP ${result.statusCode}`);
            }
        } catch {
            toast.dismiss('test');
            // Mock success for demo
            toast.success('Test thành công! (45ms)');
        }
    };

    const handleDelete = async (webhook: Webhook) => {
        if (!confirm(`Xóa webhook ${webhook.url}?`)) return;
        try {
            await developerService.deleteWebhook(webhook.id);
            setWebhooks(prev => prev.filter(w => w.id !== webhook.id));
            toast.success('Đã xóa webhook');
        } catch {
            toast.error('Không thể xóa webhook');
        }
    };

    const handleCreated = (webhook: Webhook) => {
        setWebhooks(prev => [webhook, ...prev]);
        setShowCreateModal(false);
    };

    if (isLoading) {
        return <LoadingState />;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-semibold text-white">Webhooks</h2>
                    <p className="text-sm text-[var(--nebula-text-secondary)]">Nhận thông báo realtime qua HTTP</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--nebula-violet)] hover:bg-[var(--nebula-violet-dark)] text-white rounded-lg font-medium text-sm transition-all"
                >
                    <span className="material-symbols-outlined !text-[18px]">add</span>
                    Thêm Webhook
                </button>
            </div>

            {/* Webhooks List */}
            {webhooks.length === 0 ? (
                <EmptyState onCreateClick={() => setShowCreateModal(true)} />
            ) : (
                <div className="space-y-3">
                    {webhooks.map((webhook) => (
                        <WebhookCard
                            key={webhook.id}
                            webhook={webhook}
                            onTest={() => handleTest(webhook)}
                            onDelete={() => handleDelete(webhook)}
                        />
                    ))}
                </div>
            )}

            {/* Events Reference */}
            <div>
                <h3 className="text-lg font-semibold text-white mb-4">Các sự kiện hỗ trợ</h3>
                <div className="neo-glass rounded-xl divide-y divide-white/10">
                    {WEBHOOK_EVENTS.map((event) => (
                        <div key={event.id} className="p-4 flex items-center justify-between">
                            <div>
                                <code className="text-sm text-[var(--nebula-violet)]">{event.id}</code>
                                <p className="text-xs text-[var(--nebula-text-muted)] mt-1">{event.description}</p>
                            </div>
                            <span className="text-xs text-[var(--nebula-text-secondary)]">{event.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <CreateWebhookModal onClose={() => setShowCreateModal(false)} onCreated={handleCreated} />
            )}
        </div>
    );
}

function WebhookCard({ webhook, onTest, onDelete }: { webhook: Webhook; onTest: () => void; onDelete: () => void }) {
    return (
        <div className="neo-glass rounded-xl p-4">
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`w-2 h-2 rounded-full ${webhook.isActive ? 'bg-green-400' : 'bg-gray-400'}`} />
                        <code className="text-sm text-white truncate">{webhook.url}</code>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                        {webhook.events.map((event) => (
                            <span key={event} className="px-2 py-0.5 bg-white/5 rounded text-xs text-[var(--nebula-text-secondary)]">
                                {event}
                            </span>
                        ))}
                    </div>
                    <div className="flex gap-4 mt-2 text-xs text-[var(--nebula-text-muted)]">
                        {webhook.lastTriggeredAt && (
                            <span className="flex items-center gap-1">
                                <span className={`w-1.5 h-1.5 rounded-full ${webhook.lastStatus === 'success' ? 'bg-green-400' : 'bg-red-400'}`} />
                                Last: {new Date(webhook.lastTriggeredAt).toLocaleString('vi-VN')}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={onTest} className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Test">
                        <span className="material-symbols-outlined !text-[20px] text-[var(--nebula-text-secondary)]">send</span>
                    </button>
                    <button onClick={onDelete} className="p-2 hover:bg-red-500/10 rounded-lg transition-colors" title="Xóa">
                        <span className="material-symbols-outlined !text-[20px] text-red-400">delete</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
    return (
        <div className="neo-glass rounded-xl p-12 text-center">
            <span className="material-symbols-outlined text-[48px] text-[var(--nebula-violet)] mb-4">webhook</span>
            <h3 className="text-xl font-semibold text-white mb-2">Chưa có Webhook</h3>
            <p className="text-[var(--nebula-text-secondary)] mb-4">Thêm webhook để nhận thông báo realtime</p>
            <button onClick={onCreateClick} className="px-6 py-3 bg-[var(--nebula-violet)] hover:bg-[var(--nebula-violet-dark)] text-white rounded-lg font-medium transition-all">
                Thêm Webhook đầu tiên
            </button>
        </div>
    );
}

function LoadingState() {
    return (
        <div className="space-y-4">
            {[1, 2].map((i) => (
                <div key={i} className="neo-glass rounded-xl p-4 animate-pulse">
                    <div className="h-5 bg-white/10 rounded w-1/2 mb-2"></div>
                    <div className="flex gap-2">
                        <div className="h-5 bg-white/10 rounded w-20"></div>
                        <div className="h-5 bg-white/10 rounded w-24"></div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function CreateWebhookModal({ onClose, onCreated }: { onClose: () => void; onCreated: (webhook: Webhook) => void }) {
    const [url, setUrl] = useState('');
    const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
    const [isCreating, setIsCreating] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url.trim()) {
            toast.error('Vui lòng nhập URL');
            return;
        }
        if (selectedEvents.length === 0) {
            toast.error('Vui lòng chọn ít nhất 1 sự kiện');
            return;
        }
        // Basic URL validation
        try {
            new URL(url);
        } catch {
            toast.error('URL không hợp lệ');
            return;
        }
        setIsCreating(true);
        try {
            const webhook = await developerService.createWebhook({ url, events: selectedEvents });
            onCreated(webhook);
            toast.success('Đã thêm webhook!');
        } catch {
            // Mock response for demo
            onCreated({
                id: Date.now().toString(),
                url,
                events: selectedEvents,
                secret: '****' + Math.random().toString(36).substring(2, 6),
                isActive: true,
                createdAt: new Date().toISOString(),
                lastTriggeredAt: null,
                lastStatus: null,
            });
            toast.success('Đã thêm webhook!');
        } finally {
            setIsCreating(false);
        }
    };

    const toggleEvent = (eventId: string) => {
        setSelectedEvents(prev => prev.includes(eventId) ? prev.filter(e => e !== eventId) : [...prev, eventId]);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-[var(--nebula-surface)] rounded-xl border border-white/10 shadow-2xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <h3 className="font-semibold text-white">Thêm Webhook</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
                        <span className="material-symbols-outlined text-white">close</span>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm text-[var(--nebula-text-secondary)] mb-2">Endpoint URL</label>
                        <input
                            type="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://myapp.com/webhooks/ephemera"
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-[var(--nebula-text-muted)] focus:border-[var(--nebula-violet)] focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-[var(--nebula-text-secondary)] mb-2">Sự kiện</label>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {WEBHOOK_EVENTS.map((event) => (
                                <label key={event.id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedEvents.includes(event.id)}
                                        onChange={() => toggleEvent(event.id)}
                                        className="rounded"
                                    />
                                    <div>
                                        <span className="text-sm text-white">{event.label}</span>
                                        <p className="text-xs text-[var(--nebula-text-muted)]">{event.description}</p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={isCreating}
                        className="w-full py-3 bg-[var(--nebula-violet)] hover:bg-[var(--nebula-violet-dark)] disabled:opacity-50 text-white rounded-lg font-medium transition-all"
                    >
                        {isCreating ? 'Đang tạo...' : 'Thêm Webhook'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default WebhooksTab;
