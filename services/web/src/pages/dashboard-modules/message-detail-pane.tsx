/**
 * Message Detail Pane component for Dashboard
 * Shows selected message content with actions
 */
import { motion } from "framer-motion";
import { cn } from "../../utils/cn";
import type { Message } from "../../types";

// Import extracted sub-components
import {
    DetailHeader,
    OTPHighlight,
    EmailBody,
    AttachmentsList,
    EmptyDetailState
} from "./components";

interface MessageDetailPaneProps {
    selectedMessage: Message | null;
    onBack: () => void;
    onReply: () => void;
    onMarkUnread: (msgId: string) => void;
    onTogglePin: (msgId: string, isPinned: boolean) => void;
    onDelete: (msgId: string) => void;
    onCopyOTP: (otp: string) => void;
}

export function MessageDetailPane({
    selectedMessage,
    onBack,
    onReply,
    onMarkUnread,
    onTogglePin,
    onDelete,
    onCopyOTP
}: MessageDetailPaneProps) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={cn(
                "flex-1 bg-nebula-surface flex flex-col h-full overflow-hidden border-l border-nebula-border",
                !selectedMessage ? "hidden md:flex" : "flex fixed inset-0 z-50 md:static bg-nebula-surface"
            )}
        >
            {selectedMessage ? (
                <>
                    {/* Detail Header */}
                    <DetailHeader
                        message={selectedMessage}
                        onBack={onBack}
                        onReply={onReply}
                        onMarkUnread={() => onMarkUnread(selectedMessage.id)}
                        onTogglePin={() => onTogglePin(selectedMessage.id, !selectedMessage.isPinned)}
                        onDelete={() => onDelete(selectedMessage.id)}
                        onCopyContent={() => onCopyOTP(selectedMessage.textBody || selectedMessage.htmlBody || "")}
                    />

                    {/* Detail Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pb-24 md:pb-6">
                        <h1 className="text-2xl font-bold text-nebula-text mb-6 leading-tight">
                            {selectedMessage.subject || "(Không có chủ đề)"}
                        </h1>

                        <OTPHighlight message={selectedMessage} onCopy={onCopyOTP} />
                        <EmailBody message={selectedMessage} />
                        <AttachmentsList attachments={selectedMessage.attachments} />
                    </div>

                    {/* Quick Reply Footer */}
                    <div className="hidden md:flex p-4 border-t border-nebula-border bg-nebula-surface/50 backdrop-blur-md shrink-0 z-10">
                        <button
                            onClick={onReply}
                            className="flex-1 h-12 rounded-lg bg-nebula-elevated border border-nebula-border hover:border-nebula-violet/50 text-left px-4 text-nebula-text-muted text-sm flex items-center justify-between group transition-all"
                        >
                            <span>Soạn phản hồi nhanh...</span>
                            <div className="flex items-center gap-2">
                                <span className="p-1 rounded bg-nebula-surface border border-nebula-border text-xs text-nebula-text-muted">Ctrl + Enter</span>
                                <span className="material-symbols-outlined text-[20px] group-hover:text-nebula-violet transition-colors">send</span>
                            </div>
                        </button>
                    </div>
                </>
            ) : (
                <EmptyDetailState />
            )}
        </motion.div>
    );
}
