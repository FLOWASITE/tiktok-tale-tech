import { cn } from '@/lib/utils';
import { Mic, MessageCircle, Brain, BookOpen, Check } from 'lucide-react';
import { DialogueStyle, DIALOGUE_STYLE_CONFIG } from '@/types/script';

interface DialogueStyleSelectorProps {
  value: DialogueStyle;
  onChange: (value: DialogueStyle) => void;
  disabled?: boolean;
}

const STYLE_ICONS: Record<DialogueStyle, typeof Mic> = {
  monologue: Mic,
  conversational: MessageCircle,
  internal: Brain,
  narrative: BookOpen,
};

export function DialogueStyleSelector({ value, onChange, disabled }: DialogueStyleSelectorProps) {
  const styles = Object.entries(DIALOGUE_STYLE_CONFIG) as [DialogueStyle, typeof DIALOGUE_STYLE_CONFIG[DialogueStyle]][];

  return (
    <div className="flex flex-wrap gap-2">
      {styles.map(([key, config]) => {
        const isSelected = value === key;
        const Icon = STYLE_ICONS[key];
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
