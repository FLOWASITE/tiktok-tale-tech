import { useState, useRef, ReactNode } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Trash2, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SwipeableBrandCardProps {
  children: ReactNode;
  onDelete?: () => void;
  onSetDefault?: () => void;
  isDefault?: boolean;
  disabled?: boolean;
}

const SWIPE_THRESHOLD = 80;
const ACTION_WIDTH = 80;

export function SwipeableBrandCard({
  children,
  onDelete,
  onSetDefault,
  isDefault = false,
  disabled = false,
}: SwipeableBrandCardProps) {
  const [isOpen, setIsOpen] = useState<'left' | 'right' | null>(null);
  const constraintsRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  
  // Transform for background colors based on swipe direction
  const leftBgOpacity = useTransform(x, [-ACTION_WIDTH, 0], [1, 0]);
  const rightBgOpacity = useTransform(x, [0, ACTION_WIDTH], [0, 1]);
  const leftScale = useTransform(x, [-ACTION_WIDTH, -20], [1, 0.5]);
  const rightScale = useTransform(x, [20, ACTION_WIDTH], [0.5, 1]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (disabled) return;

    const offsetX = info.offset.x;
    const velocityX = info.velocity.x;

    // Swipe left = delete
    if (offsetX < -SWIPE_THRESHOLD || velocityX < -500) {
      setIsOpen('left');
      onDelete?.();
    }
    // Swipe right = set default
    else if ((offsetX > SWIPE_THRESHOLD || velocityX > 500) && !isDefault) {
      setIsOpen('right');
      onSetDefault?.();
      // Reset after action
      setTimeout(() => setIsOpen(null), 300);
    } else {
      setIsOpen(null);
    }
  };

  if (disabled) {
    return <>{children}</>;
  }

  return (
    <div ref={constraintsRef} className="relative overflow-hidden rounded-lg md:overflow-visible">
      {/* Delete background (swipe left) */}
      <motion.div
        className="absolute inset-y-0 right-0 w-20 bg-destructive flex items-center justify-center rounded-r-lg md:hidden"
        style={{ opacity: leftBgOpacity }}
      >
        <motion.div style={{ scale: leftScale }}>
          <Trash2 className="w-6 h-6 text-destructive-foreground" />
        </motion.div>
      </motion.div>

      {/* Set default background (swipe right) */}
      <motion.div
        className={cn(
          "absolute inset-y-0 left-0 w-20 flex items-center justify-center rounded-l-lg md:hidden",
          isDefault ? "bg-muted" : "bg-primary"
        )}
        style={{ opacity: rightBgOpacity }}
      >
        <motion.div style={{ scale: rightScale }}>
          <Star className={cn(
            "w-6 h-6",
            isDefault ? "text-muted-foreground" : "text-primary-foreground fill-current"
          )} />
        </motion.div>
      </motion.div>

      {/* Swipeable card content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -ACTION_WIDTH, right: isDefault ? 0 : ACTION_WIDTH }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        style={{ x }}
        animate={{ 
          x: isOpen === 'left' ? -ACTION_WIDTH : isOpen === 'right' ? ACTION_WIDTH : 0 
        }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="relative bg-background z-10 md:!transform-none cursor-grab active:cursor-grabbing"
      >
        {children}
      </motion.div>

      {/* Swipe hint indicator - only on mobile */}
      <div className="absolute inset-y-0 left-1 right-1 pointer-events-none flex items-center justify-between md:hidden opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="w-1 h-8 bg-primary/20 rounded-full" />
        <div className="w-1 h-8 bg-destructive/20 rounded-full" />
      </div>
    </div>
  );
}
