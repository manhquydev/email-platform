/**
 * ScheduledTab - Tab for managing scheduled notifications
 */
import { useState, useEffect } from 'react';
import { useScheduledNotifications, useScheduleActions, type ScheduledNotification } from './scheduled-notification-hooks';
import { ScheduledList } from './scheduled-list';

export function ScheduledTab() {
  const { items, loading, error, fetchScheduled } = useScheduledNotifications();
  const { cancelScheduled, loading: actionLoading } = useScheduleActions();
  const [_editingItem, setEditingItem] = useState<ScheduledNotification | null>(null);

  useEffect(() => {
    fetchScheduled();
  }, [fetchScheduled]);

  const handleCancel = async (item: ScheduledNotification) => {
    if (confirm(`Bạn có chắc muốn hủy thông báo "${item.title}"?`)) {
      const success = await cancelScheduled(item.id);
      if (success) fetchScheduled();
    }
  };

  const handleEdit = (item: ScheduledNotification) => {
    setEditingItem(item);
    // TODO: Open edit modal - for now just log
    console.log('Edit scheduled:', item);
    alert('Chức năng chỉnh sửa sẽ được cập nhật trong phiên bản tiếp theo.');
  };

  return (
    <div className="space-y-6">
      {/* Error state */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg">
          {error}
        </div>
      )}

      <ScheduledList
        items={items}
        loading={loading || actionLoading}
        onCancel={handleCancel}
        onEdit={handleEdit}
        onRefresh={() => fetchScheduled()}
      />

      {/* Tip */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-sm">
        <p className="font-medium text-blue-800 dark:text-blue-300">💡 Mẹo</p>
        <p className="text-blue-700 dark:text-blue-400 mt-1">
          Để lên lịch thông báo mới, vào tab "Gửi Thông Báo" và bật tùy chọn "Lên lịch gửi".
        </p>
      </div>
    </div>
  );
}
