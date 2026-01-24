/**
 * MobileBottomSheet - Swipe-to-dismiss bottom sheet for mobile message detail
 * Touch-optimized with drag handle and backdrop
 */
import { useRef, useEffect, useCallback } from "react";

interface MobileBottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

export function MobileBottomSheet({ isOpen, onClose, children }: MobileBottomSheetProps) {
    const sheetRef = useRef<HTMLDivElement>(null);
    const startY = useRef(0);
    const currentY = useRef(0);

    // Handle touch start
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        startY.current = e.touches[0].clientY;
        currentY.current = 0;
    }, []);

    // Handle touch move - drag sheet down
    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        const deltaY = e.touches[0].clientY - startY.current;
        if (deltaY > 0 && sheetRef.current) {
            currentY.current = deltaY;
            sheetRef.current.style.transform = `translateY(${deltaY}px)`;
        }
    }, []);

    // Handle touch end - dismiss if dragged far enough
    const handleTouchEnd = useCallback(() => {
        if (currentY.current > 100) {
            onClose();
        }
        if (sheetRef.current) {
            sheetRef.current.style.transform = "";
        }
        currentY.current = 0;
    }, [onClose]);

    // Lock body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 md:hidden">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 transition-opacity duration-200"
                onClick={onClose}
            />

            {/* Sheet */}
            <div
                ref={sheetRef}
                className="absolute bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-800 rounded-t-xl max-h-[95vh] overflow-hidden transition-transform duration-200"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* Drag Handle */}
                <div className="flex justify-center py-3">
                    <div className="w-10 h-1 bg-zinc-700 rounded-full" />
                </div>

                {/* Content */}
                <div className="overflow-y-auto max-h-[calc(95vh-48px)]">
                    {children}
                </div>
            </div>
        </div>
    );
}
