import { ReactNode, useState } from 'react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfigChipSelectorProps {
  label: string;
  icon?: ReactNode;
  isAiSuggested?: boolean;
  children: ReactNode;
  className?: string;
  popoverClassName?: string;
}

export function ConfigChipSelector({
  label,
  icon,
  isAiSuggested,
  children,
  className,
  popoverClassName,
}: ConfigChipSelectorProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-all duration-200",
            "hover:border-primary/50 hover:bg-accent/40 active:scale-[0.97]",
            open
              ? "border-primary bg-primary/10 text-primary"
              : "border-border/60 bg-card/80 text-foreground",
            className
          )}
        >
          {icon && <span className="w-3.5 h-3.5 flex items-center justify-center">{icon}</span>}
          <span className="max-w-[140px] truncate">{label}</span>
          {isAiSuggested && (
            <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
          )}
          <ChevronDown className={cn(
            "w-3 h-3 text-muted-foreground transition-transform duration-200 shrink-0",
            open && "rotate-180"
          )} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("w-auto min-w-[280px] max-w-[400px] p-3", popoverClassName)}
        align="start"
        sideOffset={8}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}
