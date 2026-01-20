/**
 * ComposeModal - Email compose modal with rich text editor
 * Modules extracted to compose-modal-modules/
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { api } from "../utils/api";
import { Editor } from "./Editor";
import { useModalAccessibility } from "../hooks/useModalAccessibility";
import {
    type ComposeModalProps,
    ModalHeader,
    ErrorAlert,
    RecipientsSection,
    SubjectInput,
    AttachmentsSection,
    ModalFooter
} from "./compose-modal-modules";

export function ComposeModal({ token, inboxes, onClose, initialSubject = "", initialBody = "", initialTo = "", initialFrom = "" }: ComposeModalProps) {
    const [composeFrom, setComposeFrom] = useState(initialFrom);
    const [composeTo, setComposeTo] = useState(initialTo);
    const [composeCc, setComposeCc] = useState("");
    const [composeBcc, setComposeBcc] = useState("");
    const [showCcBcc, setShowCcBcc] = useState(false);
    const [composeSubject, setComposeSubject] = useState(initialSubject);
    const [composeBody, setComposeBody] = useState(initialBody);
    const [files, setFiles] = useState<File[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const { modalRef, modalProps } = useModalAccessibility({
        isOpen: true,
        onClose,
        closeOnEsc: !busy,
    });

    const handleCompose = async () => {
        if (!composeFrom || !composeTo || !composeSubject) return;
        setBusy(true);
        setError("");
        try {
            const formData = new FormData();
            formData.append("from", composeFrom);
            formData.append("to", composeTo);
            if (composeCc) formData.append("cc", composeCc);
            if (composeBcc) formData.append("bcc", composeBcc);
            formData.append("subject", composeSubject);
            formData.append("text", composeBody);
            formData.append("html", composeBody);

            files.forEach(f => {
                formData.append("attachments", f);
            });

            await api("/messages/outbound", {
                method: "POST",
                token,
                body: formData,
            });
            onClose();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setBusy(false);
        }
    };

    const canSend = !!(composeFrom && composeTo && composeSubject);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <motion.div
                ref={modalRef}
                {...modalProps}
                aria-labelledby="compose-modal-title"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
                className="glass-card-elevated w-full max-w-4xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-[var(--nebula-border)]"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
                <ModalHeader onClose={onClose} />
                <ErrorAlert error={error} />

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[var(--nebula-surface)]/20">
                    <RecipientsSection
                        inboxes={inboxes}
                        composeFrom={composeFrom}
                        setComposeFrom={setComposeFrom}
                        composeTo={composeTo}
                        setComposeTo={setComposeTo}
                        composeCc={composeCc}
                        setComposeCc={setComposeCc}
                        composeBcc={composeBcc}
                        setComposeBcc={setComposeBcc}
                        showCcBcc={showCcBcc}
                        setShowCcBcc={setShowCcBcc}
                    />

                    <SubjectInput value={composeSubject} onChange={setComposeSubject} />

                    <div className="space-y-2 flex flex-col flex-1 min-h-[350px]">
                        <label className="text-[11px] font-bold text-[var(--nebula-text-muted)] uppercase tracking-widest ml-1 flex items-center gap-2">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            Nội dung chi tiết
                        </label>
                        <div className="flex-1 border border-[var(--nebula-border)] rounded-2xl overflow-hidden bg-white/5 backdrop-blur-sm focus-within:ring-2 focus-within:ring-[var(--nebula-primary)]/30 transition-all duration-300">
                            <Editor
                                value={composeBody}
                                onChange={setComposeBody}
                                style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                                placeholder="Viết nội dung email tại đây..."
                            />
                        </div>
                    </div>

                    <AttachmentsSection files={files} setFiles={setFiles} />
                </div>

                <ModalFooter
                    busy={busy}
                    canSend={canSend}
                    onClose={onClose}
                    onSend={handleCompose}
                />
            </motion.div>
        </motion.div>
    );
}
