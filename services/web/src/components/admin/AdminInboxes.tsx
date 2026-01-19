/**
 * AdminInboxes - Admin panel for managing inboxes
 * Modules extracted to admin-inboxes-modules/
 */
import {
    GlassCard, SectionHeader, PremiumTable, TableHeader, TableHeaderCell,
    TableBody, EmptyState, LoadingSpinner, Pagination, ConfirmModal, PremiumInput
} from "./AdminUIComponents";
import { useAdminInboxes, InboxRow, SearchIcon } from "./admin-inboxes-modules";

export function AdminInboxes({ token }: { token: string }) {
    const {
        inboxes,
        loading,
        search,
        setSearch,
        page,
        setPage,
        total,
        updating,
        deleteTarget,
        setDeleteTarget,
        transferTarget,
        setTransferTarget,
        loadingAction,
        totalPages,
        handleDelete,
        confirmDelete,
        handleTransfer,
        confirmTransfer
    } = useAdminInboxes(token);

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <SectionHeader
                title="Quản lý Hộp thư"
                subtitle={`Xem và quản lý tất cả hộp thư trong hệ thống${total > 0 ? ` (${total} tổng)` : ""}`}
                action={
                    <PremiumInput
                        value={search}
                        onChange={setSearch}
                        placeholder="Tìm kiếm địa chỉ..."
                        className="w-64"
                        icon={<SearchIcon />}
                    />
                }
            />

            {loading ? (
                <LoadingSpinner />
            ) : (
                <GlassCard padding="p-0" hover={false}>
                    <PremiumTable>
                        <TableHeader>
                            <tr>
                                <TableHeaderCell>Địa chỉ Email</TableHeaderCell>
                                <TableHeaderCell>Người sở hữu</TableHeaderCell>
                                <TableHeaderCell>Tin nhắn</TableHeaderCell>
                                <TableHeaderCell>Ngày tạo</TableHeaderCell>
                                <TableHeaderCell>Hết hạn</TableHeaderCell>
                                <TableHeaderCell className="text-right">Hành động</TableHeaderCell>
                            </tr>
                        </TableHeader>
                        <TableBody>
                            {inboxes.map((inbox) => (
                                <InboxRow
                                    key={inbox.id}
                                    inbox={inbox}
                                    updating={updating}
                                    onTransfer={handleTransfer}
                                    onDelete={handleDelete}
                                />
                            ))}
                        </TableBody>
                    </PremiumTable>

                    {inboxes.length === 0 && (
                        <EmptyState
                            title="Không tìm thấy hộp thư"
                            description="Chưa có hộp thư nào được tạo hoặc không khớp với tìm kiếm"
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
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={() => deleteTarget && confirmDelete(deleteTarget)}
                title="Xóa hộp thư"
                message={`Bạn có chắc muốn xóa hộp thư ${deleteTarget?.localPart}@${deleteTarget?.domain.name}? Hành động này không thể hoàn tác.`}
                variant="danger"
                isLoading={loadingAction && !!deleteTarget}
            />

            <ConfirmModal
                isOpen={!!transferTarget}
                onClose={() => setTransferTarget(null)}
                onConfirm={() => transferTarget && confirmTransfer(transferTarget)}
                title="Chuyển quyền sở hữu"
                message={`Bạn có chắc muốn chuyển quyền sở hữu hộp thư ${transferTarget?.localPart}@${transferTarget?.domain.name}?`}
                confirmText="Tiếp tục"
                isLoading={loadingAction && !!transferTarget}
            />
        </div>
    );
}
