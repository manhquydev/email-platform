/**
 * VirtualizedInboxList - Performance-optimized inbox list using virtualization
 * Renders only visible items for smooth scrolling with large datasets
 */

import { useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { SwipeableInboxCard } from './SwipeableInboxCard';
import { InboxCard } from '../InboxCard';
import type { Inbox, ShareMode } from '../../types';

export interface VirtualizedInboxListProps {
    inboxes: Inbox[];
    selectedInboxIds: Set<string>;
    focusedIndex: number;
    onViewMessages: (inbox: Inbox) => void;
    onDeleteInbox: (inbox: Inbox) => void;
    onTransferInbox: (inbox: Inbox) => void;
    onExtendInbox: (inbox: Inbox) => void;
    onTogglePermanent: (inbox: Inbox) => void;
    onShareModeChange: (inboxId: string, mode: ShareMode) => void;
    onVisibilityRules: (inbox: Inbox) => void;
    onToggleSelect: (inboxId: string) => void;
    onLongPress: (inbox: Inbox) => void;
    onSetFocusedIndex: (index: number) => void;
}

/** Estimated row height for initial render calculation */
const ESTIMATED_ROW_HEIGHT = 140;

/** Number of extra items to render above/below viewport */
const OVERSCAN = 3;

export function VirtualizedInboxList({
    inboxes,
    selectedInboxIds,
    focusedIndex,
    onViewMessages,
    onDeleteInbox,
    onTransferInbox,
    onExtendInbox,
    onTogglePermanent,
    onShareModeChange,
    onVisibilityRules,
    onToggleSelect,
    onLongPress,
    onSetFocusedIndex,
}: VirtualizedInboxListProps) {
    const parentRef = useRef<HTMLDivElement>(null);

    const virtualizer = useVirtualizer({
        count: inboxes.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => ESTIMATED_ROW_HEIGHT,
        overscan: OVERSCAN,
        // Enable dynamic height measurement
        measureElement: (element) => {
            return element.getBoundingClientRect().height;
        },
    });

    const items = virtualizer.getVirtualItems();

    const handleContextMenu = useCallback((e: React.MouseEvent, inbox: Inbox) => {
        e.preventDefault();
        onLongPress(inbox);
    }, [onLongPress]);

    if (inboxes.length === 0) {
        return null;
    }

    return (
        <div
            ref={parentRef}
            className="h-full overflow-auto"
            style={{ contain: 'strict' }}
        >
            <div
                style={{
                    height: `${virtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                }}
            >
                {items.map((virtualRow) => {
                    const inbox = inboxes[virtualRow.index];
                    const email = `${inbox.localPart}@${inbox.domain?.name || 'unknown'}`;

                    return (
                        <div
                            key={virtualRow.key}
                            data-index={virtualRow.index}
                            ref={virtualizer.measureElement}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                transform: `translateY(${virtualRow.start}px)`,
                            }}
                            className="px-4 py-2"
                        >
                            <SwipeableInboxCard
                                email={email}
                                onDelete={() => onDeleteInbox(inbox)}
                                onCopy={() => onLongPress(inbox)}
                            >
                                <div onContextMenu={(e) => handleContextMenu(e, inbox)}>
                                    <InboxCard
                                        inbox={inbox}
                                        isSelected={selectedInboxIds.has(inbox.id)}
                                        isActive={virtualRow.index === focusedIndex}
                                        onSelect={() => onSetFocusedIndex(virtualRow.index)}
                                        onToggleSelect={() => onToggleSelect(inbox.id)}
                                        onCopy={() => {}}
                                        onDelete={() => onDeleteInbox(inbox)}
                                        onViewMessages={() => onViewMessages(inbox)}
                                        onTransfer={() => onTransferInbox(inbox)}
                                        onExtend={() => onExtendInbox(inbox)}
                                        onTogglePermanent={() => onTogglePermanent(inbox)}
                                        onShareModeChange={(mode) => onShareModeChange(inbox.id, mode)}
                                        onVisibilityRules={() => onVisibilityRules(inbox)}
                                    />
                                </div>
                            </SwipeableInboxCard>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
