import { cn } from '../../utils/cn';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
  /** Set to true when Skeleton is inside a container that already has role="status" */
  nested?: boolean;
}

/**
 * Loading skeleton component for async content placeholders.
 * Provides visual feedback while content is loading.
 * Respects prefers-reduced-motion automatically via CSS.
 */
export function Skeleton({
  className,
  variant = 'text',
  width,
  height,
  animation = 'pulse',
  nested = false,
}: SkeletonProps) {
  const baseClasses = cn(
    'bg-slate-200 dark:bg-slate-700',
    animation === 'pulse' && 'animate-pulse',
    animation === 'wave' && 'animate-shimmer',
    variant === 'circular' && 'rounded-full',
    variant === 'rectangular' && 'rounded-lg',
    variant === 'text' && 'rounded',
    className
  );

  const style: React.CSSProperties = {
    width: width ?? (variant === 'text' ? '100%' : undefined),
    height: height ?? (variant === 'text' ? '1em' : undefined),
  };

  // When nested inside a container with role="status", use presentation role to avoid verbosity
  if (nested) {
    return <div className={baseClasses} style={style} role="presentation" aria-hidden="true" />;
  }

  return (
    <div
      className={baseClasses}
      style={style}
      role="status"
      aria-label="Loading..."
      aria-busy="true"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/**
 * Skeleton for inbox list items
 */
export function InboxSkeleton() {
  return (
    <div className="card-material p-3.5 space-y-3" role="presentation" aria-hidden="true">
      <div className="flex justify-between items-start">
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="70%" height={16} nested />
          <div className="flex gap-2">
            <Skeleton variant="text" width={40} height={12} nested />
            <Skeleton variant="text" width={60} height={12} nested />
          </div>
        </div>
        <div className="flex gap-1">
          <Skeleton variant="circular" width={32} height={32} nested />
          <Skeleton variant="circular" width={32} height={32} nested />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton variant="rectangular" className="flex-1" height={32} nested />
        <Skeleton variant="rectangular" className="flex-1" height={32} nested />
      </div>
    </div>
  );
}

/**
 * Skeleton for message list items
 */
export function MessageSkeleton() {
  return (
    <div className="card-material p-3 space-y-2" role="presentation" aria-hidden="true">
      <div className="flex justify-between items-start">
        <div className="flex-1 space-y-1.5">
          <Skeleton variant="text" width="60%" height={14} nested />
          <Skeleton variant="text" width="40%" height={12} nested />
        </div>
        <Skeleton variant="text" width={50} height={10} nested />
      </div>
      <Skeleton variant="text" width="90%" height={12} nested />
    </div>
  );
}

/**
 * Skeleton for settings profile card
 */
export function ProfileSkeleton() {
  return (
    <div className="card-material p-5" role="presentation" aria-hidden="true">
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" width={48} height={48} nested />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="80%" height={16} nested />
          <div className="flex gap-2">
            <Skeleton variant="text" width={50} height={14} nested />
            <Skeleton variant="text" width={40} height={14} nested />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Skeleton;
