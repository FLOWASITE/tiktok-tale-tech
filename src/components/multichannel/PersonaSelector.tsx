import React, { useState } from 'react';
import { Check, ChevronsUpDown, User, X, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useCustomerPersonas } from '@/hooks/useCustomerPersonas';

interface PersonaSelectorProps {
  brandTemplateId?: string;
  value?: string;
  onValueChange: (value: string | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function PersonaSelector({
  brandTemplateId,
  value,
  onValueChange,
  placeholder = "Chọn persona mục tiêu...",
  disabled = false,
  className,
}: PersonaSelectorProps) {
  const [open, setOpen] = useState(false);
  const { personas, isLoading } = useCustomerPersonas({
    brandTemplateId,
    enabled: !!brandTemplateId,
  });

  const selectedPersona = personas.find((p) => p.id === value);

  const handleSelect = (personaId: string) => {
    onValueChange(personaId === value ? undefined : personaId);
    setOpen(false);
  };

  const handleClear = () => {
    onValueChange(undefined);
    setOpen(false);
  };

  if (!brandTemplateId) {
    return (
      <Button
        variant="outline"
        disabled
        className={cn("w-full justify-start text-muted-foreground", className)}
      >
        <User className="mr-2 h-4 w-4" />
        Chọn thương hiệu trước
      </Button>
    );
  }

  // Separate primary and other personas
  const primaryPersona = personas.find((p) => p.is_primary);
  const otherPersonas = personas.filter((p) => !p.is_primary);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || isLoading}
          className={cn(
            "w-full justify-between",
            !value && "text-muted-foreground",
            className
          )}
        >
          <div className="flex items-center gap-2 truncate">
            {selectedPersona ? (
              <>
                <span className="text-lg">{selectedPersona.avatar_emoji || '👤'}</span>
                <span className="truncate">{selectedPersona.name}</span>
                {selectedPersona.is_primary && (
                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                )}
              </>
            ) : (
              <>
                <User className="h-4 w-4" />
                <span>{isLoading ? "Đang tải..." : placeholder}</span>
              </>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Tìm persona..." />
          <CommandList>
            <CommandEmpty>Không tìm thấy persona.</CommandEmpty>
            
            {/* Clear option */}
            {value && (
              <CommandGroup>
                <CommandItem onSelect={handleClear} className="text-muted-foreground">
                  <X className="mr-2 h-4 w-4" />
                  Bỏ chọn
                </CommandItem>
              </CommandGroup>
            )}

            {/* Primary persona */}
            {primaryPersona && (
              <CommandGroup heading="Persona chính">
                <CommandItem
                  value={primaryPersona.id}
                  onSelect={() => handleSelect(primaryPersona.id)}
                  className="flex items-center gap-2"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === primaryPersona.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="text-lg">{primaryPersona.avatar_emoji || '👤'}</span>
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="truncate font-medium">{primaryPersona.name}</span>
                      <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 shrink-0" />
                    </div>
                    {primaryPersona.occupation && (
                      <span className="text-xs text-muted-foreground truncate">
                        {primaryPersona.occupation}
                      </span>
                    )}
                  </div>
                </CommandItem>
              </CommandGroup>
            )}

            {/* Other personas */}
            {otherPersonas.length > 0 && (
              <CommandGroup heading="Tất cả personas">
                {otherPersonas.map((persona) => (
                  <CommandItem
                    key={persona.id}
                    value={persona.id}
                    onSelect={() => handleSelect(persona.id)}
                    className="flex items-center gap-2"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === persona.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="text-lg">{persona.avatar_emoji || '👤'}</span>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="truncate font-medium">{persona.name}</span>
                      {persona.occupation && (
                        <span className="text-xs text-muted-foreground truncate">
                          {persona.occupation}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
