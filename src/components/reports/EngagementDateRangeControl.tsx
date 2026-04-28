import { CalendarIcon, RotateCcw } from 'lucide-react';
import { format, startOfWeek, startOfMonth, startOfQuarter, startOfYear, differenceInCalendarDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { BucketType } from '@/lib/reports/aggregators';

export interface EngagementRange {
  from: Date;
  to: Date;
}

interface Props {
  range: EngagementRange;
  bucket: BucketType;
  onRangeChange: (r: EngagementRange) => void;
  onBucketChange: (b: BucketType) => void;
  onSyncWithGlobal: () => void;
  isOverridden: boolean;
}

function lastNDays(n: number): EngagementRange {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - n);
  return { from, to };
}

const PRESETS: { label: string; get: () => EngagementRange }[] = [
  { label: '7 ngày', get: () => lastNDays(7) },
  { label: 'Tuần này', get: () => ({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: new Date() }) },
  { label: '30 ngày', get: () => lastNDays(30) },
  { label: 'Tháng này', get: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
  { label: '90 ngày', get: () => lastNDays(90) },
  { label: 'Quý này', get: () => ({ from: startOfQuarter(new Date()), to: new Date() }) },
  { label: 'Năm nay', get: () => ({ from: startOfYear(new Date()), to: new Date() }) },
];

export function EngagementDateRangeControl({
  range,
  bucket,
  onRangeChange,
  onBucketChange,
  onSyncWithGlobal,
  isOverridden,
}: Props) {
  const days = Math.max(1, differenceInCalendarDays(range.to, range.from) + 1);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-2">
      <div className="flex flex-wrap gap-1">
        {PRESETS.map((p) => (
          <Button
            key={p.label}
            variant="ghost"
            size="sm"
            className="h-7 px-2.5 text-xs"
            onClick={() => onRangeChange(p.get())}
          >
            {p.label}
          </Button>
        ))}
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className={cn('h-7 justify-start gap-2 text-xs font-normal')}>
            <CalendarIcon className="h-3.5 w-3.5" />
            {format(range.from, 'dd/MM/yy', { locale: vi })} – {format(range.to, 'dd/MM/yy', { locale: vi })}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={{ from: range.from, to: range.to }}
            onSelect={(r) => {
              if (r?.from && r?.to) onRangeChange({ from: r.from, to: r.to });
            }}
            numberOfMonths={2}
            className={cn('p-3 pointer-events-auto')}
            locale={vi}
          />
        </PopoverContent>
      </Popover>

      <Select value={bucket} onValueChange={(v) => onBucketChange(v as BucketType)}>
        <SelectTrigger className="h-7 w-[110px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="day">Theo ngày</SelectItem>
          <SelectItem value="week">Theo tuần</SelectItem>
          <SelectItem value="month">Theo tháng</SelectItem>
        </SelectContent>
      </Select>

      <Badge variant="outline" className="h-6 text-[10px] font-normal">
        {days} ngày
      </Badge>

      {isOverridden && (
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" onClick={onSyncWithGlobal}>
          <RotateCcw className="mr-1 h-3 w-3" /> Theo filter chung
        </Button>
      )}
    </div>
  );
}
