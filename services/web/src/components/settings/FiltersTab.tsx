/**
 * FiltersTab - Email filter management
 * Modules extracted to filters-tab-modules/
 */
import type { Inbox } from "../../types";
import { Button } from "../ui/Button";
import {
    useFiltersData,
    FilterCard,
    FilterModal,
    TestFilterModal
} from "./filters-tab-modules";

interface FiltersTabProps {
    inboxId?: string;
    inboxes?: Inbox[];
    selectedInboxId?: string;
    onInboxChange?: (id: string) => void;
}

export function FiltersTab({ inboxId, inboxes = [], selectedInboxId, onInboxChange }: FiltersTabProps) {
    const effectiveInboxId = selectedInboxId || inboxId;

    const {
        filters,
        labels,
        loading,
        isModalOpen,
        editingFilter,
        name,
        setName,
        matchType,
        setMatchType,
        conditions,
        actions,
        openCreateModal,
        openEditModal,
        handleSave,
        handleDelete,
        updateCondition,
        addCondition,
        removeCondition,
        updateAction,
        addAction,
        removeAction,
        closeModal,
        // Test filter
        isTestModalOpen,
        testingFilter,
        testResult,
        testLoading,
        openTestModal,
        closeTestModal,
        handleTestFilter
    } = useFiltersData(effectiveInboxId);

    if (loading && filters.length === 0) {
        return <div className="p-8 text-center text-nebula-text-muted">Đang tải...</div>;
    }

    if (!effectiveInboxId && (!inboxes || inboxes.length === 0)) {
        return <div className="p-8 text-center text-nebula-text-muted">Vui lòng chọn hộp thư.</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center gap-4">
                <div className="flex items-center gap-4 flex-1">
                    <h3 className="text-lg font-semibold text-nebula-text whitespace-nowrap">Bộ lọc tự động</h3>
                    {inboxes.length > 0 && onInboxChange && (
                        <select
                            value={selectedInboxId}
                            onChange={(e) => onInboxChange(e.target.value)}
                            className="bg-nebula-elevated border border-nebula-border rounded-lg px-3 py-1.5 text-sm text-nebula-text focus:outline-none focus:border-nebula-violet max-w-[200px]"
                        >
                            {inboxes.map(ib => (
                                <option key={ib.id} value={ib.id}>{ib.localPart}@{ib.domain?.name || '...'}</option>
                            ))}
                        </select>
                    )}
                </div>
                <Button onClick={openCreateModal} variant="primary" size="sm" disabled={!effectiveInboxId}>
                    + Thêm Bộ lọc
                </Button>
            </div>

            {/* Filters List */}
            <div className="space-y-4">
                {filters.map(filter => (
                    <FilterCard
                        key={filter.id}
                        filter={filter}
                        onEdit={() => openEditModal(filter)}
                        onDelete={() => handleDelete(filter.id)}
                        onTest={() => openTestModal(filter)}
                    />
                ))}
                {filters.length === 0 && (
                    <div className="text-center py-10 border border-dashed border-nebula-border rounded-xl text-nebula-text-muted">
                        Chưa có bộ lọc nào. Hãy tạo bộ lọc đầu tiên để tự động hóa hộp thư của bạn.
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <FilterModal
                    isEditing={!!editingFilter}
                    name={name}
                    onNameChange={setName}
                    matchType={matchType}
                    onMatchTypeChange={setMatchType}
                    conditions={conditions}
                    actions={actions}
                    labels={labels}
                    onUpdateCondition={updateCondition}
                    onAddCondition={addCondition}
                    onRemoveCondition={removeCondition}
                    onUpdateAction={updateAction}
                    onAddAction={addAction}
                    onRemoveAction={removeAction}
                    onSave={handleSave}
                    onClose={closeModal}
                />
            )}

            {/* Test Filter Modal */}
            {isTestModalOpen && testingFilter && (
                <TestFilterModal
                    filter={testingFilter}
                    testResult={testResult}
                    loading={testLoading}
                    onTest={handleTestFilter}
                    onClose={closeTestModal}
                />
            )}
        </div>
    );
}
