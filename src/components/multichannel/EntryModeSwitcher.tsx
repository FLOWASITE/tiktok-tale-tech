import { Lightbulb, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EntryMode } from '@/hooks/useEntryMode';

interface Props {
  mode: EntryMode;
  onChange: (m: EntryMode) => void;
  disabled?: boolean;
}

export function EntryModeSwitcher({ mode, onChange, disabled }: Props) {
  const options: { value: EntryMode; label: string; desc: string; icon: JSX.Element }[] = [
    { value: 'idea', label: 'Theo ý tưởng', desc: 'Bắt đầu từ chủ đề', icon: <Lightbulb className="w-4 h-4" /> },
    { value: 'seo',  label: 'Cần cho SEO', desc: 'Bắt đầu từ keyword', icon: <Target className="w-4 h-4" /> },
  ];

  return (
    <div className="inline-flex w-full sm:w-auto rounded-lg border border-border bg-muted/40 p-1">
      {options.map((opt) => {
        const active = mode === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all',
              active
                ? 'bg-background text-foreground shadow-sm border border-border'
                : 'text-muted-foreground hover:text-foreground',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            title={opt.desc}
          >
            {opt.icon}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
