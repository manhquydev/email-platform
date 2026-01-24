/**
 * Skeleton components for inbox-viewer loading states
 * Version C design system - zinc-900 with subtle pulse animation
 */

// Skeleton base component
interface SkeletonProps {
  className?: string;
}

function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`bg-zinc-900 rounded animate-pulse ${className}`}
      style={{ animationDuration: "2s" }}
    />
  );
}

// Message list skeleton (5 items)
export function MessageListSkeleton() {
  return (
    <div className="divide-y divide-zinc-900">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="p-4">
          <div className="flex justify-between items-start mb-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-3 w-full" />
        </div>
      ))}
    </div>
  );
}

// Message detail skeleton
export function MessageDetailSkeleton() {
  return (
    <div className="flex flex-col h-full">
      {/* Header skeleton */}
      <div className="p-4 border-b border-zinc-800">
        <Skeleton className="h-6 w-2/3 mb-3" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-36" />
        </div>
      </div>

      {/* Body skeleton */}
      <div className="flex-1 p-4 space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}

// Hero email skeleton (for initial load)
export function HeroEmailSkeleton() {
  return (
    <div className="flex items-center justify-center gap-3 py-6 px-4 bg-zinc-950 border-b border-zinc-800">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-10 w-10 rounded-md" />
    </div>
  );
}

// Inline loading indicator (for refresh) - uses custom slide-right animation
export function RefreshIndicator() {
  return (
    <div className="absolute top-0 left-0 right-0 h-0.5 bg-zinc-900 overflow-hidden">
      <div className="h-full w-1/3 bg-white animate-slide-right" />
    </div>
  );
}
