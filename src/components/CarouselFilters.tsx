import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import { Platform, AITool, PLATFORM_OPTIONS, AI_TOOL_OPTIONS } from '@/types/carousel';

export interface CarouselFiltersState {
  search: string;
  platform: Platform | 'all';
  aiTool: AITool | 'all';
}

interface CarouselFiltersProps {
  filters: CarouselFiltersState;
  onFiltersChange: (filters: CarouselFiltersState) => void;
}

export function CarouselFilters({ filters, onFiltersChange }: CarouselFiltersProps) {
  const hasActiveFilters =
    filters.search || filters.platform !== 'all' || filters.aiTool !== 'all';

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      platform: 'all',
      aiTool: 'all',
    });
  };

  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Tìm theo chủ đề..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="pl-9 bg-background/50 border-border/50"
        />
      </div>

      {/* Platform filter */}
      <Select
        value={filters.platform}
        onValueChange={(v) => onFiltersChange({ ...filters, platform: v as Platform | 'all' })}
      >
        <SelectTrigger className="w-[140px] bg-background/50 border-border/50">
          <SelectValue placeholder="Nền tảng" />
        </SelectTrigger>
        <SelectContent className="bg-popover border-border">
          <SelectItem value="all">Tất cả nền tảng</SelectItem>
          {PLATFORM_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* AI Tool filter */}
      <Select
        value={filters.aiTool}
        onValueChange={(v) => onFiltersChange({ ...filters, aiTool: v as AITool | 'all' })}
      >
        <SelectTrigger className="w-[150px] bg-background/50 border-border/50">
          <SelectValue placeholder="Công cụ AI" />
        </SelectTrigger>
        <SelectContent className="bg-popover border-border">
          <SelectItem value="all">Tất cả công cụ</SelectItem>
          {AI_TOOL_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4 mr-1" />
          Xóa bộ lọc
        </Button>
      )}
    </div>
  );
}
