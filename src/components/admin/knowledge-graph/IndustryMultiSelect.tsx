/**
 * IndustryMultiSelect - Multi-select component for specific industry packs
 * Groups packs by category for easy navigation
 */

import React, { useState, useMemo } from 'react';
import { Check, ChevronDown, ChevronRight, Search, Target, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useIndustryPacksForSelect, IndustryPackForSelect } from '@/hooks/useIndustryPacksForSelect';

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
  placeholder = 'Chọn ngành cụ thể...',
}: IndustryMultiSelectProps) {
  const { data, isLoading } = useIndustryPacksForSelect();
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const togglePack = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(pid => pid !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const selectAllInCategory = (categoryId: string) => {
    const categoryPacks = data?.grouped.find(g => g.category_id === categoryId)?.packs || [];
    const categoryPackIds = categoryPacks.map(p => p.id);
    const allSelected = categoryPackIds.every(id => selectedIds.includes(id));
    
    if (allSelected) {
      // Deselect all in category
      onChange(selectedIds.filter(id => !categoryPackIds.includes(id)));
    } else {
      // Select all in category
      const newIds = [...new Set([...selectedIds, ...categoryPackIds])];
      onChange(newIds);
    }
  };

  // Filter packs by search
  const filteredGroups = useMemo(() => {
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

  // Get selected packs info
  const selectedPacks = useMemo(() => {
    if (!data?.flat) return [];
    return data.flat.filter(p => selectedIds.includes(p.id));
  }, [data?.flat, selectedIds]);

  // Auto-expand categories with matches when searching
  React.useEffect(() => {
    if (search.trim()) {
      const matchingCategories = filteredGroups.map(g => g.category_id);
      setExpandedCategories(new Set(matchingCategories));
    }
  }, [search, filteredGroups]);

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
            {selectedPacks.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              <div className="flex flex-wrap gap-1">
                {selectedPacks.slice(0, 3).map(pack => (
                  <Badge key={pack.id} variant="secondary" className="text-xs">
                    {pack.name}
                  </Badge>
                ))}
                {selectedPacks.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{selectedPacks.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96 p-0" align="start">
          {/* Search */}
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm ngành..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8"
              />
            </div>
          </div>

          <ScrollArea className="h-72">
            <div className="p-2 space-y-1">
              {isLoading ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  Đang tải...
                </div>
              ) : filteredGroups.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  {search ? 'Không tìm thấy ngành phù hợp' : 'Chưa có ngành nào'}
                </div>
              ) : (
                filteredGroups.map(group => {
                  const isExpanded = expandedCategories.has(group.category_id);
                  const selectedCount = group.packs.filter(p => selectedIds.includes(p.id)).length;
                  const allSelected = selectedCount === group.packs.length;

                  return (
                    <div key={group.category_id} className="border rounded-md overflow-hidden">
                      {/* Category Header */}
                      <button
                        onClick={() => toggleCategory(group.category_id)}
                        className="flex items-center gap-2 w-full px-2 py-1.5 text-sm font-medium bg-muted/50 hover:bg-muted transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <span className="flex-1 text-left">{group.category_label}</span>
                        {selectedCount > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {selectedCount}/{group.packs.length}
                          </Badge>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            selectAllInCategory(group.category_id);
                          }}
                          className={cn(
                            'text-xs px-1.5 py-0.5 rounded',
                            allSelected
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted-foreground/10 hover:bg-muted-foreground/20'
                          )}
                        >
                          {allSelected ? 'Bỏ chọn' : 'Chọn tất cả'}
                        </button>
                      </button>

                      {/* Packs List */}
                      {isExpanded && (
                        <div className="p-1 space-y-0.5">
                          {group.packs.map(pack => {
                            const isSelected = selectedIds.includes(pack.id);
                            return (
                              <button
                                key={pack.id}
                                onClick={() => togglePack(pack.id)}
                                className={cn(
                                  'flex items-center gap-2 w-full px-2 py-1 rounded text-sm text-left transition-colors',
                                  isSelected
                                    ? 'bg-primary/10 text-primary'
                                    : 'hover:bg-muted'
                                )}
                              >
                                <div
                                  className={cn(
                                    'h-4 w-4 rounded border flex items-center justify-center flex-shrink-0',
                                    isSelected
                                      ? 'bg-primary border-primary text-primary-foreground'
                                      : 'border-muted-foreground/30'
                                  )}
                                >
                                  {isSelected && <Check className="h-3 w-3" />}
                                </div>
                                <span className="flex-1 truncate">{pack.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {pack.industry_code}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>

          {/* Footer with selected count and clear */}
          {selectedIds.length > 0 && (
            <div className="border-t p-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Đã chọn {selectedIds.length} ngành
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => onChange([])}
              >
                <X className="h-3 w-3 mr-1" />
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
