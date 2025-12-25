import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface TopicCardSkeletonProps {
  compact?: boolean;
  count?: number;
}

export function TopicCardSkeleton({ compact = false, count = 1 }: TopicCardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <Card
          key={index}
          className={cn(
            'relative overflow-hidden animate-pulse',
            compact ? 'p-3' : 'p-4'
          )}
          style={{ animationDelay: `${index * 100}ms` }}
        >
          {/* Category gradient accent placeholder */}
          <div className="absolute top-0 left-0 right-0 h-1 rounded-t-lg bg-muted" />

          {/* Header */}
          <div className={cn('flex items-start gap-3', compact ? 'mb-2' : 'mb-3')}>
            <Skeleton className={cn('rounded-lg shrink-0', compact ? 'w-7 h-7' : 'w-8 h-8')} />
            <div className="flex-1 min-w-0 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="flex gap-1.5">
                <Skeleton className="h-4 w-16 rounded-full" />
                <Skeleton className="h-4 w-12 rounded-full" />
              </div>
            </div>
          </div>

          {/* Scores */}
          <div className="space-y-2 mb-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="w-3 h-3 rounded-full" />
                <Skeleton className="flex-1 h-2 rounded-full" />
                <Skeleton className="w-6 h-3" />
              </div>
            ))}
          </div>

          {/* Format compatibility */}
          <div className="flex items-center gap-2 mb-3">
            <Skeleton className="h-3 w-12" />
            <div className="flex gap-1">
              <Skeleton className="w-5 h-5 rounded" />
              <Skeleton className="w-5 h-5 rounded" />
              <Skeleton className="w-5 h-5 rounded" />
            </div>
          </div>

          {/* Keywords */}
          <div className="flex flex-wrap gap-1 mb-3">
            <Skeleton className="h-4 w-14 rounded-full" />
            <Skeleton className="h-4 w-16 rounded-full" />
            <Skeleton className="h-4 w-12 rounded-full" />
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2 pt-2 border-t border-border/50">
            <Skeleton className="h-6 w-16" />
            <div className="flex gap-1 ml-auto">
              <Skeleton className="w-6 h-6 rounded" />
              <Skeleton className="w-6 h-6 rounded" />
              <Skeleton className="w-6 h-6 rounded" />
            </div>
          </div>

          {/* Score badge placeholder */}
          <div className="absolute -top-2 -right-2">
            <Skeleton className="w-9 h-9 rounded-full" />
          </div>
        </Card>
      ))}
    </>
  );
}
