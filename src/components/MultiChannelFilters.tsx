import { useState } from 'react';
import { Search, Calendar, X, ChevronDown, Filter, Zap } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
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

const statusColors: Record<ContentStatus | 'all', string> = {
  all: 'bg-muted/50 text-muted-foreground hover:bg-muted',
  draft: 'bg-muted/50 text-muted-foreground hover:bg-muted/80 data-[active=true]:bg-muted data-[active=true]:text-foreground data-[active=true]:ring-1 data-[active=true]:ring-border',
  review: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/20 data-[active=true]:bg-yellow-500/20 data-[active=true]:ring-1 data-[active=true]:ring-yellow-500/50',
  approved: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 data-[active=true]:bg-blue-500/20 data-[active=true]:ring-1 data-[active=true]:ring-blue-500/50',
  published: 'bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20 data-[active=true]:bg-green-500/20 data-[active=true]:ring-1 data-[active=true]:ring-green-500/50',
};

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
  const [searchFocused, setSearchFocused] = useState(false);

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

  // Quick date presets
  const setQuickDate = (days: number) => {
    const now = new Date();
    onDateRangeChange({
      from: startOfDay(subDays(now, days)),
      to: endOfDay(now),
    });
  };

  return (
    <div className="space-y-3">
      {/* Main Filter Bar - Glassmorphism */}
      <div className="relative p-3 rounded-xl bg-background/60 backdrop-blur-sm border border-border/50">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search with animated icon */}
          <div className={cn(
            "relative flex-1 min-w-[180px] max-w-[280px] transition-all duration-300",
            searchFocused && "flex-[2]"
          )}>
            <Search className={cn(
              "absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 transition-colors duration-200",
              searchFocused ? "text-primary" : "text-muted-foreground"
            )} />
            <Input
              placeholder="Tìm kiếm nội dung..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className={cn(
                "pl-9 h-9 text-sm bg-background/50 border-border/50 transition-all duration-200",
                searchFocused && "ring-2 ring-primary/20 border-primary/50"
              )}
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={() => onSearchChange('')}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>

          {/* Status Filter Chips */}
          <div className="flex items-center gap-1">
            {(['all', ...CONTENT_STATUSES.map(s => s.value)] as const).map((status) => {
              const isActive = statusFilter === status;
              const label = status === 'all' ? 'Tất cả' : CONTENT_STATUSES.find(s => s.value === status)?.label;
              return (
                <button
                  key={status}
                  data-active={isActive}
                  onClick={() => onStatusFilterChange(status as ContentStatus | 'all')}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
                    statusColors[status],
                    isActive && "scale-105"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Goal Filter */}
          <Select value={goalFilter} onValueChange={(v) => onGoalFilterChange(v as ContentGoal | 'all')}>
            <SelectTrigger className="w-[110px] h-9 text-xs bg-background/50 border-border/50">
              <SelectValue placeholder="Mục tiêu" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả mục tiêu</SelectItem>
              {CONTENT_GOALS.map((goal) => (
                <SelectItem key={goal.value} value={goal.value}>
                  {goal.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Advanced Filters Toggle */}
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className={cn(
                  "h-9 gap-1.5 text-xs bg-background/50 border-border/50 transition-all duration-200",
                  isExpanded && "bg-primary/10 border-primary/30 text-primary"
                )}
              >
                <Filter className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Bộ lọc</span>
                {activeFilterCount > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="h-4 min-w-4 p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground animate-pulse"
                  >
                    {activeFilterCount}
                  </Badge>
                )}
                <ChevronDown className={cn(
                  "w-3 h-3 transition-transform duration-200", 
                  isExpanded && "rotate-180"
                )} />
              </Button>
            </CollapsibleTrigger>
          </Collapsible>

          {/* Clear All */}
          <AnimatePresence>
            {activeFilterCount > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearFilters}
                  className="h-9 px-2.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Xóa bộ lọc
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Quick Date Filters */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/30">
          <Zap className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground mr-1">Nhanh:</span>
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: 'Hôm nay', days: 0 },
              { label: '7 ngày', days: 7 },
              { label: '30 ngày', days: 30 },
            ].map((preset) => (
              <button
                key={preset.days}
                onClick={() => setQuickDate(preset.days)}
                className={cn(
                  "px-2 py-1 rounded-md text-xs font-medium transition-all duration-200",
                  "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
                  dateRange.from && !dateRange.to && "bg-primary/10 text-primary"
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Advanced Filters (Collapsible) */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 rounded-xl bg-background/40 backdrop-blur-sm border border-border/30"
          >
            <div className="flex flex-wrap items-center gap-2">
              {/* Channel Filter */}
              <Select value={channelFilter} onValueChange={(v) => onChannelFilterChange(v as Channel | 'all')}>
                <SelectTrigger className="w-[130px] h-9 text-xs bg-background/50 border-border/50">
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
                <SelectTrigger className="w-[130px] h-9 text-xs bg-background/50 border-border/50">
                  <SelectValue placeholder="Thương hiệu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả brand</SelectItem>
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
                      "h-9 text-xs justify-start bg-background/50 border-border/50",
                      !dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-1.5 h-3.5 w-3.5" />
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
                  <SelectTrigger className="w-[110px] h-9 text-xs bg-background/50 border-border/50">
                    <SelectValue placeholder="Tag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả tag</SelectItem>
                    {availableTags.map((tag) => (
                      <SelectItem key={tag} value={tag}>
                        {tag}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </motion.div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
