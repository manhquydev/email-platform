/**
 * usePaneResize - Hook for resizable split-pane layouts
 * Handles mouse/touch drag events and persists pane sizes to localStorage
 */

import { useState, useCallback, useEffect, useRef } from 'react';

interface PaneConfig {
    /** Unique key for localStorage persistence */
    storageKey: string;
    /** Default width in pixels */
    defaultWidth: number;
    /** Minimum width in pixels */
    minWidth: number;
    /** Maximum width in pixels */
    maxWidth: number;
}

interface UsePaneResizeOptions {
    /** Configuration for each pane (left to right) */
    panes: PaneConfig[];
    /** Callback when resize starts */
    onResizeStart?: () => void;
    /** Callback when resize ends */
    onResizeEnd?: () => void;
}

interface PaneState {
    width: number;
    isCollapsed: boolean;
}

interface UsePaneResizeReturn {
    /** Current pane states */
    paneStates: PaneState[];
    /** Start resizing a specific handle */
    startResize: (handleIndex: number, clientX: number) => void;
    /** Toggle collapse state of a pane */
    toggleCollapse: (paneIndex: number) => void;
    /** Reset pane to default width */
    resetPane: (paneIndex: number) => void;
    /** Reset all panes to defaults */
    resetAll: () => void;
    /** Whether any pane is currently being resized */
    isResizing: boolean;
    /** Index of handle being dragged (-1 if none) */
    activeHandle: number;
}

const STORAGE_PREFIX = 'pane-resize-';

function loadFromStorage(key: string, defaultValue: number): number {
    try {
        const stored = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
        if (stored) {
            const parsed = parseInt(stored, 10);
            if (!isNaN(parsed)) return parsed;
        }
    } catch {
        // localStorage might be unavailable
    }
    return defaultValue;
}

function saveToStorage(key: string, value: number): void {
    try {
        localStorage.setItem(`${STORAGE_PREFIX}${key}`, String(value));
    } catch {
        // localStorage might be unavailable
    }
}

export function usePaneResize(options: UsePaneResizeOptions): UsePaneResizeReturn {
    const { panes, onResizeStart, onResizeEnd } = options;

    // Initialize pane states from localStorage or defaults
    const [paneStates, setPaneStates] = useState<PaneState[]>(() =>
        panes.map((pane) => ({
            width: loadFromStorage(pane.storageKey, pane.defaultWidth),
            isCollapsed: false,
        }))
    );

    const [isResizing, setIsResizing] = useState(false);
    const [activeHandle, setActiveHandle] = useState(-1);

    // Refs for tracking resize state
    const startXRef = useRef(0);
    const startWidthsRef = useRef<number[]>([]);

    // Start resize operation
    const startResize = useCallback(
        (handleIndex: number, clientX: number) => {
            setIsResizing(true);
            setActiveHandle(handleIndex);
            startXRef.current = clientX;
            startWidthsRef.current = paneStates.map((p) => p.width);
            onResizeStart?.();

            // Prevent text selection during resize
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'col-resize';
        },
        [paneStates, onResizeStart]
    );

    // Handle mouse/touch move during resize
    useEffect(() => {
        if (!isResizing || activeHandle < 0) return;

        const handleMove = (clientX: number) => {
            const delta = clientX - startXRef.current;
            const leftPaneIndex = activeHandle;
            const leftPaneConfig = panes[leftPaneIndex];

            if (!leftPaneConfig) return;

            const startWidth = startWidthsRef.current[leftPaneIndex];
            let newWidth = startWidth + delta;

            // Clamp to min/max
            newWidth = Math.max(leftPaneConfig.minWidth, newWidth);
            newWidth = Math.min(leftPaneConfig.maxWidth, newWidth);

            setPaneStates((prev) => {
                const next = [...prev];
                next[leftPaneIndex] = {
                    ...next[leftPaneIndex],
                    width: newWidth,
                    isCollapsed: false,
                };
                return next;
            });
        };

        const handleMouseMove = (e: MouseEvent) => {
            e.preventDefault();
            handleMove(e.clientX);
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches.length === 1) {
                handleMove(e.touches[0].clientX);
            }
        };

        const handleEnd = () => {
            setIsResizing(false);
            setActiveHandle(-1);
            document.body.style.userSelect = '';
            document.body.style.cursor = '';

            // Save to localStorage
            paneStates.forEach((state, index) => {
                saveToStorage(panes[index].storageKey, state.width);
            });

            onResizeEnd?.();
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleEnd);
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleEnd);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleEnd);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleEnd);
        };
    }, [isResizing, activeHandle, panes, paneStates, onResizeEnd]);

    // Toggle collapse state
    const toggleCollapse = useCallback(
        (paneIndex: number) => {
            setPaneStates((prev) => {
                const next = [...prev];
                const pane = next[paneIndex];
                const config = panes[paneIndex];

                if (pane.isCollapsed) {
                    // Restore to previous or default width
                    next[paneIndex] = {
                        width: loadFromStorage(config.storageKey, config.defaultWidth),
                        isCollapsed: false,
                    };
                } else {
                    // Collapse to minimum
                    next[paneIndex] = {
                        width: config.minWidth,
                        isCollapsed: true,
                    };
                }
                return next;
            });
        },
        [panes]
    );

    // Reset single pane to default
    const resetPane = useCallback(
        (paneIndex: number) => {
            const config = panes[paneIndex];
            setPaneStates((prev) => {
                const next = [...prev];
                next[paneIndex] = {
                    width: config.defaultWidth,
                    isCollapsed: false,
                };
                return next;
            });
            saveToStorage(config.storageKey, config.defaultWidth);
        },
        [panes]
    );

    // Reset all panes to defaults
    const resetAll = useCallback(() => {
        setPaneStates(
            panes.map((pane) => ({
                width: pane.defaultWidth,
                isCollapsed: false,
            }))
        );
        panes.forEach((pane) => {
            saveToStorage(pane.storageKey, pane.defaultWidth);
        });
    }, [panes]);

    return {
        paneStates,
        startResize,
        toggleCollapse,
        resetPane,
        resetAll,
        isResizing,
        activeHandle,
    };
}
