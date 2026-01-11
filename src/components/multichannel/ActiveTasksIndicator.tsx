import { memo, useCallback, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Loader2, X, CheckCircle2, AlertCircle, BookOpen, Layers, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GenerationTask } from '@/hooks/useBackgroundGeneration';
import { AnimatePresence, motion } from 'framer-motion';

interface ActiveTasksIndicatorProps {
  tasks: GenerationTask[];
  onTaskClick?: (task: GenerationTask) => void;
  onDismiss?: (taskId: string) => void;
  onRetry?: (taskId: string) => Promise<GenerationTask | null>;
  className?: string;
}

const TaskIcon = memo(function TaskIcon({ taskType }: { taskType: string }) {
  if (taskType === 'core_content') {
    return <BookOpen className="w-4 h-4 text-primary" />;
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
  const taskLabel = task.task_type === 'core_content' ? 'Core Content' : 'Multi-channel';

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
                  task.status === 'completed' ? 'Hoàn thành' : 'Thất bại')}
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

export const ActiveTasksIndicator = memo(function ActiveTasksIndicator({ 
  tasks, 
  onTaskClick,
  onDismiss,
  onRetry,
  className 
}: ActiveTasksIndicatorProps) {
  if (tasks.length === 0) return null;

  return (
    <div className={cn(
      "fixed bottom-4 right-4 z-50",
      "flex flex-col gap-2 max-h-[calc(100vh-8rem)] overflow-y-auto",
      className
    )}>
      <AnimatePresence mode="popLayout">
        {tasks.map(task => (
          <TaskCard 
            key={task.id} 
            task={task} 
            onTaskClick={onTaskClick}
            onDismiss={onDismiss}
            onRetry={onRetry}
          />
        ))}
      </AnimatePresence>
    </div>
  );
});
