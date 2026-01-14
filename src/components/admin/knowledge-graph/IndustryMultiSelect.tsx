/**
 * IndustryMultiSelect - Multi-select component for specific industry packs
 * Uses Command (cmdk) for better search UX with category grouping
 */

import React, { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Search, Target, X, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useIndustryPacksForSelect } from '@/hooks/useIndustryPacksForSelect';

interface IndustryMultiSelectProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  label?: string;
  placeholder?: string;
}

// Popular/common industries for quick selection
const POPULAR_INDUSTRY_CODES = [
  'accounting_services',
  'real_estate_agency', 
  'restaurant',
  'retail_fashion',
  'medical_clinic',
  'law_firm',
  'construction_general',
  'ecommerce_general',
];

export function IndustryMultiSelect({
  selectedIds,
  onChange,
  label = 'Ngành mục tiêu',
  placeholder = 'Chọn ngành để liên kết quy định...',
}: IndustryMultiSelectProps) {
  const { data, isLoading } = useIndustryPacksForSelect();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const togglePack = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(pid => pid !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const removePack = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedIds.filter(pid => pid !== id));
  };

  // Get popular packs
  const popularPacks = useMemo(() => {
    if (!data?.flat) return [];
    return data.flat.filter(p => POPULAR_INDUSTRY_CODES.includes(p.industry_code));
  }, [data?.flat]);

  // Get selected packs info
  const selectedPacks = useMemo(() => {
    if (!data?.flat) return [];
    return data.flat.filter(p => selectedIds.includes(p.id));
  }, [data?.flat, selectedIds]);

  // Filter and group for display
  const displayGroups = useMemo(() => {
    if (!data?.grouped) return [];
    if (!search.trim()) return data.grouped;

    const searchLower = search.toLowerCase();
    return data.grouped
      .map(group => ({
        ...group,
        packs: group.packs.filter(pack =>
          pack.name.toLowerCase().includes(searchLower) ||
          pack.industry_code.toLowerCase().includes(searchLower)
        ),
      }))
      .filter(group => group.packs.length > 0);
  }, [data?.grouped, search]);

  return (
    <div className="space-y-2">
      {label && (
        <Label className="flex items-center gap-1.5">
          <Target className="h-3.5 w-3.5" />
          {label}
        </Label>
      )}
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-auto min-h-10 py-2"
          >
            {selectedPacks.length === 0 ? (
              <span className="text-muted-foreground font-normal">{placeholder}</span>
            ) : (
              <div className="flex flex-wrap gap-1 flex-1">
                {selectedPacks.slice(0, 4).map(pack => (
                  <Badge 
                    key={pack.id} 
                    variant="secondary" 
                    className="text-xs gap-1 pr-1"
                  >
                    {pack.name}
                    <button
                      onClick={(e) => removePack(pack.id, e)}
                      className="hover:bg-muted-foreground/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {selectedPacks.length > 4 && (
                  <Badge variant="outline" className="text-xs">
                    +{selectedPacks.length - 4} ngành khác
                  </Badge>
                )}
              </div>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-[480px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput 
              placeholder="Tìm kiếm ngành..." 
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>
                {isLoading ? 'Đang tải...' : 'Không tìm thấy ngành phù hợp'}
              </CommandEmpty>
              
              {/* Quick picks - show only when not searching */}
              {!search.trim() && popularPacks.length > 0 && (
                <>
                  <CommandGroup heading={
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3" />
                      Ngành phổ biến
                    </span>
                  }>
                    <div className="flex flex-wrap gap-1.5 p-2">
                      {popularPacks.map(pack => {
                        const isSelected = selectedIds.includes(pack.id);
                        return (
                          <button
                            key={pack.id}
                            onClick={() => togglePack(pack.id)}
                            className={cn(
                              'px-2.5 py-1 rounded-full text-xs font-medium transition-all border',
                              isSelected
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-muted hover:bg-muted-foreground/10 border-transparent'
                            )}
                          >
                            {isSelected && <Check className="h-3 w-3 inline mr-1" />}
                            {pack.name}
                          </button>
                        );
                      })}
                    </div>
                  </CommandGroup>
                  <CommandSeparator />
                </>
              )}

              {/* Grouped by category */}
              <ScrollArea className="h-64">
                {displayGroups.map(group => (
                  <CommandGroup 
                    key={group.category_id} 
                    heading={
                      <span className="flex items-center justify-between">
                        <span>{group.category_label}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {group.packs.filter(p => selectedIds.includes(p.id)).length}/{group.packs.length}
                        </Badge>
                      </span>
                    }
                  >
                    {group.packs.map(pack => {
                      const isSelected = selectedIds.includes(pack.id);
                      return (
                        <CommandItem
                          key={pack.id}
                          value={`${pack.name} ${pack.industry_code}`}
                          onSelect={() => togglePack(pack.id)}
                          className="cursor-pointer"
                        >
                          <div
                            className={cn(
                              'mr-2 h-4 w-4 rounded border flex items-center justify-center flex-shrink-0',
                              isSelected
                                ? 'bg-primary border-primary text-primary-foreground'
                                : 'border-muted-foreground/30'
                            )}
                          >
                            {isSelected && <Check className="h-3 w-3" />}
                          </div>
                          <span className="flex-1">{pack.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {pack.industry_code}
                          </span>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                ))}
              </ScrollArea>
            </CommandList>

            {/* Footer */}
            {selectedIds.length > 0 && (
              <div className="border-t p-2 flex items-center justify-between bg-muted/30">
                <span className="text-xs text-muted-foreground">
                  Đã chọn <strong>{selectedIds.length}</strong> ngành
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-destructive hover:text-destructive"
                  onClick={() => onChange([])}
                >
                  <X className="h-3 w-3 mr-1" />
                  Xóa tất cả
                </Button>
              </div>
            )}
          </Command>
        </PopoverContent>
      </Popover>
      
      <p className="text-xs text-muted-foreground">
        Quy định từ nguồn này sẽ tự động liên kết với các ngành đã chọn
      </p>
    </div>
  );
}

export default IndustryMultiSelect;
