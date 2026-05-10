import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Loader2, Check, AlertTriangle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BrandImportProgress, BrandImportEvent } from '@/hooks/useBrandImport';

interface Props {
  progress: BrandImportProgress;
  events: BrandImportEvent[];
  onCancel?: () => void;
}

export function BrandImportProgressPanel({ progress, events, onCancel }: Props) {
  const recent = events.slice(-6);
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium flex-1 truncate">
          {progress.message || 'Đang phân tích...'}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {Math.max(0, Math.min(100, Math.round(progress.percent)))}%
        </span>
      </div>

      <Progress value={progress.percent} className="h-1.5" />

      {recent.length > 0 && (
        <ul className="space-y-1.5 text-xs">
          {recent.map((e, idx) => {
            const isLast = idx === recent.length - 1;
            const Icon = e.status === 'done'
              ? Check
              : e.status === 'warn'
                ? AlertTriangle
                : isLast ? Loader2 : Check;
            return (
              <li key={e.id} className="flex items-start gap-2">
                <Icon
                  className={cn(
                    'w-3.5 h-3.5 mt-0.5 shrink-0',
                    e.status === 'done' && 'text-emerald-500',
                    e.status === 'warn' && 'text-amber-500',
                    e.status === 'active' && 'text-primary',
                    isLast && e.status === 'active' && 'animate-spin',
                  )}
                />
                <span className={cn(
                  'flex-1 break-words',
                  e.status === 'warn' ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground',
                )}>
                  {e.message}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {onCancel && (
        <div className="pt-1">
          <Button variant="ghost" size="sm" onClick={onCancel} className="h-7 text-xs">
            Hủy phân tích
          </Button>
        </div>
      )}
    </div>
  );
}
