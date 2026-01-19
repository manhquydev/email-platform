/**
 * EmailStream - Email list with time-based grouping and OTP detection
 * Modules extracted to email-stream-modules/
 */
import { useMemo } from "react";
import toast from "react-hot-toast";
import { cn } from "../utils/cn";
import {
    type EmailStreamProps,
    groupMessagesByTime,
    TIME_GROUP_LABELS,
    EmptyInbox,
    GroupHeader,
    EmailItem
} from "./email-stream-modules";

export function EmailStream({ messages, selectedMessageId, onSelectMessage, onCopyOTP, className }: EmailStreamProps) {
    const groupedMessages = useMemo(() => groupMessagesByTime(messages), [messages]);

    const handleCopyOTP = (otp: string, e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(otp);
        toast.success(`Đã copy OTP: ${otp}`);
        onCopyOTP?.(otp);
    };

    if (messages.length === 0) {
        return <EmptyInbox />;
    }

    const renderGroup = (groupKey: 'today' | 'yesterday' | 'thisWeek' | 'earlier') => {
        const groupMessages = groupedMessages[groupKey];
        if (groupMessages.length === 0) return null;

        return (
            <div className="mb-6 last:mb-0" key={groupKey}>
                <GroupHeader label={TIME_GROUP_LABELS[groupKey]} count={groupMessages.length} />
                <div className="flex flex-col">
                    {groupMessages.map(message => (
                        <EmailItem
                            key={message.id}
                            message={message}
                            isSelected={message.id === selectedMessageId}
                            onSelect={() => onSelectMessage(message)}
                            onCopyOTP={handleCopyOTP}
                        />
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className={cn("h-full overflow-y-auto custom-scrollbar", className)}>
            {renderGroup('today')}
            {renderGroup('yesterday')}
            {renderGroup('thisWeek')}
            {renderGroup('earlier')}
        </div>
    );
}
