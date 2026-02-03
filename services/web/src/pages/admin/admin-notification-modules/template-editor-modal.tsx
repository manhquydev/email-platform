/**
 * TemplateEditorModal - Modal for creating/editing templates
 */
import { useState, useEffect } from 'react';
import type { NotificationTemplate, TemplatePayload } from './template-hooks';
import { TiptapEditor } from './tiptap-editor';

interface Props {
  template: NotificationTemplate | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: TemplatePayload) => Promise<boolean>;
  saving: boolean;
}

const NOTIFICATION_TYPES = ['INFO', 'WARNING', 'SUCCESS', 'ERROR', 'PROMOTION'];

export function TemplateEditorModal({ template, isOpen, onClose, onSave, saving }: Props) {
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('INFO');
  const [imageUrl, setImageUrl] = useState('');

  // Reset form when template changes
  useEffect(() => {
    if (template) {
      setName(template.name);
      setTitle(template.title);
      setMessage(template.message);
      setType(template.type);
      setImageUrl(template.imageUrl || '');
    } else {
      setName('');
      setTitle('');
      setMessage('');
      setType('INFO');
      setImageUrl('');
    }
  }, [template, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await onSave({ name, title, message, type, imageUrl: imageUrl || undefined });
    if (success) onClose();
  };

  const isEdit = !!template;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-2xl md:max-h-[90vh] bg-nebula-surface rounded-xl shadow-xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-nebula-border">
          <h2 className="text-lg font-semibold">
            {isEdit ? 'Chỉnh sửa mẫu' : 'Tạo mẫu mới'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1">Tên mẫu *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              maxLength={100}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
              placeholder="VD: Chào mừng người dùng mới"
            />
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-1">Tiêu đề thông báo *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              maxLength={200}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
              placeholder="VD: Chào mừng {{username}}!"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium mb-1">Loại</label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
            >
              {NOTIFICATION_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium mb-1">Nội dung *</label>
            <TiptapEditor
              content={message}
              onChange={setMessage}
              placeholder="Nhập nội dung thông báo... Sử dụng nút {{}} để chèn biến"
            />
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-sm font-medium mb-1">URL hình ảnh (tùy chọn)</label>
            <input
              type="url"
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
              placeholder="https://..."
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !name || !title || !message}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Tạo mẫu'}
          </button>
        </div>
      </div>
    </>
  );
}
