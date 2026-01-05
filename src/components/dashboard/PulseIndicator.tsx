import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PulseIndicatorProps {
  count: number;
  className?: string;
  variant?: 'default' | 'warning' | 'danger';
}

export function PulseIndicator({ count, className, variant = 'default' }: PulseIndicatorProps) {
  if (count === 0) return null;

  const variantClasses = {
    default: 'bg-primary text-primary-foreground',
    warning: 'bg-amber-500 text-white',
    danger: 'bg-destructive text-destructive-foreground',
  };

  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: [1, 1.15, 1] }}
      transition={{ 
        scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
      }}
      className={cn(
        "absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full text-xs font-medium flex items-center justify-center shadow-lg",
        variantClasses[variant],
        className
      )}
    >
      {count > 99 ? '99+' : count}
    </motion.span>
  );
}
