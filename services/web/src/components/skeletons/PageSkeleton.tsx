/**
 * PageSkeleton - Generic page loading skeleton
 * Used for lazy-loaded pages (Features, Pricing, API, etc.)
 */

import { Skeleton } from "../Skeleton";

export function PageSkeleton() {
    return (
        <div className="min-h-screen bg-nebula-background">
            {/* Hero skeleton */}
            <div className="pt-24 pb-16 px-4">
                <div className="max-w-4xl mx-auto text-center space-y-6">
                    <Skeleton width={200} height={28} borderRadius={8} className="mx-auto" />
                    <Skeleton width="80%" height={48} borderRadius={8} className="mx-auto" />
                    <Skeleton width="60%" height={20} borderRadius={4} className="mx-auto" />
                </div>
            </div>

            {/* Content skeleton */}
            <div className="max-w-6xl mx-auto px-4 py-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div
                            key={i}
                            className="p-6 rounded-2xl bg-nebula-surface border border-nebula-border space-y-4"
                        >
                            <Skeleton width={48} height={48} borderRadius={12} />
                            <Skeleton width="70%" height={24} borderRadius={4} />
                            <Skeleton width="100%" height={14} borderRadius={4} />
                            <Skeleton width="90%" height={14} borderRadius={4} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
