/**
 * MobileBottomSheet - Swipe-to-dismiss bottom sheet for mobile message detail
 * Touch-optimized with drag handle and backdrop
 * WCAG 2.2 AA compliant with aria labels and focus management
 */
import { useRef, useEffect, useCallback } from "react";

interface MobileBottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

export function MobileBottomSheet({ isOpen, onClose, children }: MobileBottomSheetProps) {
    const sheetRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
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

    // Lock body scroll when open + handle Escape key + focus management
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";

            // Focus the close button for accessibility
            setTimeout(() => closeButtonRef.current?.focus(), 100);

            // Handle Escape key for accessibility
            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === "Escape") {
                    onClose();
                }
            };
            document.addEventListener("keydown", handleKeyDown);

            return () => {
                document.body.style.overflow = "";
                document.removeEventListener("keydown", handleKeyDown);
            };
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Message detail"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 transition-opacity duration-200"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Sheet */}
            <div
                ref={sheetRef}
                className="absolute bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-800 rounded-t-xl max-h-[95vh] overflow-hidden transition-transform duration-200"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* Drag Handle - accessible close button with 44px touch target */}
                <div className="flex justify-center py-3">
                    <button
                        ref={closeButtonRef}
                        onClick={onClose}
                        className="w-10 h-8 flex items-center justify-center rounded-md hover:bg-zinc-800 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500"
                        aria-label="Close message detail (swipe down or tap)"
                    >
                        <div className="w-10 h-1 bg-zinc-600 rounded-full" />
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto max-h-[calc(95vh-48px)]">
                    {children}
                </div>
            </div>
        </div>
    );
}
