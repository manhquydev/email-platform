/**
 * NotificationDetailDrawer - Side drawer showing notification details and logs
 */
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import type { NotificationHistoryItem } from './notification-history-hooks';

interface Props {
  item: NotificationHistoryItem | null;
  onClose: () => void;
  onResend: (logId: string) => Promise<boolean>;
  resending: boolean;
}

export function NotificationDetailDrawer({ item, onClose, onResend, resending }: Props) {
  if (!item) return null;

  const handleResend = async (logId: string) => {
    const success = await onResend(logId);
    if (success) {
      // Optionally refresh or show toast
    }
  };

  const copyId = () => {
    navigator.clipboard.writeText(item.id);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-900 shadow-xl z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b dark:border-gray-700 px-4 py-3 flex items-center justify-between">
          <h3 className="font-semibold text-lg">Chi tiết thông báo</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* ID */}
          <div>
            <label className="text-sm text-gray-500 dark:text-gray-400">ID</label>
            <div className="flex items-center gap-2 mt-1">
              <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono truncate flex-1">
                {item.id}
              </code>
              <button
                onClick={copyId}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                title="Copy ID"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-sm text-gray-500 dark:text-gray-400">Tiêu đề</label>
            <p className="font-medium mt-1">{item.title}</p>
          </div>

          {/* Message */}
          <div>
            <label className="text-sm text-gray-500 dark:text-gray-400">Nội dung</label>
            <p className="mt-1 whitespace-pre-wrap text-gray-700 dark:text-gray-300">
              {item.message}
            </p>
          </div>

          {/* Image */}
          {item.imageUrl && (
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">Hình ảnh</label>
              <img
                src={item.imageUrl}
                alt="Notification"
                className="mt-2 rounded-lg max-h-48 object-cover"
              />
            </div>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">Loại</label>
              <p className="mt-1">
                <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                  item.type === 'INFO' ? 'bg-blue-100 text-blue-800' :
                  item.type === 'SUCCESS' ? 'bg-green-100 text-green-800' :
                  item.type === 'WARNING' ? 'bg-orange-100 text-orange-800' :
                  item.type === 'ERROR' ? 'bg-red-100 text-red-800' :
                  'bg-purple-100 text-purple-800'
                }`}>
                  {item.type}
                </span>
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">Thời gian</label>
              <p className="mt-1 text-sm">
                {format(new Date(item.createdAt), 'dd/MM/yyyy HH:mm:ss', { locale: vi })}
              </p>
            </div>
          </div>

          {/* Delivery Logs */}
          <div>
            <label className="text-sm text-gray-500 dark:text-gray-400 mb-2 block">
              Lịch sử gửi
            </label>
            <div className="space-y-2">
              {item.logs && item.logs.length > 0 ? (
                item.logs.map(log => (
                  <div
                    key={log.id}
                    className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-700"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{log.channel}</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        log.status === 'SENT' ? 'bg-green-100 text-green-800' :
                        log.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {log.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {format(new Date(log.sentAt), 'dd/MM/yyyy HH:mm:ss', { locale: vi })}
                    </p>
                    {log.errorMessage && (
                      <p className="text-xs text-red-600 mt-1">{log.errorMessage}</p>
                    )}
                    {log.status === 'FAILED' && (
                      <button
                        onClick={() => handleResend(log.id)}
                        disabled={resending}
                        className="mt-2 text-xs text-blue-600 hover:underline disabled:opacity-50"
                      >
                        {resending ? 'Đang gửi lại...' : 'Gửi lại'}
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">Chưa có log gửi</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
