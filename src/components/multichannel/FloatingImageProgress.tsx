import { motion, AnimatePresence } from 'framer-motion';
import { Image, X, Maximize2, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { createPortal } from 'react-dom';
import { useIsMobile } from '@/hooks/use-mobile';

interface FloatingImageProgressProps {
  visible: boolean;
  completedCount: number;
  totalCount: number;
  progress: Record<string, string>;
  isComplete: boolean;
  hasErrors: boolean;
  onRestore: () => void;
  onDismiss: () => void;
}

export function FloatingImageProgress({
  visible,
  completedCount,
  totalCount,
  progress,
  isComplete,
  hasErrors,
  onRestore,
  onDismiss,
}: FloatingImageProgressProps) {
  const isMobile = useIsMobile();
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const statusIcon = isComplete
    ? hasErrors
      ? <AlertCircle className="w-4 h-4 text-yellow-500" />
      : <CheckCircle2 className="w-4 h-4 text-green-500" />
    : <Loader2 className="w-4 h-4 animate-spin text-primary" />;

  const statusText = isComplete
    ? hasErrors
      ? `${completedCount}/${totalCount} ảnh hoàn tất (có lỗi)`
      : `${completedCount} ảnh hoàn tất ✓`
    : `Đang tạo ảnh ${completedCount}/${totalCount}...`;

  const content = (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={cn(
            "fixed z-[60] rounded-xl border border-border bg-card shadow-2xl",
            isMobile
              ? "bottom-20 left-3 right-3"
              : "bottom-4 right-4 w-80 max-w-[calc(100vw-2rem)]"
          )}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/50">
            <Image className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm font-medium text-foreground flex-1 truncate">
              Tạo ảnh AI
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={onRestore}
              title="Mở rộng"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </Button>
            {isComplete && (
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={onDismiss}
                title="Đóng"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>

          {/* Progress */}
          <div className="px-3 py-2.5 space-y-2">
            <div className="flex items-center gap-2">
              {statusIcon}
              <span className="text-xs text-muted-foreground flex-1">
                {statusText}
              </span>
            </div>
            {!isComplete && (
              <Progress value={percent} className="h-1.5" />
            )}

            {/* Channel dots */}
            <div className="flex items-center gap-1 flex-wrap">
              {Object.entries(progress).map(([channel, status]) => (
                <div
                  key={channel}
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors",
                    status === 'done' && "bg-green-500",
                    status === 'generating' && "bg-primary animate-pulse",
                    status === 'error' && "bg-destructive",
                    status === 'pending' && "bg-muted-foreground/30",
                  )}
                  title={`${channel}: ${status}`}
                />
              ))}
            </div>
          </div>

          {/* Restore button when complete */}
          {isComplete && (
            <div className="px-3 pb-2.5">
              <Button
                size="sm"
                variant="outline"
                className="w-full h-7 text-xs"
                onClick={onRestore}
              >
                Xem kết quả
              </Button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
