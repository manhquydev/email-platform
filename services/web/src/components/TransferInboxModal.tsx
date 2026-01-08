
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { api } from '../utils/api';
import { GlassCard } from './ui/GlassCard';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import type { Inbox } from '../types';
import { useModalAccessibility } from '../hooks/useModalAccessibility';

interface TransferInboxModalProps {
    inbox: Inbox;
    token: string | null;
    onClose: () => void;
    onTransferComplete: () => void;
}

export function TransferInboxModal({ inbox, token, onClose, onTransferComplete }: TransferInboxModalProps) {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');

    const { modalRef, modalProps } = useModalAccessibility({
        isOpen: true,
        onClose,
        closeOnEsc: !loading,
    });

    const handleTransfer = async () => {
        if (!email.trim() || !token) return;
        setLoading(true);
        try {
            await api(`/inboxes/${inbox.id}`, {
                method: 'PATCH',
                token,
                body: { ownerEmail: email.trim() }
            });

            toast.success('Đã chuyển quyền sở hữu hộp thư!');
            onTransferComplete();
            onClose();
        } catch (e) {
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
                    aria-labelledby="transfer-inbox-modal-title"
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    className="w-full max-w-md"
                >
                    <GlassCard variant="elevated" className="p-6 relative overflow-hidden">
                        <h2 id="transfer-inbox-modal-title" className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Chuyển quyền sở hữu</h2>
                        <p className="text-sm text-text-secondary mb-6">
                            Bạn đang chuyển hộp thư <strong className="text-slate-900 dark:text-white">{inbox.localPart}@{inbox.domain?.name}</strong> cho người dùng khác.
                            Bạn sẽ mất quyền truy cập vào hộp thư này ngay lập tức.
                        </p>

                        <div className="space-y-4 mb-8">
                            <Input
                                label="Email người nhận"
                                value={email}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                                placeholder="nhap-email-nguoi-nhan@example.com"
                                autoFocus
                            />
                        </div>

                        <div className="flex gap-3 justify-end">
                            <Button variant="ghost" onClick={onClose} disabled={loading}>
                                Hủy
                            </Button>
                            <Button
                                variant="danger"
                                onClick={handleTransfer}
                                disabled={loading || !email.trim()}
                                isLoading={loading}
                            >
                                Chuyển ngay
                            </Button>
                        </div>
                    </GlassCard>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
