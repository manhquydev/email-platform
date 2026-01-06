import toast from "react-hot-toast";
import type { Inbox } from "../types";
import { GlassCard } from "./ui/GlassCard";
import { cn } from "../utils/cn";

interface InboxCardProps {
    inbox: Inbox;
    isSelected: boolean;
    isActive: boolean;
    onSelect: () => void;
    onToggleSelect: () => void;
    onCopy: () => void;
    onDelete: () => void;
    onViewMessages: () => void;
    onTransfer?: () => void;
}

export function InboxCard({
    inbox,
    isSelected,
    isActive,
    onSelect,
    onToggleSelect,
    onCopy,
    onDelete,
    onViewMessages,
    onTransfer
}: InboxCardProps) {
    const email = `${inbox.localPart}@${inbox.domain?.name || 'domain'}`;

    // Calculate TTL status
    const getTTLInfo = () => {
        if (!inbox.expiresAt) {
            return { label: "Vĩnh viễn", status: "permanent" as const, icon: "text-purple-400 bg-purple-500/10" };
        }
        const expires = new Date(inbox.expiresAt);
        const now = new Date();
        const diffMs = expires.getTime() - now.getTime();

        if (diffMs <= 0) {
            return { label: "Expired", status: "expired" as const, icon: "text-red-400 bg-red-500/10" };
        }

        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffHours < 24) {
            return { label: `${diffHours}h left`, status: "expiring" as const, icon: "text-amber-400 bg-amber-500/10" };
        }
        return { label: `${diffDays}d left`, status: "active" as const, icon: "text-emerald-400 bg-emerald-500/10" };
    };

    const ttl = getTTLInfo();

    // Get message count from API
    const messageCount = inbox._count?.messages ?? 0;

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(email);
        toast.success(`Copied: ${email}`, { icon: "📋" });
        onCopy();
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete();
    };

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
            <div className="flex items-start gap-4">
                {/* Checkbox */}
                <div className="pt-1">
                    <button
                        onClick={handleCheckbox}
                        className={cn(
                            "w-5 h-5 rounded-md border border-white/20 flex items-center justify-center transition-colors",
                            isSelected ? "bg-primary border-primary" : "hover:border-primary/50"
                        )}
                    >
                        {isSelected && (
                            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        )}
                    </button>
                </div>

                {/* Main Content */}
                <div className="flex-1 min-w-0" onClick={onViewMessages}>
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="text-base font-semibold text-text-main truncate pr-2">{email}</h3>
                        <div className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider", ttl.icon)}>
                            {ttl.label}
                        </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-text-secondary mt-2">
                        <span className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            {messageCount}
                        </span>
                        <span className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {new Date(inbox.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                </div>

                {/* Actions (visible on hover/focus/active) */}
                <div className={cn(
                    "flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
                    (isActive || isSelected) && "opacity-100"
                )}>
                    <button
                        onClick={handleCopy}
                        className="p-1.5 rounded-lg text-text-secondary hover:text-primary hover:bg-primary/10 transition-colors"
                        title="Copy Address"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                        </svg>
                    </button>
                    {onTransfer && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onTransfer(); }}
                            className="p-1.5 rounded-lg text-text-secondary hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                            title="Transfer Ownership"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                        </button>
                    )}
                    <button
                        onClick={handleDelete}
                        className="p-1.5 rounded-lg text-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Delete Inbox"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </div>
        </GlassCard>
    );
}
