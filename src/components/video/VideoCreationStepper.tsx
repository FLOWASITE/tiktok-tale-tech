import { FileText, ImageIcon, Film, Clapperboard, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type VideoStep = 1 | 2 | 3 | 4;

interface VideoCreationStepperProps {
  /** Bước hiện tại (1-4). Mặc định 1 (chưa bắt đầu). */
  currentStep?: VideoStep;
  className?: string;
}

const STEPS = [
  { id: 1, label: 'Viết kịch bản', desc: 'Phân cảnh + thoại', icon: FileText },
  { id: 2, label: 'Prompt hình ảnh', desc: 'Mô tả visual từng scene', icon: ImageIcon },
  { id: 3, label: 'Render từng scene', desc: 'AI dựng clip mỗi cảnh', icon: Film },
  { id: 4, label: 'Ghép phim hoàn chỉnh', desc: 'Voiceover + sub + xuất', icon: Clapperboard },
] as const;

export function VideoCreationStepper({ currentStep = 1, className }: VideoCreationStepperProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border/60 bg-card/40 p-4 sm:p-5',
        className,
      )}
    >
      {/* Desktop: horizontal */}
      <ol className="hidden sm:flex items-start gap-2">
        {STEPS.map((step, idx) => {
          const isDone = step.id < currentStep;
          const isActive = step.id === currentStep;
          const Icon = step.icon;
          return (
            <li key={step.id} className="flex-1 flex items-start gap-2 min-w-0">
              <div className="flex flex-col items-center shrink-0">
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold transition-colors',
                    isDone && 'bg-primary text-primary-foreground border-primary',
                    isActive && 'bg-primary/10 text-primary border-primary ring-2 ring-primary/20',
                    !isDone && !isActive && 'bg-muted/40 text-muted-foreground border-border',
                  )}
                >
                  {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span
                  className={cn(
                    'mt-1 text-[10px] font-medium tabular-nums',
                    isActive ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  Bước {step.id}
                </span>
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <div
                  className={cn(
                    'text-sm font-medium leading-tight truncate',
                    isActive ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </div>
                <div className="text-xs text-muted-foreground/80 truncate">{step.desc}</div>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={cn(
                    'mt-4 h-px flex-1 min-w-4 self-start',
                    isDone ? 'bg-primary/60' : 'bg-border',
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>

      {/* Mobile: vertical compact */}
      <ol className="sm:hidden space-y-2">
        {STEPS.map((step) => {
          const isDone = step.id < currentStep;
          const isActive = step.id === currentStep;
          const Icon = step.icon;
          return (
            <li key={step.id} className="flex items-center gap-3">
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                  isDone && 'bg-primary text-primary-foreground border-primary',
                  isActive && 'bg-primary/10 text-primary border-primary ring-2 ring-primary/20',
                  !isDone && !isActive && 'bg-muted/40 text-muted-foreground border-border',
                )}
              >
                {isDone ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className={cn(
                    'text-sm font-medium leading-tight truncate',
                    isActive ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  <span className="text-xs text-muted-foreground/70 mr-1">B{step.id}.</span>
                  {step.label}
                </div>
                <div className="text-xs text-muted-foreground/80 truncate">{step.desc}</div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
