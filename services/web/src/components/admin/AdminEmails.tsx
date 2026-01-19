/**
 * AdminEmails - Admin email browser and management
 * Modules extracted to admin-emails-modules/
 */
import {
    SectionHeader, LoadingSpinner, Pagination, ConfirmModal
} from "./AdminUIComponents";
import {
    useAdminEmails,
    FilterBar,
    NoEmailsState,
    EmailsTable,
    EmailDetailModal
} from "./admin-emails-modules";

export function AdminEmails({ token }: { token: string }) {
    const {
        emails,
        loading,
        search, setSearch,
        startDate, setStartDate,
        endDate, setEndDate,
        page, setPage,
        total,
        totalPages,
        selectedEmail, setSelectedEmail,
        loadingDetail,
        deleteTarget, setDeleteTarget,
        isDeleting,
        handleViewEmail,
        handleDeleteEmail,
        confirmDeleteEmail
    } = useAdminEmails(token);

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <SectionHeader
                title="Email Browser"
                subtitle={`Xem và quản lý tất cả email trong hệ thống (${total} email)`}
            />

            <FilterBar
                search={search}
                startDate={startDate}
                endDate={endDate}
                onSearchChange={setSearch}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
                onPageReset={() => setPage(0)}
            />

            {loading ? (
                <LoadingSpinner />
            ) : emails.length === 0 ? (
                <NoEmailsState />
            ) : (
                <EmailsTable
                    emails={emails}
                    onViewEmail={handleViewEmail}
                    onDeleteEmail={handleDeleteEmail}
                />
            )}

            {totalPages > 1 && (
                <Pagination currentPage={page + 1} totalPages={totalPages} onPageChange={(p) => setPage(p - 1)} />
            )}

            <ConfirmModal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={() => deleteTarget && confirmDeleteEmail(deleteTarget)}
                title="Xóa email"
                message="Bạn có chắc muốn xóa email này khỏi hệ thống? Hành động này không thể hoàn tác."
                variant="danger"
                isLoading={isDeleting}
            />

            {selectedEmail && (
                <EmailDetailModal
                    email={selectedEmail}
                    loadingDetail={loadingDetail}
                    onClose={() => setSelectedEmail(null)}
                    onDelete={handleDeleteEmail}
                />
            )}
        </div>
    );
}
