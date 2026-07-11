/**
 * LabelsTab - Manage labels for inbox
 * Modules extracted to labels-tab-modules/
 */
import { Button } from "../ui/Button";
import {
    type LabelsTabProps,
    useLabels,
    LoadingState,
    NoInboxState,
    EmptyLabelsState,
    InboxSelector,
    LabelCard,
    LabelModal
} from "./labels-tab-modules";

export function LabelsTab({ inboxId, inboxes = [], selectedInboxId, onInboxChange }: LabelsTabProps) {
    // Resolve effective ID
    const effectiveInboxId = selectedInboxId || inboxId;

    const {
        labels,
        loading,
        isCreateModalOpen,
        setIsCreateModalOpen,
        editingLabel,
        name,
        setName,
        color,
        setColor,
        openCreateModal,
        openEditModal,
        handleSave,
        handleDelete
    } = useLabels({ effectiveInboxId });

    if (loading && labels.length === 0) {
        return <LoadingState />;
    }

    if (!effectiveInboxId && (!inboxes || inboxes.length === 0)) {
        return <NoInboxState />;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center gap-4">
                <div className="flex items-center gap-4 flex-1">
                    <h3 className="text-lg font-semibold text-semantic-text-main whitespace-nowrap">Danh sách nhãn</h3>
                    {inboxes.length > 0 && onInboxChange && (
                        <InboxSelector
                            inboxes={inboxes}
                            selectedInboxId={selectedInboxId}
                            onInboxChange={onInboxChange}
                        />
                    )}
                </div>
                <Button onClick={openCreateModal} variant="primary" size="sm" disabled={!effectiveInboxId}>
                    + Thêm Nhãn
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {labels.map((label) => (
                    <LabelCard
                        key={label.id}
                        label={label}
                        onEdit={() => openEditModal(label)}
                        onDelete={() => handleDelete(label.id)}
                    />
                ))}

                {labels.length === 0 && <EmptyLabelsState />}
            </div>

            {/* Modal Create/Edit */}
            {isCreateModalOpen && (
                <LabelModal
                    isEditing={!!editingLabel}
                    name={name}
                    onNameChange={setName}
                    color={color}
                    onColorChange={setColor}
                    onSave={handleSave}
                    onClose={() => setIsCreateModalOpen(false)}
                />
            )}
        </div>
    );
}
