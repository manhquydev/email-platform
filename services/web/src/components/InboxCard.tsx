/**
 * InboxCard - Individual inbox card component
 * Modules extracted to inbox-card-modules/
 */
import { GlassCard } from "./ui/GlassCard";
import { cn } from "../utils/cn";
import { CopyButton } from "./copy-first/CopyButton";
import { TTLProgressBar } from "./copy-first/TTLProgressBar";
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
    onVisibilityRules
}: InboxCardProps) {
    const email = `${inbox.localPart}@${inbox.domain?.name || 'domain'}`;
    const messageCount = inbox._count?.messages ?? 0;

    const handleCheckbox = (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggleSelect();
    };

    return (
        <GlassCard
            className={cn(
                "group relative p-4 mb-3 cursor-pointer transition-all duration-300 border border-white/5 hover:border-white/10",
                isActive && "ring-2 ring-primary/50 bg-primary/5",
                isSelected && "bg-primary/10 border-primary/20"
            )}
            onClick={onSelect}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter') onViewMessages();
                if (e.key === ' ') { e.preventDefault(); onToggleSelect(); }
            }}
        >
            <div className="flex items-start gap-3">
                <SelectCheckbox isSelected={isSelected} onClick={handleCheckbox} />

                {/* Main Content */}
                <div className="flex-1 min-w-0">
                    {/* Email header with prominent copy button */}
                    <div className="flex items-center gap-2 mb-2">
                        <h3
                            className="text-base font-semibold text-text-main truncate flex-1 cursor-pointer hover:text-primary transition-colors"
                            onClick={onViewMessages}
                        >
                            {email}
                        </h3>
                        <CopyButton
                            text={email}
                            size="sm"
                            variant="primary"
                            label="Copy"
                            successMessage={`Đã copy: ${email}`}
                            onCopy={onCopy}
                            ariaLabel="Copy địa chỉ email"
                        />
                    </div>

                    <TTLProgressBar
                        expiresAt={inbox.expiresAt || null}
                        createdAt={inbox.createdAt}
                        size="sm"
                        showLabel
                        className="mb-2"
                    />

                    <StatsRow
                        messageCount={messageCount}
                        createdAt={inbox.createdAt}
                        onClick={onViewMessages}
                    />

                    {onShareModeChange && (
                        <ShareModeToggle
                            shareMode={inbox.shareMode as 'PUBLIC' | 'PRIVATE'}
                            onChange={onShareModeChange}
                        />
                    )}
                </div>

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
        </GlassCard>
    );
}
