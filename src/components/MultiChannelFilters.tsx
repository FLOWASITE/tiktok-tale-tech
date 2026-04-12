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
  partially_published: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 hover:bg-teal-500/20 data-[active=true]:bg-teal-500/20 data-[active=true]:ring-1 data-[active=true]:ring-teal-500/50',
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

  const setQuickDate = (days: number) => {
    const now = new Date();
    onDateRangeChange({
      from: startOfDay(subDays(now, days)),
      to: endOfDay(now),
    });
  };

  return (
    <div className="space-y-2">
      {/* Single compact row */}
      <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg bg-background/60 backdrop-blur-sm border border-border/40">
        {/* Search */}
        <div className={cn(
          "relative flex-1 min-w-[140px] max-w-[220px] transition-all duration-200",
          searchFocused && "max-w-[280px]"
        )}>
          <Search className={cn(
            "absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 transition-colors",
            searchFocused ? "text-primary" : "text-muted-foreground"
          )} />
          <Input
            placeholder="Tìm kiếm..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className={cn(
              "pl-8 h-8 text-xs bg-background/50 border-border/40",
              searchFocused && "ring-1 ring-primary/20 border-primary/40"
            )}
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0.5 top-1/2 -translate-y-1/2 h-5 w-5"
              onClick={() => onSearchChange('')}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-border/40 hidden sm:block" />

        {/* Status chips - scrollable on mobile */}
        <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none">
          {(['all', ...CONTENT_STATUSES.map(s => s.value)] as const).map((status) => {
            const isActive = statusFilter === status;
            const label = status === 'all' ? 'Tất cả' : CONTENT_STATUSES.find(s => s.value === status)?.label;
            return (
              <button
                key={status}
                data-active={isActive}
                onClick={() => onStatusFilterChange(status as ContentStatus | 'all')}
                className={cn(
                  "px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-all",
                  statusColors[status],
                  isActive && "scale-[1.02]"
                )}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-border/40 hidden sm:block" />

        {/* Goal + Filter toggle */}
        <div className="flex items-center gap-1">
          <Select value={goalFilter} onValueChange={(v) => onGoalFilterChange(v as ContentGoal | 'all')}>
            <SelectTrigger className="w-[100px] h-8 text-[11px] bg-background/50 border-border/40 gap-1">
              <SelectValue placeholder="Tất cả mục.." />
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

          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 gap-1 px-2 text-[11px] bg-background/50 border-border/40",
                  isExpanded && "bg-primary/10 border-primary/30 text-primary"
                )}
              >
                <Filter className="w-3 h-3" />
                {activeFilterCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="h-3.5 min-w-3.5 p-0 flex items-center justify-center text-[9px] bg-primary text-primary-foreground"
                  >
                    {activeFilterCount}
                  </Badge>
                )}
                <ChevronDown className={cn(
                  "w-2.5 h-2.5 transition-transform duration-200",
                  isExpanded && "rotate-180"
                )} />
              </Button>
            </CollapsibleTrigger>
          </Collapsible>

          <AnimatePresence>
            {activeFilterCount > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClearFilters}
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  title="Xóa bộ lọc"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent>
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="p-2.5 rounded-lg bg-background/40 backdrop-blur-sm border border-border/30"
          >
            <div className="flex flex-wrap items-center gap-2">
              {/* Channel */}
              <Select value={channelFilter} onValueChange={(v) => onChannelFilterChange(v as Channel | 'all')}>
                <SelectTrigger className="w-[120px] h-8 text-xs bg-background/50 border-border/40">
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

              {/* Brand */}
              <Select value={brandFilter} onValueChange={(v) => onBrandFilterChange(v)}>
                <SelectTrigger className="w-[120px] h-8 text-xs bg-background/50 border-border/40">
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

              {/* Date Range */}
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 text-xs justify-start bg-background/50 border-border/40",
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

              {/* Tags */}
              {availableTags.length > 0 && (
                <Select value={tagFilter} onValueChange={onTagFilterChange}>
                  <SelectTrigger className="w-[100px] h-8 text-xs bg-background/50 border-border/40">
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

              {/* Divider */}
              <div className="w-px h-5 bg-border/30" />

              {/* Quick dates inline */}
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-muted-foreground" />
                {[
                  { label: 'Hôm nay', days: 0 },
                  { label: '7 ngày', days: 7 },
                  { label: '30 ngày', days: 30 },
                ].map((preset) => (
                  <button
                    key={preset.days}
                    onClick={() => setQuickDate(preset.days)}
                    className={cn(
                      "px-1.5 py-0.5 rounded text-[10px] font-medium transition-all",
                      "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground",
                      dateRange.from && !dateRange.to && "bg-primary/10 text-primary"
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
