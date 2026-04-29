import { cn } from '@/lib/utils';
import { Smartphone, Monitor, Square } from 'lucide-react';

export type VideoAspectRatio = '9:16' | '16:9' | '1:1';

interface AspectRatioPickerProps {
  value: VideoAspectRatio;
  onChange: (value: VideoAspectRatio) => void;
  disabled?: boolean;
}

const OPTIONS: { value: VideoAspectRatio; label: string; sub: string; icon: typeof Smartphone }[] = [
  { value: '9:16', label: 'Vertical', sub: 'TikTok · Reels · Shorts', icon: Smartphone },
  { value: '16:9', label: 'Landscape', sub: 'YouTube · Web', icon: Monitor },
  { value: '1:1', label: 'Square', sub: 'Feed · Ad', icon: Square },
];

export function AspectRatioPicker({ value, onChange, disabled }: AspectRatioPickerProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            disabled={disabled}
            className={cn(
              'flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border transition-all',
              'hover:border-foreground/20',
              active
                ? 'border-foreground/40 bg-foreground/[0.03] shadow-sm'
                : 'border-border/60 bg-background',
              disabled && 'opacity-50 cursor-not-allowed',
            )}
          >
            <Icon className={cn('w-4 h-4', active ? 'text-foreground' : 'text-muted-foreground')} />
            <div className="text-center">
              <div className={cn('text-xs font-medium', active ? 'text-foreground' : 'text-muted-foreground')}>
                {opt.label}
              </div>
              <div className="text-[10px] text-muted-foreground/70 mt-0.5">{opt.sub}</div>
              <div className="text-[10px] font-mono text-muted-foreground/60 mt-0.5">{opt.value}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
