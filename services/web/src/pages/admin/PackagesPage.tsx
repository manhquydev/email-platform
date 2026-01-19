/**
 * Packages Page - Admin service packages management
 * Refactored to use modular components for maintainability
 */
import { SectionHeader, ConfirmModal } from "../../components/admin/AdminUIComponents";
import {
    usePackagesData,
    usePackagesActions,
    PackageFormModal,
    PackagesTable
} from "./packages-modules";

export function PackagesPage() {
    // Data hook
    const { packages, loading, loadPackages, setPackages } = usePackagesData();

    // Actions hook
    const {
        showModal,
        setShowModal,
        editingId,
        deleteTarget,
        setDeleteTarget,
        formData,
        setFormData,
        newFeatureText,
        setNewFeatureText,
        newFeatureIncluded,
        setNewFeatureIncluded,
        handleSubmit,
        handleEdit,
        handleDelete,
        handleToggleStatus,
        addFeature,
        removeFeature,
        openCreateModal
    } = usePackagesActions({ packages, setPackages, loadPackages });

    return (
        <div className="p-4 md:p-6 max-w-full space-y-6">
            <SectionHeader
                title="Quản lý Gói Dịch Vụ"
                subtitle="Định nghĩa các gói cước và giá bán - Hiển thị trên trang /pricing"
                action={
                    <button
                        onClick={openCreateModal}
                        className="btn-primary px-4 py-2 text-sm"
                    >
                        + Tạo gói mới
                    </button>
                }
            />

            <PackagesTable
                packages={packages}
                loading={loading}
                onEdit={handleEdit}
                onDelete={setDeleteTarget}
                onToggleStatus={handleToggleStatus}
            />

            <ConfirmModal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
                title="Xóa gói dịch vụ"
                message={`Bạn có chắc chắn muốn xóa gói "${deleteTarget?.name}"? Hành động này không thể hoàn tác.`}
                confirmText="Xác nhận xóa"
                variant="danger"
            />

            <PackageFormModal
                isOpen={showModal}
                editingId={editingId}
                formData={formData}
                setFormData={setFormData}
                newFeatureText={newFeatureText}
                setNewFeatureText={setNewFeatureText}
                newFeatureIncluded={newFeatureIncluded}
                setNewFeatureIncluded={setNewFeatureIncluded}
                onClose={() => setShowModal(false)}
                onSubmit={handleSubmit}
                onAddFeature={addFeature}
                onRemoveFeature={removeFeature}
            />
        </div>
    );
}
