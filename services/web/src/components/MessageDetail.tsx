/**
 * MessageDetail - Email detail view with OTP detection and AI summary
 * Modules extracted to message-detail-modules/
 */
import {
    type MessageDetailProps,
    useMessageTimer,
    useOTPDetection,
    useViewMode,
    handleCopyContent,
    handlePrint,
    handleExport,
    EmptyState,
    SecurityToolbar,
    EmailHeader,
    OTPBanner,
    SecurityGrid,
    EmailBody,
    AttachmentsSection,
    AISummaryCard
} from "./message-detail-modules";

export function MessageDetail({ message, onComposeReply, onForward, onBack }: MessageDetailProps) {
    const timeLeft = useMessageTimer(message);
    const { detectedOTP, copyOTP, otpCopied } = useOTPDetection(message);
    const { viewMode, setViewMode } = useViewMode();

    if (!message) return <EmptyState />;

    return (
        <div className="h-full flex flex-col bg-surface overflow-hidden">
            <SecurityToolbar
                message={message}
                timeLeft={timeLeft}
                onBack={onBack}
                onCopy={() => handleCopyContent(message)}
                onPrint={handlePrint}
                onExport={() => handleExport(message)}
            />

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10">
                <div className="max-w-4xl mx-auto flex flex-col gap-8 pb-20">
                    <EmailHeader message={message} onReply={onComposeReply} onForward={onForward} />

                    {detectedOTP && (
                        <OTPBanner
                            code={detectedOTP.code}
                            copied={otpCopied}
                            onCopy={() => copyOTP(detectedOTP.code)}
                        />
                    )}

                    {/* AI Summary Card - positioned after OTP for visibility */}
                    <AISummaryCard messageId={message.id} />

                    <SecurityGrid />

                    <EmailBody message={message} viewMode={viewMode} setViewMode={setViewMode} />

                    <AttachmentsSection attachments={message.attachments} />
                </div>
            </div>
        </div>
    );
}
