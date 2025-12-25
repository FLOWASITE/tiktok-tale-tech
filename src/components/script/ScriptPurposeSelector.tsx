import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Video, Film, User, Mic, Clapperboard, LucideIcon } from 'lucide-react';
import { ScriptPurpose, SCRIPT_PURPOSE_CONFIG } from '@/types/script';

interface ScriptPurposeSelectorProps {
  value: ScriptPurpose;
  onChange: (value: ScriptPurpose) => void;
  disabled?: boolean;
}

const ICON_MAP: Record<ScriptPurpose, LucideIcon> = {
  ai_video_veo3: Video,
  ai_video_minimax: Film,
  teleprompter: User,
  voiceover: Mic,
  production: Clapperboard,
};

export function ScriptPurposeSelector({ value, onChange, disabled }: ScriptPurposeSelectorProps) {
  const purposes = Object.entries(SCRIPT_PURPOSE_CONFIG) as [ScriptPurpose, typeof SCRIPT_PURPOSE_CONFIG[ScriptPurpose]][];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {purposes.map(([key, config]) => {
          const Icon = ICON_MAP[key];
          const isSelected = value === key;
          
          return (
            <Card
              key={key}
              className={cn(
                "cursor-pointer transition-all duration-200 hover:border-primary/50",
                isSelected ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              onClick={() => !disabled && onChange(key)}
            >
              <CardContent className="p-4 flex items-start gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                  isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "font-medium text-sm",
                      isSelected ? "text-primary" : "text-foreground"
                    )}>
                      {config.label}
                    </span>
                    {key === 'ai_video_veo3' && (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1">
                        Phổ biến
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {config.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {/* Output format hint */}
      <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
        <strong>📋 Định dạng output:</strong>{' '}
        {SCRIPT_PURPOSE_CONFIG[value].outputHint}
      </div>
    </div>
  );
}
