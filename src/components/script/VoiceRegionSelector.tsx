import { cn } from '@/lib/utils';
import { MapPin, Landmark, Mountain, Palmtree } from 'lucide-react';
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
              "inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all duration-200",
              "hover:border-primary/40",
              isSelected
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-card/80 text-foreground border-border/60 hover:bg-accent/30",
              disabled && "opacity-50 pointer-events-none"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{config.label}</span>
          </button>
        );
      })}
    </div>
  );
}
