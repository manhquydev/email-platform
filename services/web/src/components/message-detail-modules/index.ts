/**
 * Barrel export for message-detail-modules
 */
export type { MessageDetailProps } from "./message-detail-hooks";
export { useMessageTimer, useOTPDetection, useViewMode } from "./message-detail-hooks";
export { handleCopyContent, handlePrint, handleExport } from "./message-detail-actions";
export {
    EmptyState,
    SecurityToolbar,
    EmailHeader,
    OTPBanner,
    SecurityGrid,
    EmailBody,
    AttachmentsSection
} from "./message-detail-components";
export { AISummaryCard } from "./ai-summary-card";
