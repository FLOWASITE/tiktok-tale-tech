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
    <>
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[150px] max-w-[200px]">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-7 h-8 text-xs"
          />
        </div>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={(v) => onStatusFilterChange(v as ContentStatus | 'all')}>
          <SelectTrigger className="w-[100px] h-8 text-xs">
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
          <SelectTrigger className="w-[100px] h-8 text-xs">
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
            <Button variant="outline" size="sm" className="h-8 gap-1 text-xs px-2">
              <Filter className="w-3 h-3" />
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                  {activeFilterCount}
                </Badge>
              )}
              <ChevronDown className={cn("w-3 h-3 transition-transform", isExpanded && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
        </Collapsible>

        {/* Clear Filters */}
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-8 px-2 text-xs text-muted-foreground"
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>

      {/* Advanced Filters (Collapsible) */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent>
          <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-border/50">
            {/* Channel Filter */}
            <Select value={channelFilter} onValueChange={(v) => onChannelFilterChange(v as Channel | 'all')}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
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
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue placeholder="Brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
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
                  size="sm"
                  className={cn(
                    "h-8 text-xs justify-start",
                    !dateRange.from && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-1 h-3 w-3" />
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
                <div className="p-2 border-t flex justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      onDateRangeChange({ from: undefined, to: undefined });
                      setCalendarOpen(false);
                    }}
                  >
                    Xóa
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs"
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
                <SelectTrigger className="w-[100px] h-8 text-xs">
                  <SelectValue placeholder="Tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  {availableTags.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </>
  );
}
