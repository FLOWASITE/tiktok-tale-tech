import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, Loader2 } from 'lucide-react';

interface ContentGeneratingSkeletonProps {
  channelCount?: number;
  message?: string;
}

export function ContentGeneratingSkeleton({ 
  channelCount = 3, 
  message = "AI đang tạo nội dung..." 
}: ContentGeneratingSkeletonProps) {
  return (
    <div className="relative gradient-card p-6 rounded-xl border border-primary/30 overflow-hidden animate-fade-in">
      {/* Animated background glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5 animate-shimmer" />
      
      {/* Header with animated icon */}
      <div className="relative flex items-center gap-3 mb-4">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
          </div>
          <div className="absolute -inset-1 bg-primary/20 rounded-full blur-md animate-pulse-glow" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{message}</span>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Đang xử lý {channelCount} kênh
          </p>
        </div>
      </div>

      {/* Progress dots */}
      <div className="relative flex items-center gap-1.5 mb-4">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-primary/40 animate-bounce"
            style={{ animationDelay: `${i * 100}ms` }}
          />
        ))}
      </div>

      {/* Skeleton content lines */}
      <div className="relative space-y-3">
        <Skeleton className="h-4 w-3/4 animate-pulse" />
        <Skeleton className="h-4 w-full animate-pulse" style={{ animationDelay: '100ms' }} />
        <Skeleton className="h-4 w-5/6 animate-pulse" style={{ animationDelay: '200ms' }} />
        <Skeleton className="h-4 w-2/3 animate-pulse" style={{ animationDelay: '300ms' }} />
      </div>

      {/* Channel pills skeleton */}
      <div className="relative flex flex-wrap gap-2 mt-4">
        {[...Array(channelCount)].map((_, i) => (
          <Skeleton 
            key={i} 
            className="h-6 w-16 rounded-full animate-pulse" 
            style={{ animationDelay: `${i * 75}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

export function CardLoadingSkeleton() {
  return (
    <div className="gradient-card p-4 rounded-xl border border-border/50 animate-fade-in">
      {/* Header */}
      <div className="mb-3">
        <Skeleton className="h-5 w-3/4 mb-2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3 mt-1" />
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2 mb-3">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>

      {/* Channel icons */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-6 w-8 rounded-md" />
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Skeleton className="h-8 flex-1 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
    </div>
  );
}

export function FormLoadingSkeleton() {
  return (
    <div className="gradient-card p-6 rounded-xl border border-border/50 space-y-4 animate-fade-in">
      <Skeleton className="h-6 w-40 mb-2" />
      
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-20 w-full rounded-md" />
      </div>
      
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
      
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
      
      <div className="space-y-3">
        <Skeleton className="h-4 w-20" />
        <div className="grid grid-cols-2 gap-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-10 rounded-lg" />
          ))}
        </div>
      </div>
      
      <Skeleton className="h-10 w-full rounded-md" />
    </div>
  );
}
