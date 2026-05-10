import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Check,
  AlertTriangle,
  Sparkles,
  Globe,
  Brain,
  FileSearch,
  CheckCircle2,
  Circle,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BrandImportProgress, BrandImportEvent } from '@/hooks/useBrandImport';

interface Props {
  progress: BrandImportProgress;
  events: BrandImportEvent[];
  onCancel?: () => void;
}

type PhaseKey = 'scrape' | 'ai' | 'parsing';

interface PhaseDef {
  key: PhaseKey;
  label: string;
  icon: typeof Globe;
  range: [number, number]; // percent range
  steps: string[]; // matching progress.step values
}

const PHASES: PhaseDef[] = [
  {
    key: 'scrape',
    label: 'Thu thập nội dung',
    icon: Globe,
    range: [0, 45],
    steps: ['scrape_home', 'scrape_subpages', 'scrape_page', 'fetch_posts', 'posts_loaded'],
  },
  {
    key: 'ai',
    label: 'AI phân tích',
    icon: Brain,
    range: [45, 85],
    steps: ['ai_analyzing', 'ai_call', 'model_attempt'],
  },
  {
    key: 'parsing',
    label: 'Tổng hợp kết quả',
    icon: FileSearch,
    range: [85, 100],
    steps: ['parsing', 'done'],
  },
];

function getPhaseStatus(
  phase: PhaseDef,
  percent: number,
  currentStep: string,
): 'pending' | 'active' | 'done' {
  if (percent >= phase.range[1]) return 'done';
  if (
    percent >= phase.range[0] ||
    phase.steps.includes(currentStep)
  ) {
    return 'active';
  }
  return 'pending';
}

function eventIcon(e: BrandImportEvent, isLast: boolean) {
  if (e.kind === 'model_fallback') return RefreshCw;
  if (e.status === 'warn') return AlertTriangle;
  if (e.status === 'done') return Check;
  return isLast ? Loader2 : Check;
}

export function BrandImportProgressPanel({ progress, events, onCancel }: Props) {
  const recent = events.slice(-6);
  const fallbackCount = events.filter((e) => e.kind === 'model_fallback').length;
  const hasFallback = fallbackCount > 0;
  const pct = Math.max(0, Math.min(100, Math.round(progress.percent)));

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary shrink-0" />
        <span className="text-sm font-medium flex-1 truncate">
          {progress.message || 'Đang phân tích thương hiệu...'}
        </span>
        {hasFallback && (
          <Badge
            variant="outline"
            className="gap-1 border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
          >
            <RefreshCw className="w-3 h-3" />
            Fallback ×{fallbackCount}
          </Badge>
        )}
        <span className="text-xs text-muted-foreground tabular-nums">{pct}%</span>
      </div>

      <Progress value={pct} className="h-1.5" />

      {/* Phase stepper */}
      <div className="flex items-stretch gap-2">
        {PHASES.map((phase) => {
          const status = getPhaseStatus(phase, pct, progress.step);
          const Icon = phase.icon;
          return (
            <div
              key={phase.key}
              className={cn(
                'flex-1 rounded-md border px-2.5 py-2 flex items-center gap-2 transition-colors',
                status === 'done' && 'border-emerald-300/60 bg-emerald-50/60 dark:bg-emerald-950/20 dark:border-emerald-800/40',
                status === 'active' && 'border-primary/40 bg-primary/5',
                status === 'pending' && 'border-border bg-muted/30 opacity-60',
              )}
            >
              <div
                className={cn(
                  'shrink-0 w-6 h-6 rounded-full flex items-center justify-center',
                  status === 'done' && 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
                  status === 'active' && 'bg-primary/15 text-primary',
                  status === 'pending' && 'bg-muted text-muted-foreground',
                )}
              >
                {status === 'done' ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : status === 'active' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Circle className="w-3.5 h-3.5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <Icon className="w-3 h-3 text-muted-foreground" />
                  <span
                    className={cn(
                      'text-[11px] font-medium truncate',
                      status === 'pending' && 'text-muted-foreground',
                    )}
                  >
                    {phase.label}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Activity feed */}
      {recent.length > 0 && (
        <ul className="space-y-1.5 text-xs border-t pt-3">
          {recent.map((e, idx) => {
            const isLast = idx === recent.length - 1;
            const Icon = eventIcon(e, isLast);
            const isFallback = e.kind === 'model_fallback';
            return (
              <li
                key={e.id}
                className={cn(
                  'flex items-start gap-2 rounded px-1.5 py-1',
                  isFallback && 'bg-amber-50 dark:bg-amber-950/30',
                )}
              >
                <Icon
                  className={cn(
                    'w-3.5 h-3.5 mt-0.5 shrink-0',
                    e.status === 'done' && 'text-emerald-500',
                    e.status === 'warn' && 'text-amber-500',
                    e.status === 'active' && !isFallback && 'text-primary',
                    isLast && e.status === 'active' && !isFallback && 'animate-spin',
                    isFallback && 'text-amber-600 dark:text-amber-400',
                  )}
                />
                <span
                  className={cn(
                    'flex-1 break-words leading-relaxed',
                    isFallback
                      ? 'text-amber-800 dark:text-amber-300 font-medium'
                      : e.status === 'warn'
                        ? 'text-amber-700 dark:text-amber-400'
                        : 'text-muted-foreground',
                  )}
                >
                  {e.message}
                </span>
                {e.kind === 'model_attempt' && (
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5 shrink-0">
                    AI
                  </Badge>
                )}
                {isFallback && (
                  <Badge
                    variant="outline"
                    className="text-[10px] h-4 px-1.5 shrink-0 border-amber-300 text-amber-700 dark:text-amber-400 dark:border-amber-800"
                  >
                    Fallback
                  </Badge>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {onCancel && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={onCancel} className="h-7 text-xs">
            Hủy phân tích
          </Button>
        </div>
      )}
    </div>
  );
}
