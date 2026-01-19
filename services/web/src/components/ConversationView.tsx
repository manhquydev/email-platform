/**
 * ConversationView - Threaded email conversation display
 * Modules extracted to conversation-view-modules/
 */
import { useState, useMemo } from "react";
import {
    type ConversationViewProps,
    groupIntoThreads,
    EmptyConversationState,
    ThreadHeader,
    ExpandedThreadMessages
} from "./conversation-view-modules";

export function ConversationView({
    messages,
    selectedThreadId,
    onSelectThread,
    onSelectMessage,
}: ConversationViewProps) {
    const [expandedThreadId, setExpandedThreadId] = useState<string | null>(null);

    const threads = useMemo(() => groupIntoThreads(messages), [messages]);

    if (threads.length === 0) {
        return <EmptyConversationState />;
    }

    return (
        <div className="divide-y divide-border">
            {threads.map((thread, idx) => {
                const isExpanded = expandedThreadId === thread.id;
                const isSelected = selectedThreadId === thread.id;
                const hasMultipleMessages = thread.messages.length > 1;

                return (
                    <div
                        key={thread.id}
                        className="animate-fade-in"
                        style={{ animationDelay: `${idx * 30}ms` }}
                    >
                        <ThreadHeader
                            thread={thread}
                            isSelected={isSelected}
                            isExpanded={isExpanded}
                            hasMultipleMessages={hasMultipleMessages}
                            onClick={() => {
                                if (hasMultipleMessages) {
                                    setExpandedThreadId(isExpanded ? null : thread.id);
                                }
                                onSelectThread(thread);
                            }}
                        />

                        {isExpanded && hasMultipleMessages && (
                            <ExpandedThreadMessages
                                messages={thread.messages}
                                onSelectMessage={onSelectMessage}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// Re-export hook for external use
export { useConversationMode } from "./conversation-view-modules";
