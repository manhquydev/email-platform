/**
 * MessageDetailSkeleton - Loading skeleton for message detail pane
 * Used with Suspense boundaries for smooth loading states
 */

import { Skeleton } from "../Skeleton";

export function MessageDetailSkeleton() {
    return (
        <div className="flex-1 flex flex-col bg-nebula-surface border-l border-nebula-border">
            {/* Header skeleton */}
            <div className="h-16 px-6 border-b border-nebula-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Skeleton width={40} height={40} borderRadius="50%" />
                    <div className="space-y-2">
                        <Skeleton width={180} height={16} borderRadius={4} />
                        <Skeleton width={120} height={12} borderRadius={4} />
                    </div>
                </div>
                <div className="flex gap-2">
                    <Skeleton width={36} height={36} borderRadius={8} />
                    <Skeleton width={36} height={36} borderRadius={8} />
                    <Skeleton width={36} height={36} borderRadius={8} />
                </div>
            </div>

            {/* Content skeleton */}
            <div className="flex-1 p-6 space-y-4 overflow-hidden">
                {/* Subject */}
                <Skeleton width="60%" height={28} borderRadius={6} />

                {/* Body */}
                <div className="space-y-3 p-6 bg-nebula-elevated rounded-xl">
                    <Skeleton width="100%" height={16} borderRadius={4} />
                    <Skeleton width="95%" height={16} borderRadius={4} />
                    <Skeleton width="85%" height={16} borderRadius={4} />
                    <Skeleton width="90%" height={16} borderRadius={4} />
                    <Skeleton width="75%" height={16} borderRadius={4} />
                    <div className="h-4" />
                    <Skeleton width="100%" height={16} borderRadius={4} />
                    <Skeleton width="80%" height={16} borderRadius={4} />
                </div>
            </div>
        </div>
    );
}
