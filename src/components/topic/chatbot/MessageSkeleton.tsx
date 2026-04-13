// ============================================
// MessageSkeleton Component
// Loading skeleton for chat messages
// ============================================

import { Skeleton } from '@/components/ui/skeleton';

export function MessageSkeleton() {
  return (
    <div className="space-y-2 py-1 animate-pulse">
      <Skeleton className="h-3 w-[85%] bg-muted" />
      <Skeleton className="h-3 w-[70%] bg-muted" />
      <Skeleton className="h-3 w-[60%] bg-muted" />
      <div className="flex items-center gap-1 pt-1">
        <div className="w-1.5 h-1.5 bg-muted-foreground/30 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-1.5 h-1.5 bg-muted-foreground/30 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-1.5 h-1.5 bg-muted-foreground/30 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}
