/**
 * EmailHeader - Display email metadata (from, to, subject, date)
 */

import { cn } from '../../utils/cn';
import { CopyButton } from '../copy-first/CopyButton';
import type { Message } from '../../types';

interface EmailHeaderProps {
    message: Message;
    className?: string;
}

export function EmailHeader({ message, className }: EmailHeaderProps) {
    const formattedDate = new Date(message.receivedAt).toLocaleString('vi-VN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <div className={cn('space-y-3', className)}>
            {/* Subject */}
            <h2 className="text-lg font-bold text-text-main leading-tight">
                {message.subject || '(Không có tiêu đề)'}
            </h2>

            {/* From/To row */}
            <div className="flex flex-wrap items-start gap-x-6 gap-y-2 text-sm">
                {/* From */}
                <div className="flex items-center gap-2">
                    <span className="font-medium text-primary bg-primary/10 px-2 py-0.5 rounded text-xs">
                        Từ
                    </span>
                    <span className="text-text-main">{message.fromAddress}</span>
                    <CopyButton
                        text={message.fromAddress ?? ''}
                        size="sm"
                        variant="ghost"
                        successMessage={`Đã copy: ${message.fromAddress}`}
                        ariaLabel="Copy địa chỉ người gửi"
                    />
                </div>

                {/* To (if available) */}
                {message.toAddress && (
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-text-secondary bg-white/5 px-2 py-0.5 rounded text-xs">
                            Đến
                        </span>
                        <span className="text-text-secondary">{message.toAddress}</span>
                    </div>
                )}

                {/* Date */}
                <div className="flex items-center gap-2 ml-auto">
                    <svg className="w-4 h-4 text-text-secondary opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-text-secondary text-xs">{formattedDate}</span>
                </div>
            </div>

            {/* Labels/Tags if available */}
            {message.labels && message.labels.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {message.labels.map(({ label }) => (
                        <span
                            key={label.id}
                            className="px-2 py-0.5 text-xs font-medium rounded-full"
                            style={{
                                backgroundColor: `${label.color}20`,
                                color: label.color,
                            }}
                        >
                            {label.name}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
