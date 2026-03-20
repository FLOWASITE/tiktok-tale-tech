import { cn } from '@/lib/utils';
import { Landmark, Mountain, Palmtree, Check } from 'lucide-react';
import { VoiceRegion, VOICE_REGION_CONFIG } from '@/types/script';

interface VoiceRegionSelectorProps {
  value: VoiceRegion;
  onChange: (value: VoiceRegion) => void;
  disabled?: boolean;
}

const REGION_ICONS: Record<VoiceRegion, typeof Landmark> = {
  northern: Landmark,
  central: Mountain,
  southern: Palmtree,
};

export function VoiceRegionSelector({ value, onChange, disabled }: VoiceRegionSelectorProps) {
  const regions = Object.entries(VOICE_REGION_CONFIG) as [VoiceRegion, typeof VOICE_REGION_CONFIG[VoiceRegion]][];

  return (
    <div className="flex flex-wrap gap-2">
      {regions.map(([key, config]) => {
        const isSelected = value === key;
        const Icon = REGION_ICONS[key];
        return (
          <button
            key={key}
            type="button"
            onClick={() => !disabled && onChange(key)}
            disabled={disabled}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-300",
              "hover:shadow-sm hover:-translate-y-px active:translate-y-0",
              isSelected
                ? "bg-primary/[0.06] text-primary border-primary/25 shadow-sm shadow-primary/5"
                : "bg-background text-muted-foreground border-border/30 hover:border-border/50 hover:text-foreground",
              disabled && "opacity-50 pointer-events-none"
            )}
          >
            <Icon className={cn("w-3.5 h-3.5", isSelected ? "text-primary" : "opacity-50")} />
            <span className="tracking-tight">{config.label}</span>
            {isSelected && <Check className="w-3 h-3 text-primary/60" />}
          </button>
        );
      })}
    </div>
  );
}
