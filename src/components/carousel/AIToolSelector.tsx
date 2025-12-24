import { cn } from '@/lib/utils';
import { Check, Wand2, Sparkles, Palette, Brush } from 'lucide-react';
import { AITool, AI_TOOL_OPTIONS } from '@/types/carousel';

interface AIToolSelectorProps {
  value: AITool;
  onChange: (value: AITool) => void;
  disabled?: boolean;
}

const toolIcons: Record<AITool, React.ComponentType<{ className?: string }>> = {
  ideogram: Wand2,
  midjourney: Sparkles,
  dalle: Palette,
  leonardo: Brush,
};

const toolColors: Record<AITool, string> = {
  ideogram: 'from-violet-500/20 to-purple-600/10 border-violet-500/30 hover:border-violet-500/60',
  midjourney: 'from-blue-500/20 to-cyan-600/10 border-blue-500/30 hover:border-blue-500/60',
  dalle: 'from-green-500/20 to-emerald-600/10 border-green-500/30 hover:border-green-500/60',
  leonardo: 'from-orange-500/20 to-amber-600/10 border-orange-500/30 hover:border-orange-500/60',
};

const toolActiveColors: Record<AITool, string> = {
  ideogram: 'from-violet-500/30 to-purple-600/20 border-violet-500 ring-2 ring-violet-500/20',
  midjourney: 'from-blue-500/30 to-cyan-600/20 border-blue-500 ring-2 ring-blue-500/20',
  dalle: 'from-green-500/30 to-emerald-600/20 border-green-500 ring-2 ring-green-500/20',
  leonardo: 'from-orange-500/30 to-amber-600/20 border-orange-500 ring-2 ring-orange-500/20',
};

export function AIToolSelector({ value, onChange, disabled }: AIToolSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {AI_TOOL_OPTIONS.map((option) => {
        const Icon = toolIcons[option.value];
        const isSelected = value === option.value;
        
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => !disabled && onChange(option.value)}
            disabled={disabled}
            className={cn(
              "relative flex flex-col items-start gap-1 p-3 rounded-xl border-2 transition-all duration-300",
              "bg-gradient-to-br hover:scale-[1.02] active:scale-[0.98]",
              isSelected 
                ? toolActiveColors[option.value]
                : toolColors[option.value],
              disabled && "opacity-50 cursor-not-allowed hover:scale-100"
            )}
          >
            {/* Selected indicator */}
            {isSelected && (
              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center animate-scale-in">
                <Check className="w-3 h-3 text-primary-foreground" />
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <Icon className={cn(
                "w-5 h-5 transition-transform duration-300",
                isSelected && "scale-110"
              )} />
              <span className={cn(
                "font-semibold text-sm",
                isSelected ? "text-foreground" : "text-muted-foreground"
              )}>
                {option.label}
              </span>
            </div>
            
            <span className={cn(
              "text-xs",
              isSelected ? "text-foreground/70" : "text-muted-foreground/70"
            )}>
              {option.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
