import { ReactNode, useState } from 'react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
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
            "inline-flex items-center gap-2 px-4 py-2 rounded-2xl border text-sm font-medium transition-all duration-300 ease-out",
            "hover:shadow-md hover:shadow-primary/5 hover:-translate-y-px active:translate-y-0 active:shadow-none",
            open
              ? "border-primary/40 bg-primary/5 text-primary shadow-lg shadow-primary/10"
              : "border-border/40 bg-background text-foreground hover:border-primary/30",
            className
          )}
        >
          {icon && <span className="w-4 h-4 flex items-center justify-center opacity-60">{icon}</span>}
          <span className="max-w-[140px] truncate tracking-tight">{label}</span>
          {isAiSuggested && (
            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-amber-100 dark:bg-amber-900/30">
              <Sparkles className="w-2.5 h-2.5 text-amber-500" />
            </span>
          )}
          <ChevronDown className={cn(
            "w-3.5 h-3.5 text-muted-foreground/50 transition-transform duration-300 shrink-0",
            open && "rotate-180"
          )} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          "w-auto min-w-[300px] max-w-[440px] p-4 rounded-2xl border-border/30 shadow-xl shadow-black/5 bg-background/95 backdrop-blur-xl",
          popoverClassName
        )}
        align="start"
        sideOffset={10}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}
