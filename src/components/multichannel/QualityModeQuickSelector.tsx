import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Settings2, Info, Zap, Scale, Sparkles, ChevronDown } from 'lucide-react';
import { QualityMode, QUALITY_MODES, Channel } from '@/types/multichannel';
import { useBrandChannelOptimizations } from '@/hooks/useBrandChannelOptimizations';

interface QualityModeQuickSelectorProps {
  value: QualityMode;
  onChange: (mode: QualityMode) => void;
  disabled?: boolean;
  brandTemplateId?: string;
  selectedChannels?: Channel[];
  variant?: 'default' | 'compact' | 'inline';
  showBrandHints?: boolean;
  className?: string;
}

const ICON_MAP: Record<QualityMode, React.ReactNode> = {
  fast: <Zap className="w-4 h-4" />,
  balanced: <Scale className="w-4 h-4" />,
  quality: <Sparkles className="w-4 h-4" />,
};

export function QualityModeQuickSelector({
  value,
  onChange,
  disabled = false,
  brandTemplateId,
  selectedChannels = [],
  variant = 'default',
  showBrandHints = true,
  className,
}: QualityModeQuickSelectorProps) {
  const { optimizations } = useBrandChannelOptimizations(showBrandHints && brandTemplateId ? brandTemplateId : undefined);

  // Get brand-level overrides for selected channels
  const channelOverrides = selectedChannels
    .map(ch => {
      const opt = optimizations.find(o => o.channel === ch);
      return opt?.quality_mode ? { channel: ch, mode: opt.quality_mode } : null;
    })
    .filter(Boolean) as { channel: Channel; mode: QualityMode }[];

  const hasOverrides = channelOverrides.length > 0;
  const currentMode = QUALITY_MODES.find(m => m.value === value);

  // Compact inline variant for small spaces
  if (variant === 'inline') {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn("gap-2", className)}
            disabled={disabled}
          >
            <span className="text-base">{currentMode?.icon}</span>
            <span className="text-sm">{currentMode?.label}</span>
            <ChevronDown className="w-3 h-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          <div className="space-y-1">
            {QUALITY_MODES.map((mode) => (
              <button
                key={mode.value}
                onClick={() => onChange(mode.value)}
                className={cn(
                  "w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors",
                  value === mode.value
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted'
                )}
              >
                <span className="text-lg">{mode.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{mode.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{mode.description}</p>
                </div>
              </button>
            ))}
          </div>
          {hasOverrides && (
            <div className="mt-2 pt-2 border-t">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="w-3 h-3" />
                {channelOverrides.length} kênh có cấu hình riêng
              </p>
            </div>
          )}
        </PopoverContent>
      </Popover>
    );
  }

  // Compact variant - smaller buttons
  if (variant === 'compact') {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            {ICON_MAP[value]}
            <span>Chế độ: {currentMode?.label}</span>
          </div>
          {hasOverrides && (
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="outline" className="text-xs gap-1">
                  <Info className="w-3 h-3" />
                  {channelOverrides.length} kênh riêng
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-[200px]">
                <p className="text-xs">
                  Các kênh có cấu hình AI riêng từ Brand sẽ ghi đè chế độ này
                </p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="flex gap-1">
          {QUALITY_MODES.map((mode) => (
            <Tooltip key={mode.value}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onChange(mode.value)}
                  disabled={disabled}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md border transition-all text-sm",
                    value === mode.value
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20 font-medium'
                      : 'border-border/50 hover:border-border hover:bg-muted/30',
                    disabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <span>{mode.icon}</span>
                  <span className="hidden sm:inline">{mode.label}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">{mode.description}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    );
  }

  // Default variant - full card with details
  return (
    <Card className={cn("bg-card/50 backdrop-blur-sm border-border/50", className)}>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Settings2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Chế độ chất lượng</h3>
              <p className="text-xs text-muted-foreground">Cân bằng tốc độ và chất lượng</p>
            </div>
          </div>
          {hasOverrides && (
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="secondary" className="text-xs gap-1">
                  <Zap className="w-3 h-3" />
                  {channelOverrides.length} kênh có cấu hình
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-[250px]">
                <div className="space-y-1">
                  <p className="text-xs font-medium">Các kênh có cấu hình AI riêng:</p>
                  {channelOverrides.map(({ channel, mode }) => (
                    <p key={channel} className="text-xs text-muted-foreground">
                      • {channel}: {QUALITY_MODES.find(m => m.value === mode)?.label}
                    </p>
                  ))}
                  <p className="text-xs text-muted-foreground pt-1 border-t">
                    Cấu hình Brand sẽ ghi đè chế độ chung
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {QUALITY_MODES.map((mode) => (
            <Tooltip key={mode.value}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onChange(mode.value)}
                  disabled={disabled}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all text-center",
                    value === mode.value
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                      : 'border-border/50 hover:border-border hover:bg-muted/30',
                    disabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <span className="text-xl">{mode.icon}</span>
                  <span className="text-sm font-medium">{mode.label}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[180px]">
                <p className="text-xs">{mode.description}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Adaptive mode hint */}
        {value === 'fast' && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Info className="w-3 h-3" />
            Nếu điểm đánh giá {'<'} 60, hệ thống tự động nâng lên Balanced
          </p>
        )}
      </CardContent>
    </Card>
  );
}
