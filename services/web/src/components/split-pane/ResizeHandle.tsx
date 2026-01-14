/**
 * ResizeHandle - Draggable handle for resizing split panes
 * Supports mouse and touch events, double-click to reset
 */

import { useCallback } from 'react';
import { cn } from '../../utils/cn';

interface ResizeHandleProps {
    /** Index of this handle (for multi-pane layouts) */
    index: number;
    /** Whether this handle is currently being dragged */
    isActive: boolean;
    /** Callback to start resize operation */
    onResizeStart: (handleIndex: number, clientX: number) => void;
    /** Callback to reset pane to default (double-click) */
    onReset?: (handleIndex: number) => void;
    /** Orientation of the handle */
    orientation?: 'vertical' | 'horizontal';
    /** Additional class names */
    className?: string;
}

export function ResizeHandle({
    index,
    isActive,
    onResizeStart,
    onReset,
    orientation = 'vertical',
    className,
}: ResizeHandleProps) {
    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            onResizeStart(index, e.clientX);
        },
        [index, onResizeStart]
    );

    const handleTouchStart = useCallback(
        (e: React.TouchEvent) => {
            if (e.touches.length === 1) {
                onResizeStart(index, e.touches[0].clientX);
            }
        },
        [index, onResizeStart]
    );

    const handleDoubleClick = useCallback(() => {
        onReset?.(index);
    }, [index, onReset]);

    const isVertical = orientation === 'vertical';

    return (
        <div
            className={cn(
                'group relative flex items-center justify-center',
                'transition-colors duration-150',
                isVertical ? 'w-1 cursor-col-resize hover:w-1.5' : 'h-1 cursor-row-resize hover:h-1.5',
                isActive ? 'bg-primary' : 'bg-white/5 hover:bg-white/10',
                className
            )}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onDoubleClick={handleDoubleClick}
            role="separator"
            aria-orientation={orientation}
            aria-valuenow={undefined}
            tabIndex={0}
            onKeyDown={(e) => {
                // Allow keyboard-based resize adjustment
                if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                    e.preventDefault();
                    // Could implement keyboard resize here
                }
            }}
        >
            {/* Visual grip indicator */}
            <div
                className={cn(
                    'absolute opacity-0 group-hover:opacity-100 transition-opacity',
                    isVertical
                        ? 'w-0.5 h-8 flex flex-col gap-1 items-center justify-center'
                        : 'h-0.5 w-8 flex flex-row gap-1 items-center justify-center'
                )}
            >
                <span className="w-1 h-1 rounded-full bg-white/30" />
                <span className="w-1 h-1 rounded-full bg-white/30" />
                <span className="w-1 h-1 rounded-full bg-white/30" />
            </div>

            {/* Larger hit area for easier grabbing */}
            <div
                className={cn(
                    'absolute',
                    isVertical ? '-left-1 -right-1 inset-y-0' : '-top-1 -bottom-1 inset-x-0'
                )}
            />
        </div>
    );
}
