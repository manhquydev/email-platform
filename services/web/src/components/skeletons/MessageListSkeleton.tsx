/**
 * MessageListSkeleton - Loading skeleton for message list
 * Used with Suspense boundaries for smooth loading states
 */

import { Skeleton } from "../Skeleton";

interface MessageListSkeletonProps {
    count?: number;
}

export function MessageListSkeleton({ count = 5 }: MessageListSkeletonProps) {
    return (
        <div className="flex flex-col bg-nebula-surface">
            {/* Toolbar skeleton */}
            <div className="h-14 px-4 border-b border-nebula-border flex items-center gap-3">
                <Skeleton width={120} height={32} borderRadius={8} />
                <Skeleton width={200} height={32} borderRadius={8} className="flex-1 max-w-xs" />
            </div>

            {/* Message items skeleton */}
            <div className="flex-1 overflow-hidden">
                {Array.from({ length: count }).map((_, i) => (
                    <div
                        key={i}
                        className="p-4 border-b border-nebula-border flex gap-3"
                    >
                        <div className="flex-1 space-y-2">
                            <div className="flex justify-between items-center">
                                <Skeleton width="30%" height={14} borderRadius={4} />
                                <Skeleton width={60} height={12} borderRadius={4} />
                            </div>
                            <Skeleton width="70%" height={16} borderRadius={4} />
                            <Skeleton width="90%" height={12} borderRadius={4} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
