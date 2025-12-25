import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { MessageSquare, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DialogueStyle, DIALOGUE_STYLE_CONFIG } from '@/types/script';

interface DialogueStyleSelectorProps {
  value: DialogueStyle;
  onChange: (value: DialogueStyle) => void;
  disabled?: boolean;
}

const STYLE_ICONS: Record<DialogueStyle, string> = {
  monologue: '🎤',
  conversational: '💬',
  internal: '🧠',
  narrative: '📖',
};

export function DialogueStyleSelector({ value, onChange, disabled }: DialogueStyleSelectorProps) {
  const styles = Object.entries(DIALOGUE_STYLE_CONFIG) as [DialogueStyle, typeof DIALOGUE_STYLE_CONFIG[DialogueStyle]][];

  return (
    <div className="space-y-2">
      <Label className="text-foreground font-semibold text-sm flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-primary" />
        Phong cách hội thoại
      </Label>
      <div className="grid grid-cols-2 gap-2">
        {styles.map(([key, config]) => {
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
              <div className="flex items-start gap-2">
                <span className="text-lg">{STYLE_ICONS[key]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">{config.label}</p>
                  <p className="text-[10px] text-muted-foreground line-clamp-2">{config.description}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      
      {/* Preview selected style instruction */}
      {value && (
        <div className="mt-2 p-2 bg-muted/30 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground mb-1">Hướng dẫn AI:</p>
          <p className="text-xs text-foreground italic">"{DIALOGUE_STYLE_CONFIG[value].prompt_instruction}"</p>
        </div>
      )}
    </div>
  );
}
