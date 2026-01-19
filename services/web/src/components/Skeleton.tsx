/**
 * Skeleton Components - Loading placeholders with shimmer animations
 * Provides content-aware skeletons for reduced perceived latency
 */
import { motion } from "framer-motion";

interface SkeletonProps {
    className?: string;
    width?: string | number;
    height?: string | number;
    borderRadius?: string | number;
}

export function Skeleton({ className = "", width, height, borderRadius }: SkeletonProps) {
    return (
        <motion.div
            className={`skeleton-base ${className}`}
            style={{ width, height, borderRadius }}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: [0.5, 0.8, 0.5] }}
            transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
            }}
        />
    );
}

/** Inbox card skeleton for sidebar */
export function InboxCardSkeleton() {
    return (
        <div className="inbox-card-skeleton">
            <div className="flex items-center gap-3 w-full">
                <Skeleton width={40} height={40} borderRadius="50%" />
                <div className="flex-1 space-y-2">
                    <Skeleton width="60%" height={16} />
                    <Skeleton width="40%" height={12} />
                </div>
            </div>
        </div>
    );
}

/** Single message item skeleton */
export function MessageItemSkeleton() {
    return (
        <div className="message-item-skeleton">
            <div className="flex items-start gap-3 p-4 border-b border-border/50">
                <Skeleton width={32} height={32} borderRadius="50%" />
                <div className="flex-1 space-y-2">
                    <div className="flex justify-between">
                        <Skeleton width="30%" height={14} />
                        <Skeleton width="15%" height={10} />
                    </div>
                    <Skeleton width="80%" height={16} />
                    <Skeleton width="90%" height={12} />
                </div>
            </div>
        </div>
    );
}

/** Message list skeleton - shows multiple message items */
export function MessageListSkeleton({ count = 5 }: { count?: number }) {
    return (
        <div className="message-list-skeleton space-y-0">
            {Array.from({ length: count }).map((_, i) => (
                <MessageItemSkeleton key={i} />
            ))}
        </div>
    );
}

/** Message detail pane skeleton */
export function MessageDetailSkeleton() {
    return (
        <div className="message-detail-skeleton p-6 space-y-6">
            {/* Header */}
            <div className="space-y-3">
                <Skeleton width="70%" height={24} />
                <div className="flex items-center gap-3">
                    <Skeleton width={40} height={40} borderRadius="50%" />
                    <div className="space-y-2">
                        <Skeleton width={180} height={14} />
                        <Skeleton width={120} height={12} />
                    </div>
                </div>
            </div>
            {/* Divider */}
            <Skeleton width="100%" height={1} />
            {/* Body content */}
            <div className="space-y-3">
                <Skeleton width="100%" height={16} />
                <Skeleton width="95%" height={16} />
                <Skeleton width="88%" height={16} />
                <Skeleton width="92%" height={16} />
                <Skeleton width="60%" height={16} />
            </div>
            {/* Attachments placeholder */}
            <div className="flex gap-3 pt-4">
                <Skeleton width={120} height={80} borderRadius={8} />
                <Skeleton width={120} height={80} borderRadius={8} />
            </div>
        </div>
    );
}

/** Inbox sidebar skeleton - shows domain and inbox list */
export function InboxSidebarSkeleton() {
    return (
        <div className="inbox-sidebar-skeleton p-4 space-y-4">
            {/* Domain header */}
            <div className="space-y-2">
                <Skeleton width="40%" height={12} />
                <Skeleton width="70%" height={20} />
            </div>
            {/* Inbox list */}
            <div className="space-y-3 pt-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <InboxCardSkeleton key={i} />
                ))}
            </div>
        </div>
    );
}

/** Dashboard stats cards skeleton */
export function DashboardStatsSkeleton() {
    return (
        <div className="dashboard-stats-skeleton grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-4 rounded-lg border border-nebula-border bg-nebula-surface/50 space-y-3">
                    <Skeleton width={40} height={40} borderRadius={8} />
                    <Skeleton width="60%" height={14} />
                    <Skeleton width="40%" height={24} />
                </div>
            ))}
        </div>
    );
}

/** Full page loading skeleton */
export function PageSkeleton() {
    return (
        <div className="page-skeleton h-full flex">
            {/* Sidebar */}
            <div className="hidden md:block w-64 border-r border-nebula-border">
                <InboxSidebarSkeleton />
            </div>
            {/* Message list */}
            <div className="w-full md:w-[360px] border-r border-nebula-border">
                <div className="h-16 p-4 border-b border-nebula-border">
                    <Skeleton width="50%" height={20} />
                </div>
                <MessageListSkeleton count={6} />
            </div>
            {/* Detail pane */}
            <div className="hidden md:block flex-1">
                <MessageDetailSkeleton />
            </div>
        </div>
    );
}
