/**
 * TemplateManagementTab - Main orchestrating component for template management
 */
import { useState, useEffect } from 'react';
import { useTemplates, useTemplateActions, NotificationTemplate, TemplatePayload } from './template-hooks';
import { TemplateGrid } from './template-grid';
import { TemplateEditorModal } from './template-editor-modal';
import { TemplatePreviewModal } from './template-preview-modal';

export function TemplateManagementTab() {
  const { templates, loading, error, fetchTemplates } = useTemplates();
  const { createTemplate, updateTemplate, archiveTemplate, cloneTemplate, loading: actionLoading } = useTemplateActions();

  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<NotificationTemplate | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    fetchTemplates(showArchived);
  }, [fetchTemplates, showArchived]);

  const handleCreate = () => {
    setEditingTemplate(null);
    setIsEditorOpen(true);
  };

  const handleEdit = (template: NotificationTemplate) => {
    setEditingTemplate(template);
    setIsEditorOpen(true);
  };

  const handleSave = async (payload: TemplatePayload): Promise<boolean> => {
    const result = editingTemplate
      ? await updateTemplate(editingTemplate.id, payload)
      : await createTemplate(payload);
    if (result) {
      fetchTemplates(showArchived);
      return true;
    }
    return false;
  };

  const handleClone = async (template: NotificationTemplate) => {
    const cloned = await cloneTemplate(template.id, `${template.name} (Copy)`);
    if (cloned) fetchTemplates(showArchived);
  };

  const handleArchive = async (template: NotificationTemplate) => {
    if (confirm(`Bạn có chắc muốn lưu trữ mẫu "${template.name}"?`)) {
      const success = await archiveTemplate(template.id);
      if (success) fetchTemplates(showArchived);
    }
  };

  const handlePreview = (template: NotificationTemplate) => {
    setPreviewTemplate(template);
  };

  const activeTemplates = templates.filter(t => !t.isArchived);
  const archivedTemplates = templates.filter(t => t.isArchived);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Mẫu thông báo</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Quản lý các mẫu thông báo để gửi nhanh hơn
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <span>➕</span> Tạo mẫu mới
        </button>
      </div>

      {/* Filter toggle */}
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={e => setShowArchived(e.target.checked)}
            className="rounded"
          />
          Hiện mẫu đã lưu trữ
        </label>
        <span className="text-sm text-gray-500">
          {activeTemplates.length} mẫu đang dùng
          {showArchived && `, ${archivedTemplates.length} đã lưu trữ`}
        </span>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <TemplateGrid
          templates={showArchived ? templates : activeTemplates}
          onEdit={handleEdit}
          onClone={handleClone}
          onArchive={handleArchive}
          onPreview={handlePreview}
        />
      )}

      {/* Editor Modal */}
      <TemplateEditorModal
        template={editingTemplate}
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSave={handleSave}
        saving={actionLoading}
      />

      {/* Preview Modal */}
      <TemplatePreviewModal
        template={previewTemplate}
        isOpen={!!previewTemplate}
        onClose={() => setPreviewTemplate(null)}
      />
    </div>
  );
}
