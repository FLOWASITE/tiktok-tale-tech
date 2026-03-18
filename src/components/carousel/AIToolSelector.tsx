import { Wand2, Sparkles, Palette, Brush } from 'lucide-react';
import { AITool, AI_TOOL_OPTIONS } from '@/types/carousel';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

export function AIToolSelector({ value, onChange, disabled }: AIToolSelectorProps) {
  const selectedOption = AI_TOOL_OPTIONS.find(o => o.value === value);
  const SelectedIcon = selectedOption ? toolIcons[selectedOption.value] : Wand2;

  return (
    <Select value={value} onValueChange={(v) => onChange(v as AITool)} disabled={disabled}>
      <SelectTrigger className="bg-muted/30 border-2 border-border focus:border-primary text-sm h-10 transition-all">
        <SelectValue>
          <span className="flex items-center gap-2">
            <SelectedIcon className="w-4 h-4" />
            <span>{selectedOption?.label}</span>
            <span className="text-muted-foreground text-xs">— {selectedOption?.description}</span>
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {AI_TOOL_OPTIONS.map((option) => {
          const Icon = toolIcons[option.value];
          return (
            <SelectItem key={option.value} value={option.value} textValue={option.label}>
              <span className="flex items-center gap-2">
                <Icon className="w-4 h-4 shrink-0" />
                <span className="font-medium">{option.label}</span>
                <span className="text-muted-foreground text-xs">— {option.description}</span>
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
