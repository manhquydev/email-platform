/**
 * TemplatePreviewModal - Preview template in different formats
 */
import { useState } from 'react';
import type { NotificationTemplate } from './template-hooks';
import { TEMPLATE_VARIABLES } from './template-hooks';

interface Props {
  template: NotificationTemplate | null;
  isOpen: boolean;
  onClose: () => void;
}

type PreviewTab = 'desktop' | 'mobile' | 'telegram';

// Sample data for preview
const SAMPLE_DATA: Record<string, string> = {
  username: 'Nguyễn Văn A',
  email: 'user@example.com',
  tier: 'Premium',
  date: new Date().toLocaleDateString('vi-VN'),
  appName: 'MailBox',
};

function renderVariables(text: string): string {
  let result = text;
  TEMPLATE_VARIABLES.forEach(v => {
    const pattern = new RegExp(`\\{\\{${v.name}\\}\\}`, 'g');
    result = result.replace(pattern, SAMPLE_DATA[v.name] || `{{${v.name}}}`);
  });
  return result;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

export function TemplatePreviewModal({ template, isOpen, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<PreviewTab>('desktop');

  if (!isOpen || !template) return null;

  const renderedTitle = renderVariables(template.title);
  const renderedMessage = renderVariables(template.message);

  const tabs: { id: PreviewTab; label: string }[] = [
    { id: 'desktop', label: '🖥 Desktop' },
    { id: 'mobile', label: '📱 Mobile' },
    { id: 'telegram', label: '✈️ Telegram' },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg bg-nebula-surface rounded-xl shadow-xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-nebula-border">
          <h2 className="text-lg font-semibold">Xem trước: {template.name}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b dark:border-gray-700">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'desktop' && (
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white">
                    🔔
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{renderedTitle}</h4>
                    <div
                      className="text-sm text-gray-600 dark:text-gray-300 mt-1"
                      dangerouslySetInnerHTML={{ __html: renderedMessage }}
                    />
                    {template.imageUrl && (
                      <img src={template.imageUrl} alt="" className="mt-2 rounded max-h-32" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'mobile' && (
            <div className="flex justify-center">
              <div className="w-72 bg-gray-900 rounded-3xl p-3">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-3">
                  <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded bg-blue-500 flex items-center justify-center text-white text-xs">
                        📧
                      </div>
                      <span className="text-xs font-medium">MailBox</span>
                      <span className="text-xs text-gray-400 ml-auto">now</span>
                    </div>
                    <h4 className="font-medium text-sm">{renderedTitle}</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                      {stripHtml(renderedMessage)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'telegram' && (
            <div className="bg-[#17212b] rounded-lg p-4">
              <div className="max-w-sm">
                <div className="bg-[#2b5278] text-white rounded-lg p-3">
                  <p className="font-medium">{renderedTitle}</p>
                  <p className="text-sm mt-1 opacity-90">{stripHtml(renderedMessage)}</p>
                  {template.imageUrl && (
                    <img src={template.imageUrl} alt="" className="mt-2 rounded max-h-32" />
                  )}
                  <div className="text-xs text-right mt-2 opacity-60">
                    {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sample data note */}
        <div className="px-6 py-3 border-t dark:border-gray-700 text-xs text-gray-500">
          💡 Biến được thay bằng dữ liệu mẫu: {Object.entries(SAMPLE_DATA).map(([k, v]) => `${k}="${v}"`).join(', ')}
        </div>
      </div>
    </>
  );
}
