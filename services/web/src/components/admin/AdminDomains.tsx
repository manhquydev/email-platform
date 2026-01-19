/**
 * AdminDomains - Admin panel for managing domains
 * Modules extracted to admin-domains-modules/
 */
import {
    GlassCard, SectionHeader, PremiumTable, TableHeader, TableHeaderCell,
    TableBody, EmptyState, LoadingSpinner, Pagination, BulkActionsBar, PremiumButton, PremiumInput
} from "./AdminUIComponents";
import { useAdminDomains, DomainRow, FilterSelect } from "./admin-domains-modules";

export function AdminDomains({ token }: { token: string }) {
    const {
        domains,
        loading,
        updating,
        page,
        setPage,
        search,
        setSearch,
        filter,
        setFilter,
        selectedIds,
        setSelectedIds,
        totalPages,
        handleReview,
        handleBulkAction,
        toggleSelectAll,
        toggleSelect
    } = useAdminDomains(token);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-4">
            <SectionHeader
                title="Quản lý Tên miền"
                subtitle="Duyệt và quản lý tên miền do người dùng đóng góp"
                action={
                    <div className="flex items-center gap-3">
                        <FilterSelect value={filter} onChange={setFilter} />
                        <PremiumInput
                            value={search}
                            onChange={setSearch}
                            placeholder="Tìm tên miền..."
                            className="w-48"
                        />
                    </div>
                }
            />

            <BulkActionsBar
                selectedCount={selectedIds.size}
                onClear={() => setSelectedIds(new Set())}
            >
                <PremiumButton size="sm" onClick={() => handleBulkAction("APPROVED")}>Duyệt hàng loạt</PremiumButton>
                <PremiumButton size="sm" variant="danger" onClick={() => handleBulkAction("REJECTED")}>Từ chối</PremiumButton>
            </BulkActionsBar>

            {loading ? (
                <LoadingSpinner />
            ) : (
                <GlassCard padding="p-0" hover={false}>
                    <PremiumTable>
                        <TableHeader>
                            <tr>
                                <TableHeaderCell className="w-10">
                                    <input
                                        type="checkbox"
                                        onChange={(e) => toggleSelectAll(e.target.checked)}
                                        checked={selectedIds.size === domains.length && domains.length > 0}
                                        className="rounded border-nebula-border"
                                    />
                                </TableHeaderCell>
                                <TableHeaderCell>Tên miền</TableHeaderCell>
                                <TableHeaderCell>Chủ sở hữu</TableHeaderCell>
                                <TableHeaderCell>Xác thực</TableHeaderCell>
                                <TableHeaderCell>Đóng góp</TableHeaderCell>
                                <TableHeaderCell>Phạm vi</TableHeaderCell>
                                <TableHeaderCell className="text-right">Hành động</TableHeaderCell>
                            </tr>
                        </TableHeader>
                        <TableBody>
                            {domains.map((domain) => (
                                <DomainRow
                                    key={domain.id}
                                    domain={domain}
                                    isSelected={selectedIds.has(domain.id)}
                                    updating={updating}
                                    onToggleSelect={toggleSelect}
                                    onReview={handleReview}
                                />
                            ))}
                        </TableBody>
                    </PremiumTable>

                    {domains.length === 0 && (
                        <EmptyState title="Không tìm thấy tên miền" description="Thay đổi bộ lọc hoặc tìm kiếm khác" />
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
        </div>
    );
}
