/**
 * Barrel export for admin-notification-modules
 */
export type { NotificationType, TargetMode, NotificationFormState } from "./admin-notification-hooks";
export { useNotificationForm } from "./admin-notification-hooks";
export {
    NotificationTypeIcons,
    NotificationTypeSelector,
    TargetModeSelector,
    ImageUploadInput,
    MessageTextarea,
    NotificationForm,
    HelpSidebar
} from "./admin-notification-components";

// Phase 2: History tab exports
export { NotificationHistoryTab } from "./notification-history-tab";
export { NotificationHistoryTable } from "./notification-history-table";
export { NotificationHistoryFilters } from "./notification-history-filters";
export { NotificationDetailDrawer } from "./notification-detail-drawer";
export {
    useNotificationHistory,
    useNotificationDetail,
    useResendNotification,
    useLogStats,
    useExportLogs,
} from "./notification-history-hooks";
export type {
    NotificationHistoryItem,
    NotificationLog,
    HistoryFilters,
    LogStats,
} from "./notification-history-hooks";

// Phase 3: Template management exports
export { TemplateManagementTab } from "./template-management-tab";
export { TemplateGrid } from "./template-grid";
export { TemplateEditorModal } from "./template-editor-modal";
export { TemplatePreviewModal } from "./template-preview-modal";
export { TiptapEditor } from "./tiptap-editor";
export {
    useTemplates,
    useTemplateActions,
    TEMPLATE_VARIABLES,
} from "./template-hooks";
export type {
    NotificationTemplate,
    TemplatePayload,
    TemplateVariable,
} from "./template-hooks";

// Phase 4: Scheduled notifications exports
export { ScheduledTab } from "./scheduled-tab";
export { ScheduledList } from "./scheduled-list";
export { SchedulePicker } from "./schedule-picker";
export {
    useScheduledNotifications,
    useScheduleActions,
} from "./scheduled-notification-hooks";
export type {
    ScheduledNotification,
    SchedulePayload,
} from "./scheduled-notification-hooks";

// Phase 6: Analytics dashboard exports
export { AnalyticsTab } from "./analytics-tab";
export { AnalyticsKPICards } from "./analytics-kpi-cards";
export {
    DeliveryVolumeChart,
    ChannelBreakdownChart,
    FailureReasonsChart,
    TemplatePerformanceTable,
} from "./analytics-charts";
export { useNotificationAnalytics } from "./analytics-hooks";
export type {
    NotificationAnalytics,
    AnalyticsSummary,
    DailyVolume,
    ChannelBreakdown,
    FailureReason,
    TemplatePerformance,
} from "./analytics-hooks";
