/**
 * MessageViewer - Complete email viewing component
 * Combines header, body, actions, and attachments
 */

import { cn } from '../../utils/cn';
import { EmailHeader } from './EmailHeader';
import { EmailBody } from './EmailBody';
import { EmailActionToolbar } from './EmailActionToolbar';
import { AttachmentGrid } from './AttachmentGrid';
import { OTPBanner } from '../copy-first/OTPBanner';
import { extractOTP } from '../../utils/otpExtractor';
import type { Message } from '../../types';

interface MessageViewerProps {
    message: Message;
    onClose?: () => void;
    onDelete?: () => void;
    onPin?: (isPinned: boolean) => void;
    onExport?: () => void;
    isDeleting?: boolean;
    /** Show as full page or inline pane */
    variant?: 'pane' | 'modal';
    className?: string;
}

export function MessageViewer({
    message,
    onClose,
    onDelete,
    onPin,
    onExport,
    isDeleting = false,
    variant = 'pane',
    className,
}: MessageViewerProps) {
    // Extract OTP from email content
    const emailText = `${message.subject || ''} ${message.textBody || ''} ${message.htmlBody || ''}`;
    const otp = extractOTP(emailText);

    // Mock attachments - would come from message.attachments in real implementation
    const attachments = message.attachments || [];

    const isModal = variant === 'modal';

    return (
        <div
            className={cn(
                'flex flex-col h-full bg-semantic-bg-primary',
                isModal && 'rounded-2xl overflow-hidden',
                className
            )}
        >
            {/* Header with close button for modal */}
            <div className={cn(
                'flex-shrink-0 p-4 border-b border-semantic-border',
                isModal && 'bg-semantic-bg-secondary'
            )}>
                <div className="flex items-start justify-between gap-4">
                    <EmailHeader message={message} className="flex-1 min-w-0" />

                    {isModal && onClose && (
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg bg-semantic-bg-secondary hover:bg-semantic-bg-hover text-semantic-text-secondary hover:text-semantic-text-main transition-colors flex-shrink-0"
                            aria-label="Đóng"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Action Toolbar */}
                <div className="mt-3 pt-3 border-t border-semantic-border">
                    <EmailActionToolbar
                        message={message}
                        onDelete={onDelete}
                        onPin={onPin}
                        onExport={onExport}
                        isDeleting={isDeleting}
                    />
                </div>
            </div>

            {/* OTP Banner if detected */}
            {otp && (
                <div className="flex-shrink-0 px-4 pt-4">
                    <OTPBanner otp={otp} />
                </div>
            )}

            {/* Email Body */}
            <div className="flex-1 min-h-0 overflow-hidden">
                <EmailBody
                    htmlBody={message.htmlBody}
                    textBody={message.textBody}
                    className="h-full"
                />
            </div>

            {/* Attachments */}
            {attachments.length > 0 && (
                <div className="flex-shrink-0 px-4 pb-4">
                    <AttachmentGrid
                        attachments={attachments}
                        onDownload={(att) => {
                            // Download attachment
                            if (att.url) {
                                window.open(att.url, '_blank');
                            }
                        }}
                    />
                </div>
            )}
        </div>
    );
}

export default MessageViewer;
