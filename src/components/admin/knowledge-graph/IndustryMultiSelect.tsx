/**
 * IndustryMultiSelect - Multi-select component for industry categories
 */

import React from 'react';
import { Check, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useIndustryCategories, IndustryCategory } from '@/hooks/useIndustryCategories';

interface IndustryMultiSelectProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  label?: string;
  placeholder?: string;
}

export function IndustryMultiSelect({
  selectedIds,
  onChange,
  label = 'Ngành mục tiêu',
  placeholder = 'Chọn ngành...',
}: IndustryMultiSelectProps) {
  const { data: categories = [], isLoading } = useIndustryCategories();

  const toggleCategory = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(cid => cid !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectedCategories = categories.filter(c => selectedIds.includes(c.id));

  return (
    <div className="space-y-2">
      {label && (
        <Label className="flex items-center gap-1.5">
          <Target className="h-3.5 w-3.5" />
          {label}
        </Label>
      )}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="w-full justify-start h-auto min-h-10 py-2"
          >
            {selectedCategories.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              <div className="flex flex-wrap gap-1">
                {selectedCategories.map(cat => (
                  <Badge key={cat.id} variant="secondary" className="text-xs">
                    {cat.label}
                  </Badge>
                ))}
              </div>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <ScrollArea className="h-64">
            <div className="p-2 space-y-1">
              {isLoading ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  Đang tải...
                </div>
              ) : categories.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  Chưa có ngành nào
                </div>
              ) : (
                categories.map(category => {
                  const isSelected = selectedIds.includes(category.id);
                  return (
                    <button
                      key={category.id}
                      onClick={() => toggleCategory(category.id)}
                      className={cn(
                        'flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm text-left transition-colors',
                        isSelected
                          ? 'bg-primary/10 text-primary'
                          : 'hover:bg-muted'
                      )}
                    >
                      <div
                        className={cn(
                          'h-4 w-4 rounded border flex items-center justify-center',
                          isSelected
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'border-muted-foreground/30'
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <span>{category.label}</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {category.code}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
          {selectedIds.length > 0 && (
            <div className="border-t p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => onChange([])}
              >
                Bỏ chọn tất cả
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
      <p className="text-xs text-muted-foreground">
        Quy định từ nguồn này sẽ tự động liên kết với các ngành đã chọn
      </p>
    </div>
  );
}

export default IndustryMultiSelect;
