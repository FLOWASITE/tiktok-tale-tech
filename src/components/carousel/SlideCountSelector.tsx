import { cn } from '@/lib/utils';
import { Check, Layers } from 'lucide-react';
import { SLIDE_COUNT_OPTIONS } from '@/types/carousel';

interface SlideCountSelectorProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const getSlideDescription = (count: number): string => {
  if (count <= 4) return 'Ngắn gọn';
  if (count <= 6) return 'Tiêu chuẩn';
  if (count <= 8) return 'Chi tiết';
  return 'Đầy đủ';
};

export function SlideCountSelector({ value, onChange, disabled }: SlideCountSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {SLIDE_COUNT_OPTIONS.map((count) => {
        const isSelected = value === count;
        
        return (
          <button
            key={count}
            type="button"
            onClick={() => !disabled && onChange(count)}
            disabled={disabled}
            className={cn(
              "relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-300",
              "bg-gradient-to-br hover:scale-[1.02] active:scale-[0.98]",
              isSelected 
                ? "from-primary/20 to-primary/10 border-primary ring-2 ring-primary/20"
                : "from-muted/30 to-muted/10 border-border/50 hover:border-primary/40",
              disabled && "opacity-50 cursor-not-allowed hover:scale-100"
            )}
          >
            {/* Selected indicator */}
            {isSelected && (
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center animate-scale-in">
                <Check className="w-2.5 h-2.5 text-primary-foreground" />
              </div>
            )}
            
            <div className={cn(
              "flex items-center gap-1",
              isSelected ? "text-primary" : "text-muted-foreground"
            )}>
              <Layers className="w-4 h-4" />
              <span className="font-bold text-lg">{count}</span>
            </div>
            
            <span className={cn(
              "text-[10px] font-medium",
              isSelected ? "text-foreground" : "text-muted-foreground"
            )}>
              {getSlideDescription(count)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
