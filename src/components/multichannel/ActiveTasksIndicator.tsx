import { memo, useCallback, useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, X, CheckCircle2, AlertCircle, BookOpen, Layers, RotateCcw, Clock, Images, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GenerationTask } from '@/hooks/useBackgroundGeneration';
import { AnimatePresence, motion } from 'framer-motion';
import { CHANNELS } from '@/types/multichannel';

// Pending queue item for multichannel waiting on core content
export interface PendingQueueItem {
  id: string;
  type: 'multichannel_pending';
  channels: string[];
  waitingFor: 'core_content';
  progress: number;
}

interface ActiveTasksIndicatorProps {
  tasks: GenerationTask[];
  pendingQueue?: PendingQueueItem[];
  onTaskClick?: (task: GenerationTask) => void;
  onDismiss?: (taskId: string) => void;
  onRetry?: (taskId: string) => Promise<GenerationTask | null>;
  onCancelPending?: (id: string) => void;
  className?: string;
}

const TASK_LABELS: Record<string, string> = {
  core_content: 'Core Content',
  multichannel: 'Đa kênh',
  carousel_image: 'Tạo ảnh Carousel',
};

function getTaskLabel(taskType: string): string {
  return TASK_LABELS[taskType] || taskType;
}

const TaskIcon = memo(function TaskIcon({ taskType }: { taskType: string }) {
  if (taskType === 'core_content') {
    return <BookOpen className="w-4 h-4 text-primary" />;
  }
  if (taskType === 'carousel_image') {
    return <Images className="w-4 h-4 text-primary" />;
  }
  return <Layers className="w-4 h-4 text-primary" />;
});

const TaskStatusIcon = memo(function TaskStatusIcon({ status }: { status: string }) {
  if (status === 'completed') {
    return <CheckCircle2 className="w-4 h-4 text-green-500" />;
  }
  if (status === 'failed') {
    return <AlertCircle className="w-4 h-4 text-destructive" />;
  }
  return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
});

const TaskCard = memo(function TaskCard({ 
  task, 
  onTaskClick, 
  onDismiss,
  onRetry,
}: { 
  task: GenerationTask; 
  onTaskClick?: (task: GenerationTask) => void;
  onDismiss?: (taskId: string) => void;
  onRetry?: (taskId: string) => Promise<GenerationTask | null>;
}) {
  const [isRetrying, setIsRetrying] = useState(false);

  // Auto-dismiss completed tasks after 3 seconds
  useEffect(() => {
    if (task.status === 'completed' && onDismiss) {
      const timer = setTimeout(() => {
        onDismiss(task.id);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [task.status, task.id, onDismiss]);

  const handleClick = useCallback(() => {
    onTaskClick?.(task);
  }, [task, onTaskClick]);

  const handleDismiss = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDismiss?.(task.id);
  }, [task.id, onDismiss]);

  const handleRetry = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onRetry || isRetrying) return;
    setIsRetrying(true);
    try {
      await onRetry(task.id);
    } finally {
      setIsRetrying(false);
    }
  }, [task.id, onRetry, isRetrying]);

  const isActive = task.status === 'pending' || task.status === 'generating';
  const isFailed = task.status === 'failed';
  const isCompleted = task.status === 'completed';
  const taskLabel = getTaskLabel(task.task_type);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        className={cn(
          "bg-card/95 backdrop-blur-md shadow-lg border-border/50",
          "hover:bg-accent/50 transition-colors cursor-pointer",
          "min-w-[280px]",
          isFailed && "border-destructive/30"
        )}
        onClick={handleClick}
      >
        <CardContent className="p-3">
          <div className="flex items-start gap-3">
            {/* Status/Loading Icon */}
            <div className="relative flex-shrink-0 mt-0.5">
              <TaskStatusIcon status={task.status} />
              {isActive && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              )}
            </div>

            {/* Task Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <TaskIcon taskType={task.task_type} />
                <span className="text-sm font-medium truncate">{taskLabel}</span>
              </div>
              
              <p className="text-xs text-muted-foreground truncate mb-2">
                {task.progress_message || (isActive ? 'Đang xử lý...' : 
                  isCompleted ? 'Hoàn thành - Nhấn để xem' : 'Thất bại')}
              </p>

              {isActive && (
                <div className="flex items-center gap-2">
                  <Progress value={task.progress} className="h-1.5 flex-1" />
                  <span className="text-xs text-muted-foreground font-medium w-8 text-right">
                    {task.progress}%
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Retry Button - Only for failed tasks */}
              {isFailed && onRetry && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-primary hover:bg-primary/10"
                  onClick={handleRetry}
                  disabled={isRetrying}
                  title="Thử lại"
                >
                  {isRetrying ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <RotateCcw className="w-3 h-3" />
                  )}
                </Button>
              )}
              
              {/* Dismiss Button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-50 hover:opacity-100"
                onClick={handleDismiss}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});

// Pending Queue Card for multichannel waiting on core content
const PendingQueueCard = memo(function PendingQueueCard({
  item,
  onCancel,
}: {
  item: PendingQueueItem;
  onCancel?: (id: string) => void;
}) {
  const handleCancel = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onCancel?.(item.id);
  }, [item.id, onCancel]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="bg-amber-50/95 dark:bg-amber-950/40 backdrop-blur-md shadow-lg border-amber-200/50 dark:border-amber-800/50 min-w-[280px]">
        <CardContent className="p-3">
          <div className="flex items-start gap-3">
            {/* Queue Icon */}
            <div className="relative flex-shrink-0 mt-0.5">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="text-sm font-medium text-amber-800 dark:text-amber-200">Đang xếp hàng...</span>
              </div>
              
              <p className="text-xs text-amber-700 dark:text-amber-300/80 mb-2">
                Chờ Core Content ({item.progress}%)
              </p>

              {/* Channel badges */}
              <div className="flex flex-wrap gap-1 mb-2">
                {item.channels.slice(0, 4).map(ch => {
                  const channelInfo = CHANNELS.find(c => c.value === ch);
                  return (
                    <Badge 
                      key={ch} 
                      variant="outline" 
                      className="text-[10px] px-1.5 py-0 h-4 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300"
                    >
                      {channelInfo?.label || ch}
                    </Badge>
                  );
                })}
                {item.channels.length > 4 && (
                  <Badge 
                    variant="outline" 
                    className="text-[10px] px-1.5 py-0 h-4 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300"
                  >
                    +{item.channels.length - 4}
                  </Badge>
                )}
              </div>

              {/* Progress bar */}
              <div className="flex items-center gap-2">
                <Progress value={item.progress} className="h-1.5 flex-1 [&>div]:bg-amber-500" />
                <span className="text-xs text-amber-600 dark:text-amber-400 font-medium w-8 text-right">
                  {item.progress}%
                </span>
              </div>
            </div>

            {/* Cancel Button */}
            {onCancel && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 flex-shrink-0 text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                onClick={handleCancel}
                title="Hủy"
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});

const COLLAPSE_THRESHOLD = 3;

export const ActiveTasksIndicator = memo(function ActiveTasksIndicator({ 
  tasks, 
  pendingQueue = [],
  onTaskClick,
  onDismiss,
  onRetry,
  onCancelPending,
  className 
}: ActiveTasksIndicatorProps) {
  const [expanded, setExpanded] = useState(false);

  if (tasks.length === 0 && pendingQueue.length === 0) return null;

  const shouldCollapse = tasks.length > COLLAPSE_THRESHOLD && !expanded;
  const visibleTasks = shouldCollapse ? tasks.slice(0, 1) : tasks;
  const hiddenCount = tasks.length - visibleTasks.length;

  return (
    <div className={cn(
      "flex flex-col gap-2 max-h-[calc(100vh-12rem)] overflow-y-auto w-full",
      className
    )}>
      <AnimatePresence mode="popLayout">
        {/* Pending Queue Items */}
        {pendingQueue.map(item => (
          <PendingQueueCard 
            key={item.id} 
            item={item} 
            onCancel={onCancelPending}
          />
        ))}
        
        {/* Regular Tasks (collapsed or full) */}
        {visibleTasks.map(task => (
          <TaskCard 
            key={task.id} 
            task={task} 
            onTaskClick={onTaskClick}
            onDismiss={onDismiss}
            onRetry={onRetry}
          />
        ))}

        {/* Collapsed summary toggle */}
        {tasks.length > COLLAPSE_THRESHOLD && (
          <motion.div
            key="collapse-toggle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <Button
              variant="outline"
              size="sm"
              className="w-full bg-card/95 backdrop-blur-md shadow-lg"
              onClick={() => setExpanded(e => !e)}
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-3 h-3 mr-1" />
                  Thu gọn ({tasks.length} tác vụ)
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3 mr-1" />
                  Xem thêm {hiddenCount} tác vụ đang chạy
                </>
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
