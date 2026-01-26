/**
 * ScheduledList - Table view for scheduled notifications with countdown
 */
import { useState, useEffect } from 'react';
import type { ScheduledNotification } from './scheduled-notification-hooks';

interface Props {
  items: ScheduledNotification[];
  loading: boolean;
  onCancel: (item: ScheduledNotification) => void;
  onEdit: (item: ScheduledNotification) => void;
  onRefresh: () => void;
}

const STATUS_BADGES: Record<string, string> = {
  PENDING: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  EXECUTED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  CANCELLED: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  FAILED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function Countdown({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft('Đang gửi...');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${minutes}m ${seconds}s`);
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return <span className="font-mono text-sm">{timeLeft}</span>;
}

function canModify(item: ScheduledNotification): boolean {
  if (item.status !== 'PENDING') return false;
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
  return new Date(item.scheduledFor) > fiveMinutesFromNow;
}

export function ScheduledList({ items, loading, onCancel, onEdit, onRefresh }: Props) {
  const [statusFilter, setStatusFilter] = useState<string>('');

  const filteredItems = statusFilter
    ? items.filter(i => i.status === statusFilter)
    : items;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Thông báo đã lên lịch</h3>
          <p className="text-sm text-gray-500">{items.length} thông báo</p>
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="PENDING">Chờ gửi</option>
            <option value="EXECUTED">Đã gửi</option>
            <option value="CANCELLED">Đã hủy</option>
            <option value="FAILED">Thất bại</option>
          </select>
          <button
            onClick={onRefresh}
            className="px-3 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Empty state */}
      {filteredItems.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-2">📅</div>
          <p>Chưa có thông báo nào được lên lịch</p>
        </div>
      )}

      {/* Table */}
      {filteredItems.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Tiêu đề</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Đối tượng</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Thời gian</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Còn lại</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Trạng thái</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => (
                <tr key={item.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="py-3 px-4">
                    <div className="font-medium truncate max-w-[200px]">{item.title}</div>
                    {item.template && (
                      <div className="text-xs text-gray-500">Mẫu: {item.template.name}</div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {item.targetMode === 'ALL' ? '👥 Tất cả' : item.targetMode === 'SPECIFIC' ? '👤 Cá nhân' : '📊 Phân khúc'}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {formatDateTime(item.scheduledFor)}
                  </td>
                  <td className="py-3 px-4">
                    {item.status === 'PENDING' ? (
                      <Countdown targetDate={item.scheduledFor} />
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${STATUS_BADGES[item.status]}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {canModify(item) && (
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => onEdit(item)}
                          className="px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => onCancel(item)}
                          className="px-2 py-1 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                        >
                          ❌
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
