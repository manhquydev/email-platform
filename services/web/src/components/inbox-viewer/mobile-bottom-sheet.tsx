/**
 * MobileBottomSheet - Full-screen mobile message detail overlay
 * Focus-managed, keyboard accessible, and optimized for narrow viewports
 */
import { useRef, useEffect } from "react";

interface MobileBottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    subtitle?: string;
    children: React.ReactNode;
}

export function MobileBottomSheet({ isOpen, onClose, title, subtitle, children }: MobileBottomSheetProps) {
    const closeButtonRef = useRef<HTMLButtonElement>(null);

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
            className="fixed inset-0 z-[120] md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Message detail"
        >
            <div
                className="absolute inset-0 bg-zinc-950 flex flex-col"
            >
                <div className="flex items-center gap-3 px-3 py-3 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-md">
                    <button
                        ref={closeButtonRef}
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center rounded-md hover:bg-zinc-800 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500"
                        aria-label="Close message detail"
                    >
                        <span className="material-symbols-outlined text-zinc-100">arrow_back</span>
                    </button>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-zinc-100 truncate">
                            {title || "Chi tiết email"}
                        </p>
                        {subtitle && (
                            <p className="text-xs text-zinc-400 truncate">{subtitle}</p>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0">
                    {children}
                </div>
            </div>
        </div>
    );
}
