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
