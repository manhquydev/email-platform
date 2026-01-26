/**
 * TemplateGrid - Card grid layout for browsing templates
 */
import { NotificationTemplate } from './template-hooks';

interface Props {
  templates: NotificationTemplate[];
  onEdit: (template: NotificationTemplate) => void;
  onClone: (template: NotificationTemplate) => void;
  onArchive: (template: NotificationTemplate) => void;
  onPreview: (template: NotificationTemplate) => void;
}

const TYPE_COLORS: Record<string, string> = {
  INFO: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  WARNING: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  SUCCESS: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  ERROR: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  PROMOTION: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
};

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '...';
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

export function TemplateGrid({ templates, onEdit, onClone, onArchive, onPreview }: Props) {
  if (!templates.length) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">📝</div>
        <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
          Chưa có mẫu thông báo
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Tạo mẫu đầu tiên để bắt đầu
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map(template => (
        <div
          key={template.id}
          className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                {template.name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {template.title}
              </p>
            </div>
            <span className={`px-2 py-1 text-xs rounded-full font-medium ml-2 ${TYPE_COLORS[template.type]}`}>
              {template.type}
            </span>
          </div>

          {/* Preview */}
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
            {truncate(stripHtml(template.message), 100)}
          </p>

          {/* Usage stats */}
          {template._count && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Đã dùng: {template._count.notifications} lần
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-3 border-t dark:border-gray-700">
            <button
              onClick={() => onPreview(template)}
              className="flex-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              👁 Xem
            </button>
            <button
              onClick={() => onEdit(template)}
              className="flex-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
            >
              ✏️ Sửa
            </button>
            <button
              onClick={() => onClone(template)}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              title="Nhân bản"
            >
              📋
            </button>
            <button
              onClick={() => onArchive(template)}
              className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
              title="Lưu trữ"
            >
              🗑
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
