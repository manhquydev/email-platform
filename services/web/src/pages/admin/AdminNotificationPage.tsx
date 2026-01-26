/**
 * AdminNotificationPage - Notification management with tabs
 * Modules extracted to admin-notification-modules/
 */
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { SectionHeader } from "../../components/admin/AdminUIComponents";
import {
    useNotificationForm,
    NotificationForm,
    HelpSidebar,
    NotificationHistoryTab,
    TemplateManagementTab,
    ScheduledTab,
    SchedulePicker,
    AnalyticsTab,
} from "./admin-notification-modules";

type TabId = 'compose' | 'history' | 'templates' | 'scheduled' | 'analytics';

const TABS: { id: TabId; label: string; disabled?: boolean }[] = [
    { id: 'compose', label: 'Gửi Thông Báo' },
    { id: 'history', label: 'Lịch Sử' },
    { id: 'templates', label: 'Mẫu' },
    { id: 'scheduled', label: 'Đã Lên Lịch' },
    { id: 'analytics', label: 'Thống Kê' },
];

export function AdminNotificationPage() {
    const [activeTab, setActiveTab] = useState<TabId>('compose');
    const { token } = useAuth();
    const {
        title, setTitle,
        message, setMessage,
        type, setType,
        targetMode, setTargetMode,
        targetUserId, setTargetUserId,
        imageUrl, setImageUrl,
        isScheduled, setIsScheduled,
        scheduledFor, setScheduledFor,
        busy,
        submit,
        handleImageUpload
    } = useNotificationForm(token);

    const getTabClass = (tab: typeof TABS[0]) => {
        if (activeTab === tab.id) return 'border-blue-500 text-blue-600 dark:text-blue-400';
        if (tab.disabled) return 'border-transparent text-gray-400 cursor-not-allowed';
        return 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300';
    };

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
            <SectionHeader
                title="Quản lý Thông Báo"
                subtitle="Gửi và quản lý thông báo hệ thống đến người dùng"
            />

            {/* Tab Navigation */}
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                <nav className="flex gap-4 -mb-px">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => !tab.disabled && setActiveTab(tab.id)}
                            disabled={tab.disabled}
                            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${getTabClass(tab)}`}
                        >
                            {tab.label}
                            {tab.disabled && <span className="ml-1 text-xs">(Soon)</span>}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'compose' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2">
                        <NotificationForm
                            title={title}
                            message={message}
                            type={type}
                            targetMode={targetMode}
                            targetUserId={targetUserId}
                            imageUrl={imageUrl}
                            busy={busy}
                            token={token}
                            onTitleChange={setTitle}
                            onMessageChange={setMessage}
                            onTypeChange={setType}
                            onTargetModeChange={setTargetMode}
                            onTargetUserIdChange={setTargetUserId}
                            onImageUrlChange={setImageUrl}
                            onImageUpload={handleImageUpload}
                            onSubmit={submit}
                        />
                        {/* Schedule Picker */}
                        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <SchedulePicker
                                isScheduled={isScheduled}
                                scheduledFor={scheduledFor}
                                onToggle={setIsScheduled}
                                onChange={setScheduledFor}
                            />
                        </div>
                    </div>
                    <div className="md:col-span-1 space-y-6">
                        <HelpSidebar />
                    </div>
                </div>
            )}

            {activeTab === 'history' && <NotificationHistoryTab />}

            {activeTab === 'templates' && <TemplateManagementTab />}

            {activeTab === 'scheduled' && <ScheduledTab />}

            {activeTab === 'analytics' && <AnalyticsTab />}
        </div>
    );
}
