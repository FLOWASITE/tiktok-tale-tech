/**
 * Import Progress Log Component
 * Displays detailed step-by-step progress during import with timing and status
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  Circle,
  Loader2,
  AlertCircle,
  Clock,
  Package,
  Languages,
  Ban,
  Scale,
  MessageSquareWarning,
  Lightbulb,
  Settings,
  Globe,
  Users,
  FileText,
} from 'lucide-react';

export interface ImportLogEntry {
  step: number;
  name: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  startTime?: number;
  endTime?: number;
  count?: number;
  error?: string;
}

interface ImportProgressLogProps {
  logs: ImportLogEntry[];
  currentStep: number;
  totalSteps: number;
}

const STEP_ICONS: Record<number, React.ElementType> = {
  1: Package,
  2: Languages,
  3: Ban,
  4: Scale,
  5: MessageSquareWarning,
  6: Lightbulb,
  7: Settings,
  8: Globe,
  9: FileText,
  10: Users,
};

const STEP_COLORS: Record<number, string> = {
  1: 'text-primary',
  2: 'text-blue-500',
  3: 'text-red-500',
  4: 'text-amber-500',
  5: 'text-orange-500',
  6: 'text-yellow-500',
  7: 'text-slate-500',
  8: 'text-green-500',
  9: 'text-teal-500',
  10: 'text-purple-500',
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function getStatusIcon(status: ImportLogEntry['status']) {
  switch (status) {
    case 'success':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'running':
      return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
    case 'error':
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    case 'skipped':
      return <Circle className="h-4 w-4 text-muted-foreground" />;
    default:
      return <Circle className="h-4 w-4 text-muted-foreground/50" />;
  }
}

export function ImportProgressLog({
  logs,
  currentStep,
  totalSteps,
}: ImportProgressLogProps) {
  const totalDuration = useMemo(() => {
    const completedLogs = logs.filter(l => l.startTime && l.endTime);
    if (completedLogs.length === 0) return 0;
    return completedLogs.reduce((sum, l) => sum + ((l.endTime || 0) - (l.startTime || 0)), 0);
  }, [logs]);

  const successCount = logs.filter(l => l.status === 'success').length;
  const errorCount = logs.filter(l => l.status === 'error').length;

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="gap-1">
            <Loader2 className="h-3 w-3" />
            {currentStep} / {totalSteps}
          </Badge>
          {successCount > 0 && (
            <Badge variant="outline" className="gap-1 text-green-600 border-green-200 bg-green-50">
              <CheckCircle className="h-3 w-3" />
              {successCount} hoàn thành
            </Badge>
          )}
          {errorCount > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              {errorCount} lỗi
            </Badge>
          )}
        </div>
        {totalDuration > 0 && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatDuration(totalDuration)}
          </div>
        )}
      </div>

      {/* Log Entries */}
      <ScrollArea className="h-[280px] rounded-lg border bg-muted/20 p-3">
        <div className="space-y-2">
          {logs.map((log) => {
            const Icon = STEP_ICONS[log.step] || Package;
            const colorClass = STEP_COLORS[log.step] || 'text-primary';
            const duration = log.startTime && log.endTime 
              ? log.endTime - log.startTime 
              : null;

            return (
              <div
                key={log.step}
                className={cn(
                  'flex items-center gap-3 p-2 rounded-md transition-colors',
                  log.status === 'running' && 'bg-primary/5 border border-primary/20',
                  log.status === 'success' && 'bg-green-500/5',
                  log.status === 'error' && 'bg-destructive/5',
                  log.status === 'pending' && 'opacity-50'
                )}
              >
                {/* Status Icon */}
                {getStatusIcon(log.status)}

                {/* Step Icon */}
                <div className={cn('p-1.5 rounded-md bg-muted/50', colorClass)}>
                  <Icon className="h-3.5 w-3.5" />
                </div>

                {/* Step Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'text-sm font-medium truncate',
                      log.status === 'pending' && 'text-muted-foreground'
                    )}>
                      {log.name}
                    </span>
                    {log.count !== undefined && log.status === 'success' && (
                      <Badge variant="secondary" className="text-xs h-5">
                        +{log.count}
                      </Badge>
                    )}
                  </div>
                  {log.error && (
                    <p className="text-xs text-destructive mt-0.5 truncate">
                      {log.error}
                    </p>
                  )}
                </div>

                {/* Duration */}
                {duration !== null && (
                  <span className="text-xs text-muted-foreground font-mono">
                    {formatDuration(duration)}
                  </span>
                )}

                {/* Running indicator */}
                {log.status === 'running' && (
                  <span className="text-xs text-primary animate-pulse">
                    Đang xử lý...
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
