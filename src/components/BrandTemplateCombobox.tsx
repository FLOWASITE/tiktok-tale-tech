import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

export type BrandTemplateOption = {
  id: string;
  name: string;
  is_default?: boolean;
  primary_color?: string | null;
};

interface BrandTemplateComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  options: BrandTemplateOption[];
  disabled?: boolean;
  placeholder?: string;
}

export function BrandTemplateCombobox({
  value,
  onValueChange,
  options,
  disabled,
  placeholder = "Chọn template...",
}: BrandTemplateComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const selected = React.useMemo(
    () => options.find((o) => o.id === value),
    [options, value],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between",
            !selected && "text-muted-foreground",
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            {selected?.primary_color ? (
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: selected.primary_color }}
                aria-hidden="true"
              />
            ) : null}
            <span className="truncate">
              {selected ? selected.name : placeholder}
            </span>
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0"
      >
        <Command>
          <CommandInput placeholder="Tìm brand..." />
          <CommandList>
            <CommandEmpty>Không tìm thấy template</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => {
                const isSelected = opt.id === value;
                return (
                  <CommandItem
                    key={opt.id}
                    value={opt.name}
                    onSelect={() => {
                      onValueChange(opt.id);
                      setOpen(false);
                    }}
                    className="flex items-center gap-2"
                  >
                    <Check
                      className={cn(
                        "h-4 w-4",
                        isSelected ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {opt.primary_color ? (
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: opt.primary_color }}
                        aria-hidden="true"
                      />
                    ) : null}
                    <span className="truncate">{opt.name}</span>
                    {opt.is_default ? (
                      <span className="ml-auto text-xs text-muted-foreground">Mặc định</span>
                    ) : null}
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
