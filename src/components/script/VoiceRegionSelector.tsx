import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { MapPin, Check } from 'lucide-react';
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
    <div className="space-y-2">
      <Label className="text-foreground font-semibold text-sm flex items-center gap-2">
        <MapPin className="w-4 h-4 text-primary" />
        Giọng vùng miền
      </Label>
      <div className="grid grid-cols-3 gap-2">
        {regions.map(([key, config]) => {
          const isSelected = value === key;
          return (
            <Card
              key={key}
              className={cn(
                "p-3 cursor-pointer transition-all relative",
                "hover:border-primary/50 hover:shadow-sm",
                isSelected && "border-primary bg-primary/5 ring-1 ring-primary/30",
                disabled && "opacity-50 pointer-events-none"
              )}
              onClick={() => !disabled && onChange(key)}
            >
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <Check className="w-3.5 h-3.5 text-primary" />
                </div>
              )}
              <div className="text-center space-y-1">
                <span className="text-xl">{REGION_ICONS[key]}</span>
                <p className="text-xs font-medium text-foreground">{config.label}</p>
                <p className="text-[10px] text-muted-foreground line-clamp-2">{config.description}</p>
              </div>
            </Card>
          );
        })}
      </div>
      
      {/* Preview selected region */}
      {value && (
        <div className="mt-2 p-2 bg-muted/30 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground mb-1">Đặc điểm giọng:</p>
          <p className="text-xs text-foreground">{VOICE_REGION_CONFIG[value].dialect_notes}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {VOICE_REGION_CONFIG[value].example_phrases.map((phrase, i) => (
              <Badge key={i} variant="secondary" className="text-[10px]">
                "{phrase}"
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
