import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Zap, Crown, Rocket } from 'lucide-react';

export type VideoModelChoice =
  | 'geminigen/veo-3.1-fast'
  | 'geminigen/veo-3.1'
  | 'geminigen/veo-3'
  | 'geminigen/sora-2'
  | 'poyo/seedance-2'
  | 'poyo/sora-2'
  | 'poyo/happy-horse';

interface ModelOption {
  id: VideoModelChoice;
  provider: 'geminigen' | 'poyo';
  label: string;
  description: string;
  pricePerSec: number; // USD
  maxDuration: number;
  badge?: { label: string; tone: 'default' | 'premium' | 'new' };
  icon: typeof Zap;
}

export const VIDEO_MODELS: ModelOption[] = [
  {
    id: 'geminigen/veo-3.1-fast',
    provider: 'geminigen',
    label: 'Veo 3.1 Fast',
    description: 'Mặc định · nhanh · audio native',
    pricePerSec: 0.10,
    maxDuration: 10,
    badge: { label: 'Default', tone: 'default' },
    icon: Zap,
  },
  {
    id: 'geminigen/veo-3.1',
    provider: 'geminigen',
    label: 'Veo 3.1',
    description: 'Chất lượng cao · prompt phức tạp',
    pricePerSec: 0.20,
    maxDuration: 10,
    icon: Sparkles,
  },
  {
    id: 'geminigen/sora-2',
    provider: 'geminigen',
    label: 'Sora 2 (GeminiGen)',
    description: 'OpenAI Sora · physics realistic',
    pricePerSec: 0.30,
    maxDuration: 10,
    badge: { label: 'Premium', tone: 'premium' },
    icon: Crown,
  },
  {
    id: 'poyo/seedance-2',
    provider: 'poyo',
    label: 'Seedance 2',
    description: 'ByteDance · clip dài 15s · first/last frame',
    pricePerSec: 0.05,
    maxDuration: 15,
    badge: { label: 'Cheapest · 15s', tone: 'new' },
    icon: Rocket,
  },
  {
    id: 'poyo/sora-2',
    provider: 'poyo',
    label: 'Sora 2 (PoYo)',
    description: 'OpenAI Sora qua PoYo · sync audio',
    pricePerSec: 0.28,
    maxDuration: 10,
    badge: { label: 'Premium', tone: 'premium' },
    icon: Crown,
  },
  {
    id: 'poyo/happy-horse',
    provider: 'poyo',
    label: 'Happy Horse',
    description: 'Alibaba · text & image to video',
    pricePerSec: 0.04,
    maxDuration: 10,
    icon: Rocket,
  },
];

interface ProviderModelPickerProps {
  value: VideoModelChoice;
  onChange: (value: VideoModelChoice) => void;
  durationSec: number;
  disabled?: boolean;
}

export function ProviderModelPicker({ value, onChange, durationSec, disabled }: ProviderModelPickerProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {VIDEO_MODELS.map((m) => {
        const active = value === m.id;
        const Icon = m.icon;
        const cost = (m.pricePerSec * durationSec).toFixed(2);
        return (
          <button
            key={m.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(m.id)}
            className={cn(
              'group flex items-start gap-3 p-3 rounded-xl border text-left transition-all',
              'hover:border-foreground/20',
              active ? 'border-foreground/40 bg-foreground/[0.03] shadow-sm' : 'border-border/60 bg-background',
              disabled && 'opacity-50 cursor-not-allowed',
            )}
          >
            <div
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                active ? 'bg-foreground/10' : 'bg-muted/50',
              )}
            >
              <Icon className={cn('w-4 h-4', active ? 'text-foreground' : 'text-muted-foreground')} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-medium text-foreground">{m.label}</span>
                {m.badge && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      'h-4 px-1.5 text-[9px] font-medium border-0',
                      m.badge.tone === 'premium' && 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
                      m.badge.tone === 'new' && 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
                      m.badge.tone === 'default' && 'bg-foreground/10 text-foreground',
                    )}
                  >
                    {m.badge.label}
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{m.description}</p>
              <div className="text-[10px] text-muted-foreground/70 font-mono mt-1">
                ~${cost} cho {durationSec}s · max {m.maxDuration}s
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
