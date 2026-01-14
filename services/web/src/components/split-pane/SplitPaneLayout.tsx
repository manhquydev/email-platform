/**
 * SplitPaneLayout - Responsive 3-column layout for inbox manager
 * Desktop: 3 columns (Inbox | Messages | Reading Pane)
 * Tablet: 2 columns (Combined list | Reading Pane)
 * Mobile: Single column with navigation stack
 */

import { useMemo, type ReactNode } from 'react';
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
            {/* Left pane: Inbox list - Nebula glass sidebar */}
            {showLeftPane && (
                <>
                    <div
                        className="flex-shrink-0 overflow-auto border-r border-white/5 bg-[var(--nebula-void)]/50"
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

            {/* Middle pane: Message list - Nebula surface */}
            <div
                className="flex-shrink-0 overflow-auto border-r border-white/5 bg-[var(--nebula-surface)]/30"
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
            <div className="flex-1 overflow-auto min-w-0 bg-gradient-to-br from-[var(--nebula-void)] to-[var(--nebula-surface)]/20">
                {showRightPane ? rightPane : (
                    <div className="h-full flex items-center justify-center text-text-secondary">
                        <div className="text-center max-w-[300px] animate-fade-in">
                            {/* Nebula-styled empty state icon */}
                            <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/10 via-purple-500/5 to-cyan-500/5 border border-primary/10 flex items-center justify-center shadow-[0_0_40px_rgba(139,92,246,0.1)]">
                                <svg
                                    className="w-12 h-12 text-primary/50"
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
                            </div>
                            <h3 className="text-base font-semibold text-text-main mb-2">Chọn email để xem</h3>
                            <p className="text-sm text-text-secondary mb-5 leading-relaxed">
                                Chọn một email từ danh sách bên trái để xem nội dung chi tiết
                            </p>
                            {/* Keyboard hints with Nebula glass style */}
                            <div className="inline-flex items-center gap-4 text-[11px] text-text-secondary bg-white/[0.02] backdrop-blur-sm border border-white/5 rounded-xl px-4 py-2.5">
                                <div className="flex items-center gap-1.5">
                                    <kbd className="px-2 py-1 rounded-md bg-white/5 border border-white/10 font-mono text-primary/80 shadow-sm">j</kbd>
                                    <kbd className="px-2 py-1 rounded-md bg-white/5 border border-white/10 font-mono text-primary/80 shadow-sm">k</kbd>
                                    <span className="text-text-secondary/70">di chuyển</span>
                                </div>
                                <div className="w-px h-4 bg-white/10" />
                                <div className="flex items-center gap-1.5">
                                    <kbd className="px-2 py-1 rounded-md bg-white/5 border border-white/10 font-mono text-primary/80 shadow-sm">↵</kbd>
                                    <span className="text-text-secondary/70">mở</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default SplitPaneLayout;
