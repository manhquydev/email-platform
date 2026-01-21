/**
 * UI components for InboxCard
 */
import type { Inbox } from "../../types";
import { cn } from "../../utils/cn";
import { haptic } from "../../hooks/useHaptic";

/** Checkbox for selecting inbox */
interface SelectCheckboxProps {
    isSelected: boolean;
    onClick: (e: React.MouseEvent) => void;
}

export function SelectCheckbox({ isSelected, onClick }: SelectCheckboxProps) {
    return (
        <div className="pt-1">
            <button
                onClick={onClick}
                className={cn(
                    "w-5 h-5 rounded-md border border-white/20 flex items-center justify-center transition-colors",
                    isSelected ? "bg-primary border-primary" : "hover:border-primary/50"
                )}
                aria-label={isSelected ? "Bỏ chọn" : "Chọn"}
            >
                {isSelected && (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                )}
            </button>
        </div>
    );
}

/** Stats row showing message count and creation date */
interface StatsRowProps {
    messageCount: number;
    createdAt: string;
    onClick: () => void;
}

export function StatsRow({ messageCount, createdAt, onClick }: StatsRowProps) {
    return (
        <div className="flex items-center gap-4 text-xs text-text-secondary" onClick={onClick}>
            <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {messageCount} tin
            </span>
            <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {new Date(createdAt).toLocaleDateString('vi-VN')}
            </span>
        </div>
    );
}

/** Share mode toggle button */
interface ShareModeToggleProps {
    shareMode: 'PUBLIC' | 'PRIVATE';
    onChange: (mode: 'PUBLIC' | 'PRIVATE') => void;
}

export function ShareModeToggle({ shareMode, onChange }: ShareModeToggleProps) {
    const isPublic = shareMode === 'PUBLIC';

    return (
        <div className="mt-3 pt-3 border-t border-white/5">
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onChange(isPublic ? 'PRIVATE' : 'PUBLIC');
                }}
                className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all w-full justify-center",
                    isPublic
                        ? "bg-green-500/15 text-green-400 hover:bg-green-500/25 border border-green-500/30"
                        : "bg-gray-500/15 text-gray-400 hover:bg-gray-500/25 border border-gray-500/30"
                )}
                title={isPublic ? 'Click để chuyển sang Private' : 'Click để chuyển sang Public'}
            >
                {isPublic ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                )}
                <span>{isPublic ? 'Công khai' : 'Riêng tư'}</span>
                <span className="text-[10px] opacity-60 ml-1">
                    {isPublic ? '(ai cũng xem được qua inbox viewer)' : '(chỉ bạn mới xem được)'}
                </span>
            </button>
        </div>
    );
}

/** Action buttons panel */
interface ActionButtonsProps {
    inbox: Inbox;
    isVisible: boolean;
    onTransfer?: () => void;
    onExtend?: () => void;
    onTogglePermanent?: () => void;
    onVisibilityRules?: () => void;
    onDelete: () => void;
}

export function ActionButtons({
    inbox,
    isVisible,
    onTransfer,
    onExtend,
    onTogglePermanent,
    onVisibilityRules,
    onDelete
}: ActionButtonsProps) {
    return (
        <div className={cn(
            // Responsive layout: row on mobile, column on desktop
            "flex flex-row sm:flex-col",
            "gap-0.5 sm:gap-1",
            // Visibility
            "opacity-0 group-hover:opacity-100 transition-opacity",
            isVisible && "opacity-100"
        )}>
            {onTransfer && (
                <ActionButton
                    onClick={onTransfer}
                    title="Transfer Ownership"
                    ariaLabel="Chuyển quyền sở hữu"
                    className="hover:text-warning hover:bg-warning/10"
                    icon={<path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />}
                />
            )}
            {onTogglePermanent && (
                <ActionButton
                    onClick={onTogglePermanent}
                    title={!inbox.expiresAt ? "Chuyển sang Có hạn (24h)" : "Chuyển sang Vĩnh viễn"}
                    ariaLabel="Chuyển đổi trạng thái vĩnh viễn"
                    className={!inbox.expiresAt ? "text-amber-400 hover:bg-amber-400/10" : "text-purple-400 hover:bg-purple-500/10"}
                    icon={!inbox.expiresAt
                        ? <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        : <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z" />
                    }
                />
            )}
            {onExtend && inbox.expiresAt && (
                <ActionButton
                    onClick={onExtend}
                    title="Gia hạn +10 phút"
                    ariaLabel="Gia hạn inbox"
                    className="hover:text-cyan-400 hover:bg-cyan-400/10"
                    icon={<path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />}
                />
            )}
            {onVisibilityRules && (
                <ActionButton
                    onClick={onVisibilityRules}
                    title="Visibility Rules"
                    ariaLabel="Quy tắc hiển thị"
                    className="hover:text-purple-400 hover:bg-purple-500/10"
                    icon={
                        <>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </>
                    }
                />
            )}
            <ActionButton
                onClick={onDelete}
                title="Delete Inbox"
                ariaLabel="Xóa hộp thư"
                className="hover:text-danger hover:bg-danger/10"
                icon={<path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />}
            />
        </div>
    );
}

/** Single action button */
interface ActionButtonProps {
    onClick: () => void;
    title: string;
    ariaLabel: string;
    className: string;
    icon: React.ReactNode;
}

function ActionButton({ onClick, title, ariaLabel, className, icon }: ActionButtonProps) {
    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        haptic('light');
        onClick();
    };

    return (
        <button
            onClick={handleClick}
            className={cn(
                // Responsive padding and touch target
                "p-1 sm:p-1.5",
                "min-w-[32px] min-h-[32px] sm:min-w-0 sm:min-h-0",
                "rounded-lg text-text-secondary transition-colors",
                className
            )}
            title={title}
            aria-label={ariaLabel}
        >
            <svg
                className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
            >
                {icon}
            </svg>
        </button>
    );
}
