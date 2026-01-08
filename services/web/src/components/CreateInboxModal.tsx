
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import type { Domain, Inbox } from '../types';
import { api } from '../utils/api';
import { GlassCard } from './ui/GlassCard';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { cn } from '../utils/cn';
import { useModalAccessibility } from '../hooks/useModalAccessibility';

interface CreateInboxModalProps {
    domains: Domain[];
    token: string | null;
    onClose: () => void;
    onInboxCreated?: (inbox: Inbox) => void;
}

const generateRandomName = () => {
    const adjectives = ['swift', 'silent', 'bright', 'cool', 'blue', 'dark', 'light', 'neon', 'epic', 'pure'];
    const nouns = ['user', 'ghost', 'fox', 'wolf', 'soul', 'wave', 'storm', 'mist', 'star', 'void'];
    const rand = Math.floor(Math.random() * 10000);
    return `${adjectives[Math.floor(Math.random() * adjectives.length)]}-${nouns[Math.floor(Math.random() * nouns.length)]}-${rand}`;
};

export function CreateInboxModal({ domains, token, onClose, onInboxCreated }: CreateInboxModalProps) {
    const [loading, setLoading] = useState(false);
    const [localPart, setLocalPart] = useState(generateRandomName());
    const [selectedDomainId, setSelectedDomainId] = useState<string>(domains.find(d => d.isPublic)?.id || domains[0]?.id || '');

    const { modalRef, modalProps } = useModalAccessibility({
        isOpen: true,
        onClose,
        closeOnEsc: !loading,
    });

    const verifiedDomains = domains.filter(d => d.status === 'VERIFIED');
    const activeDomain = verifiedDomains.find(d => d.id === selectedDomainId) || verifiedDomains[0];
    const previewEmail = activeDomain ? `${localPart}@${activeDomain.name}` : '';

    const handleRandomize = () => setLocalPart(generateRandomName());

    const handleCreate = async () => {
        if (!activeDomain || !localPart.trim() || !token) return;
        setLoading(true);
        try {
            const res = await api<{ inbox: Inbox }>('/inboxes', {
                method: 'POST',
                token,
                body: { domainId: activeDomain.id, localPart: localPart.trim() }
            });

            // Manually attach domain since API might not return included relation
            const newInbox = { ...res.inbox, domain: activeDomain };

            toast.success('Đã tạo hộp thư mới!');
            onInboxCreated?.(newInbox);
            onClose();
        } catch {
            toast.error('Lỗi: ' + (e as Error).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    ref={modalRef}
                    {...modalProps}
                    aria-labelledby="create-inbox-modal-title"
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    className="w-full max-w-md"
                >
                    <GlassCard
                        variant="elevated"
                        className="p-6 sm:p-8 relative overflow-hidden h-full"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 id="create-inbox-modal-title" className="text-xl font-bold text-slate-900 dark:text-white">Tạo email mới</h2>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-text-secondary transition-colors"
                                title="Đóng"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-6">
                            {verifiedDomains.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-8 text-center text-text-secondary">
                                    <div className="text-4xl mb-4">📧</div>
                                    <h4 className="text-lg font-medium text-slate-900 dark:text-white mb-2">Chưa có domain khả dụng</h4>
                                    <p className="mb-6">Tài khoản của bạn chưa có domain nào được xác thực.</p>
                                    <Button
                                        variant="primary"
                                        onClick={() => window.location.href = '/app?tab=domains'}
                                    >
                                        + Quản lý Domain
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    {/* Email Preview */}
                                    <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex flex-col items-center text-center">
                                        <span className="text-xs font-medium text-primary/80 uppercase tracking-widest mb-1">Địa chỉ email của bạn</span>
                                        <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white break-all">
                                            {previewEmail || 'chọn domain...'}
                                        </span>
                                    </div>

                                    {/* Local Part Input */}
                                    <div className="space-y-4">
                                        <div className="flex gap-2 items-end">
                                            <div className="flex-1">
                                                <Input
                                                    label="Tên email"
                                                    id="localPart"
                                                    value={localPart}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalPart(e.target.value.toLowerCase())}
                                                    placeholder="vd: contact, info, hello"
                                                    autoFocus
                                                />
                                            </div>
                                            <Button
                                                variant="secondary"
                                                size="icon"
                                                onClick={handleRandomize}
                                                title="Tạo ngẫu nhiên"
                                                className="mb-[2px] h-[46px] w-[46px]"
                                            >
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                                                </svg>
                                            </Button>
                                        </div>

                                        {/* Domain Select */}
                                        <div className="space-y-2">
                                            <label htmlFor="domain" className="text-sm font-medium text-text-secondary ml-1">Domain</label>
                                            <div className="relative">
                                                <select
                                                    id="domain"
                                                    value={selectedDomainId}
                                                    onChange={(e) => setSelectedDomainId(e.target.value)}
                                                    className={cn(
                                                        "w-full h-[46px] px-4 bg-slate-50 dark:bg-surface-glass border border-slate-200 dark:border-white/10 rounded-xl",
                                                        "text-slate-900 dark:text-white outline-none transition-all duration-200",
                                                        "focus:border-primary/50 focus:ring-1 focus:ring-primary/50",
                                                        "appearance-none cursor-pointer"
                                                    )}
                                                >
                                                    {verifiedDomains.map(d => (
                                                        <option key={d.id} value={d.id} className="bg-white dark:bg-gray-900 text-slate-900 dark:text-white">
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
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {verifiedDomains.length > 0 && (
                            <div className="flex gap-3 justify-end mt-8">
                                <Button variant="ghost" onClick={onClose} disabled={loading}>
                                    Hủy
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={handleCreate}
                                    disabled={loading || !activeDomain || !localPart.trim()}
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
                        )}
                    </GlassCard>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
