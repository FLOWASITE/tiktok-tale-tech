import { useRef, useCallback, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion } from 'framer-motion';
import { AdCopyCard } from './AdCopyCard';
import type { AdCopy } from '@/types/adCopy';
import { cn } from '@/lib/utils';

interface VirtualizedAdCopyGridProps {
  adCopies: AdCopy[];
  viewMode: 'grid' | 'list';
  onView: (adCopy: AdCopy) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

// Constants for virtualization
const GRID_CARD_HEIGHT = 320;
const LIST_CARD_HEIGHT = 80;
const GAP = 16;

export const VirtualizedAdCopyGrid = memo(function VirtualizedAdCopyGrid({
  adCopies,
  viewMode,
  onView,
  onDelete,
  onDuplicate,
}: VirtualizedAdCopyGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Calculate columns based on viewport
  const getColumnCount = useCallback(() => {
    if (typeof window === 'undefined') return 4;
    if (viewMode === 'list') return 1;
    const width = window.innerWidth;
    if (width < 640) return 1;
    if (width < 1024) return 2;
    if (width < 1280) return 3;
    return 4;
  }, [viewMode]);

  const columnCount = getColumnCount();
  const rowCount = Math.ceil(adCopies.length / columnCount);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => (viewMode === 'list' ? LIST_CARD_HEIGHT : GRID_CARD_HEIGHT) + GAP,
    overscan: 3,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className="h-[calc(100vh-400px)] min-h-[400px] overflow-auto"
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualRows.map((virtualRow) => {
          const startIndex = virtualRow.index * columnCount;
          const endIndex = Math.min(startIndex + columnCount, adCopies.length);
          const rowItems = adCopies.slice(startIndex, endIndex);

          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className={cn(
                viewMode === 'grid'
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                  : "space-y-3"
              )}
            >
              {rowItems.map((adCopy, idx) => (
                <motion.div
                  key={adCopy.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.02 }}
                >
                  <AdCopyCard
                    adCopy={adCopy}
                    viewMode={viewMode}
                    onView={() => onView(adCopy)}
                    onDelete={() => onDelete(adCopy.id)}
                    onDuplicate={() => onDuplicate(adCopy.id)}
                  />
                </motion.div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
});
