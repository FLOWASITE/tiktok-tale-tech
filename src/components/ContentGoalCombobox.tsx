import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CONTENT_GOALS, ContentGoal } from "@/types/multichannel";

interface ContentGoalComboboxProps {
  value: ContentGoal;
  onValueChange: (value: ContentGoal) => void;
  disabled?: boolean;
}

export function ContentGoalCombobox({
  value,
  onValueChange,
  disabled,
}: ContentGoalComboboxProps) {
  const [open, setOpen] = useState(false);

  const selectedGoal = CONTENT_GOALS.find((goal) => goal.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between text-xs xs:text-sm h-9 xs:h-10 font-normal"
        >
          {selectedGoal ? (
            <span className="flex items-center gap-1.5 xs:gap-2 truncate">
              <selectedGoal.icon className="w-3.5 h-3.5 xs:w-4 xs:h-4 text-primary shrink-0" />
              <span className="truncate">{selectedGoal.label}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">Chọn mục tiêu...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[--radix-popover-trigger-width] p-0" 
        align="start"
        sideOffset={4}
      >
        <Command>
          <CommandList>
            <CommandEmpty>Không tìm thấy.</CommandEmpty>
            <CommandGroup>
              {CONTENT_GOALS.map((goal) => {
                const Icon = goal.icon;
                return (
                  <CommandItem
                    key={goal.value}
                    value={goal.value}
                    onSelect={() => {
                      onValueChange(goal.value);
                      setOpen(false);
                    }}
                    className="flex items-center gap-2 py-2.5"
                  >
                    <Icon className="w-4 h-4 text-primary shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm truncate">{goal.label}</span>
                      <span className="text-xs text-muted-foreground truncate">
                        {goal.description}
                      </span>
                    </div>
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4 shrink-0",
                        value === goal.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
