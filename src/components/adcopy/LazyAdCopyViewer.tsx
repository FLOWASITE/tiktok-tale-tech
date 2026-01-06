import { lazy, Suspense, memo } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import type { AdCopy } from '@/types/adCopy';

// Lazy load the heavy viewer component
const AdCopyViewerContent = lazy(() => 
  import('./AdCopyViewer').then(mod => ({ default: mod.AdCopyViewer }))
);

interface LazyAdCopyViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adCopy: AdCopy | null;
  isLoading?: boolean;
}

// Loading skeleton for the viewer
function ViewerSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header skeleton */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-16" />
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-24" />
        ))}
      </div>

      {/* Content skeleton */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-16 w-full" />
        </div>
        <div>
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export const LazyAdCopyViewer = memo(function LazyAdCopyViewer({
  open,
  onOpenChange,
  adCopy,
  isLoading,
}: LazyAdCopyViewerProps) {
  // Don't render anything if not open
  if (!open) return null;

  return (
    <Suspense fallback={
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <ViewerSkeleton />
        </DialogContent>
      </Dialog>
    }>
      <AdCopyViewerContent
        open={open}
        onOpenChange={onOpenChange}
        adCopy={adCopy}
        isLoading={isLoading}
      />
    </Suspense>
  );
});
