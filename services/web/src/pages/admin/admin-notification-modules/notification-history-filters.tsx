/**
 * NotificationHistoryFilters - Filter popover for notification logs
 */
import { useState } from 'react';
import type { HistoryFilters } from './notification-history-hooks';

interface Props {
  filters: HistoryFilters;
  onChange: (filters: HistoryFilters) => void;
  onExport: () => void;
  exporting: boolean;
}

const STATUS_OPTIONS = ['SENT', 'PENDING', 'FAILED'];
const TYPE_OPTIONS = ['INFO', 'WARNING', 'SUCCESS', 'ERROR', 'PROMOTION'];
const CHANNEL_OPTIONS = ['WEB', 'TELEGRAM', 'PUSH'];

export function NotificationHistoryFilters({ filters, onChange, onExport, exporting }: Props) {
  const [showFilters, setShowFilters] = useState(false);

  const toggleFilter = (key: 'status' | 'type' | 'channel', value: string) => {
    const current = filters[key];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    onChange({ ...filters, [key]: updated });
  };

  const activeCount = filters.status.length + filters.type.length + filters.channel.length +
    (filters.dateFrom ? 1 : 0) + (filters.dateTo ? 1 : 0);

  return (
    <div className="flex flex-wrap gap-3 items-center mb-4">
      {/* Search */}
      <div className="flex-1 min-w-[200px]">
        <input
          type="text"
          placeholder="Tìm kiếm tiêu đề..."
          value={filters.search}
          onChange={e => onChange({ ...filters, search: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Filter toggle */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className={`px-4 py-2 border rounded-lg flex items-center gap-2 ${
          activeCount > 0 ? 'border-blue-500 text-blue-600' : 'dark:border-gray-600'
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        Bộ lọc {activeCount > 0 && `(${activeCount})`}
      </button>

      {/* Export CSV */}
      <button
        onClick={onExport}
        disabled={exporting}
        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        {exporting ? 'Đang xuất...' : 'Xuất CSV'}
      </button>

      {/* Filter panel */}
      {showFilters && (
        <div className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-700 mt-2">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Status filter */}
            <div>
              <label className="block text-sm font-medium mb-2">Trạng thái</label>
              <div className="space-y-1">
                {STATUS_OPTIONS.map(opt => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.status.includes(opt)}
                      onChange={() => toggleFilter('status', opt)}
                      className="rounded"
                    />
                    <span className="text-sm">{opt}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Type filter */}
            <div>
              <label className="block text-sm font-medium mb-2">Loại</label>
              <div className="space-y-1">
                {TYPE_OPTIONS.map(opt => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.type.includes(opt)}
                      onChange={() => toggleFilter('type', opt)}
                      className="rounded"
                    />
                    <span className="text-sm">{opt}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Channel filter */}
            <div>
              <label className="block text-sm font-medium mb-2">Kênh</label>
              <div className="space-y-1">
                {CHANNEL_OPTIONS.map(opt => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.channel.includes(opt)}
                      onChange={() => toggleFilter('channel', opt)}
                      className="rounded"
                    />
                    <span className="text-sm">{opt}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Date range */}
            <div>
              <label className="block text-sm font-medium mb-2">Thời gian</label>
              <input
                type="date"
                value={filters.dateFrom || ''}
                onChange={e => onChange({ ...filters, dateFrom: e.target.value })}
                className="w-full px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600 mb-2"
              />
              <input
                type="date"
                value={filters.dateTo || ''}
                onChange={e => onChange({ ...filters, dateTo: e.target.value })}
                className="w-full px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
          </div>

          {/* Clear filters */}
          {activeCount > 0 && (
            <button
              onClick={() => onChange({ status: [], type: [], channel: [], search: '', dateFrom: undefined, dateTo: undefined })}
              className="mt-3 text-sm text-red-600 hover:underline"
            >
              Xóa tất cả bộ lọc
            </button>
          )}
        </div>
      )}
    </div>
  );
}
