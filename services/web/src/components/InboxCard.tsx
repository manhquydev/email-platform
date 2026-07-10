/**
 * InboxCard - Individual inbox card component
 * Responsive design with mobile-first approach
 * Modules extracted to inbox-card-modules/
 */
import { GlassCard } from "./ui/GlassCard";
import { cn } from "../utils/cn";
import { CopyButton } from "./copy-first/CopyButton";
import { TTLProgressBar } from "./copy-first/TTLProgressBar";
import { haptic } from "../hooks/useHaptic";
import {
    type InboxCardProps,
    SelectCheckbox,
    StatsRow,
    ShareModeToggle,
    ActionButtons
} from "./inbox-card-modules";

export function InboxCard({
    inbox,
    isSelected,
    isActive,
    onSelect,
    onToggleSelect,
    onCopy,
    onDelete,
    onViewMessages,
    onTransfer,
    onExtend,
    onTogglePermanent,
    onShareModeChange,
    onVisibilityRules,
    variant = 'default',
    hideActions = false,
    hideCheckbox = false,
    className,
}: InboxCardProps) {
    const email = `${inbox.localPart}@${inbox.domain?.name || 'domain'}`;
    const messageCount = inbox._count?.messages ?? 0;
    const isMobile = variant === 'mobile';
    const isCompact = variant === 'compact';

    const handleCheckbox = (e: React.MouseEvent) => {
        e.stopPropagation();
        haptic('selection');
        onToggleSelect();
    };

    const handleSelect = () => {
        haptic('light');
        onSelect();
    };

    const handleViewMessages = () => {
        haptic('light');
        onViewMessages();
    };

    return (
        <GlassCard
            className={cn(
                // Base styles
                "group relative cursor-pointer transition-all duration-300",
                "border border-white/5 hover:border-white/10",
                // Responsive padding: mobile-first
                "p-3 sm:p-4",
                // Spacing
                !isMobile && "mb-2 sm:mb-3",
                // Compact variant
                isCompact && "p-3",
                // States
                isActive && "ring-2 ring-primary/50 bg-primary/5",
                isSelected && "bg-primary/10 border-primary/20",
                className
            )}
            onClick={handleSelect}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter') handleViewMessages();
                if (e.key === ' ') { e.preventDefault(); onToggleSelect(); }
            }}
        >
            <div className="flex items-start gap-2 sm:gap-3">
                {!hideCheckbox && (
                    <SelectCheckbox isSelected={isSelected} onClick={handleCheckbox} />
                )}

                {/* Main Content */}
                <div className="flex-1 min-w-0">
                    {/* Email header with copy button */}
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                        <h3
                            className={cn(
                                "font-semibold text-text-main truncate flex-1",
                                "cursor-pointer hover:text-primary transition-colors",
                                // Responsive font size
                                "text-sm sm:text-base"
                            )}
                            onClick={handleViewMessages}
                        >
                            {email}
                        </h3>
                        <CopyButton
                            text={email}
                            size="sm"
                            variant="primary"
                            label={isMobile ? "" : "Copy"}
                            successMessage={`Đã copy: ${email}`}
                            onCopy={onCopy}
                            ariaLabel="Copy địa chỉ email"
                        />
                    </div>

                    <TTLProgressBar
                        expiresAt={inbox.expiresAt || null}
                        createdAt={inbox.createdAt}
                        size="sm"
                        showLabel={!isMobile}
                        className="mb-1.5 sm:mb-2"
                    />

                    <StatsRow
                        messageCount={messageCount}
                        createdAt={inbox.createdAt}
                        onClick={handleViewMessages}
                    />

                    {/* Share toggle - hidden on dedicated mobile variant (uses long-press action sheet instead) */}
                    {onShareModeChange && !isMobile && (
                        <ShareModeToggle
                            shareMode={inbox.shareMode as 'PUBLIC' | 'PRIVATE'}
                            onChange={onShareModeChange}
                        />
                    )}
                </div>

                {/* Action buttons - responsive visibility */}
                {!hideActions && (
                    <div className={cn(
                        // Always visible on mobile when active/selected
                        // Hidden on desktop until hover
                        "flex-shrink-0",
                        !isActive && !isSelected && "sm:opacity-0 sm:group-hover:opacity-100",
                        "transition-opacity"
                    )}>
                        <ActionButtons
                            inbox={inbox}
                            isVisible={isActive || isSelected}
                            onTransfer={onTransfer}
                            onExtend={onExtend}
                            onTogglePermanent={onTogglePermanent}
                            onVisibilityRules={onVisibilityRules}
                            onDelete={onDelete}
                        />
                    </div>
                )}
            </div>
        </GlassCard>
    );
}

export type { InboxCardProps, InboxCardVariant } from "./inbox-card-modules";
