/**
 * NotificationHistoryTab - Main tab component for notification history
 */
import { useState, useEffect, useCallback } from 'react';
import {
  useNotificationHistory,
  useNotificationDetail,
  useResendNotification,
  useExportLogs,
  type HistoryFilters,
  type NotificationHistoryItem,
} from './notification-history-hooks';
import { NotificationHistoryTable } from './notification-history-table';
import { NotificationHistoryFilters } from './notification-history-filters';
import { NotificationDetailDrawer } from './notification-detail-drawer';

const DEFAULT_FILTERS: HistoryFilters = {
  status: [],
  type: [],
  channel: [],
  search: '',
  dateFrom: undefined,
  dateTo: undefined,
};

export function NotificationHistoryTab() {
  const [filters, setFilters] = useState<HistoryFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<NotificationHistoryItem | null>(null);

  const { data, loading, fetchHistory } = useNotificationHistory();
  const { detail, fetchDetail, setDetail } = useNotificationDetail();
  const { resend, loading: resending } = useResendNotification();
  const { exportCSV, loading: exporting } = useExportLogs();

  // Fetch on mount and filter change
  useEffect(() => {
    fetchHistory(filters, page);
  }, [filters, page, fetchHistory]);

  // Handle row click - fetch full detail
  const handleRowClick = useCallback((item: NotificationHistoryItem) => {
    setSelectedItem(item);
    fetchDetail(item.id);
  }, [fetchDetail]);

  // Close drawer
  const handleCloseDrawer = useCallback(() => {
    setSelectedItem(null);
    setDetail(null);
  }, [setDetail]);

  // Handle resend
  const handleResend = useCallback(async (logId: string) => {
    const success = await resend(logId);
    if (success && selectedItem) {
      // Refresh detail
      fetchDetail(selectedItem.id);
    }
    return success;
  }, [resend, selectedItem, fetchDetail]);

  // Handle export
  const handleExport = useCallback(() => {
    exportCSV(filters);
  }, [exportCSV, filters]);

  const totalPages = data ? Math.ceil(data.total / (data.limit || 20)) : 1;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border dark:border-gray-700">
      <div className="p-4">
        <NotificationHistoryFilters
          filters={filters}
          onChange={setFilters}
          onExport={handleExport}
          exporting={exporting}
        />

        <NotificationHistoryTable
          data={data?.logs || []}
          loading={loading}
          onRowClick={handleRowClick}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>

      <NotificationDetailDrawer
        item={detail || selectedItem}
        onClose={handleCloseDrawer}
        onResend={handleResend}
        resending={resending}
      />
    </div>
  );
}
