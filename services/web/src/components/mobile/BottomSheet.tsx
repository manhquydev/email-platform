/**
 * BottomSheet - Draggable bottom sheet component for mobile
 * Supports snap points, backdrop dismiss, and drag-to-close
 */

import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface BottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
    /** Title shown in the header */
    title?: string;
    /** Snap points as percentages of viewport height */
    snapPoints?: number[];
    /** Initial snap point index */
    initialSnap?: number;
    /** Additional class names */
    className?: string;
}

const DEFAULT_SNAP_POINTS = [0, 50, 90]; // closed, half, full

export function BottomSheet({
    isOpen,
    onClose,
    children,
    title,
    snapPoints = DEFAULT_SNAP_POINTS,
    initialSnap = 1,
    className,
}: BottomSheetProps) {
    const [currentSnap, setCurrentSnap] = useState(initialSnap);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState(0);
    const sheetRef = useRef<HTMLDivElement>(null);
    const startY = useRef(0);
    const startHeight = useRef(0);

    // Reset state when opened
    useEffect(() => {
        if (isOpen) {
            setCurrentSnap(initialSnap);
            setDragOffset(0);
        }
    }, [isOpen, initialSnap]);

    // Prevent body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        setIsDragging(true);
        startY.current = e.touches[0].clientY;
        startHeight.current = snapPoints[currentSnap];
    }, [currentSnap, snapPoints]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!isDragging) return;

        const deltaY = startY.current - e.touches[0].clientY;
        const deltaPercent = (deltaY / window.innerHeight) * 100;
        setDragOffset(deltaPercent);
    }, [isDragging]);

    const handleTouchEnd = useCallback(() => {
        if (!isDragging) return;
        setIsDragging(false);

        const newHeight = startHeight.current + dragOffset;

        // Find closest snap point
        let closestSnap = 0;
        let minDistance = Infinity;
        snapPoints.forEach((point, index) => {
            const distance = Math.abs(point - newHeight);
            if (distance < minDistance) {
                minDistance = distance;
                closestSnap = index;
            }
        });

        // If snapped to 0 (closed), close the sheet
        if (closestSnap === 0) {
            onClose();
        } else {
            setCurrentSnap(closestSnap);
        }

        setDragOffset(0);
    }, [isDragging, dragOffset, snapPoints, onClose]);

    const handleBackdropClick = useCallback(() => {
        onClose();
    }, [onClose]);

    if (!isOpen) return null;

    const currentHeight = snapPoints[currentSnap] + dragOffset;
    const clampedHeight = Math.max(0, Math.min(95, currentHeight));

    return (
        <div className="fixed inset-0 z-50">
            {/* Backdrop */}
            <div
                className={cn(
                    'absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity',
                    isDragging ? 'transition-none' : 'duration-300'
                )}
                style={{ opacity: clampedHeight / 100 }}
                onClick={handleBackdropClick}
            />

            {/* Sheet */}
            <div
                ref={sheetRef}
                className={cn(
                    'absolute bottom-0 left-0 right-0 bg-bg-secondary rounded-t-2xl shadow-2xl',
                    isDragging ? 'transition-none' : 'transition-all duration-300 ease-out',
                    className
                )}
                style={{ height: `${clampedHeight}vh` }}
            >
                {/* Drag Handle */}
                <div
                    className="flex justify-center py-3 cursor-grab active:cursor-grabbing touch-none"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    <div className="w-10 h-1 bg-white/20 rounded-full" />
                </div>

                {/* Header */}
                {title && (
                    <div className="px-4 pb-3 border-b border-white/5">
                        <h2 className="text-lg font-semibold text-text-main">{title}</h2>
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-4 py-2">
                    {children}
                </div>
            </div>
        </div>
    );
}

export default BottomSheet;
