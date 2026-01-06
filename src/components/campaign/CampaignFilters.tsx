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
import { CampaignStatus, CAMPAIGN_TYPES } from '@/types/campaign';
import { cn } from '@/lib/utils';

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

type FilterStatus = 'all' | 'active' | 'planning' | 'completed';

interface CampaignFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: FilterStatus;
  onStatusFilterChange: (status: FilterStatus) => void;
  typeFilter: string;
  onTypeFilterChange: (type: string) => void;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  onClearFilters: () => void;
  activeFilterCount: number;
  stats: {
    total: number;
    active: number;
    planning: number;
    completed: number;
  };
}

const statusColors: Record<FilterStatus, string> = {
  all: 'bg-muted/50 text-muted-foreground hover:bg-muted',
  active: 'bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20 data-[active=true]:bg-green-500/20 data-[active=true]:ring-1 data-[active=true]:ring-green-500/50',
  planning: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 data-[active=true]:bg-blue-500/20 data-[active=true]:ring-1 data-[active=true]:ring-blue-500/50',
  completed: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 data-[active=true]:bg-purple-500/20 data-[active=true]:ring-1 data-[active=true]:ring-purple-500/50',
};

const statusLabels: Record<FilterStatus, string> = {
  all: 'Tất cả',
  active: 'Đang chạy',
  planning: 'Kế hoạch',
  completed: 'Hoàn thành',
};

export function CampaignFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
  dateRange,
  onDateRangeChange,
  onClearFilters,
  activeFilterCount,
  stats,
}: CampaignFiltersProps) {
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

  const getStatusCount = (status: FilterStatus) => {
    switch (status) {
      case 'all': return stats.total;
      case 'active': return stats.active;
      case 'planning': return stats.planning;
      case 'completed': return stats.completed;
    }
  };

  return (
    <div className="space-y-3">
      {/* Main Filter Bar - Glassmorphism */}
      <div className="relative p-3 rounded-xl bg-background/60 backdrop-blur-sm border border-border/50">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search with animated icon */}
          <div className={cn(
            "relative flex-1 min-w-[140px] max-w-[280px] transition-all duration-300",
            searchFocused && "flex-[2]"
          )}>
            <Search className={cn(
              "absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 transition-colors duration-200",
              searchFocused ? "text-primary" : "text-muted-foreground"
            )} />
            <Input
              placeholder="Tìm chiến dịch..."
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
          <div className="flex items-center gap-1 flex-wrap">
            {(['all', 'active', 'planning', 'completed'] as const).map((status) => {
              const isActive = statusFilter === status;
              const count = getStatusCount(status);
              return (
                <button
                  key={status}
                  data-active={isActive}
                  onClick={() => onStatusFilterChange(status)}
                  className={cn(
                    "px-2 sm:px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-all duration-200 whitespace-nowrap",
                    statusColors[status],
                    isActive && "scale-105 ring-1"
                  )}
                >
                  {statusLabels[status]}
                  <span className="ml-1 opacity-70">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Type Filter */}
          <Select value={typeFilter} onValueChange={onTypeFilterChange}>
            <SelectTrigger className="w-[100px] sm:w-[120px] h-9 text-xs bg-background/50 border-border/50">
              <SelectValue placeholder="Loại" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả loại</SelectItem>
              {CAMPAIGN_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
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
                  Xóa lọc
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Quick Date Filters */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/30">
          <Zap className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
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
            </div>
          </motion.div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
