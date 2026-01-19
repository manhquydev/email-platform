/**
 * UI components for ComposeModal
 */
import { motion } from "framer-motion";
import type { Inbox } from "../../types";

// Modal Header
interface ModalHeaderProps {
    onClose: () => void;
}

export function ModalHeader({ onClose }: ModalHeaderProps) {
    return (
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--nebula-border)] bg-[var(--nebula-surface-elevated)]/50 backdrop-blur-md">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--nebula-primary)] to-[var(--nebula-secondary)] flex items-center justify-center shadow-lg shadow-[var(--nebula-primary)]/20">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
                <div>
                    <h3 id="compose-modal-title" className="text-lg font-bold text-[var(--nebula-text)] leading-tight">Soạn thảo Email</h3>
                    <p className="text-xs text-[var(--nebula-text-muted)] font-medium">Tạo và gửi thông điệp chuyên nghiệp</p>
                </div>
            </div>
            <button
                onClick={onClose}
                className="text-[var(--nebula-text-muted)] hover:text-[var(--nebula-text)] p-2 hover:bg-[var(--nebula-surface-elevated)] rounded-full transition-all duration-200"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
        </div>
    );
}

// Error Alert
export function ErrorAlert({ error }: { error: string }) {
    if (!error) return null;
    return (
        <div className="mx-6 mt-4 p-3 bg-danger/10 text-danger text-sm border border-danger/20 rounded-xl flex items-center gap-3 animate-shake">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span className="font-medium">{error}</span>
        </div>
    );
}

// Recipients Section
interface RecipientsSectionProps {
    inboxes: Inbox[];
    composeFrom: string;
    setComposeFrom: (val: string) => void;
    composeTo: string;
    setComposeTo: (val: string) => void;
    composeCc: string;
    setComposeCc: (val: string) => void;
    composeBcc: string;
    setComposeBcc: (val: string) => void;
    showCcBcc: boolean;
    setShowCcBcc: (val: boolean) => void;
}

export function RecipientsSection({ inboxes, composeFrom, setComposeFrom, composeTo, setComposeTo, composeCc, setComposeCc, composeBcc, setComposeBcc, showCcBcc, setShowCcBcc }: RecipientsSectionProps) {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[var(--nebula-text-muted)] uppercase tracking-widest ml-1 flex items-center gap-2">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        Người gửi
                    </label>
                    <div className="relative">
                        <select
                            value={composeFrom}
                            onChange={(e) => setComposeFrom(e.target.value)}
                            className="input-nebula w-full appearance-none cursor-pointer text-sm py-2.5 pl-4 pr-10"
                            autoFocus
                        >
                            <option value="" className="bg-[var(--nebula-surface-elevated)]">-- Chọn danh tính gửi --</option>
                            {inboxes.map((i) => (
                                <option key={i.id} value={`${i.localPart}@${i.domain?.name}`} className="bg-[var(--nebula-surface-elevated)]">
                                    {i.localPart}@{i.domain?.name}
                                </option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--nebula-primary)] opacity-70">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                        </div>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <div className="flex items-center justify-between ml-1">
                        <label className="text-[11px] font-bold text-[var(--nebula-text-muted)] uppercase tracking-widest flex items-center gap-2">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            Người nhận
                        </label>
                        <button
                            onClick={() => setShowCcBcc(!showCcBcc)}
                            className="text-[10px] font-bold text-[var(--nebula-primary)] hover:underline opacity-80"
                        >
                            {showCcBcc ? "- Ẩn Cc/Bcc" : "+ Hiện Cc/Bcc"}
                        </button>
                    </div>
                    <input
                        value={composeTo}
                        onChange={(e) => setComposeTo(e.target.value)}
                        placeholder="example@recipient.com"
                        className="input-nebula w-full text-sm py-2.5"
                    />
                </div>
            </div>

            {showCcBcc && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden"
                >
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-[var(--nebula-text-muted)] uppercase tracking-widest ml-1">Sao chép (Cc)</label>
                        <input
                            value={composeCc}
                            onChange={(e) => setComposeCc(e.target.value)}
                            placeholder="cc@example.com"
                            className="input-nebula w-full text-sm py-2"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-[var(--nebula-text-muted)] uppercase tracking-widest ml-1">Ẩn danh (Bcc)</label>
                        <input
                            value={composeBcc}
                            onChange={(e) => setComposeBcc(e.target.value)}
                            placeholder="bcc@example.com"
                            className="input-nebula w-full text-sm py-2"
                        />
                    </div>
                </motion.div>
            )}
        </div>
    );
}

// Subject Input
interface SubjectInputProps {
    value: string;
    onChange: (val: string) => void;
}

export function SubjectInput({ value, onChange }: SubjectInputProps) {
    return (
        <div className="space-y-2">
            <label className="text-[11px] font-bold text-[var(--nebula-text-muted)] uppercase tracking-widest ml-1 flex items-center gap-2">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Chủ đề Email
            </label>
            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Nhập tiêu đề hoặc chủ đề của email..."
                className="input-nebula w-full text-sm font-semibold py-3 border-transparent bg-[var(--nebula-surface-elevated)]/30 focus:bg-[var(--nebula-surface-elevated)]/50"
            />
        </div>
    );
}

// Attachments Section
interface AttachmentsSectionProps {
    files: File[];
    setFiles: (files: File[]) => void;
}

export function AttachmentsSection({ files, setFiles }: AttachmentsSectionProps) {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between ml-1">
                <label className="text-[11px] font-bold text-[var(--nebula-text-muted)] uppercase tracking-widest flex items-center gap-2">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    Tệp đính kèm
                </label>
                {files.length > 0 && (
                    <span className="text-[10px] font-bold text-[var(--nebula-primary)] bg-[var(--nebula-primary)]/10 px-2 py-0.5 rounded-full border border-[var(--nebula-primary)]/20">
                        {files.length} Tệp đã chọn
                    </span>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="relative group col-span-1 lg:col-span-1">
                    <input
                        type="file"
                        multiple
                        onChange={(e) => setFiles(Array.from(e.target.files || []))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="h-full border-2 border-dashed border-[var(--nebula-border)] rounded-xl p-4 flex flex-col items-center justify-center gap-2 bg-[var(--nebula-surface-elevated)]/10 group-hover:bg-[var(--nebula-primary)]/5 group-hover:border-[var(--nebula-primary)]/40 transition-all duration-300 text-center">
                        <div className="w-8 h-8 rounded-full bg-[var(--nebula-surface-elevated)] flex items-center justify-center text-[var(--nebula-text-muted)] group-hover:text-[var(--nebula-primary)] group-hover:scale-110 transition-all duration-300 shadow-sm">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </div>
                        <span className="text-[11px] font-medium text-[var(--nebula-text-muted)]">Thêm tệp tin</span>
                    </div>
                </div>

                <div className="col-span-1 lg:col-span-2 flex flex-wrap gap-2 content-start">
                    {files.length === 0 ? (
                        <div className="h-full w-full border border-[var(--nebula-border)]/30 rounded-xl border-dashed flex items-center justify-center">
                            <span className="text-[11px] text-[var(--nebula-text-muted)] italic opacity-50">Chưa có tệp nào được đính kèm</span>
                        </div>
                    ) : (
                        files.map((f, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-[11px] px-3 py-2 bg-[var(--nebula-surface-elevated)]/40 border border-[var(--nebula-border)] rounded-xl text-[var(--nebula-text)] hover:border-[var(--nebula-primary)]/30 transition-colors shadow-sm animate-fade-in group">
                                <div className="w-5 h-5 rounded bg-info/10 flex items-center justify-center text-info">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                </div>
                                <span className="max-w-[120px] truncate font-medium">{f.name}</span>
                                <button
                                    onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                                    className="text-[var(--nebula-text-muted)] hover:text-danger transition-colors p-1"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

// Modal Footer
interface ModalFooterProps {
    busy: boolean;
    canSend: boolean;
    hasCredits: boolean;
    onClose: () => void;
    onSend: () => void;
}

export function ModalFooter({ busy, canSend, hasCredits, onClose, onSend }: ModalFooterProps) {
    const isDisabled = busy || !canSend || !hasCredits;

    return (
        <div className="px-6 py-5 border-t border-[var(--nebula-border)] bg-[var(--nebula-surface-elevated)]/50 backdrop-blur-md flex items-center justify-between flex-shrink-0">
            <button
                onClick={onClose}
                disabled={busy}
                className="px-4 py-2.5 text-xs font-bold text-[var(--nebula-text-muted)] hover:text-[var(--nebula-text)] transition-colors hover:bg-[var(--nebula-surface-elevated)] rounded-xl"
            >
                Hủy bỏ
            </button>

            <div className="flex items-center gap-3">
                {!hasCredits && (
                    <div className="text-xs text-danger font-medium px-3 py-1 bg-danger/10 rounded-lg flex items-center gap-2">
                        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        Hết tín dụng
                    </div>
                )}

                <button
                    disabled={busy}
                    className="px-4 py-2.5 text-xs font-bold text-[var(--nebula-primary)] hover:bg-[var(--nebula-primary)]/10 rounded-xl transition-all border border-transparent hover:border-[var(--nebula-primary)]/20"
                >
                    Lưu nháp
                </button>

                <button
                    onClick={onSend}
                    disabled={isDisabled}
                    className={`group h-11 px-8 rounded-xl flex items-center gap-3 transition-all duration-300 shadow-lg ${isDisabled
                        ? 'bg-[var(--nebula-surface-elevated)] text-[var(--nebula-text-muted)] cursor-not-allowed opacity-50'
                        : 'bg-[var(--nebula-primary)] text-white hover:scale-[1.02] active:scale-[0.98] shadow-[var(--nebula-glow)]'
                    }`}
                >
                    {busy ? (
                        <>
                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <span className="font-bold text-sm">Đang gửi thư...</span>
                        </>
                    ) : (
                        <>
                            <span className="font-bold text-sm">Gửi Email (1 Credit)</span>
                            <svg className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
