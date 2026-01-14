/**
 * SplitPaneLayout - Responsive 3-column layout for inbox manager
 * Desktop: 3 columns (Inbox | Messages | Reading Pane)
 * Tablet: 2 columns (Combined list | Reading Pane)
 * Mobile: Single column with navigation stack
 */

import { ReactNode, useMemo } from 'react';
import { cn } from '../../utils/cn';
import { usePaneResize } from '../../hooks/usePaneResize';
import { ResizeHandle } from './ResizeHandle';

interface SplitPaneLayoutProps {
    /** Left pane content (inbox list) */
    leftPane: ReactNode;
    /** Middle pane content (message list) */
    middlePane: ReactNode;
    /** Right pane content (reading pane) */
    rightPane: ReactNode;
    /** Whether to show the left pane */
    showLeftPane?: boolean;
    /** Whether to show the right pane */
    showRightPane?: boolean;
    /** Current breakpoint for responsive behavior */
    breakpoint?: 'mobile' | 'tablet' | 'desktop';
    /** Additional class names */
    className?: string;
}

// Pane configuration
const PANE_CONFIG = {
    left: {
        storageKey: 'inbox-sidebar',
        defaultWidth: 280,
        minWidth: 200,
        maxWidth: 400,
    },
    middle: {
        storageKey: 'message-list',
        defaultWidth: 350,
        minWidth: 280,
        maxWidth: 500,
    },
};

export function SplitPaneLayout({
    leftPane,
    middlePane,
    rightPane,
    showLeftPane = true,
    showRightPane = true,
    breakpoint = 'desktop',
    className,
}: SplitPaneLayoutProps) {
    const paneConfigs = useMemo(
        () => [PANE_CONFIG.left, PANE_CONFIG.middle],
        []
    );

    const { paneStates, startResize, resetPane, isResizing } = usePaneResize({
        panes: paneConfigs,
    });

    const leftWidth = paneStates[0]?.width ?? PANE_CONFIG.left.defaultWidth;
    const middleWidth = paneStates[1]?.width ?? PANE_CONFIG.middle.defaultWidth;

    // Mobile: Single column stack
    if (breakpoint === 'mobile') {
        return (
            <div className={cn('flex flex-col h-full', className)}>
                {showLeftPane && !showRightPane && (
                    <div className="flex-1 overflow-auto">{leftPane}</div>
                )}
                {!showLeftPane && !showRightPane && (
                    <div className="flex-1 overflow-auto">{middlePane}</div>
                )}
                {showRightPane && (
                    <div className="flex-1 overflow-auto">{rightPane}</div>
                )}
            </div>
        );
    }

    // Tablet: 2 columns
    if (breakpoint === 'tablet') {
        return (
            <div className={cn('flex h-full', className)}>
                {/* Combined inbox + messages pane */}
                <div
                    className="flex-shrink-0 overflow-auto border-r border-white/5"
                    style={{ width: middleWidth }}
                >
                    {showLeftPane ? leftPane : middlePane}
                </div>

                <ResizeHandle
                    index={1}
                    isActive={isResizing}
                    onResizeStart={startResize}
                    onReset={resetPane}
                />

                {/* Reading pane */}
                <div className="flex-1 overflow-auto">
                    {showRightPane ? rightPane : middlePane}
                </div>
            </div>
        );
    }

    // Desktop: 3 columns
    return (
        <div
            className={cn(
                'flex h-full',
                isResizing && 'select-none',
                className
            )}
        >
            {/* Left pane: Inbox list */}
            {showLeftPane && (
                <>
                    <div
                        className="flex-shrink-0 overflow-auto border-r border-white/5"
                        style={{ width: leftWidth }}
                    >
                        {leftPane}
                    </div>

                    <ResizeHandle
                        index={0}
                        isActive={isResizing}
                        onResizeStart={startResize}
                        onReset={resetPane}
                    />
                </>
            )}

            {/* Middle pane: Message list */}
            <div
                className="flex-shrink-0 overflow-auto border-r border-white/5"
                style={{ width: middleWidth }}
            >
                {middlePane}
            </div>

            <ResizeHandle
                index={1}
                isActive={isResizing}
                onResizeStart={startResize}
                onReset={resetPane}
            />

            {/* Right pane: Reading pane (flex-1 to fill remaining space) */}
            <div className="flex-1 overflow-auto min-w-0">
                {showRightPane ? rightPane : (
                    <div className="h-full flex items-center justify-center text-text-secondary">
                        <div className="text-center">
                            <svg
                                className="w-16 h-16 mx-auto mb-4 opacity-30"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                />
                            </svg>
                            <p className="text-sm">Chọn email để xem</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default SplitPaneLayout;
