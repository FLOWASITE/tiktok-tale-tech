import { cn } from '@/lib/utils';
import { VoiceRegion, VOICE_REGION_CONFIG } from '@/types/script';

interface VoiceRegionSelectorProps {
  value: VoiceRegion;
  onChange: (value: VoiceRegion) => void;
  disabled?: boolean;
}

const REGION_ICONS: Record<VoiceRegion, string> = {
  northern: '🏛️',
  central: '🏯',
  southern: '🌴',
};

export function VoiceRegionSelector({ value, onChange, disabled }: VoiceRegionSelectorProps) {
  const regions = Object.entries(VOICE_REGION_CONFIG) as [VoiceRegion, typeof VOICE_REGION_CONFIG[VoiceRegion]][];

  return (
    <div className="flex flex-wrap gap-2">
      {regions.map(([key, config]) => {
        const isSelected = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => !disabled && onChange(key)}
            disabled={disabled}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-all duration-200",
              "hover:border-primary/40",
              isSelected
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-card/80 text-muted-foreground border-border/60 hover:bg-accent/30",
              disabled && "opacity-50 pointer-events-none"
            )}
          >
            <span className="text-sm">{REGION_ICONS[key]}</span>
            <span>{config.label}</span>
          </button>
        );
      })}
    </div>
  );
}
