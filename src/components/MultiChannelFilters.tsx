import { useState } from 'react';
import { Search, Calendar, X, ChevronDown, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ContentGoal, Channel, ContentStatus, CONTENT_GOALS, CHANNELS, CONTENT_STATUSES } from '@/types/multichannel';
import { BrandTemplate } from '@/hooks/useBrandTemplates';
import { cn } from '@/lib/utils';

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface MultiChannelFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  goalFilter: ContentGoal | 'all';
  onGoalFilterChange: (goal: ContentGoal | 'all') => void;
  channelFilter: Channel | 'all';
  onChannelFilterChange: (channel: Channel | 'all') => void;
  statusFilter: ContentStatus | 'all';
  onStatusFilterChange: (status: ContentStatus | 'all') => void;
  brandFilter: string | 'all';
  onBrandFilterChange: (brandId: string | 'all') => void;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  tagFilter: string;
  onTagFilterChange: (tag: string) => void;
  brandTemplates: BrandTemplate[];
  availableTags: string[];
  onClearFilters: () => void;
  activeFilterCount: number;
}

export function MultiChannelFilters({
  searchQuery,
  onSearchChange,
  goalFilter,
  onGoalFilterChange,
  channelFilter,
  onChannelFilterChange,
  statusFilter,
  onStatusFilterChange,
  brandFilter,
  onBrandFilterChange,
  dateRange,
  onDateRangeChange,
  tagFilter,
  onTagFilterChange,
  brandTemplates,
  availableTags,
  onClearFilters,
  activeFilterCount,
}: MultiChannelFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const formatDateRange = () => {
    if (!dateRange.from && !dateRange.to) return 'Chọn ngày';
    if (dateRange.from && dateRange.to) {
      return `${format(dateRange.from, 'dd/MM', { locale: vi })} - ${format(dateRange.to, 'dd/MM', { locale: vi })}`;
    }
    if (dateRange.from) {
      return `Từ ${format(dateRange.from, 'dd/MM', { locale: vi })}`;
    }
    return 'Chọn ngày';
  };

  return (
    <div className="space-y-3">
      {/* Primary Filters Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm theo chủ đề..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={(v) => onStatusFilterChange(v as ContentStatus | 'all')}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            {CONTENT_STATUSES.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Goal Filter */}
        <Select value={goalFilter} onValueChange={(v) => onGoalFilterChange(v as ContentGoal | 'all')}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="Mục tiêu" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            {CONTENT_GOALS.map((goal) => (
              <SelectItem key={goal.value} value={goal.value}>
                {goal.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Toggle Advanced Filters */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto gap-2">
              <Filter className="w-4 h-4" />
              Bộ lọc
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {activeFilterCount}
                </Badge>
              )}
              <ChevronDown className={cn("w-4 h-4 transition-transform", isExpanded && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
        </Collapsible>
      </div>

      {/* Advanced Filters (Collapsible) */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-border/50">
            {/* Channel Filter */}
            <Select value={channelFilter} onValueChange={(v) => onChannelFilterChange(v as Channel | 'all')}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Kênh" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả kênh</SelectItem>
                {CHANNELS.map((channel) => (
                  <SelectItem key={channel.value} value={channel.value}>
                    {channel.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Brand Template Filter */}
            <Select value={brandFilter} onValueChange={(v) => onBrandFilterChange(v)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Thương hiệu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả thương hiệu</SelectItem>
                {brandTemplates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.brand_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Range Filter */}
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full sm:w-[180px] justify-start text-left font-normal",
                    !dateRange.from && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {formatDateRange()}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => {
                    onDateRangeChange({ from: range?.from, to: range?.to });
                  }}
                  numberOfMonths={2}
                  locale={vi}
                  className="pointer-events-auto"
                />
                <div className="p-3 border-t flex justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onDateRangeChange({ from: undefined, to: undefined });
                      setCalendarOpen(false);
                    }}
                  >
                    Xóa
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setCalendarOpen(false)}
                  >
                    Áp dụng
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Tag Filter */}
            {availableTags.length > 0 && (
              <Select value={tagFilter} onValueChange={onTagFilterChange}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả tags</SelectItem>
                  {availableTags.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Clear Filters */}
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="gap-1 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
                Xóa bộ lọc
              </Button>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
