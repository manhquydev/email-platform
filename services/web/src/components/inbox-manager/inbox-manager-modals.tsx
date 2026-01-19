/**
 * Modal components for InboxManager
 * Extracted from InboxManager.tsx for modularity
 */
import { lazy, Suspense } from "react";
import { ConfirmationModal } from "../ConfirmationModal";
import { GlassCard } from "../ui/GlassCard";
import { InboxActionSheet } from "../mobile";
import type { Domain, Inbox, Message, ShareMode } from "../../types";

// Lazy-loaded modals
const CreateInboxModal = lazy(() => import("../CreateInboxModal").then(m => ({ default: m.CreateInboxModal })));
const TransferInboxModal = lazy(() => import("../TransferInboxModal").then(m => ({ default: m.TransferInboxModal })));
const VisibilityRulesPanel = lazy(() => import("../VisibilityRulesPanel").then(m => ({ default: m.VisibilityRulesPanel })));

export interface InboxManagerModalsProps {
    // Token
    token: string | null;

    // Data
    domains: Domain[];
    activeInbox: Inbox | null;

    // Modal states
    showCreateModal: boolean;
    inboxToDelete: Inbox | null;
    inboxToTransfer: Inbox | null;
    inboxForVisibilityRules: Inbox | null;
    showBatchDeleteConfirm: boolean;
    inboxForActionSheet: Inbox | null;

    // Loading states
    busy: boolean;
    isBatchDeleting: boolean;
    selectedInboxIds: Set<string>;

    // Message detail (mobile only)
    showDetail: boolean;
    selectedMessage: Message | null;
    isDesktop: boolean;

    // Handlers
    onCloseCreateModal: () => void;
    onInboxCreated: (inbox: Inbox) => void;
    onCloseDeleteModal: () => void;
    onConfirmDelete: () => Promise<void>;
    onCloseTransferModal: () => void;
    onTransferComplete: () => void;
    onCloseVisibilityRules: () => void;
    onCloseBatchDeleteConfirm: () => void;
    onConfirmBatchDelete: () => Promise<void>;
    onCloseActionSheet: () => void;
    onCloseDetail: () => void;

    // Action sheet handlers
    onActionSheetCopy: () => void;
    onActionSheetViewMessages: () => void;
    onActionSheetTransfer: () => void;
    onActionSheetExtend: () => void;
    onActionSheetTogglePermanent: () => void;
    onActionSheetDelete: () => void;
    onActionSheetShareModeChange: (mode: ShareMode) => void;
    onActionSheetVisibilityRules: () => void;

    // State setters for inbox updates
    setInboxes: React.Dispatch<React.SetStateAction<Inbox[]>>;
    setActiveInbox: React.Dispatch<React.SetStateAction<Inbox | null>>;
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

export function InboxManagerModals({
    token,
    domains,
    // activeInbox is kept for potential future use but currently unused
    activeInbox: _activeInbox,
    showCreateModal,
    inboxToDelete,
    inboxToTransfer,
    inboxForVisibilityRules,
    showBatchDeleteConfirm,
    inboxForActionSheet,
    busy,
    isBatchDeleting,
    selectedInboxIds,
    showDetail,
    selectedMessage,
    isDesktop,
    onCloseCreateModal,
    onInboxCreated,
    onCloseDeleteModal,
    onConfirmDelete,
    onCloseTransferModal,
    onTransferComplete,
    onCloseVisibilityRules,
    onCloseBatchDeleteConfirm,
    onConfirmBatchDelete,
    onCloseActionSheet,
    onCloseDetail,
    onActionSheetCopy,
    onActionSheetViewMessages,
    onActionSheetTransfer,
    onActionSheetExtend,
    onActionSheetTogglePermanent,
    onActionSheetDelete,
    onActionSheetShareModeChange,
    onActionSheetVisibilityRules
}: InboxManagerModalsProps) {
    return (
        <>
            {/* Message Detail Overlay - Only for mobile/tablet */}
            {!isDesktop && showDetail && selectedMessage && (
                <MessageDetailOverlay
                    message={selectedMessage}
                    onClose={onCloseDetail}
                />
            )}

            {/* Create Inbox Modal */}
            <Suspense fallback={null}>
                {showCreateModal && (
                    <CreateInboxModal
                        domains={domains}
                        token={token}
                        onClose={onCloseCreateModal}
                        onInboxCreated={onInboxCreated}
                    />
                )}
            </Suspense>

            {/* Transfer Inbox Modal */}
            <Suspense fallback={null}>
                {inboxToTransfer && (
                    <TransferInboxModal
                        inbox={inboxToTransfer}
                        token={token}
                        onClose={onCloseTransferModal}
                        onTransferComplete={onTransferComplete}
                    />
                )}
            </Suspense>

            {/* Visibility Rules Panel */}
            <Suspense fallback={null}>
                {inboxForVisibilityRules && (
                    <VisibilityRulesPanel
                        inboxId={inboxForVisibilityRules.id}
                        inboxEmail={`${inboxForVisibilityRules.localPart}@${inboxForVisibilityRules.domain?.name}`}
                        onClose={onCloseVisibilityRules}
                    />
                )}
            </Suspense>

            {/* Single Delete Confirmation */}
            <ConfirmationModal
                isOpen={!!inboxToDelete}
                title="Confirm Deletion"
                message={`Are you sure you want to delete ${inboxToDelete?.localPart}@${inboxToDelete?.domain?.name}? This action cannot be undone.`}
                confirmLabel="Delete"
                isDestructive
                isLoading={busy}
                onConfirm={onConfirmDelete}
                onCancel={onCloseDeleteModal}
            />

            {/* Batch Delete Confirmation */}
            <ConfirmationModal
                isOpen={showBatchDeleteConfirm}
                title="Confirm Batch Deletion"
                message={`Are you sure you want to delete ${selectedInboxIds.size} selected inboxes? This action cannot be undone.`}
                confirmLabel="Delete All"
                isDestructive
                isLoading={isBatchDeleting}
                onConfirm={onConfirmBatchDelete}
                onCancel={onCloseBatchDeleteConfirm}
            />

            {/* Mobile Action Sheet */}
            <InboxActionSheet
                isOpen={!!inboxForActionSheet}
                onClose={onCloseActionSheet}
                inbox={inboxForActionSheet}
                onCopy={onActionSheetCopy}
                onViewMessages={onActionSheetViewMessages}
                onTransfer={onActionSheetTransfer}
                onExtend={onActionSheetExtend}
                onTogglePermanent={onActionSheetTogglePermanent}
                onDelete={onActionSheetDelete}
                onShareModeChange={onActionSheetShareModeChange}
                onVisibilityRules={onActionSheetVisibilityRules}
            />
        </>
    );
}

// Message Detail Overlay for mobile
function MessageDetailOverlay({ message, onClose }: { message: Message; onClose: () => void }) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <GlassCard
                className="w-full max-w-4xl max-h-full h-[80vh] flex flex-col rounded-2xl shadow-2xl relative overflow-hidden bg-bg-secondary/95"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5 bg-surface/30">
                    <div>
                        <h2 className="text-xl font-bold text-text-main pr-8">{message.subject || '(No Subject)'}</h2>
                        <div className="flex items-center gap-2 mt-1 text-sm text-text-secondary">
                            <span className="font-medium text-primary bg-primary/10 px-2 py-0.5 rounded text-xs">From</span>
                            <span>{message.fromAddress}</span>
                            <span className="text-muted">•</span>
                            <span>{new Date(message.receivedAt).toLocaleString('vi-VN')}</span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-lg bg-surface hover:bg-white/10 text-text-secondary hover:text-white transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-auto bg-white">
                    {message.htmlBody ? (
                        <iframe
                            srcDoc={message.htmlBody}
                            title="Email content"
                            sandbox="allow-same-origin allow-scripts"
                            className="w-full h-full border-0"
                        />
                    ) : (
                        <div className="p-6 whitespace-pre-wrap font-mono text-sm text-[var(--nebula-text)]">
                            {message.textBody || 'No content'}
                        </div>
                    )}
                </div>
            </GlassCard>
        </div>
    );
}
