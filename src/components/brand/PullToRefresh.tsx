import { useState, useRef, ReactNode, useCallback } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  disabled?: boolean;
}

const PULL_THRESHOLD = 80;
const MAX_PULL = 120;

export function PullToRefresh({ children, onRefresh, disabled = false }: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useMotionValue(0);
  
  const pullProgress = useTransform(currentY, [0, PULL_THRESHOLD], [0, 1]);
  const rotation = useTransform(currentY, [0, PULL_THRESHOLD], [0, 180]);
  const scale = useTransform(currentY, [0, PULL_THRESHOLD / 2, PULL_THRESHOLD], [0.5, 0.8, 1]);
  const opacity = useTransform(currentY, [0, 30, PULL_THRESHOLD], [0, 0.5, 1]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    const container = containerRef.current;
    if (!container || container.scrollTop > 0) return;
    
    startY.current = e.touches[0].clientY;
    setIsPulling(true);
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling || disabled || isRefreshing) return;
    
    const container = containerRef.current;
    if (!container || container.scrollTop > 0) {
      setIsPulling(false);
      currentY.set(0);
      return;
    }

    const deltaY = e.touches[0].clientY - startY.current;
    if (deltaY > 0) {
      // Dampen the pull effect
      const dampedPull = Math.min(deltaY * 0.5, MAX_PULL);
      currentY.set(dampedPull);
    }
  }, [isPulling, disabled, isRefreshing, currentY]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling || disabled) return;
    
    setIsPulling(false);
    
    if (currentY.get() >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    
    currentY.set(0);
  }, [isPulling, disabled, currentY, isRefreshing, onRefresh]);

  return (
    <div 
      ref={containerRef}
      className="relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 -top-2 z-10 pointer-events-none"
        style={{ 
          y: currentY,
          opacity: isRefreshing ? 1 : opacity,
          scale
        }}
      >
        <div className={cn(
          "w-10 h-10 rounded-full bg-primary/10 backdrop-blur-sm flex items-center justify-center",
          "border border-primary/20 shadow-lg"
        )}>
          <motion.div
            style={{ rotate: isRefreshing ? undefined : rotation }}
            animate={isRefreshing ? { rotate: 360 } : undefined}
            transition={isRefreshing ? { duration: 1, repeat: Infinity, ease: 'linear' } : undefined}
          >
            <RefreshCw className={cn(
              "w-5 h-5 text-primary",
              isRefreshing && "animate-spin"
            )} />
          </motion.div>
        </div>
      </motion.div>

      {/* Content with pull animation */}
      <motion.div
        style={{ y: isPulling || isRefreshing ? currentY : 0 }}
        animate={!isPulling && !isRefreshing ? { y: 0 } : undefined}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
