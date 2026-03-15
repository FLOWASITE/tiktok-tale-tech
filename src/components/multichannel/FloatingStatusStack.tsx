import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface FloatingStatusStackProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Container that stacks floating status popups vertically
 * to prevent overlapping on mobile devices.
 * All children should NOT have their own `fixed` positioning.
 */
export function FloatingStatusStack({ children, className }: FloatingStatusStackProps) {
  const isMobile = useIsMobile();

  return (
    <div
      className={cn(
        "fixed z-50 flex flex-col-reverse gap-2 pointer-events-none",
        "[&>*]:pointer-events-auto",
        isMobile
          ? "bottom-16 left-2 right-2"
          : "bottom-20 right-4 max-w-sm",
        className
      )}
    >
      {children}
    </div>
  );
}
