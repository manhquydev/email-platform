/**
 * UsersPage - Admin user management page
 * Manages users with CRUD, bulk actions, pagination
 */
import {
    GlassCard, SectionHeader, PremiumTable, TableHeader,
    TableBody, PremiumButton, PremiumInput,
    EmptyState, LoadingSpinner, Pagination, BulkActionsBar, ConfirmModal
} from "../../components/admin/AdminUIComponents";
import {
    useUsersPageData,
    UserTableRow,
    UserTableHeader
} from "./users-page-modules";

export function UsersPage() {
    const {
        users,
        loading,
        total,
        page,
        search,
        updating,
        selectedIds,
        isAllSelected,
        confirmDelete,
        confirmCancelSub,
        confirmBulk,
        bulkLoading,
        setSearch,
        setPage,
        setConfirmDelete,
        setConfirmCancelSub,
        setConfirmBulk,
        handleSelectAll,
        handleSelectOne,
        clearSelection,
        handleRoleChange,
        handleTierChange,
        handleCancelSubscription,
        confirmCancelSubscription,
        handleToggleDisable,
        handleDelete,
        handleForceVerify,
        handleBulkAction,
        confirmBulkAction,
        totalPages,
    } = useUsersPageData();

    return (
        <div className="p-4 md:p-6 max-w-full">
            <SectionHeader
                title="Quản lý Người dùng"
                subtitle={`Tổng số: ${total} người dùng`}
                action={
                    <PremiumInput
                        value={search}
                        onChange={setSearch}
                        placeholder="Tìm kiếm email..."
                        className="w-64"
                        icon={
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                            </svg>
                        }
                    />
                }
            />

            <BulkActionsBar selectedCount={selectedIds.size} onClear={clearSelection}>
                <PremiumButton variant="secondary" size="sm" onClick={() => handleBulkAction("enable")} disabled={bulkLoading}>
                    ✓ Kích hoạt
                </PremiumButton>
                <PremiumButton variant="secondary" size="sm" onClick={() => handleBulkAction("disable")} disabled={bulkLoading}>
                    ⊘ Vô hiệu hóa
                </PremiumButton>
                <PremiumButton variant="danger" size="sm" onClick={() => handleBulkAction("delete")} disabled={bulkLoading}>
                    ✕ Xóa
                </PremiumButton>
            </BulkActionsBar>

            {loading ? (
                <LoadingSpinner />
            ) : (
                <GlassCard padding="p-0" hover={false}>
                    <PremiumTable>
                        <TableHeader>
                            <UserTableHeader isAllSelected={isAllSelected} onSelectAll={handleSelectAll} />
                        </TableHeader>
                        <TableBody>
                            {users.map((user) => (
                                <UserTableRow
                                    key={user.id}
                                    user={user}
                                    isSelected={selectedIds.has(user.id)}
                                    updating={updating}
                                    onSelect={handleSelectOne}
                                    onRoleChange={handleRoleChange}
                                    onTierChange={handleTierChange}
                                    onCancelSubscription={handleCancelSubscription}
                                    onToggleDisable={handleToggleDisable}
                                    onDelete={setConfirmDelete}
                                    onForceVerify={handleForceVerify}
                                />
                            ))}
                        </TableBody>
                    </PremiumTable>

                    {users.length === 0 && (
                        <EmptyState
                            title="Không tìm thấy người dùng"
                            description="Thử thay đổi từ khóa tìm kiếm"
                        />
                    )}
                </GlassCard>
            )}

            {totalPages > 1 && (
                <Pagination
                    currentPage={page + 1}
                    totalPages={totalPages}
                    onPageChange={(p) => setPage(p - 1)}
                />
            )}

            <ConfirmModal
                isOpen={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
                onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
                title="Xóa người dùng"
                message={`Bạn có chắc muốn xóa người dùng "${confirmDelete?.email}"? Tất cả domain, inbox và email của họ sẽ bị xóa vĩnh viễn.`}
                variant="danger"
                isLoading={updating === confirmDelete?.id}
            />

            <ConfirmModal
                isOpen={!!confirmCancelSub}
                onClose={() => setConfirmCancelSub(null)}
                onConfirm={() => confirmCancelSub && confirmCancelSubscription(confirmCancelSub.id)}
                title="Hủy gói cước"
                message={`Bạn có chắc muốn hủy gói cước của "${confirmCancelSub?.email}" ngay lập tức?`}
                variant="danger"
                isLoading={updating === confirmCancelSub?.id}
            />

            <ConfirmModal
                isOpen={!!confirmBulk}
                onClose={() => setConfirmBulk(null)}
                onConfirm={() => confirmBulk && confirmBulkAction(confirmBulk)}
                title="Hành động hàng loạt"
                message={`Bạn có chắc muốn ${confirmBulk === "delete" ? "xóa" : confirmBulk === "enable" ? "kích hoạt" : "vô hiệu hóa"} ${selectedIds.size} người dùng đã chọn?`}
                variant={confirmBulk === "delete" ? "danger" : "primary"}
                isLoading={bulkLoading}
            />
        </div>
    );
}
