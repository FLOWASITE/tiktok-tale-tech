import { CalendarIcon, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { ReportFilters } from '@/hooks/reports/useReportFilters';
import { useCurrentBrand } from '@/contexts/BrandContext';

interface Props {
  filters: ReportFilters;
  onChange: (patch: Partial<ReportFilters>) => void;
  onReset: () => void;
  onPreset: (days: number) => void;
}

const CHANNELS = [
  { value: 'all', label: 'Tất cả channel' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'twitter', label: 'X / Twitter' },
  { value: 'threads', label: 'Threads' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'zalo_oa', label: 'Zalo OA' },
  { value: 'website', label: 'Website' },
  { value: 'email', label: 'Email' },
  { value: 'telegram', label: 'Telegram' },
];

export function ReportFiltersBar({ filters, onChange, onReset, onPreset }: Props) {
  const { brands } = useCurrentBrand();

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3">
      <div className="flex gap-1">
        {[7, 30, 90].map((d) => (
          <Button key={d} variant="ghost" size="sm" className="h-8 px-3 text-xs" onClick={() => onPreset(d)}>
            {d} ngày
          </Button>
        ))}
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className={cn('h-8 justify-start gap-2 text-xs font-normal')}>
            <CalendarIcon className="h-3.5 w-3.5" />
            {format(filters.dateFrom, 'dd/MM/yy', { locale: vi })} – {format(filters.dateTo, 'dd/MM/yy', { locale: vi })}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={{ from: filters.dateFrom, to: filters.dateTo }}
            onSelect={(range) => {
              if (range?.from && range?.to) onChange({ dateFrom: range.from, dateTo: range.to });
            }}
            numberOfMonths={2}
            className={cn('p-3 pointer-events-auto')}
            locale={vi}
          />
        </PopoverContent>
      </Popover>

      <Select
        value={filters.brandId ?? 'all'}
        onValueChange={(v) => onChange({ brandId: v === 'all' ? null : v })}
      >
        <SelectTrigger className="h-8 w-[180px] text-xs">
          <SelectValue placeholder="Brand" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả brand</SelectItem>
          {brands?.map((b) => (
            <SelectItem key={b.id} value={b.id}>
              {b.brand_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.channel ?? 'all'}
        onValueChange={(v) => onChange({ channel: v === 'all' ? null : v })}
      >
        <SelectTrigger className="h-8 w-[160px] text-xs">
          <SelectValue placeholder="Channel" />
        </SelectTrigger>
        <SelectContent>
          {CHANNELS.map((c) => (
            <SelectItem key={c.value} value={c.value}>
              {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={onReset}>
        <RotateCcw className="mr-1 h-3 w-3" /> Đặt lại
      </Button>
    </div>
  );
}
