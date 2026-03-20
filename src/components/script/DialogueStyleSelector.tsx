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
    <div className="flex flex-wrap gap-2">
      {styles.map(([key, config]) => {
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
            <span className="text-sm">{STYLE_ICONS[key]}</span>
            <span>{config.label}</span>
          </button>
        );
      })}
    </div>
  );
}
