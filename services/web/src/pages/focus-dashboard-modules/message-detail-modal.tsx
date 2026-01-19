/**
 * Message Detail Modal component for FocusDashboard
 * Shows selected message with actions
 */
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '../../components/ui/Button';
import type { Message } from '../../types';

interface MessageDetailModalProps {
    message: Message | null;
    show: boolean;
    onClose: () => void;
    onTogglePin: () => void;
    onMarkUnread: () => void;
    onDelete: () => void;
}

export function MessageDetailModal({
    message,
    show,
    onClose,
    onTogglePin,
    onMarkUnread,
    onDelete,
}: MessageDetailModalProps) {
    return (
        <AnimatePresence>
            {show && message && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        onClick={e => e.stopPropagation()}
                        className="bg-surface-elevated border border-white/10 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col relative z-10 overflow-hidden"
                    >
                        {/* Detail Header */}
                        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-surface-glass backdrop-blur-md sticky top-0 z-10">
                            <h2 className="text-lg font-bold text-white truncate max-w-md pr-4">
                                {message.subject || '(Không có tiêu đề)'}
                            </h2>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={onTogglePin}
                                    title={message.isPinned ? "Bỏ ghim" : "Ghim"}
                                    className={message.isPinned ? "text-primary bg-primary/10" : "text-text-secondary"}
                                    icon={<svg viewBox="0 0 24 24" fill={message.isPinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" /></svg>}
                                />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={onMarkUnread}
                                    title="Đánh dấu chưa đọc"
                                    className="text-text-secondary hover:text-white"
                                    icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.98l7.5-4.04a2.25 2.25 0 012.134 0l7.5 4.04a2.25 2.25 0 011.183 1.98V19.5z" /></svg>}
                                />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={onDelete}
                                    title="Xóa"
                                    className="text-red-400 hover:text-red-500 hover:bg-red-500/10"
                                    icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>}
                                />
                                <div className="w-px h-6 bg-white/10 mx-1" />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={onClose}
                                    title="Đóng (Esc)"
                                    className="text-text-secondary hover:text-white"
                                    icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>}
                                />
                            </div>
                        </div>

                        {/* Meta Info */}
                        <div className="p-4 bg-surface/50 border-b border-white/5 space-y-2">
                            <div className="flex justify-between items-start gap-4">
                                <div className="space-y-1">
                                    <div className="text-sm">
                                        <span className="text-text-secondary w-12 inline-block">Từ:</span>
                                        <span className="text-white font-medium select-all">{message.fromAddress}</span>
                                    </div>
                                    <div className="text-sm">
                                        <span className="text-text-secondary w-12 inline-block">Đến:</span>
                                        <span className="text-white font-medium select-all">{message.toAddress}</span>
                                    </div>
                                </div>
                                <div className="text-xs text-text-tertiary whitespace-nowrap">
                                    {new Date(message.receivedAt).toLocaleString('vi-VN')}
                                </div>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-0 bg-white min-h-[300px]">
                            {message.htmlBody ? (
                                <iframe
                                    srcDoc={message.htmlBody}
                                    title="Email content"
                                    sandbox="allow-same-origin allow-scripts"
                                    className="w-full h-full min-h-[400px] border-none block"
                                />
                            ) : (
                                <div className="p-6 whitespace-pre-wrap font-sans text-[var(--nebula-text)] leading-relaxed">
                                    {message.textBody || 'Không có nội dung'}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
