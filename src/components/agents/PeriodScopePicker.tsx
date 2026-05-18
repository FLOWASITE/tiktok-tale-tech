import { CalendarRange, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { CampaignPeriodType, AgentGoal } from '@/types/agent';
import { computePeriodRange, describePeriodOption } from '@/lib/campaignPeriod';

const OPTIONS: { value: CampaignPeriodType; label: string }[] = [
  { value: 'month',   label: 'Tháng này' },
  { value: 'quarter', label: 'Quý này' },
  { value: 'year',    label: 'Năm này' },
  { value: 'custom',  label: 'Tự chọn' },
];

interface PeriodScopePickerProps {
  value: CampaignPeriodType;
  onChange: (type: CampaignPeriodType, range: { startDate: string; durationDays: number; label: string | null }) => void;
  parentGoalId: string | null;
  onParentChange: (id: string | null) => void;
  parentOptions: AgentGoal[];
}

export function PeriodScopePicker({
  value,
  onChange,
  parentGoalId,
  onParentChange,
  parentOptions,
}: PeriodScopePickerProps) {
  const handleSelect = (next: CampaignPeriodType) => {
    const range = computePeriodRange(next);
    onChange(next, {
      startDate: range?.startDate ?? new Date().toISOString().split('T')[0],
      durationDays: range?.durationDays ?? 14,
      label: range?.label ?? null,
    });
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-1.5">
        <CalendarRange className="w-3.5 h-3.5 text-muted-foreground" />
        <Label className="text-xs">Phạm vi chiến dịch</Label>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        {OPTIONS.map(opt => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleSelect(opt.value)}
              className={cn(
                'p-2 rounded-lg border text-center transition-all',
                active ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
              )}
            >
              <p className="text-xs font-medium">{opt.label}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5 truncate">
                {describePeriodOption(opt.value)}
              </p>
            </button>
          );
        })}
      </div>

      {value !== 'custom' && (
        <Badge variant="outline" className="text-[9px] gap-1">
          <Hash className="w-2.5 h-2.5" />
          Tự động đặt ngày bắt đầu & số ngày theo {OPTIONS.find(o => o.value === value)?.label.toLowerCase()}
        </Badge>
      )}

      {parentOptions.length > 0 && (
        <div className="space-y-1 pt-1">
          <Label className="text-[10px] text-muted-foreground">Gắn vào campaign cha (tuỳ chọn)</Label>
          <Select
            value={parentGoalId ?? 'none'}
            onValueChange={v => onParentChange(v === 'none' ? null : v)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Không gắn" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none" className="text-xs">Không gắn</SelectItem>
              {parentOptions.map(p => (
                <SelectItem key={p.id} value={p.id} className="text-xs">
                  {p.period_label ? `[${p.period_label}] ` : ''}{p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[9px] text-muted-foreground">
            Dùng để gom các campaign con dưới chiến dịch Tháng/Quý/Năm.
          </p>
        </div>
      )}
    </div>
  );
}
