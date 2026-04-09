/**
 * CreateInboxModal - Modal for creating new email inboxes
 * Modules extracted to create-inbox-modal-modules/
 */
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from './ui/GlassCard';
import {
    type CreateInboxModalProps,
    useCreateInboxForm,
    ModalHeader,
    EmailPreview,
    NoDomainState,
    LocalPartInput,
    DomainSelect,
    TTLSelect,
    ModalFooter
} from "./create-inbox-modal-modules";

export function CreateInboxModal(props: CreateInboxModalProps) {
    const {
        loading,
        loadingAction,
        localPart, setLocalPart,
        selectedDomainId, setSelectedDomainId,
        ttlMs, setTtlMs,
        useRandomDomainPool,
        randomDomainIds,
        handleRandomPoolToggle,
        handleRandomDomainSelection,
        modalRef, modalProps,
        verifiedDomains,
        activeDomain,
        canCreate,
        previewEmail,
        presetSummary,
        handleRandomize,
        handleCreate,
        handleCreateAndKeepSetup,
        handleCreateBatch,
        handleRequestClose
    } = useCreateInboxForm(props);

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleRequestClose}
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
                    <GlassCard variant="elevated" className="p-6 sm:p-8 relative overflow-hidden h-full">
                        <ModalHeader onClose={handleRequestClose} />

                        <div className="space-y-6">
                            {verifiedDomains.length === 0 ? (
                                <NoDomainState />
                            ) : (
                                <>
                                    <EmailPreview previewEmail={previewEmail} presetSummary={presetSummary} />
                                    <div className="space-y-4">
                                        <LocalPartInput
                                            value={localPart}
                                            onChange={setLocalPart}
                                            onRandomize={handleRandomize}
                                        />
                                        <DomainSelect
                                            domains={verifiedDomains}
                                            value={selectedDomainId}
                                            onChange={setSelectedDomainId}
                                            useRandomDomainPool={useRandomDomainPool}
                                            randomDomainIds={randomDomainIds}
                                            onRandomPoolToggle={handleRandomPoolToggle}
                                            onRandomDomainSelection={handleRandomDomainSelection}
                                        />
                                        <TTLSelect value={ttlMs} onChange={setTtlMs} />
                                    </div>
                                </>
                            )}
                        </div>

                        {verifiedDomains.length > 0 && (
                        <ModalFooter
                            loading={loading}
                            loadingAction={loadingAction}
                            canCreate={canCreate && !!activeDomain && !!localPart.trim()}
                            onClose={handleRequestClose}
                            onCreate={handleCreate}
                            onCreateAndKeepSetup={handleCreateAndKeepSetup}
                            onCreateBatch={handleCreateBatch}
                        />
                    )}
                    </GlassCard>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
