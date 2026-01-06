import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarIcon, Filter, X } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { AnalyticsFilters } from '@/hooks/useAdCopyAnalytics';
import { Badge } from '@/components/ui/badge';

interface AnalyticsFiltersProps {
  filters: AnalyticsFilters;
  onFiltersChange: (filters: Partial<AnalyticsFilters>) => void;
}

const DATE_PRESETS = [
  { label: '7 ngày', days: 7 },
  { label: '14 ngày', days: 14 },
  { label: '30 ngày', days: 30 },
  { label: '90 ngày', days: 90 },
];

const PLATFORMS = [
  { value: 'facebook_feed', label: 'Facebook Feed' },
  { value: 'facebook_stories', label: 'Facebook Stories' },
  { value: 'instagram_feed', label: 'Instagram Feed' },
  { value: 'instagram_stories', label: 'Instagram Stories' },
  { value: 'instagram_reels', label: 'Instagram Reels' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'google_search', label: 'Google Search' },
  { value: 'google_display', label: 'Google Display' },
  { value: 'zalo', label: 'Zalo' },
];

export function AnalyticsFiltersComponent({ filters, onFiltersChange }: AnalyticsFiltersProps) {
  const activeFiltersCount = (filters.platforms?.length || 0) + (filters.brands?.length || 0);

  const handleDatePreset = (days: number) => {
    onFiltersChange({
      dateRange: {
        from: subDays(new Date(), days),
        to: new Date(),
      },
    });
  };

  const handlePlatformToggle = (platform: string) => {
    const current = filters.platforms || [];
    const updated = current.includes(platform)
      ? current.filter((p) => p !== platform)
      : [...current, platform];
    onFiltersChange({ platforms: updated.length ? updated : undefined });
  };

  const clearFilters = () => {
    onFiltersChange({
      platforms: undefined,
      brands: undefined,
      campaigns: undefined,
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Date Range */}
      <div className="flex items-center gap-2">
        {DATE_PRESETS.map((preset) => (
          <Button
            key={preset.days}
            variant="outline"
            size="sm"
            onClick={() => handleDatePreset(preset.days)}
            className={cn(
              'text-xs',
              Math.ceil(
                (filters.dateRange.to.getTime() - filters.dateRange.from.getTime()) /
                  (1000 * 60 * 60 * 24)
              ) === preset.days && 'bg-primary text-primary-foreground'
            )}
          >
            {preset.label}
          </Button>
        ))}

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs gap-2">
              <CalendarIcon className="h-3 w-3" />
              {format(filters.dateRange.from, 'dd/MM', { locale: vi })} -{' '}
              {format(filters.dateRange.to, 'dd/MM', { locale: vi })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              defaultMonth={filters.dateRange.from}
              selected={{
                from: filters.dateRange.from,
                to: filters.dateRange.to,
              }}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  onFiltersChange({ dateRange: { from: range.from, to: range.to } });
                }
              }}
              numberOfMonths={2}
              locale={vi}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Platform Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="text-xs gap-2">
            <Filter className="h-3 w-3" />
            Platform
            {filters.platforms?.length ? (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {filters.platforms.length}
              </Badge>
            ) : null}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[220px]" align="start">
          <div className="space-y-2">
            <p className="text-sm font-medium mb-3">Chọn nền tảng</p>
            {PLATFORMS.map((platform) => (
              <label
                key={platform.value}
                className="flex items-center gap-2 cursor-pointer hover:bg-muted p-1.5 rounded"
              >
                <input
                  type="checkbox"
                  checked={filters.platforms?.includes(platform.value) || false}
                  onChange={() => handlePlatformToggle(platform.value)}
                  className="rounded border-input"
                />
                <span className="text-sm">{platform.label}</span>
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Clear Filters */}
      {activeFiltersCount > 0 && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs gap-1">
          <X className="h-3 w-3" />
          Xóa bộ lọc ({activeFiltersCount})
        </Button>
      )}
    </div>
  );
}
