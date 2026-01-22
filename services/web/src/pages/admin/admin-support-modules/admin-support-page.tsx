/**
 * Admin Support Page - Ticket List View
 */

import {
  GlassCard, SectionHeader, PremiumTable, TableHeader,
  TableBody, EmptyState, LoadingSpinner, Pagination
} from "../../../components/admin/AdminUIComponents";
import {
  useAdminTickets,
  useTicketStats,
  StatsCards,
  TicketTableRow,
  TicketTableHeader,
  FiltersBar
} from "./";

export function AdminSupportPage() {
  const { stats, loading: statsLoading } = useTicketStats();
  const {
    tickets,
    total,
    loading,
    filters,
    updateFilters
  } = useAdminTickets({ limit: 20 });

  const totalPages = Math.ceil(total / (filters.limit || 20));
  const currentPage = (filters.page || 0) + 1;

  return (
    <div className="p-4 md:p-6 max-w-full">
      <SectionHeader
        title="Hỗ trợ khách hàng"
        subtitle={`Tổng số: ${total} yêu cầu`}
      />

      <StatsCards stats={stats} loading={statsLoading} />

      <FiltersBar
        filters={filters}
        onFilterChange={updateFilters}
      />

      {loading ? (
        <LoadingSpinner />
      ) : (
        <GlassCard padding="p-0" hover={false}>
          <PremiumTable>
            <TableHeader>
              <TicketTableHeader />
            </TableHeader>
            <TableBody>
              {tickets.map((ticket) => (
                <TicketTableRow key={ticket.id} ticket={ticket} />
              ))}
            </TableBody>
          </PremiumTable>

          {tickets.length === 0 && (
            <EmptyState
              title="Không có yêu cầu hỗ trợ"
              description="Chưa có ticket nào phù hợp với bộ lọc"
            />
          )}
        </GlassCard>
      )}

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(p) => updateFilters({ page: p - 1 })}
        />
      )}
    </div>
  );
}
