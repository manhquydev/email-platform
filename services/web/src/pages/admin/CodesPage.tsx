/**
 * CodesPage - Redemption codes management
 * Modules extracted to codes-page-modules/
 */
import { useState } from "react";
import { SectionHeader, PremiumInput, ConfirmModal } from "../../components/admin/AdminUIComponents";
import {
    filterCodes,
    useCodesData,
    useCodeGeneration,
    CodesTable,
    CreateCodeModal
} from "./codes-page-modules";

export function CodesPage() {
    const [filterCode, setFilterCode] = useState("");

    const {
        codes, packages, loading, deleteTarget,
        setDeleteTarget, loadData, handleDelete
    } = useCodesData();

    const {
        showModal, setShowModal,
        formData, updateFormField,
        handleGenerate
    } = useCodeGeneration(loadData);

    const filteredCodes = filterCodes(codes || [], filterCode);

    return (
        <div className="p-4 md:p-6 max-w-full space-y-6">
            <SectionHeader
                title="Mã Đổi Thưởng"
                subtitle="Tạo và quản lý mã khuyến mãi/kích hoạt"
                action={
                    <div className="flex gap-2">
                        <PremiumInput
                            placeholder="Tìm kiếm mã..."
                            value={filterCode}
                            onChange={setFilterCode}
                            className="w-48"
                        />
                        <button onClick={() => setShowModal(true)} className="btn-primary px-4 py-2 text-sm">
                            + Tạo mã
                        </button>
                    </div>
                }
            />

            <CodesTable codes={filteredCodes} loading={loading} onDelete={setDeleteTarget} />

            <ConfirmModal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
                title="Xóa mã đổi thưởng"
                message={`Bạn có chắc muốn xóa mã "${deleteTarget?.code}"?`}
                variant="danger"
                isLoading={loading && !!deleteTarget}
            />

            <CreateCodeModal
                show={showModal}
                packages={packages}
                formData={formData}
                onUpdateField={updateFormField}
                onClose={() => setShowModal(false)}
                onSubmit={handleGenerate}
            />
        </div>
    );
}
