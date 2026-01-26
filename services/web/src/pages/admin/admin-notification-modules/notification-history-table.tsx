/**
 * NotificationHistoryTable - TanStack Table for notification logs
 */
import { useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { NotificationHistoryItem } from './notification-history-hooks';

interface Props {
  data: NotificationHistoryItem[];
  loading: boolean;
  onRowClick: (item: NotificationHistoryItem) => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    SENT: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    FAILED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  };
  return (
    <span className={`px-2 py-1 text-xs rounded-full font-medium ${colors[status] || 'bg-gray-100'}`}>
      {status}
    </span>
  );
}

// Type badge component
function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    INFO: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    WARNING: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    SUCCESS: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    ERROR: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    PROMOTION: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  };
  return (
    <span className={`px-2 py-1 text-xs rounded-full font-medium ${colors[type] || 'bg-gray-100'}`}>
      {type}
    </span>
  );
}

export function NotificationHistoryTable({
  data,
  loading,
  onRowClick,
  page,
  totalPages,
  onPageChange,
}: Props) {
  const columns = useMemo<ColumnDef<NotificationHistoryItem>[]>(() => [
    {
      accessorKey: 'createdAt',
      header: 'Thời gian',
      cell: ({ getValue }) => {
        const date = getValue() as string;
        return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: vi });
      },
    },
    {
      accessorKey: 'title',
      header: 'Tiêu đề',
      cell: ({ getValue }) => (
        <span className="font-medium truncate max-w-[200px] block">
          {getValue() as string}
        </span>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Loại',
      cell: ({ getValue }) => <TypeBadge type={getValue() as string} />,
    },
    {
      accessorKey: 'isRead',
      header: 'Trạng thái',
      cell: ({ getValue }) => (
        <StatusBadge status={getValue() ? 'SENT' : 'PENDING'} />
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: () => (
        <button className="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm">
          Chi tiết →
        </button>
      ),
    },
  ], []);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  });

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse h-14 bg-gray-200 dark:bg-gray-700 rounded" />
        ))}
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <p>Chưa có thông báo nào</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800">
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th
                  key={header.id}
                  className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300"
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {table.getRowModel().rows.map(row => (
            <tr
              key={row.id}
              onClick={() => onRowClick(row.original)}
              className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
            >
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="px-4 py-3">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Trang {page} / {totalPages || 1}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            ← Trước
          </button>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Sau →
          </button>
        </div>
      </div>
    </div>
  );
}
